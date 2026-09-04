#!/usr/bin/env python3
"""Fast polish on classified_v8: re-score mood + tighten aging-signs topics.

Does not re-run full classification (segments / procedures stay as-is).
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from classify_comments import (
    MODEL_NAME,
    MOOD_LABELS,
    apply_mood_rules,
    topic_keyword_hits,
)

ROOT = Path(__file__).resolve().parents[1]
IN_JSONL = ROOT / "data" / "classified_v8.jsonl"


def cosine_top(emb: np.ndarray, label_embs: np.ndarray, ids: list[str], k: int = 6):
    sims = label_embs @ emb
    order = np.argsort(-sims)[:k]
    return [(ids[i], float(sims[i])) for i in order]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(IN_JSONL))
    parser.add_argument("--output", default=str(IN_JSONL))
    parser.add_argument("--batch-size", type=int, default=128)
    args = parser.parse_args()

    in_path = Path(args.input)
    out_path = Path(args.output)

    rows = []
    with in_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    print(f"Polishing {len(rows)} rows…")

    model = SentenceTransformer(MODEL_NAME)
    mood_ids = list(MOOD_LABELS)
    mood_embs = model.encode(list(MOOD_LABELS.values()), normalize_embeddings=True, show_progress_bar=False)

    mood_before = Counter(r["mood"] for r in rows)
    aging_before = sum(1 for r in rows if "aging-signs" in (r.get("topics") or []))

    bs = args.batch_size
    for start in tqdm(range(0, len(rows), bs), desc="mood"):
        batch = rows[start : start + bs]
        texts = [(r.get("text") or "")[:1500] for r in batch]
        embs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        for r, emb, text in zip(batch, embs, texts):
            scores = cosine_top(np.asarray(emb), mood_embs, mood_ids, 6)
            top_mood = scores[0][0]
            r["mood"] = apply_mood_rules(text, top_mood, scores)
            r["mood_score"] = round(scores[0][1], 4)

            # Tighten aging-signs: keyword gate only
            topics = list(r.get("topics") or [])
            hits = topic_keyword_hits(text)
            has_aging = "aging-signs" in hits
            if has_aging and "aging-signs" not in topics:
                topics.append("aging-signs")
            if not has_aging and "aging-signs" in topics:
                topics = [t for t in topics if t != "aging-signs"]
            r["topics"] = topics
            scores_map = dict(r.get("topic_scores") or {})
            if has_aging:
                scores_map["aging-signs"] = max(float(scores_map.get("aging-signs") or 0), 0.9)
            else:
                scores_map.pop("aging-signs", None)
            r["topic_scores"] = scores_map

    mood_after = Counter(r["mood"] for r in rows)
    aging_after = sum(1 for r in rows if "aging-signs" in (r.get("topics") or []))

    with out_path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"Wrote {out_path}")
    print("Mood before:", dict(mood_before.most_common()))
    print("Mood after: ", dict(mood_after.most_common()))
    print(f"aging-signs: {aging_before} → {aging_after}")


if __name__ == "__main__":
    main()
