#!/usr/bin/env python3
"""Download selected 3x Carsized model images for AK-Tuning.

The script intersects three data sources:
  1. Passenger-car models and year ranges currently present in Sanity.
  2. Models whose current image in all_models.json is below the quality limit.
  3. The Carsized catalogue captured in a browser HAR file.

It is deliberately a preview-only tool unless --download is supplied. It never
writes to Sanity or all_models.json. Ambiguous matches are only reported.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import dataclasses
import difflib
import hashlib
import html
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable

try:
    from curl_cffi import requests as browser_requests
except ImportError:
    browser_requests = None


PROJECT_ID = os.getenv("SANITY_PROJECT_ID", "wensahkh")
DATASET = os.getenv("SANITY_DATASET", "production")
API_VERSION = "2023-05-03"
CURRENT_YEAR = 2026
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
)
IMAGE_DIMENSIONS = re.compile(
    r"-(?P<width>\d+)x(?P<height>\d+)\.(?:png|jpe?g|webp)(?:\?|$)", re.I
)
IMAGE_3X = re.compile(
    r"(?P<url>(?:https://www\.carsized\.com)?/resources/[^\"'\s]+side-view_3x\.png)",
    re.I,
)


BRAND_ALIASES = {
    "fiat": "FIAT",
    "infiniti": "INFINITI",
    "landrover": "Land Rover",
    "land rover": "Land Rover",
    "mercedes": "Mercedes-Benz",
    "mini": "MINI",
    "rolls royce": "Rolls-Royce",
}

TRUCK_BRANDS = {"man", "scania", "lastbil man", "lastbil scania", "lastbil volvo"}


@dataclasses.dataclass(frozen=True)
class CatalogueCar:
    brand: str
    model: str
    body: str
    years: str
    url: str
    start_year: int
    end_year: int


class CarsizedCatalogueParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.current: dict[str, str] | None = None
        self.current_class: str | None = None
        self.rows: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "a" and "/en/cars/" in (values.get("href") or ""):
            self.current = {"url": values["href"] or ""}
        if self.current is not None and tag == "span":
            self.current_class = values.get("class")

    def handle_data(self, data: str) -> None:
        if self.current is not None and self.current_class in {"lima", "limo", "imb", "imp"}:
            key = self.current_class
            self.current[key] = f"{self.current.get(key, '')}{data}".strip()

    def handle_endtag(self, tag: str) -> None:
        if tag == "span":
            self.current_class = None
        if tag == "a" and self.current is not None:
            if self.current.get("lima") and self.current.get("limo"):
                self.rows.append(self.current)
            self.current = None


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = value.lower().replace("&", " and ")
    value = re.sub(r"\b(series|serien|serie|class|klass)\b", "", value)
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def slugify(value: str) -> str:
    return normalize(value).replace(" ", "-") or "unknown"


def variant_model_folder(base_model: str, carsized_body: str) -> str:
    """Route performance bodies to their own S/RS/SQ/M model folder."""
    body = unicodedata.normalize("NFKD", carsized_body).encode("ascii", "ignore").decode()
    bmw_explicit = re.search(r"\bM\s*-?\s*(\d)\b", body, re.I)
    if bmw_explicit:
        return f"M{bmw_explicit.group(1)}"

    if re.search(r"\bM\b", body, re.I):
        base = re.sub(r"[^A-Za-z0-9]", "", base_model).upper()
        bmw_x_family = re.fullmatch(r"X(\d)", base)
        if bmw_x_family:
            return f"X{bmw_x_family.group(1)} M"

    explicit = re.search(r"\b(RSQ|SQ|RS|S)\s*-?\s*(\d)\b", body, re.I)
    if explicit:
        return f"{explicit.group(1).upper()}{explicit.group(2)}"

    if re.search(r"\bRS\b", body, re.I):
        base = re.sub(r"[^A-Za-z0-9]", "", base_model).upper()
        if base.startswith("TT"):
            return "TTRS"
        audi_family = re.fullmatch(r"([AQ])(\d)", base)
        if audi_family:
            prefix, number = audi_family.groups()
            return f"RS{number}" if prefix == "A" else f"RSQ{number}"

    return base_model


def year_interval(value: str, *, catalogue: bool = False) -> tuple[int, int]:
    years = [int(year) for year in re.findall(r"(?<!\d)(?:19|20)\d{2}(?!\d)", value)]
    if not years:
        return (1900, CURRENT_YEAR)
    start = min(years)
    if len(years) >= 2:
        return (start, max(years))
    open_ended = bool(re.search(r"present|\.\.\.|(?:->|>|-)\s*$", value, re.I))
    if catalogue and "present" in value.lower():
        open_ended = True
    return (start, CURRENT_YEAR if open_ended else start)


def intervals_overlap(left: tuple[int, int], right: tuple[int, int]) -> bool:
    return max(left[0], right[0]) <= min(left[1], right[1])


def resolved_sanity_intervals(years: list[dict[str, Any]]) -> list[tuple[int, int]]:
    """Cap stale open-ended ranges at the next generation's start year."""
    labels = [str(year.get("range") or "") for year in years]
    parsed = [year_interval(label) for label in labels]
    starts = sorted({start for start, _ in parsed})
    result: list[tuple[int, int]] = []
    for label, (start, end) in zip(labels, parsed):
        is_open = bool(re.search(r"present|\.\.\.|(?:->|>|-)\s*$", label, re.I))
        later_starts = [candidate for candidate in starts if candidate > start]
        if is_open and later_starts:
            end = min(end, later_starts[0] - 1)
        result.append((start, max(start, end)))
    return result


