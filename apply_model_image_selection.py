#!/usr/bin/env python3
"""Upload an approved image selection and update all_models.json atomically."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


PROJECT_ID = os.getenv("SANITY_PROJECT_ID", "wensahkh")
DATASET = os.getenv("SANITY_DATASET", "production")
API_VERSION = "2023-05-03"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ladda upp godkända modellbilder och uppdatera all_models.json."
    )
    parser.add_argument("--selection", type=Path, required=True)
    parser.add_argument(
        "--models-json",
        type=Path,
        default=Path(__file__).parent / "frontend/public/data/all_models.json",
    )
    parser.add_argument("--report", type=Path)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def upload_image(path: Path, token: str) -> dict[str, Any]:
    filename = urllib.parse.quote(path.name)
    url = (
        f"https://{PROJECT_ID}.api.sanity.io/v{API_VERSION}/assets/images/"
        f"{DATASET}?filename={filename}"
    )
    request = urllib.request.Request(
        url,
        data=path.read_bytes(),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": mimetypes.guess_type(path.name)[0] or "image/png",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)["document"]
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"Sanity svarade HTTP {exc.code}: {details}") from exc


def main() -> int:
    args = parse_args()
    selection = json.loads(args.selection.read_text(encoding="utf-8"))
    records = json.loads(args.models_json.read_text(encoding="utf-8"))
    report_path = args.report or args.selection.with_name(
        f"{selection['brand'].lower()}-image-apply-report.json"
    )

    by_identity = {
        (str(record.get("brand") or "").casefold(), str(record.get("name") or "").casefold()): record
        for record in records
    }
    changes = []
    errors = []
    seen_ids: set[str] = set()
    for item in selection.get("selections", []):
        identity = (selection["brand"].casefold(), item["model"].casefold())
        record = by_identity.get(identity)
        source = Path(item["selected"]["path"])
        if not record:
            errors.append(f"Saknas i all_models.json: {selection['brand']} {item['model']}")
            continue
        if not source.is_file():
            errors.append(f"Bildfil saknas: {source}")
            continue
        record_id = str(record.get("id") or "")
        if not record_id or record_id in seen_ids:
            errors.append(f"Ogiltigt eller dubblerat modell-id för {item['model']}: {record_id}")
            continue
        seen_ids.add(record_id)
        changes.append(
            {
                "brand": record["brand"],
                "model": record["name"],
                "modelId": record_id,
                "source": str(source),
                "oldImage": record.get("image_url"),
                "newImage": None,
                "assetId": None,
            }
        )

    report = {
        "mode": "apply" if args.apply else "preview",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "selection": str(args.selection),
        "modelsJson": str(args.models_json),
        "summary": {
            "selected": len(selection.get("selections", [])),
            "ready": len(changes),
            "errors": len(errors),
            "uploaded": 0,
            "updated": 0,
        },
        "errors": errors,
        "changes": changes,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if errors:
        print(json.dumps({"changed": False, "report": str(report_path), **report["summary"]}, ensure_ascii=False, indent=2))
        return 2
    if not args.apply:
        print(json.dumps({"changed": False, "report": str(report_path), **report["summary"]}, ensure_ascii=False, indent=2))
        return 0

    token = os.getenv("SANITY_WRITE_TOKEN") or os.getenv("SANITY_API_TOKEN")
    if not token:
        raise RuntimeError("SANITY_WRITE_TOKEN saknas. Exportera token i samma terminal före --apply.")

    for index, change in enumerate(changes, 1):
        asset = upload_image(Path(change["source"]), token)
        change["assetId"] = asset["_id"]
        change["newImage"] = asset["url"]
        report["summary"]["uploaded"] = index
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Uppladdning {index}/{len(changes)}: {change['model']}", flush=True)

    changes_by_id = {change["modelId"]: change for change in changes}
    for record in records:
        change = changes_by_id.get(str(record.get("id") or ""))
        if change:
            record["image_url"] = change["newImage"]

    temporary = args.models_json.with_suffix(args.models_json.suffix + ".tmp")
    temporary.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(args.models_json)
    report["summary"]["updated"] = len(changes)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"changed": True, "report": str(report_path), **report["summary"]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
