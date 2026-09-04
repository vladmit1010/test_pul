#!/usr/bin/env python3
"""Build wordcloud aggregates for Chart 4 (Skincare-First) and Chart 5 (Procedure)."""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLASSIFIED = ROOT / "data" / "classified_v8.jsonl"
OUT_JS = ROOT / "data" / "dashboard_generated.js"
MAX_TERMS = 40
OVERWEIGHT_N = 20

STOP = {
    "und", "oder", "aber", "denn", "weil", "dass", "daß", "wenn", "als", "auch",
    "nicht", "noch", "nur", "schon", "sehr", "viel", "mehr", "mal", "man", "mir",
    "mich", "mein", "meine", "meiner", "meinem", "meinen", "dein", "deine", "deiner",
    "deinem", "deinen", "ihre", "ihr", "ihren", "ihrem", "ihrer",
    "seine", "sein", "sich", "ich", "du", "er", "sie", "es", "wir", "ihr", "ihnen",
    "euch", "uns", "unser", "unsere", "dir", "dich",
    "der", "die", "das", "dem", "den", "des", "ein", "eine", "einer", "einem", "einen",
    "eines", "im", "in", "am", "an", "auf", "aus", "bei", "mit", "nach", "von", "zu", "zum",
    "zur", "für", "über", "unter", "ohne", "um", "durch", "bis", "gegen", "zwischen",
    "vor", "vom", "ins", "ans", "beim",
    "ist", "sind", "war", "waren", "wird", "werden", "wurde", "wurden", "hat", "haben",
    "hatte", "hatten", "kann", "können", "muss", "müssen", "soll", "sollte", "will",
    "würde", "würden", "sein", "bin", "bist", "seid", "habt", "hast", "habe", "hätte",
    "ja", "nein", "ok", "okay", "also", "dann", "dort", "hier", "da", "so", "wie",
    "was", "wer", "wo", "wann", "warum", "welche", "welcher", "welches", "ob", "doch",
    "dieser", "diese", "dieses", "jenem", "alle", "alles", "etwas", "nichts", "kein",
    "keine", "keinen", "keiner", "ganz", "immer", "nie", "oft", "heute", "jetzt",
    "bitte", "danke", "hallo", "lg", "mfg", "via", "http", "https", "www", "amp", "nbsp",
    "instagram", "tiktok", "youtube", "facebook", "reddit", "post", "video",
    "kommentar", "link", "bild", "foto", "story", "reel", "account", "profil",
    "gut", "gute", "guter", "gutes", "schon", "einfach", "wirklich", "einfach",
    "geht", "geben", "machen", "macht", "gemacht", "lassen", "lässt", "kommt", "kommen",
    "gibt", "gibt", "mal", "eher", "vielleicht", "eigentlich", "einfach", "richtig",
    "wieder", "genau", "immer", "nochmal", "davon", "dazu", "damit", "darauf", "dabei",
    "aber", "denn", "weil", "auch", "noch", "schon", "sehr", "viel", "mehr",
    "gesicht", "haut", "sondern", "jedoch", "trotzdem", "dadurch", "deshalb", "darum",
    "the", "and", "for", "you", "your", "with", "this", "that", "from", "are",
    "was", "have", "has", "been", "will", "can", "just", "about", "into", "get",
    "one", "all", "but", "not", "out", "they", "she", "his", "her", "him",
}

