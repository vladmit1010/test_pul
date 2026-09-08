# Classification plan — embeddings + keywords (same stack as v8)

## Current run (v9)

| | |
|---|---|
| Input | `data/merged_filtered_v9.csv` (~375k) |
| Output | `data/classified_v9.jsonl`, `data/review_queue_v9.csv` |
| Command | `python3 scripts/classify_comments.py` |
| Pilot | `python3 scripts/classify_comments.py --limit 5000` |

## Approach

Multilingual MiniLM embeddings + keyword boost (no full LLM). Labels: mood (6), segment (3), topics, procedure/ingredient + tones.

## Model

`paraphrase-multilingual-MiniLM-L12-v2`

## After classify

```bash
python3 scripts/aggregate_dashboard.py
python3 scripts/aggregate_wordclouds.py
python3 scripts/aggregate_chart6.py
python3 scripts/aggregate_retinol.py
```

Update those scripts’ input paths to `classified_v9.jsonl` if needed.

## Mood names (client brief 2026-09)

Client rename: Seeking→Intrigued, Cautioning→Warning. Classifier still writes `seeking` / `cautioning` ids for pipeline compatibility; map in UI/taxonomy when rebuilding dashboard.