def extract_catalogue_from_har(path: Path) -> list[CatalogueCar]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    content = ""
    for entry in raw.get("log", {}).get("entries", []):
        url = entry.get("request", {}).get("url", "")
        if "pagination-lite.php" not in url:
            continue
        response = entry.get("response", {}).get("content", {})
        text = response.get("text") or ""
        if response.get("encoding") == "base64":
            import base64

            text = base64.b64decode(text).decode("utf-8", "replace")
        if len(text) > len(content):
            content = text
    if not content:
        raise RuntimeError(
            f"Ingen Carsized-katalog hittades i {path}. "
            "HAR-filen måste innehålla anropet pagination-lite.php."
        )

    parser = CarsizedCatalogueParser()
    parser.feed(content)
    result = []
    for row in parser.rows:
        start, end = year_interval(row.get("imp", ""), catalogue=True)
        result.append(
            CatalogueCar(
                brand=html.unescape(row.get("lima", "")),
                model=html.unescape(row.get("limo", "")),
                body=html.unescape(row.get("imb", "")),
                years=html.unescape(row.get("imp", "")),
                url=row["url"],
                start_year=start,
                end_year=end,
            )
        )
    return result


def request_bytes(url: str, timeout: int = 60) -> bytes:
    if "carsized.com" in (urllib.parse.urlsplit(url).hostname or ""):
        if browser_requests is None:
            raise RuntimeError(
                "Carsized kräver en webbläsarlik HTTP-klient. Installera den med: "
                "python3 -m pip install --user curl-cffi"
            )
        for attempt in range(6):
            response = browser_requests.get(
                url,
                impersonate="safari184",
                headers={"Referer": "https://www.carsized.com/en/cars/"},
                timeout=timeout,
            )
            if response.status_code != 429:
                response.raise_for_status()
                return response.content
            if attempt < 5:
                retry_after = response.headers.get("Retry-After")
                delay = float(retry_after) if retry_after and retry_after.isdigit() else 2 ** attempt
                time.sleep(min(delay, 30))
        response.raise_for_status()
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def fetch_sanity() -> list[dict[str, Any]]:
    query = '''*[_type == "brand"]{
      _id,name,"slug":slug.current,
      models[]{_key,name,years[]{_key,range}}
    }'''
    params = urllib.parse.urlencode({"query": query})
    url = (
        f"https://{PROJECT_ID}.api.sanity.io/v{API_VERSION}/data/query/"
        f"{DATASET}?{params}"
    )
    return json.loads(request_bytes(url))["result"]


def load_low_quality_models(path: Path) -> list[tuple[str, str]]:
    records = json.loads(path.read_text(encoding="utf-8"))
    low_quality: list[tuple[str, str]] = []
    for record in records:
        image_url = str(record.get("image_url") or "")
        match = IMAGE_DIMENSIONS.search(image_url)
        if not match:
            continue
        width, height = int(match["width"]), int(match["height"])
        if width < 400 or height < 180:
            low_quality.append((str(record.get("brand") or ""), str(record.get("name") or "")))
    return low_quality


