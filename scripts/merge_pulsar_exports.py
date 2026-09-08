#!/usr/bin/env python3
"""
Merge Pulsar Q1–Q7 exports → slim deduped master CSV.

Input:  pulsar/q1.xlsx … q7_2.xlsx
Output: merged_all_deduped.csv (+ pulsar/merged_master.csv copy)
        pulsar/merge_report.json

Usage:
  python3 scripts/merge_pulsar_exports.py
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
PULSAR = ROOT / "pulsar"
OUT_ROOT = ROOT / "merged_all_deduped.csv"
OUT_PULSAR = PULSAR / "merged_master.csv"
OUT_REPORT = PULSAR / "merge_report.json"

# Source Pulsar headers → output field (filter_comments expects date, not date (UTC))
COL_MAP = [
    ("id", "id"),
    ("content id", "content_id"),
    ("search", "search"),
    ("source", "source"),
    ("title", "title"),
    ("content", "content"),
    ("date (UTC)", "date"),
    ("language", "language"),
    ("url", "url"),
    ("domain", "domain"),
    ("topics", "topics"),
    ("sentiment class", "sentiment_class"),
    ("country", "country"),
    ("user country", "user_country"),
    ("media type", "media_type"),
    ("post type", "post_type"),
    ("no. of likes", "likes"),
    ("no. of comments", "comments"),
    ("no. of shares", "shares"),
]
SRC_COLS = [s for s, _ in COL_MAP]
OUT_BASE = [d for _, d in COL_MAP]

# filename stem → query family (q1…q7)
FILE_MAP = [
    ("q1.xlsx", "q1"),
    ("q2.xlsx", "q2"),
    ("q3_1.xlsx", "q3"),
    ("q3_2.xlsx", "q3"),
    ("q4_1.xlsx", "q4"),
    ("q4_2.xlsx", "q4"),
    ("q5_1.xlsx", "q5"),
    ("q5_2.xlsx", "q5"),
    ("q6.xlsx", "q6"),
    ("q7_1.xlsx", "q7"),
    ("q7_2.xlsx", "q7"),
]

OUT_FIELDS = OUT_BASE + ["query", "queries"]


def load_sheet_rows(path: Path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Contents"]
    it = ws.iter_rows(values_only=True)
    header = [str(h).strip() if h is not None else "" for h in next(it)]
    idx = {h: i for i, h in enumerate(header)}
    missing = [c for c in SRC_COLS if c not in idx]
    if missing:
        print(f"  WARN {path.name}: missing cols {missing}")
    for row in it:
        yield {dst: (row[idx[src]] if src in idx else None) for src, dst in COL_MAP}
    wb.close()


def cell_str(v) -> str:
    if v is None:
        return ""
    return str(v).replace("\r\n", "\n").replace("\r", "\n")


def canonical_id(rid: str) -> str:
    """Pulsar embeds search id in row id: 0_{search}_{rest} → 0_{rest}."""
    parts = rid.split("_")
    if len(parts) >= 3 and parts[1].isdigit() and len(parts[1]) >= 5:
        return parts[0] + "_" + "_".join(parts[2:])
    return rid


def text_key(title: str, content: str) -> str:
    t = f"{title}\n{content}".strip().lower()
    t = re.sub(r"\s+", " ", t)
    return t


def main() -> None:
    # key → row; also map canon_id / text → key for secondary dedup accounting
    seen: dict[str, dict] = {}  # primary storage key = first raw id kept
    by_canon: dict[str, str] = {}  # canon_id → storage key
    by_text: dict[str, str] = {}  # exact text → storage key
    id_queries: dict[str, set[str]] = defaultdict(set)  # storage key → queries

    per_file = []
    per_query_raw = Counter()
    sources_raw = Counter()
    months_raw = Counter()
    total_raw = 0
    empty_id = 0
    dups_by_canon = 0
    dups_by_text = 0

    for fname, qlabel in FILE_MAP:
        path = PULSAR / fname
        if not path.exists():
            print(f"SKIP missing {fname}")
            continue
        print(f"Reading {fname} ({path.stat().st_size / 1e6:.0f} MB)…", flush=True)
        n = 0
        new = 0
        for row in load_sheet_rows(path):
            n += 1
            total_raw += 1
            rid = cell_str(row.get("id")).strip()
            if not rid:
                empty_id += 1
                continue
            per_query_raw[qlabel] += 1
            src = cell_str(row.get("source")) or "∅"
            sources_raw[src] += 1
            d = cell_str(row.get("date"))
            if len(d) >= 7:
                months_raw[d[:7]] += 1

            canon = canonical_id(rid)
            title = cell_str(row.get("title"))
            content = cell_str(row.get("content"))
            tkey = text_key(title, content)

            # already have this post via canon id?
            if canon in by_canon:
                sk = by_canon[canon]
                id_queries[sk].add(qlabel)
                dups_by_canon += 1
                continue

            # exact same text already kept (cross-channel / cross-search copies)
            if tkey and len(tkey) >= 40 and tkey in by_text:
                sk = by_text[tkey]
                id_queries[sk].add(qlabel)
                by_canon[canon] = sk  # link this canon too
                dups_by_text += 1
                continue

            out = {c: cell_str(row.get(c)) for c in OUT_BASE}
            out["id"] = rid  # keep original first-seen id
            out["query"] = qlabel
            seen[rid] = out
            by_canon[canon] = rid
            if tkey and len(tkey) >= 40:
                by_text[tkey] = rid
            id_queries[rid].add(qlabel)
            new += 1
            if n % 50000 == 0:
                print(f"  … {n:,} rows  master={len(seen):,}", flush=True)
        per_file.append(
            {
                "file": fname,
                "query": qlabel,
                "rows": n,
                "new_unique": new,
            }
        )
        print(
            f"  rows={n:,}  new_unique={new:,}  master_so_far={len(seen):,}",
            flush=True,
        )

    for sk, row in seen.items():
        qs = sorted(id_queries[sk])
        row["queries"] = "|".join(qs)

    OUT_ROOT.parent.mkdir(parents=True, exist_ok=True)
    print(f"Writing {OUT_ROOT}…", flush=True)
    with OUT_ROOT.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=OUT_FIELDS, delimiter=";", quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        for row in seen.values():
            w.writerow(row)

    print(f"Copy → {OUT_PULSAR}", flush=True)
    OUT_PULSAR.write_bytes(OUT_ROOT.read_bytes())

    sources_u = Counter()
    months_u = Counter()
    queries_u = Counter()
    multi = 0
    for row in seen.values():
        sources_u[row.get("source") or "∅"] += 1
        d = row.get("date") or ""
        if len(d) >= 7:
            months_u[d[:7]] += 1
        qs = [x for x in (row.get("queries") or "").split("|") if x]
        for q in qs:
            queries_u[q] += 1
        if len(qs) > 1:
            multi += 1

    report = {
        "total_raw_rows": total_raw,
        "empty_id_skipped": empty_id,
        "unique_ids": len(seen),
        "duplicates_removed": total_raw - empty_id - len(seen),
        "duplicates_by_canonical_id": dups_by_canon,
        "duplicates_by_exact_text": dups_by_text,
        "multi_query_posts": multi,
        "per_file": per_file,
        "per_query_raw": dict(per_query_raw),
        "per_query_unique_membership": dict(queries_u),
        "sources_raw": dict(sources_raw.most_common()),
        "sources_unique": dict(sources_u.most_common()),
        "months_raw": dict(sorted(months_raw.items())),
        "months_unique": dict(sorted(months_u.items())),
        "output_csv": str(OUT_ROOT.relative_to(ROOT)),
        "output_copy": str(OUT_PULSAR.relative_to(ROOT)),
        "kept_columns": OUT_FIELDS,
        "dedup_keys": ["canonical_id (strip search)", "exact normalized title+content (≥40 chars)"],
    }
    OUT_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== MERGE DONE ===", flush=True)
    print(f"raw={total_raw:,}  unique={len(seen):,}  dups_removed={report['duplicates_removed']:,}")
    print(f"  via canon_id={dups_by_canon:,}  via text={dups_by_text:,}")
    print(f"multi-query posts={multi:,}")
    print(f"report → {OUT_REPORT}")


if __name__ == "__main__":
    main()
