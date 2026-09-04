#!/usr/bin/env python3
"""Export classified_v8 comments to CSV + XLSX (LOP REV charts)."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
JSONL = ROOT / "data" / "classified_v8.jsonl"
FILTERED_CSV = ROOT / "data" / "merged_filtered_v7.csv"
OUT_CSV = ROOT / "data" / "export_comments_v8.csv"
OUT_XLSX = ROOT / "data" / "export_dashboard_classification_v8.xlsx"
ORIGINAL_COLUMNS = ("id", "source", "title", "content", "date")

CHART6_NOTE = "— (Chart 6 Concerns/Needs/Paths: Keyword-Aggregat im Dashboard, nicht 1:1 pro Zeile)"
CHART7_NOTE = "— (Chart 7 Retinol: nur bei Retinol-Nennung; Fears/Hopes im Dashboard)"
CHART8_NOTE = "— (Chart 8 Appinio n=450, fest im Dashboard)"


def load_rows(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def chart4_cell(row: dict) -> tuple[str, str]:
    if row.get("segment") not in ("procedure-open", "procedure-curious"):
        return "", ""
    return row.get("procedure") or "", row.get("procedureTone") or ""


def chart5_cell(row: dict) -> tuple[str, str]:
    if row.get("segment") != "skincare-first":
        return "", ""
    return row.get("ingredient") or "", row.get("ingredientTone") or ""


def load_original_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def write_csv(original_rows: list[dict], out: Path) -> None:
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(ORIGINAL_COLUMNS), delimiter=";", extrasaction="ignore")
        w.writeheader()
        for r in original_rows:
            w.writerow({col: r.get(col, "") for col in ORIGINAL_COLUMNS})


def write_xlsx(rows: list[dict], out: Path) -> None:
    headers = [
        ("id", "ID"),
        ("source", "Quelle"),
        ("date", "Datum"),
        ("text", "Kommentar"),
        ("chart1", "Chart 1 · Mood"),
        ("chart2", "Chart 2 · Topics"),
        ("chart3", "Chart 3 · Segment"),
        ("chart3_pos", "Chart 3 · Positioniert"),
        ("chart4_proc", "Chart 4/5 WC · Verfahren (legacy)"),
        ("chart4_tone", "Chart 4/5 WC · Tone (legacy)"),
        ("chart5_ing", "Chart 4/5 WC · Wirkstoff (legacy)"),
        ("chart5_tone", "Chart 4/5 WC · Tone (legacy)"),
        ("chart6", "Chart 6 · Concerns/Needs"),
        ("chart7", "Chart 7 · Retinol"),
        ("chart8", "Chart 8 · Appinio"),
        ("confidence", "Confidence"),
    ]

    wb = Workbook()
    ws = wb.active
    ws.title = "Klassifikation"

    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(color="FFFFFF", bold=True)

    for col, (_, label) in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col, value=label)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(wrap_text=True, vertical="top")

    for row_idx, r in enumerate(rows, start=2):
        proc, proc_tone = chart4_cell(r)
        ing, ing_tone = chart5_cell(r)
        positioned = "ja" if r.get("segment_positioned") else "nein"
        values = [
            r.get("id", ""),
            r.get("source", ""),
            r.get("date", ""),
            r.get("text", ""),
            r.get("mood", ""),
            "|".join(r.get("topics") or []),
            r.get("segment") or "",
            positioned,
            proc,
            proc_tone,
            ing,
            ing_tone,
            CHART6_NOTE,
            CHART7_NOTE,
            CHART8_NOTE,
            r.get("confidence", ""),
        ]
        for col, val in enumerate(values, start=1):
            cell = ws.cell(row=row_idx, column=col, value=val)
            if col == 4:
                cell.alignment = Alignment(wrap_text=True, vertical="top")

    widths = [28, 16, 14, 70, 14, 28, 18, 12, 16, 16, 16, 16, 28, 28, 22, 10]
    for i, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = width

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{len(rows) + 1}"

    leg = wb.create_sheet("Legende")
    legend_rows = [
        ("Chart", "Spalte", "Bedeutung"),
        ("1", "Mood", "enthusiastic | satisfied | seeking | conflicted | disappointed | cautioning"),
        ("2", "Topics", "Topic-IDs pipe-getrennt (botox, retinol, aging-signs, …) · Block A/B"),
        ("3", "Segment", "procedure-open | procedure-curious | skincare-first | leer=unpositioniert"),
        ("4–5", "Wordclouds", "Segment-Sprache im Dashboard; legacy procedure/ingredient Spalten nur Hilfsfelder"),
        ("6", "Concerns/Needs/Paths", "Dashboard-Aggregat (Keywords), nicht fest pro Kommentar-Zeile"),
        ("7", "Retinol Fears/Hopes", "Dashboard-Aggregat für Retinol-Beiträge"),
        ("8", "Appinio", "Fixe Umfrage n=450, nicht aus PULSAR-Kommentaren"),
        ("Meta", "Corpus", "filter v7 · classified_v8 · LOP REV"),
    ]
    for r_i, row in enumerate(legend_rows, start=1):
        for c_i, val in enumerate(row, start=1):
            leg.cell(row=r_i, column=c_i, value=val)
            if r_i == 1:
                leg.cell(row=r_i, column=c_i).font = Font(bold=True)
    leg.column_dimensions["A"].width = 8
    leg.column_dimensions["B"].width = 28
    leg.column_dimensions["C"].width = 78

    wb.save(out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--jsonl", default=str(JSONL))
    parser.add_argument("--filtered-csv", default=str(FILTERED_CSV))
    parser.add_argument("--out-csv", default=str(OUT_CSV))
    parser.add_argument("--out-xlsx", default=str(OUT_XLSX))
    args = parser.parse_args()

    jsonl = Path(args.jsonl)
    filtered = Path(args.filtered_csv)
    out_csv = Path(args.out_csv)
    out_xlsx = Path(args.out_xlsx)

    if not jsonl.exists():
        raise SystemExit(f"Missing {jsonl}")
    if not filtered.exists():
        raise SystemExit(f"Missing {filtered}")

    original_rows = load_original_rows(filtered)
    classified_rows = load_rows(jsonl)
    write_csv(original_rows, out_csv)
    write_xlsx(classified_rows, out_xlsx)
    print(f"Wrote {out_csv} ({len(original_rows)} rows, original columns)")
    print(f"Wrote {out_xlsx} ({len(classified_rows)} rows)")


if __name__ == "__main__":
    main()