def name_score(sanity_name: str, catalogue_name: str) -> float:
    left = normalize(sanity_name)
    right = normalize(catalogue_name)
    if left == right or left.replace(" ", "") == right.replace(" ", ""):
        return 1.0
    left_parts = [
        normalize(part)
        for part in re.split(r"/|\bor\b", sanity_name, flags=re.I)
        if normalize(part)
    ]
    right_parts = [
        normalize(part)
        for part in re.split(r"/|\bor\b", catalogue_name, flags=re.I)
        if normalize(part)
    ]
    scores = [
        difflib.SequenceMatcher(None, left_part, right_part).ratio()
        for left_part in left_parts
        for right_part in right_parts
    ]
    if any(
        left_part == right_part
        or left_part.replace(" ", "") == right_part.replace(" ", "")
        for left_part in left_parts
        for right_part in right_parts
    ):
        return 0.98
    return max(scores or [difflib.SequenceMatcher(None, left, right).ratio()])


def is_low_quality(brand: str, model: str, low_quality: list[tuple[str, str]]) -> bool:
    brand_key = normalize(brand)
    candidates = [m for b, m in low_quality if normalize(b) == brand_key]
    return any(name_score(model, candidate) >= 0.90 for candidate in candidates)


def body_preference(body: str) -> int:
    value = normalize(body)
    priorities = [
        "suv",
        "sedan",
        "liftback",
        "estate",
        "hatchback",
        "coupe",
        "cabriolet",
        "van",
        "pickup",
    ]
    for index, name in enumerate(priorities):
        if name in value:
            return index
    return len(priorities)


def match_year(
    brand: str,
    model: str,
    year_label: str,
    catalogue: list[CatalogueCar],
    target_interval: tuple[int, int] | None = None,
) -> tuple[str, CatalogueCar | None, list[CatalogueCar], float]:
    expected_brand = BRAND_ALIASES.get(normalize(brand), brand)
    brand_rows = [row for row in catalogue if normalize(row.brand) == normalize(expected_brand)]
    target_interval = target_interval or year_interval(year_label)
    scored = [(name_score(model, row.model), row) for row in brand_rows]
    scored = [(score, row) for score, row in scored if score >= 0.72]
    overlapping = [
        (score, row)
        for score, row in scored
        if intervals_overlap(target_interval, (row.start_year, row.end_year))
    ]
    overlapping.sort(
        key=lambda item: (
            -item[0],
            -(
                min(item[1].end_year, target_interval[1])
                - max(item[1].start_year, target_interval[0])
                + 1
            ),
            abs(item[1].start_year - target_interval[0]),
            body_preference(item[1].body),
        )
    )
    if not overlapping:
        return ("unmatched", None, [], 0.0)

    best_score, best = overlapping[0]
    close = [
        row
        for score, row in overlapping
        if score >= best_score - 0.02
        and abs(row.start_year - best.start_year) <= 1
    ]
    distinct_bodies = {normalize(row.body) for row in close}
    status = "matched"
    target_span = target_interval[1] - target_interval[0] + 1
    overlap_span = (
        min(best.end_year, target_interval[1])
        - max(best.start_year, target_interval[0])
        + 1
    )
    weak_year_coverage = target_span > 2 and overlap_span / target_span < 0.5
    if best_score < 0.84 or len(distinct_bodies) > 1 or weak_year_coverage:
        status = "ambiguous"
    return (status, best, close[:8], best_score)


def extract_3x_url(page: bytes) -> str | None:
    text = page.decode("utf-8", "replace").replace("&amp;", "&")
    matches = [match.group("url") for match in IMAGE_3X.finditer(text)]
    if not matches:
        return None
    url = matches[0]
    return urllib.parse.urljoin("https://www.carsized.com", url)


def cache_path(cache: Path, url: str) -> Path:
    return cache / f"{hashlib.sha256(url.encode()).hexdigest()}.html"


