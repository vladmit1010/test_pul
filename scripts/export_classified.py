#!/usr/bin/env python3
"""Export classified comments to CSV + XLSX with per-chart classification columns."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
JSONL = ROOT / "data" / "classified_v5.jsonl"
FILTERED_CSV = ROOT / "data" / "merged_filtered_v6.csv"
OUT_CSV = ROOT / "data" / "export_comments_v6.csv"
OUT_XLSX = ROOT / "data" / "export_dashboard_classification_v6.xlsx"
ORIGINAL_COLUMNS = ("id", "source", "title", "content", "date")

CHART6_NOTE = "— (Appinio n=450, fest im Dashboard, nicht pro Kommentar)"


def load_rows() -> list[dict]:
    rows = []
    with JSONL.open(encoding="utf-8") as f:
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


def load_original_rows() -> list[dict]:
    """Original filtered corpus columns for third-party agent comparison."""
    with FILTERED_CSV.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def write_csv(original_rows: list[dict]) -> None:
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(ORIGINAL_COLUMNS), delimiter=";", extrasaction="ignore")
        w.writeheader()
        for r in original_rows:
            w.writerow({col: r.get(col, "") for col in ORIGINAL_COLUMNS})


def write_xlsx(rows: list[dict]) -> None:
    headers = [
        ("id", "ID"),
        ("source", "Quelle"),
        ("date", "Datum"),
        ("text", "Kommentar"),
        ("chart1", "Chart 1 · Mood Map"),
        ("chart2", "Chart 2 · Topic Landscape"),
        ("chart3", "Chart 3 · Segmentierung"),
        ("chart4_proc", "Chart 4 · Verfahren"),
        ("chart4_tone", "Chart 4 · Wirkung/Angst"),
        ("chart5_ing", "Chart 5 · Wirkstoff"),
        ("chart5_tone", "Chart 5 · Concern/Result"),
        ("chart6", "Chart 6 · Decision Drivers"),
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
        values = [
            r.get("id", ""),
            r.get("source", ""),
            r.get("date", ""),
            r.get("text", ""),
            r.get("mood", ""),
            "|".join(r.get("topics") or []),
            r.get("segment", ""),
            proc,
            proc_tone,
            ing,
            ing_tone,
            CHART6_NOTE,
            r.get("confidence", ""),
        ]
        for col, val in enumerate(values, start=1):
            cell = ws.cell(row=row_idx, column=col, value=val)
            if col == 4:
                cell.alignment = Alignment(wrap_text=True, vertical="top")

    widths = [28, 16, 20, 80, 14, 28, 18, 18, 22, 18, 22, 36, 10]
    for i, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = width

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{len(rows) + 1}"

    # Legend sheet
    leg = wb.create_sheet("Legende")
    legend_rows = [
        ("Chart", "Spalte", "Bedeutung"),
        ("1", "Chart 1 · Mood Map", "enthusiastic | satisfied | neutral | disappointed | advisory"),
        ("2", "Chart 2 · Topic Landscape", "Topic-IDs, pipe-getrennt (botox, retinol, spf, …)"),
        ("3", "Chart 3 · Segmentierung", "procedure-open | procedure-curious | skincare-first"),
        ("4", "Chart 4 · Verfahren / Tone", "Nur bei procedure-* Segmenten; sonst leer"),
        ("5", "Chart 5 · Wirkstoff / Tone", "Nur bei skincare-first; sonst leer"),
        ("6", "Chart 6 · Decision Drivers", "Fixe Appinio-Umfrage (n=450), nicht aus Kommentaren"),
    ]
    for r_i, row in enumerate(legend_rows, start=1):
        for c_i, val in enumerate(row, start=1):
            leg.cell(row=r_i, column=c_i, value=val)
            if r_i == 1:
                leg.cell(row=r_i, column=c_i).font = Font(bold=True)
    leg.column_dimensions["A"].width = 8
    leg.column_dimensions["B"].width = 32
    leg.column_dimensions["C"].width = 70

    wb.save(OUT_XLSX)


def main() -> None:
    original_rows = load_original_rows()
    classified_rows = load_rows()
    write_csv(original_rows)
    write_xlsx(classified_rows)
    print(f"Wrote {OUT_CSV} ({len(original_rows)} rows, original columns)")
    print(f"Wrote {OUT_XLSX} ({len(classified_rows)} rows)")


if __name__ == "__main__":
    main()
