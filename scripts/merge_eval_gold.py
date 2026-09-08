#!/usr/bin/env python3
"""Merge gold_XX.json batches + compute agreement vs pipeline."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH_DIR = ROOT / "data" / "eval_batches"
SAMPLE = ROOT / "data" / "eval_sample_1000.jsonl"
OUT = ROOT / "data" / "eval_gold_1000.jsonl"
SUMMARY = ROOT / "data" / "eval_gold_1000_summary.json"

MOODS = [
    "enthusiastic",
    "satisfied",
    "seeking",
    "conflicted",
    "disappointed",
    "cautioning",
]


def kappa(y_true, y_pred, labels):
    n = len(y_true)
    cm = {(a, b): 0 for a in labels for b in labels}
    for a, b in zip(y_true, y_pred):
        cm[(a, b)] += 1
    po = sum(cm[(l, l)] for l in labels) / n
    pe = 0.0
    for l in labels:
        pe += (sum(cm[(l, b)] for b in labels) / n) * (
            sum(cm[(a, l)] for a in labels) / n
        )
    return 1.0 if pe >= 1 else (po - pe) / (1 - pe)


def main():
    pipe = {}
    with SAMPLE.open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            pipe[r["id"]] = r

    gold_rows = []
    missing = []
    for i in range(10):
        p = BATCH_DIR / f"gold_{i:02d}.json"
        if not p.exists():
            missing.append(str(p))
            continue
        arr = json.loads(p.read_text(encoding="utf-8"))
        if len(arr) != 100:
            print(f"WARN {p.name} has {len(arr)} rows")
        gold_rows.extend(arr)

    if missing:
        print("MISSING:", missing)
        raise SystemExit(1)

    # dedupe by id
    by_id = {}
    for g in gold_rows:
        mood = str(g.get("gold_mood", "")).strip().lower()
        aliases = {
            "intrigued": "seeking",
            "warning": "cautioning",
            "advisory": "cautioning",
            "neutral": "seeking",
        }
        mood = aliases.get(mood, mood)
        if mood not in MOODS:
            mood = "seeking"
        conf_raw = g.get("conf", 0)
        if isinstance(conf_raw, (int, float)):
            conf_v = float(conf_raw)
        else:
            conf_map = {"high": 0.9, "medium": 0.6, "med": 0.6, "low": 0.3}
            conf_v = conf_map.get(str(conf_raw).lower().strip(), 0.5)
        by_id[g["id"]] = {
            "gold_mood": mood,
            "gold_conf": conf_v,
            "gold_why": str(g.get("why") or "")[:160],
        }

    ordered = []
    for pid, row in pipe.items():
        if pid not in by_id:
            continue
        g = by_id[pid]
        ordered.append(
            {
                **row,
                **g,
                "agree": g["gold_mood"] == row["mood"],
            }
        )

    with OUT.open("w", encoding="utf-8") as f:
        for r in ordered:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    gold = [r["gold_mood"] for r in ordered]
    pred = [r["mood"] for r in ordered]
    n = len(ordered)
    agree = sum(a == b for a, b in zip(gold, pred))
    conf = Counter((g, p) for g, p in zip(gold, pred))

    per = {}
    for m in MOODS:
        tp = conf[(m, m)]
        fp = sum(conf[(g, m)] for g in MOODS if g != m)
        fn = sum(conf[(m, p)] for p in MOODS if p != m)
        prec = tp / (tp + fp) if tp + fp else 0
        rec = tp / (tp + fn) if tp + fn else 0
        per[m] = {
            "n_gold": sum(1 for x in gold if x == m),
            "n_pipeline": sum(1 for x in pred if x == m),
            "precision": round(prec, 3),
            "recall": round(rec, 3),
            "f1": round(2 * prec * rec / (prec + rec), 3) if prec + rec else 0,
        }

    # adjacent errors (spectrum neighbors)
    order = MOODS
    idx = {m: i for i, m in enumerate(order)}
    adj = sum(
        1
        for g, p in zip(gold, pred)
        if g != p and abs(idx[g] - idx[p]) == 1
    )

    # top confusions
    top_wrong = [
        {"gold": g, "pipeline": p, "n": n_}
        for (g, p), n_ in conf.most_common()
        if g != p
    ][:15]

    summary = {
        "n": n,
        "accuracy": round(agree / n, 4),
        "error_rate": round(1 - agree / n, 4),
        "adjacent_error_share_of_errors": round(
            adj / max(1, n - agree), 3
        ),
        "cohens_kappa": round(kappa(gold, pred, MOODS), 4),
        "gold_dist_pct": {
            m: round(100 * sum(1 for x in gold if x == m) / n, 1) for m in MOODS
        },
        "pipeline_dist_pct": {
            m: round(100 * sum(1 for x in pred if x == m) / n, 1) for m in MOODS
        },
        "per_class": per,
        "top_confusions": top_wrong,
        "confusion_gold_rows_pipeline_cols": {
            g: {p: conf[(g, p)] for p in MOODS} for g in MOODS
        },
        "note": "Gold = parallel LLM annotators with LOP REV brief; independent of MiniLM pipeline.",
    }
    SUMMARY.write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
