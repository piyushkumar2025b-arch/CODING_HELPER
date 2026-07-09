"""Build a simple asset wiring report for the CodeMind workspace.

This script scans the project for .js, .jsx, .ts, .tsx, .html, and .css files,
then generates:

1. a JSON manifest of discovered assets
2. a lightweight HTML page that lists them and links to the local files

Browser runtimes cannot execute TypeScript/TSX directly, so those files are
included in the manifest and the report as source assets rather than being
transpiled.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = ROOT / "wired_assets"
TARGET_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".html", ".css"}
IGNORE_DIRS = {
    ".git",
    ".venv",
    "__pycache__",
    "local_data",
    "wired_assets",
    ".streamlit",
}


@dataclass(frozen=True)
class AssetEntry:
    path: str
    kind: str
    name: str


def iter_assets(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in TARGET_EXTENSIONS:
            yield path


def classify(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".css":
        return "css"
    if suffix == ".html":
        return "html"
    if suffix in {".jsx", ".tsx"}:
        return "source-tsx"
    if suffix == ".ts":
        return "source-ts"
    return "source-js"


def build_entries(root: Path) -> list[AssetEntry]:
    entries = [
        AssetEntry(
            path=str(path.relative_to(root)).replace("\\", "/"),
            kind=classify(path),
            name=path.name,
        )
        for path in sorted(iter_assets(root))
    ]
    return entries


def build_html(entries: list[AssetEntry], title: str) -> str:
    rows = []
    for entry in entries:
        rows.append(
            f"<tr><td>{entry.kind}</td><td><a href='../{entry.path}' target='_blank'>{entry.path}</a></td><td>{entry.name}</td></tr>"
        )
    rows_html = "\n".join(rows)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    :root {{
      color-scheme: dark;
      --bg: #0b1020;
      --panel: #121a31;
      --text: #e5eefc;
      --muted: #8ea0c8;
      --accent: #3bd1ff;
      --line: rgba(123, 147, 196, 0.2);
    }}
    body {{
      margin: 0;
      font-family: Arial, sans-serif;
      background: radial-gradient(circle at top, #17203a, var(--bg) 55%);
      color: var(--text);
    }}
    main {{
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 28px;
    }}
    p {{
      margin: 0 0 20px;
      color: var(--muted);
    }}
    .card {{
      background: rgba(18, 26, 49, 0.92);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 16px 50px rgba(0, 0, 0, 0.25);
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
    }}
    th, td {{
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }}
    th {{
      background: rgba(255, 255, 255, 0.03);
      color: var(--accent);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}
    tr:hover td {{
      background: rgba(59, 209, 255, 0.05);
    }}
    a {{
      color: var(--text);
      text-decoration: none;
    }}
    a:hover {{
      text-decoration: underline;
    }}
    code {{
      color: var(--accent);
    }}
  </style>
</head>
<body>
  <main>
    <h1>{title}</h1>
    <p>Discovered {len(entries)} asset files. TypeScript, TSX, and JSX are listed as source assets.</p>
    <div class="card">
      <table>
        <thead>
          <tr><th>Kind</th><th>Path</th><th>Name</th></tr>
        </thead>
        <tbody>
          {rows_html}
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a wiring manifest for project assets.")
    parser.add_argument("--root", type=Path, default=ROOT, help="Project root to scan.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUTPUT_DIR, help="Output directory.")
    args = parser.parse_args()

    root = args.root.resolve()
    out_dir = args.out.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    entries = build_entries(root)
    manifest = {
        "root": str(root),
        "count": len(entries),
        "assets": [asdict(entry) for entry in entries],
    }

    manifest_path = out_dir / "asset_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    html_path = out_dir / "asset_wiring_report.html"
    html_path.write_text(build_html(entries, "CodeMind Asset Wiring Report"), encoding="utf-8")

    print(f"Wrote {manifest_path}")
    print(f"Wrote {html_path}")
    print(f"Found {len(entries)} assets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