# Lemma / variant merge
LEMMA = {
    "falte": "falten",
    "falten": "falten",
    "fältchen": "falten",
    "fältchens": "falten",
    "faltenbildung": "falten",
    "hyaluron": "hyaluronsäure",
    "hyaluronsäure": "hyaluronsäure",
    "ha": "hyaluronsäure",
    "retinol": "retinol",
    "retinal": "retinol",
    "retinoid": "retinol",
    "retinoiden": "retinol",
    "tretinoin": "retinol",
    "tret": "retinol",
    "niacinamid": "niacinamid",
    "niacinamide": "niacinamid",
    "peptide": "peptide",
    "peptiden": "peptide",
    "spf": "spf",
    "sonnenschutz": "spf",
    "sonnencreme": "spf",
    "lsf": "spf",
    "botox": "botox",
    "botulinum": "botox",
    "filler": "filler",
    "fillern": "filler",
    "unterspritzung": "filler",
    "unterspritzen": "filler",
    "laser": "laser",
    "laserbehandlung": "laser",
    "peeling": "peeling",
    "microneedling": "microneedling",
    "facelift": "facelift",
    "fadenlifting": "fadenlifting",
    "hifu": "hifu",
    "ultherapy": "hifu",
    "serum": "serum",
    "seren": "serum",
    "creme": "creme",
    "cremes": "creme",
    "hautpflege": "hautpflege",
    "skincare": "hautpflege",
    "routine": "routine",
    "morgenroutine": "morgenroutine",
    "abendroutine": "abendroutine",
    "trockenheit": "trockenheit",
    "trockene": "trockenheit",
    "feuchtigkeit": "feuchtigkeit",
    "strahlend": "strahlung",
    "strahlung": "strahlung",
    "glow": "strahlung",
    "glowy": "strahlung",
    "pigmentflecken": "pigmentflecken",
    "altersflecken": "pigmentflecken",
    "poren": "poren",
    "haut": "haut",
    "teint": "teint",
    "ergebnis": "ergebnis",
    "ergebnisse": "ergebnis",
    "wirkung": "wirkung",
    "nebenwirkung": "nebenwirkung",
    "nebenwirkungen": "nebenwirkung",
    "komplikation": "komplikation",
    "komplikationen": "komplikation",
    "angst": "angst",
    "beratung": "beratung",
    "termin": "termin",
    "arzt": "arzt",
    "ärztin": "arzt",
    "praxis": "praxis",
    "auffrischung": "auffrischung",
    "preis": "preis",
    "kosten": "preis",
    "behandlung": "behandlung",
    "behandlungen": "behandlung",
    "natürlich": "natürlich",
    "natürliche": "natürlich",
    "natürliches": "natürlich",
    "natürlicher": "natürlich",
    "frozen": "frozen-look",
    "nadel": "nadel",
    "nadeln": "nadel",
}

BIGRAMS = {
    ("pralle", "haut"): "pralle haut",
    ("ebenmäßiger", "teint"): "ebenmäßiger teint",
    ("ebenmäßigen", "teint"): "ebenmäßiger teint",
    ("frozen", "look"): "frozen look",
    ("glow", "up"): "glow up",
    ("natürliches", "ergebnis"): "natürliches ergebnis",
    ("angst", "vor"): "angst vor",
    ("zweite", "meinung"): "zweite meinung",
    ("feine", "linien"): "feine linien",
    ("feinen", "linien"): "feine linien",
}

# Family coloring
SKIN_FAMILIES = {
    "ingredient": {
        "color": "#e8a86e",
        "terms": {
            "retinol", "hyaluronsäure", "niacinamid", "peptide", "spf", "bakuchiol",
            "vitamin-c", "vitaminc", "ascorbinsäure", "kollagen", "serum", "creme",
            "glycerin", "aloe", "aha", "bha",
        },
    },
    "concern": {
        "color": "#e07070",
        "terms": {
            "falten", "trockenheit", "pigmentflecken", "poren", "schlaff",
            "augenringe", "röung", "rötung", "pickel", "unreinheiten", "elastizität",
        },
    },
    "result": {
        "color": "#7ecdb8",
        "terms": {
            "strahlung", "pralle haut", "ebenmäßiger teint", "glättung", "straffung",
            "feuchtigkeit", "glow up", "jugendlich", "frisch",
        },
    },
    "routine": {
        "color": "#7eb8d4",
        "terms": {
            "routine", "morgenroutine", "abendroutine", "layering", "dosierung",
            "eingewöhnung", "purging", "hautpflege", "anwendung",
        },
    },
}

