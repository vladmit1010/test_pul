#!/usr/bin/env python3
"""
Independent gold mood labels via local Ollama (Mistral) vs pipeline classified_v9.
Uses LOP REV brief definitions. Output: data/eval_gold_1000.jsonl + summary JSON.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "data" / "eval_sample_1000.jsonl"
OUT = ROOT / "data" / "eval_gold_1000.jsonl"
SUMMARY = ROOT / "data" / "eval_gold_1000_summary.json"

MOODS = [
    "enthusiastic",
    "satisfied",
    "seeking",  # = Intrigued
    "conflicted",
    "disappointed",
    "cautioning",  # = Warning
]

SYSTEM = """Du bist ein strenger Annotator für deutsche Social-Media-Kommentare zu Anti-Aging (Pflege + Eingriffe).
Vergib GENAU eine Mood-Hauptkategorie nach diesen Definitionen:

- enthusiastic: Überschwang, starke Empfehlung, Stolz, „Game Changer", „liebe mein Ergebnis"
- satisfied: ruhige Zufriedenheit ohne Hype; „macht seinen Job", „würde wieder machen"
- seeking: neugierig/infosuchend/Fragen; noch ohne feste Ergebnisbewertung (= Intrigued)
- conflicted: echte Ambivalenz, Druck/Scham, hin-und-her; Wunsch + Widerwille
- disappointed: eigenes negatives Ergebnis/Erwartung enttäuscht; OHNE Warnung an Dritte
- cautioning: Warnung an ANDERE (Vorsicht, Klinik, Komplikation, Finger weg) (= Warning)

Regeln:
(a) eine Haupt-Tonalität für den ganzen Kommentar
(b) Warnung an Dritte → cautioning (auch wenn sonst positiv)
(c) Ambivalenz → conflicted, nicht cautioning
(d) reine Werbung/Klinik-Promo ohne echte Haltung → satisfied nur wenn klar positiv-sachlich, sonst seeking
(e) kurze Emojis/„schön"/Likes ohne Substanz → satisfied (nicht enthusiastic)
(f) Ironie/Sarkasmus beachten

