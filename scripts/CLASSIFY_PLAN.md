# Classification plan — fast medium quality (~2 days)

## Approach: Embeddings + keywords (no manual gold, no full LLM)

| Step | What | Time |
|------|------|------|
| 1 | `classify_comments.py` on `merged_filtered_v2.csv` | ~30–90 min (53k, CPU) |
| 2 | `aggregate_dashboard.py` → counts + sample quotes | ~5 min |
| 3 | Review `review_queue.csv` (low confidence) together | ~2–4 h |
| 4 | Tune thresholds in `classify_config.json`, re-run if needed | ~1 h |

## Model

`paraphrase-multilingual-MiniLM-L12-v2` — fast, good DE, runs locally.

## Output files

- `data/classified_v1.jsonl` — one JSON per comment + scores
- `data/review_queue.csv` — lowest-confidence rows for manual check
- `data/dashboard_generated.js` — counts for dashboard (chart 6 = Appinio unchanged)

## Quality expectation

~70–80% usable for dashboard aggregates; quotes filtered by confidence ≥ 0.5.