PROC_FAMILIES = {
    "procedure": {
        "color": "#7eb8d4",
        "terms": {
            "botox", "filler", "laser", "facelift", "fadenlifting", "hifu",
            "microneedling", "peeling", "prp", "unterspritzung",
        },
    },
    "fear": {
        "color": "#e07070",
        "terms": {
            "angst", "nebenwirkung", "komplikation", "frozen look", "nadel",
            "schmerz", "risiko", "unnatürlich", "vernarbung", "verbrennung",
        },
    },
    "result": {
        "color": "#7ecdb8",
        "terms": {
            "ergebnis", "wirkung", "natürlich", "natürliches ergebnis", "glättung",
            "straffung", "zufrieden",
        },
    },
    "process": {
        "color": "#9aa3b2",
        "terms": {
            "beratung", "termin", "arzt", "praxis", "auffrischung", "preis",
            "erstgespräch", "behandlung", "sitzung",
        },
    },
}

TOKEN_RE = re.compile(r"[a-zäöüß0-9]+(?:-[a-zäöüß0-9]+)?", re.I)


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def normalize_token(tok: str) -> str | None:
    t = tok.lower().strip("-")
    if len(t) < 4 or t in STOP or t.isdigit():
        return None
    if t.startswith("http") or t.startswith("www"):
        return None
    if t in {"amp", "nbsp", "quot", "lt", "gt"}:
        return None
    return LEMMA.get(t, t)


def extract_terms(text: str) -> list[str]:
    raw = TOKEN_RE.findall(text.lower())
    # bigrams first
    terms: list[str] = []
    i = 0
    while i < len(raw):
        if i + 1 < len(raw):
            pair = (raw[i], raw[i + 1])
            if pair in BIGRAMS:
                terms.append(BIGRAMS[pair])
                i += 2
                continue
        norm = normalize_token(raw[i])
        if norm:
            terms.append(norm)
        i += 1
    return terms


def family_for(term: str, families: dict) -> tuple[str, str]:
    for fid, meta in families.items():
        if term in meta["terms"] or any(term.startswith(t) or t in term for t in meta["terms"]):
            return fid, meta["color"]
    return "other", "#b8c4d4"


def count_segment(rows: list[dict], segments: set[str]) -> tuple[Counter, int, int]:
    """Return term counts, n_docs, n_tokens."""
    counts: Counter = Counter()
    n_docs = 0
    n_tokens = 0
    for r in rows:
        if r.get("segment") not in segments:
            continue
        if r.get("segment_positioned") is False:
            continue
        terms = extract_terms(r.get("text") or "")
        if not terms:
            continue
        n_docs += 1
        n_tokens += len(terms)
        counts.update(terms)
    return counts, n_docs, n_tokens


def per_1000(counts: Counter, n_tokens: int) -> dict[str, float]:
    if n_tokens <= 0:
        return {}
    return {t: (c / n_tokens) * 1000.0 for t, c in counts.items()}


def build_cloud(
    counts: Counter,
    n_tokens: int,
    families: dict,
    max_terms: int = MAX_TERMS,
    curious_share: dict[str, float] | None = None,
) -> list[dict]:
    rates = per_1000(counts, n_tokens)
    # Prefer themed terms, then high rate
    scored = []
    for term, rate in rates.items():
        if counts[term] < 12:
            continue
        fam, color = family_for(term, families)
        # Boost known thematic families so they surface over generic nouns
        boost = 1.55 if fam != "other" else 0.65
        weight = (rate * boost) / math.sqrt(max(len(term), 3))
        scored.append((weight, rate, term, fam, color, counts[term]))
    scored.sort(key=lambda x: -x[0])
    # Ensure mix of families in top
    out = []
    seen_fam = Counter()
    for weight, rate, term, fam, color, abs_c in scored:
        if len(out) >= max_terms:
            break
        # Cap generic "other" so theme colors dominate the cloud
        if fam == "other" and seen_fam["other"] >= 8:
            continue
        if fam != "other" and seen_fam[fam] >= 14:
            continue
        item = {
            "term": term,
            "count": abs_c,
            "per_1000": round(rate, 2),
            "family": fam,
            "color": color,
            "weight": round(weight, 4),
        }
        if curious_share is not None:
            item["curious_share"] = round(curious_share.get(term, 0.0), 3)
        out.append(item)
        seen_fam[fam] += 1
    return out