Antworte NUR mit JSON-Array: [{"i":0,"mood":"...","conf":0.0-1.0,"why":"≤12 Wörter"}, ...]
Keine Markdown-Backticks."""


def call_ollama(model: str, prompt: str, timeout: int = 180) -> str:
    body = json.dumps(
        {
            "model": model,
            "prompt": prompt,
            "system": SYSTEM,
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 1200},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data.get("response") or ""


def parse_json_array(text: str) -> list:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # find first [ ... ]
    m = re.search(r"\[[\s\S]*\]", text)
    if not m:
        raise ValueError(f"no JSON array in: {text[:200]}")
    return json.loads(m.group(0))


def truncate(t: str, n: int = 700) -> str:
    t = re.sub(r"\s+", " ", t or "").strip()
    return t if len(t) <= n else t[: n - 1] + "…"


def build_batch_prompt(items: list[dict], start_i: int) -> str:
    lines = [
        f"Klassifiziere {len(items)} Kommentare. Index i startet bei {start_i}.",
        "Erlaubte mood-Werte exakt: " + ", ".join(MOODS),
        "",
    ]
    for j, row in enumerate(items):
        lines.append(f"[{start_i + j}] {truncate(row['text'])}")
    return "\n".join(lines)


def kappa(y_true, y_pred, labels):
    n = len(y_true)
    if n == 0:
        return 0.0
    cm = {(a, b): 0 for a in labels for b in labels}
    for a, b in zip(y_true, y_pred):
        if a in labels and b in labels:
            cm[(a, b)] += 1
    po = sum(cm[(l, l)] for l in labels) / n
    pe = 0.0
    for l in labels:
        row = sum(cm[(l, b)] for b in labels) / n
        col = sum(cm[(a, l)] for a in labels) / n
        pe += row * col
    if pe >= 1:
        return 1.0
    return (po - pe) / (1 - pe)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="mistral:latest")
    ap.add_argument("--batch", type=int, default=8)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--resume", action="store_true")
    args = ap.parse_args()

    # Do not use str.splitlines() — U+2028 inside comments would break JSONL rows.
    rows = []
    with SAMPLE.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    if args.limit:
        rows = rows[: args.limit]

    done = {}
    if args.resume and OUT.exists():
        for line in OUT.read_text().splitlines():
            if not line.strip():
                continue
            r = json.loads(line)
            done[r["id"]] = r
        print(f"resume: {len(done)} already labeled")

    results = []
    # keep prior order for resume rewrite
    for i in range(0, len(rows), args.batch):
        batch = rows[i : i + args.batch]
        if all(r["id"] in done for r in batch):
            results.extend(done[r["id"]] for r in batch)
            continue

        prompt = build_batch_prompt(batch, 0)
        last_err = None
        parsed = None
        for attempt in range(3):
            try:
                raw = call_ollama(args.model, prompt)
                arr = parse_json_array(raw)
                by_i = {int(x["i"]): x for x in arr if "i" in x and "mood" in x}
                if len(by_i) < len(batch):
                    # fallback: single-item
                    raise ValueError(f"got {len(by_i)}/{len(batch)} labels")
                parsed = by_i
                break
            except Exception as e:
                last_err = e
                time.sleep(1 + attempt)
        if parsed is None:
            # per-item fallback
            parsed = {}
            for j, row in enumerate(batch):
                try:
                    raw = call_ollama(
                        args.model,
                        build_batch_prompt([row], 0),
                    )
                    arr = parse_json_array(raw)
                    parsed[j] = arr[0]
                except Exception as e:
                    parsed[j] = {
                        "i": j,
                        "mood": "seeking",
                        "conf": 0.0,
                        "why": f"parse_fail:{e}",
                    }
                    last_err = e

        for j, row in enumerate(batch):
            g = parsed.get(j) or parsed.get(str(j)) or {}
            mood = str(g.get("mood", "seeking")).strip().lower()
            # normalize aliases
            aliases = {
                "intrigued": "seeking",
                "warning": "cautioning",
                "advisory": "cautioning",
                "neutral": "seeking",
                "positive": "satisfied",
                "negative": "disappointed",
            }
            mood = aliases.get(mood, mood)
            if mood not in MOODS:
                mood = "seeking"
            out_row = {
                **row,
                "gold_mood": mood,
                "gold_conf": float(g.get("conf") or 0),
                "gold_why": str(g.get("why") or "")[:120],
                "agree": mood == row["mood"],
            }
            results.append(out_row)
            done[row["id"]] = out_row

        # checkpoint
        with OUT.open("w") as f:
            for r in results:
                # on partial resume mid-run, results may be incomplete — rewrite from done in sample order later
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(
            f"[{min(i + args.batch, len(rows))}/{len(rows)}] "
            f"batch agree={sum(1 for r in results[-len(batch):] if r['agree'])}/{len(batch)}"
            + (f" last_err={last_err}" if last_err else "")
        )

    # rewrite in sample order
    ordered = [done[r["id"]] for r in rows if r["id"] in done]
    with OUT.open("w") as f:
        for r in ordered:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    gold = [r["gold_mood"] for r in ordered]
    pred = [r["mood"] for r in ordered]
    agree = sum(a == b for a, b in zip(gold, pred))
    n = len(ordered)
    conf = Counter()
    for g, p in zip(gold, pred):
        conf[(g, p)] += 1

    # per-class recall/precision vs gold
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

    summary = {
        "n": n,
        "accuracy": round(agree / n, 4) if n else 0,
        "error_rate": round(1 - agree / n, 4) if n else 0,
        "cohens_kappa": round(kappa(gold, pred, MOODS), 4),
        "gold_dist_pct": {
            m: round(100 * sum(1 for x in gold if x == m) / n, 1) for m in MOODS
        },
        "pipeline_dist_pct": {
            m: round(100 * sum(1 for x in pred if x == m) / n, 1) for m in MOODS
        },
        "per_class": per,
        "confusion_gold_rows_pipeline_cols": {
            g: {p: conf[(g, p)] for p in MOODS} for g in MOODS
        },
        "model": args.model,
        "note": "Gold = local Mistral with LOP REV mood brief; not human expert.",
    }
    SUMMARY.write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