def fetch_detail(car: CatalogueCar, cache: Path) -> tuple[CatalogueCar, str | None, str | None]:
    target = cache_path(cache, car.url)
    try:
        if target.exists():
            page = target.read_bytes()
        else:
            page = request_bytes(car.url)
            target.write_bytes(page)
        return (car, extract_3x_url(page), None)
    except Exception as exc:  # report individual failures without losing the run
        return (car, None, str(exc))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Hämta Carsized 3x-bilder endast för lågupplösta Sanity-modeller."
    )
    parser.add_argument(
        "--catalog-har",
        type=Path,
        default=Path.home() / "Downloads" / "11www.carsized.com.har",
        help="HAR med Carsized-katalogens pagination-lite.php-anrop.",
    )
    parser.add_argument(
        "--models-json",
        type=Path,
        default=Path(__file__).parent / "frontend" / "public" / "data" / "all_models.json",
        help="Nuvarande modellregister, används för kvalitetsfiltret.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path.home() / "Downloads" / "ak-model-images-3x",
    )
    parser.add_argument("--brand", help="Begränsa till ett märke, t.ex. Volvo.")
    parser.add_argument(
        "--exclude-brand",
        action="append",
        default=[],
        help="Hoppa över ett märke. Flaggan kan anges flera gånger.",
    )
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--limit", type=int, help="Begränsa antalet matchningar vid test.")
    parser.add_argument(
        "--download",
        action="store_true",
        help="Ladda ner bilder. Utan flaggan skapas endast en förhandsrapport.",
    )
    parser.add_argument(
        "--include-ambiguous",
        action="store_true",
        help="Ta även med osäkra träffar. Rekommenderas först efter granskning av rapporten.",
    )
    parser.add_argument(
        "--download-candidates",
        action="store_true",
        help=(
            "Ladda ner alla relevanta karossvarianter för varje årsintervall "
            "i stället för enbart skriptets förstaval."
        ),
    )
    parser.add_argument(
        "--latest-only",
        action="store_true",
        help="Behåll endast det nyaste matchade årsintervallet per modell.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    cache = args.output / ".page-cache"
    cache.mkdir(exist_ok=True)

    print("Läser Carsized-katalogen ...", flush=True)
    catalogue = extract_catalogue_from_har(args.catalog_har)
    print(f"Carsized: {len(catalogue)} varianter", flush=True)
    print("Hämtar aktuella modeller och årsintervall från Sanity ...", flush=True)
    sanity = fetch_sanity()
    low_quality = load_low_quality_models(args.models_json)

    rows: list[dict[str, Any]] = []
    selected: list[tuple[dict[str, Any], CatalogueCar]] = []
    for brand in sanity:
        brand_name = str(brand.get("name") or "")
        if normalize(brand_name) in TRUCK_BRANDS or "lastbil" in normalize(brand_name):
            continue
        if args.brand and normalize(args.brand) != normalize(brand_name):
            continue
        if normalize(brand_name) in {normalize(value) for value in args.exclude_brand}:
            continue
        for model in brand.get("models") or []:
            model_name = str(model.get("name") or "")
            if not is_low_quality(brand_name, model_name, low_quality):
                continue
            model_years = model.get("years") or []
            intervals = resolved_sanity_intervals(model_years)
            for year, target_interval in zip(model_years, intervals):
                year_label = str(year.get("range") or "")
                status, best, candidates, score = match_year(
                    brand_name, model_name, year_label, catalogue, target_interval
                )
                row = {
                    "brand": brand_name,
                    "model": model_name,
                    "year": year_label,
                    "resolvedYears": f"{target_interval[0]}-{target_interval[1]}",
                    "status": status,
                    "score": round(score, 3),
                    "carsizedPage": best.url if best else None,
                    "carsizedModel": best.model if best else None,
                    "carsizedBody": best.body if best else None,
                    "carsizedYears": best.years if best else None,
                    "image3x": None,
                    "localFile": None,
                    "candidates": [
                        {"model": item.model, "body": item.body, "years": item.years, "url": item.url}
                        for item in candidates
                    ],
                }
                rows.append(row)
                if best and args.download_candidates:
                    # Keep every close year/model candidate so a human can choose
                    # between e.g. Coupé, Sportback and Cabriolet afterwards.
                    choices = candidates or [best]
                    seen_urls: set[str] = set()
                    for candidate in choices:
                        if candidate.url not in seen_urls:
                            selected.append((row, candidate))
                            seen_urls.add(candidate.url)
                elif best and (status == "matched" or args.include_ambiguous):
                    selected.append((row, best))

    if args.latest_only:
        latest_starts: dict[tuple[str, str], int] = {}
        for row, _ in selected:
            key = (normalize(row["brand"]), normalize(row["model"]))
            start = int(row["resolvedYears"].split("-", 1)[0])
            latest_starts[key] = max(start, latest_starts.get(key, 0))
        selected = [
            (row, car)
            for row, car in selected
            if int(row["resolvedYears"].split("-", 1)[0])
            == latest_starts[(normalize(row["brand"]), normalize(row["model"]))]
        ]

    if args.limit:
        selected = selected[: args.limit]

    counts = {name: sum(row["status"] == name for row in rows) for name in ("matched", "ambiguous", "unmatched")}
    print(
        f"Sanity-år som behöver ny bild: {len(rows)} | "
        f"säkra: {counts['matched']} | osäkra: {counts['ambiguous']} | "
        f"saknas: {counts['unmatched']}",
        flush=True,
    )

    if not args.download:
        report = {
            "mode": "preview",
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "summary": {"total": len(rows), **counts, "selected": len(selected)},
            "items": rows,
        }
        report_path = args.output / "carsized-match-preview.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(f"Förhandsrapport: {report_path}")
        print("Inga bilder laddades ner. Kör igen med --download efter granskning.")
        return 0

    started = time.monotonic()
    completed = 0
    errors = 0
    car_to_rows: dict[str, list[tuple[dict[str, Any], CatalogueCar]]] = {}
    unique_cars: dict[str, CatalogueCar] = {}
    for row, car in selected:
        unique_cars[car.url] = car
        car_to_rows.setdefault(car.url, []).append((row, car))

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        futures = [pool.submit(fetch_detail, car, cache) for car in unique_cars.values()]
        for future in concurrent.futures.as_completed(futures):
            car, image_url, error = future.result()
            completed += 1
            if error or not image_url:
                errors += 1
            for row, selected_car in car_to_rows[car.url]:
                variant = {
                    "carsizedPage": selected_car.url,
                    "carsizedModel": selected_car.model,
                    "carsizedBody": selected_car.body,
                    "carsizedYears": selected_car.years,
                    "image3x": image_url,
                    "localFile": None,
                }
                row.setdefault("variants", []).append(variant)
                if selected_car.url == row.get("carsizedPage"):
                    row["image3x"] = image_url
                if error:
                    variant["error"] = error
            elapsed = max(time.monotonic() - started, 0.001)
            rate = completed / elapsed
            remaining = (len(futures) - completed) / rate if rate else 0
            print(
                f"Sidor {completed}/{len(futures)} | fel {errors} | "
                f"ca {remaining / 60:.1f} min kvar",
                end="\r",
                flush=True,
            )
    print()

    downloadable = [
        (row, variant)
        for row in rows
        for variant in row.get("variants", [])
        if variant.get("image3x")
    ]
    for index, (row, variant) in enumerate(downloadable, 1):
        brand_dir = args.output / slugify(row["brand"])
        folder_model = variant_model_folder(
            row["model"], variant.get("carsizedBody") or ""
        )
        model_dir = brand_dir / slugify(folder_model)
        model_dir.mkdir(parents=True, exist_ok=True)
        start, end = (int(value) for value in row["resolvedYears"].split("-", 1))
        filename = (
            f"{start}-{end}-{slugify(variant['carsizedModel'] or 'car')}-"
            f"{slugify(variant['carsizedBody'] or 'car')}-"
            f"{variant.get('carsizedYears', '').replace(' ', '')}-3x.png"
        )
        destination = model_dir / filename
        try:
            if not destination.exists():
                destination.write_bytes(request_bytes(variant["image3x"]))
            variant["localFile"] = str(destination)
            if variant["carsizedPage"] == row.get("carsizedPage"):
                row["localFile"] = str(destination)
        except Exception as exc:
            variant["error"] = str(exc)
            errors += 1
        elapsed = max(time.monotonic() - started, 0.001)
        rate = index / elapsed
        remaining = (len(downloadable) - index) / rate if rate else 0
        print(
            f"Bilder {index}/{len(downloadable)} | fel {errors} | "
            f"ca {remaining / 60:.1f} min kvar",
            end="\r",
            flush=True,
        )
    print()

    report = {
        "mode": "download",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "summary": {
            "total": len(rows),
            **counts,
            "downloaded": sum(
                bool(variant.get("localFile"))
                for row in rows
                for variant in row.get("variants", [])
            ),
            "errors": errors,
        },
        "items": rows,
    }
    report_path = args.output / "carsized-download-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"Rapport: {report_path}")
    print(f"Färdiga bilder: {report['summary']['downloaded']}")
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