NOISE_OVERWEIGHT = {
    "ebay",
    "labello",
    "budni",
    "nocosmetics",
    "lorealparismakeup",
    "isana",
    "zeitgard",
    "invisible",
    "perfecting",
    "ultraleichte",
    "pumpstöße",
    "pumpstosse",
    "favorite",
    "duft-isana",
    "pflege-und",
    "leinsamen",
    "mizellenwasser",
    "epigenetics",
    "verjüngendes",
    "uv-filtern",
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
    "reddit",
    "category",
    "karotten",
    "pipette",
    "drops",
    "sexy",
    "komisches",
    "fange",
    "attraktiv",
    "hässlich",
    "einen",
    "pflegewirkstoffen",
}


def overweight(
    focus: dict[str, float],
    base: dict[str, float],
    counts: Counter,
    n: int = OVERWEIGHT_N,
    families: dict | None = None,
) -> list[dict]:
    """Terms relatively over-indexed in focus vs base. Skip noise / zero-base spikes."""
    rows = []
    for term, rate in focus.items():
        if term in NOISE_OVERWEIGHT or term in STOP:
            continue
        if len(term) < 4:
            continue
        count = counts.get(term, 0)
        if count < 50:
            continue
        if re.search(
            r"(deutschland|skinabox|garnier|anua|ebay|budni|isana|labello|nocosmetic|parfum|parfüm)",
            term,
            re.I,
        ):
            continue
        # Prefer content-bearing terms (known family or multi-word)
        if families:
            fam, _ = family_for(term, families)
            if fam == "other" and " " not in term and len(term) < 9:
                continue
        base_rate = base.get(term, 0.0)
        # Require presence in comparison corpus — avoids fake ×99 from absences
        if base_rate <= 0:
            continue
        ratio = rate / base_rate
        if ratio < 1.5:
            continue
        rows.append(
            {
                "term": term,
                "ratio": round(ratio, 2),
                "per_1000": round(rate, 2),
                "count": count,
            }
        )
    rows.sort(key=lambda x: (-x["ratio"], -x["count"]))
    return rows[:n]


