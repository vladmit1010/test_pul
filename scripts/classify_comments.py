#!/usr/bin/env python3
"""
Fast medium-quality classifier: multilingual embeddings + keyword boost.
Input:  data/merged_filtered_v2.csv
Output: data/classified_v1.jsonl, data/review_queue.csv

  pip install -r requirements-classify.txt
  python3 scripts/classify_comments.py
  python3 scripts/classify_comments.py --limit 5000   # pilot
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "data" / "dashboard-reference.json"
DEFAULT_INPUT = ROOT / "data" / "merged_filtered_v6.csv"
OUT_JSONL = ROOT / "data" / "classified_v5.jsonl"
OUT_REVIEW = ROOT / "data" / "review_queue_v5.csv"
CONFIG = ROOT / "scripts" / "classify_config.json"

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

# German-rich label text for better embedding match
MOOD_LABELS = {
    "enthusiastic": "begeistert ich liebe mein ergebnis bester entschluss empfehle es weiter endlich für mich",
    "satisfied": "zufrieden gutes ergebnis würde es wieder machen hat funktioniert zufriedenstellend",
    "neutral": "was kostet wie lange hält es erfahrung frage vergleiche noch unsicher information",
    "disappointed": "enttäuscht hat nichts gebracht geld verschwendet enttäuschend schlecht bereue",
    "advisory": "vorsicht informieren komplikationen warnung bitte beachten risiko ärztin arzt erfahrung warnen",
}

SEGMENT_LABELS = {
    "procedure-open": "hatte schon botox filler behandlung termin auffrischung wartung nächster termin maintenance",
    "procedure-curious": "überlege es mir angst traue mich nicht erste beratung vorsichtig interessiert aber unsicher",
    "skincare-first": "kein botox keine nadeln nur skincare hautpflege retinol serum creme ohne eingriff",
}

TOPIC_KEYWORDS = {
    "botox": ["botox", "botulinum", "botulinotoxin", "baby botox", "masseter"],
    "fillers": [
        "lippenfiller",
        "dermal filler",
        "hyaluron unterspritz",
        "unterspritz",
        "juvederm",
        "restylane",
    ],
    "laser": ["laserbehandlung", "laser", "ipl", "fotona"],
    "retinol": ["retinol", "retinal", "retinoid", "tretinoin", "vitamin a"],
    "price": [],
    "facelift": ["facelift", "facelifting", "gesichtsstraffung", "lidstraffung", "blepharoplastik"],
    "celebrity": ["promi", "celebrity", "influencer", "kim kardashian", "kanye west"],
    "peel": ["peeling", "microneedling", "fruchtsäure", "chemisches peeling"],
    "pressure": ["schönheitswahn", "jugendkult", "gesellschaftsdruck", "soll man"],
    "spf": ["spf", "sonnenschutz", "uv-schutz", "sonnencreme", "lichtschutzfaktor", "lsf"],
    "threads": ["fadenlifting", "pdo faden", "pdo-faden"],
    "natural": ["natürlich altern", "ohne eingriff", "aging gracefully", "no intervention"],
}

PRICE_PATTERNS = [
    re.compile(r"\bpreis", re.I),
    re.compile(r"\bteuer", re.I),
    re.compile(r"preis-leistung", re.I),
    re.compile(r"\beuro\b", re.I),
    re.compile(r"€"),
    re.compile(r"\bkosten\b(?!los)", re.I),
    re.compile(r"\bkostet\b", re.I),
]
SPF_PATTERNS = [re.compile(p, re.I) for p in [r"\bspf\b", r"sonnenschutz", r"uv-schutz", r"sonnencreme", r"lichtschutzfaktor", r"\blsf\b"]]
BOTOX_SHORT = re.compile(
    r"\b(was haltet ihr|erfahrung mit|botox und filler|wer botoxt|botox spritzen)\b",
    re.I,
)
POLITICS_BOTOX = re.compile(r"\b(botox opa|botox.?vladi|klopp)\b", re.I)
CLINIC_PROMO = re.compile(
    r"\b(willkommen bei|plätze frei|brandneue produkte|jetzt erhältlich bei|"
    r"erstbehandlung bei|termin per dm|#kosmetikstudio)\b",
    re.I,
)

COSMETIC_FILLER_TOPIC = re.compile(
    r"\b(lippenfiller|dermal filler|hyaluron unterspritz|unterspritz|juvederm|restylane|"
    r"skinbooster|profhilo)\b",
    re.I,
)
PRICE_BLOCK = re.compile(
    r"\b(industriestrom|diesel|schilling|tattoo|füllstoffe?\b|atomkraft|strompreis|"
    r"batterie|gewichtsabnahme|chinesin nach|immigration|megathread|"
    r"gelenk|arthrose|gelenknahrung|knorpel|finanzierung|paypal|sofa|teppich|"
    r"ecksofa|superfood|sea moss|nappaleder)\b",
    re.I,
)
COSMETIC_LASER_TOPIC = re.compile(
    r"\b(laserbehandlung|laser.*haut|pigmentfleck|haarentfernung|ipl|fotona|"
    r"laser.*gesicht|laser.*verbrannt|laser von)\b",
    re.I,
)
NON_COSMETIC_LASER_TOPIC = re.compile(
    r"\b(laserstrahl|hologramm|neon.?light|neonlichter|official lyrics|"
    r"lichtgeschwindigkeit|python//)\b",
    re.I,
)
CELEBRITY_TOPIC = re.compile(
    r"\b(promi|celebrity|influencer|stars? like|kim k|kanye|prominente)\b",
    re.I,
)
CLINIC_EDU = re.compile(
    r"\b(vereinbare.*termin|doctolib|hautberatung|gesichtschirurgie|"
    r"plastische.{0,20}chirurg|dr\. [a-zäöü]|behandlungsplan|klinik)\b",
    re.I,
)
RAGEBAIT = re.compile(
    r"\b(ragebait|eklig findet|unfehlbar gut und gehören moralisiert|"
    r"schadenfreude|high-maintenance bitch)\b",
    re.I,
)
NEGATIVE_EXPERIENCE = re.compile(
    r"\b(verbrannt|schmerzhaft|komplikation|bereu|enttäuscht|hat nichts gebracht|"
    r"geld verschwendet|schlimm|pfusch)\b",
    re.I,
)
BRAND_PROMO = re.compile(
    r"\b(entdecke jetzt|neue .{0,40} von |#parfuemerie|we love|jetzt erhältlich|"
    r"highlight|revolutionär|🚨|mega toll|glow, aber wissenschaftlich)\b",
    re.I,
)
BOTOX_GOSSIP = re.compile(
    r"\b(sklave|schizophren|bratze|niggas|chuturu|misogynist|sex.?appeal)\b",
    re.I,
)
COSMETIC_BOTOX = re.compile(
    r"\b(botox|botulinum).{0,40}(gesicht|falten|mimik|behandlung|spritz|auffrisch|arzt|praxis)|"
    r"(behandlung|spritz|auffrisch|praxis|arzt).{0,40}(botox|botulinum)|"
    r"\bohne botox\b|\bkein botox\b",
    re.I,
)
EDUCATIONAL = re.compile(
    r"\b(was ist .{0,40}(und woher|glykosaminoglykan)|wirkstoffwissen|superfood|"
    r"gehört zu den .{0,30}arten)\b",
    re.I,
)
BEAUTY_QUESTION = re.compile(
    r"\b(nehmen wir an.*schönheitsop|würdet ihr.*verändern|was haltet ihr von|"
    r"erfahrung mit .{0,30}filler)\b",
    re.I,
)
PROMO_MOOD = re.compile(
    r"\b(neu bei|ausverkauft|jetzt erhältlich|bist du bereit|highlight|revolutionär|"
    r"🚨|mega toll|begeistert von|entdecke jetzt|we love|glow, aber wissenschaftlich)\b",
    re.I,
)
PROCEDURE_CONTEXT = re.compile(
    r"\b(behandlung|praxis|termin|injektion|unterspritz|ästhetik|skinbooster|jalupro)\b",
    re.I,
)

POS_WORDS = re.compile(
    r"\b(empfehl|zufrieden|liebe|toll|super|gut|geklappt|begeistert|perfekt|"
    r"happy|amazing|besser|schön|top|klare kaufempfehlung)\w*\b",
    re.I,
)
NEG_WORDS = re.compile(
    r"\b(enttäuscht|angst|schreck|fehl|komplikation|bereu|nicht empfehl|"
    r"hass|schlimm|pfusch|rip.?off|warnung|vorsicht|nebeneffekt|schmerz|"
    r"allerg|vertrage nicht|jucken|null wirkung|hat nichts gebracht|"
    r"nicht vertragen|rote pickel)\w*\b",
    re.I,
)

DISAPPOINTED_OVERRIDE = re.compile(
    r"\b(allerg|vertrage nicht|nicht vertragen|jucken|rote pickel|"
    r"null wirkung|hat nichts gebracht|geld verschwendet|bereu|enttäuscht)\b",
    re.I,
)
ADVISORY_OVERRIDE = re.compile(
    r"\b(vorsicht|warnung|risiko|abraten|komplikation|ärztin|arzt|"
    r"anatomie|nebeneffekt|sicherheit)\b",
    re.I,
)
ENTHUSIASTIC_OVERRIDE = re.compile(
    r"\b(begeistert|liebe es|beste entscheidung|empfehle|ausverkauft|wunderschön|"
    r"definitiv nachkaufen|mega gut|highlight)\b",
    re.I,
)


@dataclass
class LabelSet:
    ids: list[str]
    texts: list[str]
    keywords: dict[str, list[str]] = field(default_factory=dict)


def load_reference() -> dict:
    return json.loads(REF.read_text(encoding="utf-8"))


def flatten_chart4_level1(ref: dict) -> LabelSet:
    ids, texts, kw = [], [], {}
    for cat in ref["chart4_procedureEffects"]["level1"]["categories"]:
        for item in cat["items"]:
            ids.append(item["id"])
            syns = item.get("synonyms") or []
            texts.append(f"{item['label']} {' '.join(syns)}")
            kw[item["id"]] = [item["label"].lower()] + [s.lower() for s in syns]
    return LabelSet(ids, texts, kw)


def flatten_chart4_level2(ref: dict) -> LabelSet:
    ids, texts, kw = [], [], {}
    for item in ref["chart4_procedureEffects"]["level2a"]["items"]:
        ids.append(item["id"])
        syns = item.get("synonyms") or []
        texts.append(f"{item['label']} {' '.join(syns)}")
        kw[item["id"]] = [item["label"].lower()] + [s.lower() for s in syns]
    for cat in ref["chart4_procedureEffects"]["level2b"]["categories"]:
        for item in cat["items"]:
            ids.append(item["id"])
            syns = item.get("synonyms") or []
            texts.append(f"{item['label']} {' '.join(syns)}")
            kw[item["id"]] = [item["label"].lower()] + [s.lower() for s in syns]
    return LabelSet(ids, texts, kw)


def flatten_chart5_level1(ref: dict) -> LabelSet:
    ids, texts, kw = [], [], {}
    for cat in ref["chart5_skincareIngredients"]["level1"]["categories"]:
        for item in cat["items"]:
            ids.append(item["id"])
            syns = item.get("synonyms") or []
            texts.append(f"{item['label']} {' '.join(syns)}")
            kw[item["id"]] = [item["label"].lower()] + [s.lower() for s in syns]
    return LabelSet(ids, texts, kw)


def flatten_chart5_level2(ref: dict) -> LabelSet:
    ids, texts, kw = [], [], {}
    for item in ref["chart5_skincareIngredients"]["level2a"]["items"]:
        ids.append(item["id"])
        syns = item.get("synonyms") or []
        texts.append(f"{item['label']} {' '.join(syns)}")
        kw[item["id"]] = [item["label"].lower()] + [s.lower() for s in syns]
    for item in ref["chart5_skincareIngredients"]["level2b"]["items"]:
        ids.append(item["id"])
        syns = item.get("synonyms") or []
        texts.append(f"{item['label']} {' '.join(syns)}")
        kw[item["id"]] = [item["label"].lower()] + [s.lower() for s in syns]
    return LabelSet(ids, texts, kw)


def apply_mood_rules(text: str, mood: str) -> str:
    if RAGEBAIT.search(text) or NEGATIVE_EXPERIENCE.search(text):
        return "disappointed"
    if BEAUTY_QUESTION.search(text):
        return "neutral"
    if CLINIC_EDU.search(text) and not DISAPPOINTED_OVERRIDE.search(text):
        return "advisory"
    if EDUCATIONAL.search(text) and not DISAPPOINTED_OVERRIDE.search(text):
        return "advisory"
    if DISAPPOINTED_OVERRIDE.search(text):
        return "disappointed"
    if (
        PROMO_MOOD.search(text)
        or BRAND_PROMO.search(text)
        or CLINIC_PROMO.search(text)
        or re.search(r"\b(bin begeistert|liebe diese|must-have|getestet und bin)\b", text, re.I)
    ) and not DISAPPOINTED_OVERRIDE.search(text):
        return "enthusiastic"
    if ENTHUSIASTIC_OVERRIDE.search(text) and not DISAPPOINTED_OVERRIDE.search(text):
        return "enthusiastic"
    if ADVISORY_OVERRIDE.search(text) and mood in ("satisfied", "neutral", "enthusiastic"):
        return "advisory"
    if re.search(r"\b(was kostet|wie lange|erfahrung\?|überlege|unsicher)\b", text, re.I):
        return "neutral"
    return mood


def apply_segment_rules(text: str, segment: str) -> str:
    lower = text.lower()
    if BEAUTY_QUESTION.search(text) or CLINIC_EDU.search(text):
        return "procedure-curious"
    if "kein botox" in lower or "keine nadel" in lower or "ohne botox" in lower:
        return "skincare-first"
    if re.search(r"\b(botox|filler|unterspritz|behandlung|ästhetik|hifu|laserbehandlung)\b", text, re.I):
        if PROCEDURE_CONTEXT.search(text):
            if re.search(r"\b(überlege|angst|erste mal|unsicher|würde)\b", text, re.I):
                return "procedure-curious"
            if re.search(r"\b(hatte|termin|wieder|auffrisch|wartung|schon)\b", text, re.I):
                return "procedure-open"
            return "procedure-curious"
    return segment


def keyword_hits(text: str, keywords: dict[str, list[str]]) -> dict[str, float]:
    lower = text.lower()
    hits = {}
    for tid, terms in keywords.items():
        for term in terms:
            if len(term) < 3:
                continue
            if term in lower:
                hits[tid] = max(hits.get(tid, 0), 0.92)
                break
    return hits


def topic_keyword_hits(text: str) -> dict[str, float]:
    lower = text.lower()
    hits = {}
    for tid, terms in TOPIC_KEYWORDS.items():
        if tid == "price":
            if any(p.search(text) for p in PRICE_PATTERNS) and not PRICE_BLOCK.search(text):
                hits[tid] = 0.9
            continue
        if tid == "spf":
            if any(p.search(text) for p in SPF_PATTERNS):
                hits[tid] = 0.9
            continue
        for term in terms:
            if len(term) < 3:
                continue
            if term in lower:
                if tid == "fillers" and not COSMETIC_FILLER_TOPIC.search(text):
                    if not re.search(
                        r"\bfiller\b.*(gesicht|lippe|ästhetik|unterspritz|hyaluron)|"
                        r"(gesicht|lippe|ästhetik|unterspritz|hyaluron).*\bfiller\b",
                        text,
                        re.I,
                    ):
                        break
                if tid == "botox":
                    if BOTOX_GOSSIP.search(text) or POLITICS_BOTOX.search(text):
                        break
                    if "botox" in lower or "botulinum" in lower:
                        if not COSMETIC_BOTOX.search(text) and not BOTOX_SHORT.search(text):
                            break
                if tid == "laser":
                    if NON_COSMETIC_LASER_TOPIC.search(text) and not COSMETIC_LASER_TOPIC.search(text):
                        break
                    if "laser" in lower and not COSMETIC_LASER_TOPIC.search(text):
                        if not re.search(r"\bipl\b", lower):
                            break
                if tid == "celebrity" and not CELEBRITY_TOPIC.search(text):
                    break
                hits[tid] = 0.9
                break
    return hits


def cosine_top(emb: np.ndarray, label_embs: np.ndarray, labels: LabelSet, top_k: int = 1):
    sims = label_embs @ emb
    order = np.argsort(-sims)
    return [(labels.ids[i], float(sims[i])) for i in order[:top_k]]


def cosine_above(emb: np.ndarray, label_embs: np.ndarray, labels: LabelSet, threshold: float):
    sims = label_embs @ emb
    out = []
    for i, s in enumerate(sims):
        if s >= threshold:
            out.append((labels.ids[i], float(s)))
    out.sort(key=lambda x: -x[1])
    return out


def merge_scores(kw: dict[str, float], emb_scores: list[tuple[str, float]]) -> list[tuple[str, float]]:
    merged: dict[str, float] = dict(kw)
    for tid, score in emb_scores:
        merged[tid] = max(merged.get(tid, 0), score)
    return sorted(merged.items(), key=lambda x: -x[1])


def row_text(row: dict) -> str:
    return f"{row.get('title', '')} {row.get('content', '')}".strip()


def classify_batch(
    rows: list[dict],
    text_embs: np.ndarray,
    mood_embs,
    seg_embs,
    topic_embs,
    proc_embs,
    proc_tone_embs,
    ing_embs,
    ing_tone_embs,
    moods: LabelSet,
    segments: LabelSet,
    topics: LabelSet,
    procedures: LabelSet,
    proc_tones: LabelSet,
    ingredients: LabelSet,
    ing_tones: LabelSet,
    cfg: dict,
) -> list[dict]:
    results = []
    for i, row in enumerate(rows):
        text = row_text(row)
        emb = text_embs[i]

        mood_kw = {}
        seg_kw = {}
        mood_scores = merge_scores(mood_kw, cosine_top(emb, mood_embs, moods, 5))
        seg_scores = merge_scores(seg_kw, cosine_top(emb, seg_embs, segments, 3))
        mood, mood_sc = mood_scores[0]
        segment, seg_sc = seg_scores[0]
        mood = apply_mood_rules(text, mood)
        segment = apply_segment_rules(text, segment)

        topic_kw = topic_keyword_hits(text)
        topics_ids = [t for t, s in topic_kw.items() if s >= 0.85][: cfg["topic_max"]]
        topic_merged = sorted(topic_kw.items(), key=lambda x: -x[1])

        pos = bool(POS_WORDS.search(text))
        neg = bool(NEG_WORDS.search(text))

        procedure = procedure_tone = ingredient = ingredient_tone = None
        proc_sc = ing_sc = 0.0

        if segment in ("procedure-open", "procedure-curious"):
            pk = keyword_hits(text, procedures.keywords)
            if pk:
                p_emb = merge_scores(pk, cosine_top(emb, proc_embs, procedures, 3))
                best = next((x for x in p_emb if x[0] in pk), None)
                if best and best[1] >= cfg["entity_threshold"]:
                    procedure, proc_sc = best
                    tk = keyword_hits(text, proc_tones.keywords)
                    if tk:
                        t_emb = merge_scores(tk, cosine_top(emb, proc_tone_embs, proc_tones, 3))
                        tone_best = next((x for x in t_emb if x[0] in tk), None)
                        if tone_best and tone_best[1] >= cfg["tone_threshold"]:
                            procedure_tone = tone_best[0]

        if segment == "skincare-first":
            ik = keyword_hits(text, ingredients.keywords)
            if ik:
                i_emb = merge_scores(ik, cosine_top(emb, ing_embs, ingredients, 3))
                best = next((x for x in i_emb if x[0] in ik), None)
                if best and best[1] >= cfg["entity_threshold"]:
                    ingredient, ing_sc = best
                    tk = keyword_hits(text, ing_tones.keywords)
                    if tk:
                        t_emb = merge_scores(tk, cosine_top(emb, ing_tone_embs, ing_tones, 3))
                        tone_best = next((x for x in t_emb if x[0] in tk), None)
                        if tone_best and tone_best[1] >= cfg["tone_threshold"]:
                            ingredient_tone = tone_best[0]

        min_conf = min(mood_sc, seg_sc)
        results.append(
            {
                "id": row["id"],
                "source": row.get("source", ""),
                "text": text[:2000],
                "date": row.get("date", ""),
                "mood": mood,
                "mood_score": round(mood_sc, 4),
                "segment": segment,
                "segment_score": round(seg_sc, 4),
                "topics": topics_ids,
                "topic_scores": {t: round(s, 4) for t, s in topic_merged[:5]},
                "sentiment_positive": pos,
                "sentiment_negative": neg,
                "procedure": procedure,
                "procedure_score": round(proc_sc, 4) if procedure else None,
                "procedureTone": procedure_tone,
                "ingredient": ingredient,
                "ingredient_score": round(ing_sc, 4) if ingredient else None,
                "ingredientTone": ingredient_tone,
                "confidence": round(min_conf, 4),
            }
        )
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(ROOT / "data" / "merged_filtered_v6.csv"))
    parser.add_argument("--output-jsonl", default=str(ROOT / "data" / "classified_v5.jsonl"))
    parser.add_argument("--output-review", default=str(ROOT / "data" / "review_queue_v5.csv"))
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=128)
    args = parser.parse_args()

    out_jsonl = Path(args.output_jsonl)
    out_review = Path(args.output_review)

    cfg = {
        "topic_threshold": 0.38,
        "topic_max": 4,
        "entity_threshold": 0.40,
        "tone_threshold": 0.36,
        "review_confidence_below": 0.32,
    }
    if CONFIG.exists():
        cfg.update(json.loads(CONFIG.read_text(encoding="utf-8")))

    ref = load_reference()
    moods = LabelSet(list(MOOD_LABELS), list(MOOD_LABELS.values()))
    segments = LabelSet(list(SEGMENT_LABELS), list(SEGMENT_LABELS.values()))
    topics = LabelSet(
        [c["id"] for c in ref["chart2_topicLandscape"]["candidates"]],
        [c["label"] for c in ref["chart2_topicLandscape"]["candidates"]],
        TOPIC_KEYWORDS,
    )
    procedures = flatten_chart4_level1(ref)
    proc_tones = flatten_chart4_level2(ref)
    ingredients = flatten_chart5_level1(ref)
    ing_tones = flatten_chart5_level2(ref)

    print(f"Loading model {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    def encode_labels(ls: LabelSet) -> np.ndarray:
        return model.encode(ls.texts, normalize_embeddings=True, show_progress_bar=False)

    mood_embs = encode_labels(moods)
    seg_embs = encode_labels(segments)
    topic_embs = encode_labels(topics)
    proc_embs = encode_labels(procedures)
    proc_tone_embs = encode_labels(proc_tones)
    ing_embs = encode_labels(ingredients)
    ing_tone_embs = encode_labels(ing_tones)

    rows: list[dict] = []
    with open(args.input, encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            rows.append(row)
            if args.limit and len(rows) >= args.limit:
                break

    print(f"Classifying {len(rows)} comments...")
    all_results: list[dict] = []
    bs = args.batch_size

    for start in tqdm(range(0, len(rows), bs), desc="batches"):
        batch = rows[start : start + bs]
        texts = [row_text(r) for r in batch]
        embs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        all_results.extend(
            classify_batch(
                batch,
                embs,
                mood_embs,
                seg_embs,
                topic_embs,
                proc_embs,
                proc_tone_embs,
                ing_embs,
                ing_tone_embs,
                moods,
                segments,
                topics,
                procedures,
                proc_tones,
                ingredients,
                ing_tones,
                cfg,
            )
        )

    OUT_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with out_jsonl.open("w", encoding="utf-8") as f:
        for r in all_results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    review = sorted(all_results, key=lambda x: x["confidence"])[:2000]
    with out_review.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(
            [
                "id",
                "confidence",
                "mood",
                "segment",
                "topics",
                "procedure",
                "ingredient",
                "text",
            ]
        )
        for r in review:
            w.writerow(
                [
                    r["id"],
                    r["confidence"],
                    r["mood"],
                    r["segment"],
                    ",".join(r["topics"]),
                    r.get("procedure") or "",
                    r.get("ingredient") or "",
                    r["text"][:300],
                ]
            )

    print(f"Wrote {out_jsonl} ({len(all_results)} rows)")
    print(f"Wrote {out_review} (2000 lowest confidence)")
    print(
        "Mood dist:",
        dict(
            sorted(
                ((m, sum(1 for x in all_results if x["mood"] == m)) for m in MOOD_LABELS),
                key=lambda x: -x[1],
            )
        ),
    )


if __name__ == "__main__":
    main()
