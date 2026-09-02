#!/usr/bin/env python3
"""Aggregate classified jsonl → dashboard counts + sample comments."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "data" / "dashboard-reference.json"
OUT_JS = ROOT / "data" / "dashboard_generated.js"
OUT_COMMENTS_JS = ROOT / "data" / "dashboard_comments.js"
QUOTE_LIMIT = 8
QUOTES_PER_BUCKET = 150
MIN_CONF = 0.0  # use all classified rows for chart counts
QUOTE_MIN_CONF = 0.35

# Chart 6 — fixed Appinio survey (not derived from comments)
DECISION_DRIVERS = {
    "eyebrow": "6. Category-Wide Decision Drivers",
    "title": "Whom do German consumers trust when it comes to anti-aging?",
    "source": "Appinio · Emotional Trust Builders · n=450",
    "drivers": [
        {"id": "clinical", "label": "Clinically tested efficacy", "percent": 86.4},
        {"id": "innovation", "label": "Innovative ingredients", "percent": 73.9},
        {"id": "experts", "label": "Recommendations by experts", "percent": 72.0},
        {"id": "price", "label": "Price-performance ratio", "percent": 54.9},
        {"id": "friends", "label": "Recommendations by friends", "percent": 51.1},
        {"id": "brand", "label": "Popularity of the brand", "percent": 26.2},
        {"id": "tradition", "label": "Market leader / tradition", "percent": 25.8},
    ],
}


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def row_to_quote(r: dict) -> dict:
    q = {
        "id": r["id"],
        "text": r["text"][:500],
        "mood": r["mood"],
        "segment": r["segment"],
        "topics": r.get("topics") or [],
        "tags": [r["mood"], r["segment"]],
    }
    if r.get("procedure"):
        q["procedure"] = r["procedure"]
    if r.get("procedureTone"):
        q["procedureTone"] = r["procedureTone"]
    if r.get("ingredient"):
        q["ingredient"] = r["ingredient"]
    if r.get("ingredientTone"):
        q["ingredientTone"] = r["ingredientTone"]
    return q


def build_comment_index(rows: list[dict]) -> dict:
    """Pool of quotes + per-filter id lists (for sidebar browsing)."""
    pool: dict[str, dict] = {}
    buckets: dict[str, dict[str, list[str]]] = {
        "mood": defaultdict(list),
        "topic": defaultdict(list),
        "segment": defaultdict(list),
        "procedure": defaultdict(list),
        "procedure-tone": defaultdict(list),
        "ingredient": defaultdict(list),
        "ingredient-tone": defaultdict(list),
    }

    def add(bucket: str, key: str, row: dict) -> None:
        if len(buckets[bucket][key]) >= QUOTES_PER_BUCKET:
            return
        rid = row["id"]
        if rid not in pool:
            pool[rid] = row_to_quote(row)
        if rid not in buckets[bucket][key]:
            buckets[bucket][key].append(rid)

    sorted_rows = sorted(rows, key=lambda x: -x.get("confidence", 0))
    for r in sorted_rows:
        add("mood", r["mood"], r)
        add("segment", r["segment"], r)
        for t in r.get("topics") or []:
            add("topic", t, r)

        if r.get("procedure") and r["segment"] in ("procedure-open", "procedure-curious"):
            add("procedure", r["procedure"], r)
            if r.get("procedureTone"):
                add("procedure-tone", f"{r['procedure']}|{r['procedureTone']}", r)

        if r.get("ingredient") and r["segment"] == "skincare-first":
            add("ingredient", r["ingredient"], r)
            if r.get("ingredientTone"):
                add("ingredient-tone", f"{r['ingredient']}|{r['ingredientTone']}", r)

    pool_list = list(pool.values())
    id_to_idx = {q["id"]: i for i, q in enumerate(pool_list)}

    def remap(bucket_map: dict[str, list[str]]) -> dict[str, list[int]]:
        return {k: [id_to_idx[i] for i in ids if i in id_to_idx] for k, ids in bucket_map.items()}

    return {
        "meta": {
            "per_bucket_limit": QUOTES_PER_BUCKET,
            "min_confidence": QUOTE_MIN_CONF,
            "pool_size": len(pool_list),
        },
        "pool": pool_list,
        "mood": remap(buckets["mood"]),
        "topic": remap(buckets["topic"]),
        "segment": remap(buckets["segment"]),
        "procedure": remap(buckets["procedure"]),
        "procedure-tone": remap(buckets["procedure-tone"]),
        "ingredient": remap(buckets["ingredient"]),
        "ingredient-tone": remap(buckets["ingredient-tone"]),
    }


def write_comments_js(index: dict, source_name: str) -> None:
    js = (
        f"/** AUTO-GENERATED comment index from {source_name} — do not edit by hand */\n"
        f"window.DashboardCommentIndex = {json.dumps(index, ensure_ascii=False, indent=2)};\n"
    )
    OUT_COMMENTS_JS.write_text(js, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(ROOT / "data" / "classified_v5.jsonl"))
    parser.add_argument("--source-label", default="PULSAR classified_v5 (filter v6)")
    args = parser.parse_args()

    classified_path = Path(args.input)
    ref = json.loads(REF.read_text(encoding="utf-8"))
    rows = [r for r in load_jsonl(classified_path) if r.get("confidence", 0) >= MIN_CONF]
    print(f"Aggregating {len(rows)} rows (confidence >= {MIN_CONF})")

    mood_c = Counter(r["mood"] for r in rows)
    seg_c = Counter(r["segment"] for r in rows)

    topic_c: Counter = Counter()
    topic_pos: Counter = Counter()
    topic_neg: Counter = Counter()
    for r in rows:
        for t in r.get("topics") or []:
            topic_c[t] += 1
            if r.get("sentiment_positive"):
                topic_pos[t] += 1
            if r.get("sentiment_negative"):
                topic_neg[t] += 1

    proc_nested: dict[str, Counter] = defaultdict(Counter)
    ing_nested: dict[str, Counter] = defaultdict(Counter)
    for r in rows:
        if r.get("procedure") and r.get("procedureTone"):
            if r["segment"] in ("procedure-open", "procedure-curious"):
                proc_nested[r["procedure"]][r["procedureTone"]] += 1
        if r.get("ingredient") and r.get("ingredientTone"):
            if r["segment"] == "skincare-first":
                ing_nested[r["ingredient"]][r["ingredientTone"]] += 1

    # Sample quotes for legacy embed (hero / fallback)
    quotes = []
    seen = set()
    for mood in ["enthusiastic", "satisfied", "neutral", "disappointed", "advisory"]:
        pool = sorted(
            [r for r in rows if r["mood"] == mood and r.get("confidence", 0) >= QUOTE_MIN_CONF],
            key=lambda x: -x.get("confidence", 0),
        )
        for r in pool[:3]:
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            quotes.append(row_to_quote(r))
            if len(quotes) >= QUOTE_LIMIT:
                break

    comment_index = build_comment_index(rows)

    mood_map = ref["chart1_moodMap"]["moods"]
    for m in mood_map:
        m["count"] = mood_c.get(m["id"], 0)

    candidates = []
    for c in ref["chart2_topicLandscape"]["candidates"]:
        tid = c["id"]
        candidates.append(
            {
                **c,
                "count": topic_c.get(tid, 0),
                "positive": topic_pos.get(tid, 0),
                "negative": topic_neg.get(tid, 0),
            }
        )

    segments = ref["chart3_segmentation"]["segments"]
    for s in segments:
        s["count"] = seg_c.get(s["id"], 0)

    proc_aggs = []
    proc_totals = Counter({k: sum(v.values()) for k, v in proc_nested.items()})
    for pid, _ in proc_totals.most_common(12):
        tones = proc_nested[pid]
        proc_aggs.append(
            {
                "id": pid,
                "tones": [{"tone": t, "count": c} for t, c in tones.most_common(8)],
            }
        )

    ing_aggs = []
    ing_totals = Counter({k: sum(v.values()) for k, v in ing_nested.items()})
    for iid, _ in ing_totals.most_common(12):
        tones = ing_nested[iid]
        ing_aggs.append(
            {
                "id": iid,
                "tones": [{"tone": t, "count": c} for t, c in tones.most_common(8)],
            }
        )

    out = {
        "meta": {
            "schema_version": 1,
            "source": args.source_label,
            "total_comments": len(rows),
            "classifier": "paraphrase-multilingual-MiniLM-L12-v2 + keyword rules v4",
        },
        "moodMap": {
            "eyebrow": "1. Mood Map",
            "title": "The emotional spectrum of anti-aging",
            "moods": mood_map,
        },
        "topicLandscape": {
            "eyebrow": "2. Topic Landscape",
            "title": "The top conversations driving the category",
            "topN": 10,
            "candidates": candidates,
        },
        "segmentation": {
            "eyebrow": "3. Consumer Segmentation",
            "title": "One category, three anti-aging mindsets",
            "segments": segments,
        },
        "procedureEffects": {
            "eyebrow": "4. Procedure-Open & Procedure-Curious",
            "title": "Verfahren, Wirkungen und Ängste",
            "aggregates": {"procedures": proc_aggs},
        },
        "skincareIngredients": {
            "eyebrow": "5. Skincare-First",
            "title": "Wirkstoffe, Hautprobleme und Pflegeziele",
            "aggregates": {"procedures": ing_aggs},
        },
        "decisionDrivers": DECISION_DRIVERS,
        "comments": quotes,
    }

    js = (
        f"/** AUTO-GENERATED from {classified_path.name} — do not edit by hand */\n"
        f"window.DashboardData = {json.dumps(out, ensure_ascii=False, indent=2)};\n"
    )
    OUT_JS.write_text(js, encoding="utf-8")
    write_comments_js(comment_index, classified_path.name)
    print(f"Wrote {OUT_JS}")
    print(f"Wrote {OUT_COMMENTS_JS} (pool={comment_index['meta']['pool_size']})")
    print("Mood:", dict(mood_c))
    print("Segment:", dict(seg_c))
    print("Top topics:", topic_c.most_common(10))


if __name__ == "__main__":
    main()