def patch_dashboard(payload: dict) -> None:
    text = OUT_JS.read_text(encoding="utf-8")
    # Replace or inject wordcloud keys into the JS object
    # Safer: load JSON by stripping wrapper
    m = re.match(r"/\*\*.*?\*/\s*window\.DashboardData\s*=\s*", text, re.S)
    if not m:
        raise SystemExit("Could not parse dashboard_generated.js header")
    body = text[m.end() :].rstrip()
    if body.endswith(";"):
        body = body[:-1]
    data = json.loads(body)
    data["skincareWordcloud"] = payload["skincareWordcloud"]
    data["procedureWordcloud"] = payload["procedureWordcloud"]
    # Keep old nested charts for now but mark superseded
    data["meta"]["wordclouds"] = "v1 from classified_v8"
    js = (
        f"/** AUTO-GENERATED from classified_v8.jsonl — do not edit by hand */\n"
        f"window.DashboardData = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    )
    OUT_JS.write_text(js, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(CLASSIFIED))
    args = parser.parse_args()

    rows = load_jsonl(Path(args.input))
    print(f"Loaded {len(rows)} rows")

    skin_c, skin_docs, skin_tok = count_segment(rows, {"skincare-first"})
    open_c, open_docs, open_tok = count_segment(rows, {"procedure-open"})
    cur_c, cur_docs, cur_tok = count_segment(rows, {"procedure-curious"})

    # Combined procedure cloud: normalize each segment then average rates
    open_r = per_1000(open_c, open_tok)
    cur_r = per_1000(cur_c, cur_tok)
    all_terms = set(open_r) | set(cur_r)
    combined_rate: dict[str, float] = {}
    combined_count: Counter = Counter()
    curious_share: dict[str, float] = {}
    for t in all_terms:
        # equal weight per segment (avoid open dominating)
        combined_rate[t] = 0.5 * open_r.get(t, 0.0) + 0.5 * cur_r.get(t, 0.0)
        combined_count[t] = open_c.get(t, 0) + cur_c.get(t, 0)
        tot = open_c.get(t, 0) + cur_c.get(t, 0)
        curious_share[t] = (cur_c.get(t, 0) / tot) if tot else 0.0

    # Fake Counter from combined for build_cloud absolute counts
    # Use combined_count; for per_1000 pass synthetic n_tokens so rate≈combined_rate
    # build_cloud recomputes per_1000 from counts/n_tokens — so pass weighted tokens
    # Instead build manually for procedure:
    proc_cloud = []
    scored = []
    for term, rate in combined_rate.items():
        if combined_count[term] < 12:
            continue
        fam, color = family_for(term, PROC_FAMILIES)
        boost = 1.55 if fam != "other" else 0.65
        weight = (rate * boost) / math.sqrt(max(len(term), 3))
        scored.append((weight, rate, term, fam, color, combined_count[term], curious_share[term]))
    scored.sort(key=lambda x: -x[0])
    seen_fam = Counter()
    for weight, rate, term, fam, color, abs_c, cshare in scored:
        if len(proc_cloud) >= MAX_TERMS:
            break
        if fam == "other" and seen_fam["other"] >= 8:
            continue
        if fam != "other" and seen_fam[fam] >= 14:
            continue
        proc_cloud.append(
            {
                "term": term,
                "count": abs_c,
                "per_1000": round(rate, 2),
                "family": fam,
                "color": color,
                "weight": round(weight, 4),
                "curious_share": round(cshare, 3),
            }
        )
        seen_fam[fam] += 1

    skin_cloud = build_cloud(skin_c, skin_tok, SKIN_FAMILIES)
    skin_r = per_1000(skin_c, skin_tok)
    proc_base_r = combined_rate
    skin_over = overweight(skin_r, proc_base_r, skin_c, families=SKIN_FAMILIES)
    cur_over = overweight(cur_r, open_r, cur_c, families=PROC_FAMILIES)

    payload = {
        "skincareWordcloud": {
            "eyebrow": "4. Skincare-First Wordcloud",
            "title": "The Language of Skincare-First Consumers: Top Themes in Conversation",
            "n_docs": skin_docs,
            "n_tokens": skin_tok,
            "terms": skin_cloud,
            "overweight": skin_over,
            "overweight_label": "Übergewichtung vs. Procedure-Open/Curious",
            "legend": [
                {"id": "ingredient", "label": "Ingredients", "color": "#e8a86e"},
                {"id": "concern", "label": "Concerns", "color": "#e07070"},
                {"id": "result", "label": "Results", "color": "#7ecdb8"},
                {"id": "routine", "label": "Routine", "color": "#7eb8d4"},
            ],
        },
        "procedureWordcloud": {
            "eyebrow": "5. Procedure-Open & Procedure-Curious Wordcloud",
            "title": "The Language of Procedure-Open & Procedure-Curious: Top Themes in Conversation",
            "n_docs_open": open_docs,
            "n_docs_curious": cur_docs,
            "n_tokens_open": open_tok,
            "n_tokens_curious": cur_tok,
            "terms": proc_cloud,
            "overweight": cur_over,
            "overweight_label": "Übergewichtung Procedure-Curious vs. Procedure-Open",
            "legend": [
                {"id": "procedure", "label": "Procedures", "color": "#7eb8d4"},
                {"id": "fear", "label": "Fears", "color": "#e07070"},
                {"id": "result", "label": "Results", "color": "#7ecdb8"},
                {"id": "process", "label": "Process", "color": "#9aa3b2"},
            ],
        },
    }

    patch_dashboard(payload)
    print(f"Skincare cloud: {len(skin_cloud)} terms from {skin_docs} docs")
    print(f"Procedure cloud: {len(proc_cloud)} terms (open={open_docs}, curious={cur_docs})")
    print(f"Wrote wordclouds into {OUT_JS}")
    print("Skin top:", [t["term"] for t in skin_cloud[:8]])
    print("Proc top:", [t["term"] for t in proc_cloud[:8]])


if __name__ == "__main__":
    main()
