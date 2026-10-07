#!/usr/bin/env python3
"""Prepare a reviewable latest-generation model-image selection.

This tool is read-only with respect to Sanity and the model registry. It scans
downloaded candidate folders and writes JSON + HTML previews for human review.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import unicodedata
from pathlib import Path


YEAR_PREFIX = re.compile(r"^(?P<start>\d{4})-(?P<end>\d{4})-")

MODEL_FOLDER_ALIASES = {
    "a3 / a3 berline": "a3",
    "a4 cabrio": "a4",
    "tt rs": "ttrs",
    "tt s": "tts",
}

MODEL_BODY_REQUIREMENTS = {
    "a3 / a3 berline": "sedan",
    "a4 cabrio": "cabriolet",
}

ELECTRIC_MODELS = {"a6 e-tron", "q4", "q6", "s6 e-tron", "e-tron"}


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return value or "unknown"


def body_preference(filename: str) -> tuple[int, str]:
    name = filename.lower()
    penalties = (
        ("cabriolet", 50),
        ("roadster", 45),
        ("citycarver", 40),
        ("crossover", 35),
        ("lwb", 30),
        ("coupe-suv", 15),
        ("coupe", 10),
    )
    return (next((penalty for token, penalty in penalties if token in name), 0), name)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Välj automatiskt senaste lokala bildgeneration per modell."
    )
    parser.add_argument("--brand", required=True)
    parser.add_argument("--images-root", type=Path, required=True)
    parser.add_argument(
        "--models-json",
        type=Path,
        default=Path(__file__).parent / "frontend/public/data/all_models.json",
    )
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    records = json.loads(args.models_json.read_text(encoding="utf-8"))
    models = [
        record for record in records
        if str(record.get("brand") or "").casefold() == args.brand.casefold()
    ]

    selections = []
    missing = []
    ignored = []
    for model in sorted(models, key=lambda item: str(item.get("name") or "")):
        model_name = str(model.get("name") or "")
        model_key = model_name.casefold()
        if model_key in ELECTRIC_MODELS:
            ignored.append(
                {
                    "model": model_name,
                    "currentImage": model.get("image_url"),
                    "reason": "Ren elmodell ingår inte i urvalet",
                }
            )
            continue
        folder_name = MODEL_FOLDER_ALIASES.get(model_key, slugify(model_name))
        folder = args.images_root / folder_name
        required_body = MODEL_BODY_REQUIREMENTS.get(model_key)
        candidates = []
        for path in folder.glob("*.png") if folder.exists() else []:
            match = YEAR_PREFIX.match(path.name)
            if match:
                candidates.append(
                    {
                        "path": str(path),
                        "filename": path.name,
                        "startYear": int(match.group("start")),
                        "endYear": int(match.group("end")),
                    }
                )
        if required_body:
            candidates = [
                candidate for candidate in candidates
                if required_body in candidate["filename"].lower()
            ]
        if not candidates:
            missing.append(
                {
                    "model": model_name,
                    "currentImage": model.get("image_url"),
                    "reason": "Ingen nedladdad kandidat",
                }
            )
            continue

        newest_start = max(candidate["startYear"] for candidate in candidates)
        newest = [candidate for candidate in candidates if candidate["startYear"] == newest_start]
        newest.sort(key=lambda item: body_preference(item["filename"]))
        selections.append(
            {
                "brand": args.brand,
                "model": model_name,
                "modelId": model.get("id"),
                "currentImage": model.get("image_url"),
                "selected": newest[0],
                "alternatives": newest[1:],
                "olderCandidates": sorted(
                    (candidate for candidate in candidates if candidate["startYear"] != newest_start),
                    key=lambda item: (-item["startYear"], body_preference(item["filename"])),
                ),
                "status": "selected-latest",
            }
        )

    report = {
        "mode": "preview",
        "rule": "newest start year, then representative body preference",
        "brand": args.brand,
        "summary": {
            "models": len(models),
            "selected": len(selections),
            "missing": len(missing),
            "ignoredElectric": len(ignored),
        },
        "selections": selections,
        "missing": missing,
        "ignored": ignored,
    }
    json_path = args.output / f"{slugify(args.brand)}-latest-selection.json"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    cards = []
    for item in selections:
        selected = item["selected"]
        alternatives = "".join(
            f'<li><img src="{html.escape(Path(candidate["path"]).as_uri())}" alt="">'
            f'<span>{html.escape(candidate["filename"])}</span></li>'
            for candidate in item["alternatives"]
        ) or "<li>Inga alternativ för senaste generationen</li>"
        cards.append(
            f'''<article>
              <h2>{html.escape(item["model"])}</h2>
              <div class="compare">
                <figure><img src="{html.escape(item["currentImage"] or '')}" alt=""><figcaption>Nuvarande</figcaption></figure>
                <figure class="selected"><img src="{html.escape(Path(selected["path"]).as_uri())}" alt=""><figcaption>Vald: {html.escape(selected["filename"])}</figcaption></figure>
              </div>
              <h3>Alternativ från samma senaste generation</h3><ul>{alternatives}</ul>
            </article>'''
        )
    missing_html = "".join(f"<li>{html.escape(item['model'])}</li>" for item in missing)
    ignored_html = "".join(f"<li>{html.escape(item['model'])}</li>" for item in ignored)
    html_path = args.output / f"{slugify(args.brand)}-latest-selection.html"
    html_path.write_text(
        f'''<!doctype html><html lang="sv"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>{html.escape(args.brand)} – bildurval</title>
        <style>
        body{{font:16px system-ui;background:#090a0c;color:#f5f5f5;margin:0;padding:32px}}
        main{{max-width:1200px;margin:auto}} article{{background:#17191e;border:1px solid #30343c;border-radius:16px;padding:20px;margin:20px 0}}
        .compare{{display:grid;grid-template-columns:1fr 1fr;gap:18px}} figure{{margin:0;background:#22252b;border-radius:12px;padding:12px}}
        figure.selected{{outline:2px solid #d9272e}} img{{width:100%;height:220px;object-fit:contain}} figcaption{{margin-top:8px;word-break:break-word}}
        ul{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;padding:0;list-style:none}} li img{{width:100%;height:130px;object-fit:contain;background:#22252b}} li span{{font-size:12px;word-break:break-word}}
        @media(max-width:700px){{.compare{{grid-template-columns:1fr}}}}
        </style></head><body><main><h1>{html.escape(args.brand)} – senaste modellbild</h1>
        <p>{len(selections)} automatiska val. Inget har laddats upp.</p>{''.join(cards)}
        <article><h2>Saknar kandidat ({len(missing)})</h2><ul>{missing_html}</ul></article>
        <article><h2>Överhoppade elmodeller ({len(ignored)})</h2><ul>{ignored_html}</ul></article>
        </main></body></html>''',
        encoding="utf-8",
    )
    print(json.dumps({"json": str(json_path), "html": str(html_path), **report["summary"]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
