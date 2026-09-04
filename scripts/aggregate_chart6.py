#!/usr/bin/env python3
"""Aggregate Chart 6 — Aging Concerns, Skin Needs & Paths (drill-down)."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLASSIFIED = ROOT / "data" / "classified_v8.jsonl"
OUT_JS = ROOT / "data" / "dashboard_generated.js"

NEGATION = re.compile(
    r"\b(kein|keine|keinen|nicht|nie|bloß kein|ohne|kein interesse)\b",
    re.I,
)


def negated(text: str, start: int, window: int = 35) -> bool:
    left = text[max(0, start - window) : start].lower()
    return bool(NEGATION.search(left))


def compile_terms(terms: list[str]) -> list[tuple[str, re.Pattern]]:
    out = []
    for t in terms:
        # longer / more specific first later via sort
        pat = re.compile(re.escape(t), re.I)
        out.append((t, pat))
    out.sort(key=lambda x: -len(x[0]))
    return out


CONCERNS = {
    "structural-wrinkling": {
        "label": "Structural Wrinkling",
        "pair": "wrinkle-reduction",
        "terms": [
            "stirnfalten", "zornesfalte", "nasolabialfalten", "krähenfüße", "marionettenfalten",
            "faltenbildung", "tiefe falten", "feine linien", "fältchen", "falten",
        ],
    },
    "sagging-contour": {
        "label": "Sagging and Loss of Contour",
        "pair": "firmness-lifting",
        "terms": [
            "schlaffe haut", "erschlaffung", "spannkraft verloren", "hängende wangen",
            "konturverlust", "jawline verloren", "hängebäckchen", "doppelkinn", "schlaff",
        ],
    },
    "collagen-volume": {
        "label": "Collagen & Volume Loss",
        "pair": None,
        "terms": [
            "kollagenabbau", "kollagenverlust", "dünnere haut", "haut wird dünner",
            "volumenverlust", "eingefallene wangen",
        ],
    },
    "barrier-dryness": {
        "label": "Barrier Fragility / Dryness",
        "pair": "plump-hydrated",
        "terms": [
            "trockene haut", "feuchtigkeitsmangel", "barriere geschädigt", "empfindliche haut",
            "gereizte haut", "schuppig", "spannt",
        ],
    },
    "hyperpigmentation": {
        "label": "Hyperpigmentation",
        "pair": "even-complexion",
        "terms": [
            "altersflecken", "pigmentflecken", "dunkle flecken", "sonnenflecken", "melasma",
            "ungleichmäßiger teint", "fleckiger hautton",
        ],
    },
    "dullness": {
        "label": "Dullness",
        "pair": "glow-radiance",
        "terms": [
            "fahle haut", "fahler teint", "glanzlos", "grauer teint", "müde haut",
            "keine ausstrahlung",
        ],
    },
    "dark-circles": {
        "label": "Dark Circles & Under-Eye",
        "pair": None,
        "terms": [
            "augenringe", "dunkle schatten unter den augen", "tränensäcke", "müde augen",
            "schlupflider",
        ],
    },
    "pores-texture": {
        "label": "Enlarged Pores & Texture",
        "pair": "refined-pores",
        "terms": [
            "große poren", "vergrößerte poren", "unebene textur", "raue haut", "unebenheiten",
        ],
    },
}

NEEDS = {
    "wrinkle-reduction": {
        "label": "Visible Wrinkle Reduction",
        "pair": "structural-wrinkling",
        "terms": [
            "glattere haut", "weniger falten", "falten weniger sichtbar", "glatteres hautbild",
            "faltenreduktion",
        ],
    },
    "firmness-lifting": {
        "label": "Firmness & Lifting",
        "pair": "sagging-contour",
        "terms": [
            "straffere haut", "festere konturen", "gestrafft", "mehr spannkraft",
            "definierte kontur",
        ],
    },
    "plump-hydrated": {
        "label": "Plump & Hydrated Skin",
        "pair": "barrier-dryness",
        "terms": [
            "pralle haut", "aufgepolstert", "gut durchfeuchtet", "mehr feuchtigkeit",
            "gepolsterte haut",
        ],
    },
    "glow-radiance": {
        "label": "Glow & Radiance",
        "pair": "dullness",
        "terms": [
            "strahlender teint", "strahlend", "glowy", "leuchtkraft", "frischer teint",
            "ausstrahlung",
        ],
    },
    "even-complexion": {
        "label": "Even Complexion",
        "pair": "hyperpigmentation",
        "terms": [
            "ebenmäßiger teint", "ebenmäßiger hautton", "gleichmäßiger hautton",
            "einheitlicher teint", "weniger dunkle flecken", "ebenmäßig",
        ],
    },
    "refined-pores": {
        "label": "Refined Pores & Smooth Texture",
        "pair": "pores-texture",
        "terms": [
            "feinporig", "verfeinerte poren", "weniger sichtbare poren", "glatte textur",
            "samtige haut",
        ],
    },
    "youthful-fresh": {
        "label": "Youthful & Fresh Appearance",
        "pair": None,
        "terms": [
            "jünger aussehen", "frischer look", "verjüngt", "jugendlich wirken",
            "ausgeruht aussehen",
        ],
    },
    "prevention": {
        "label": "Long-Term Protection & Prevention",
        "pair": None,
        "terms": [
            "vorbeugen", "schützt vor weiterer alterung", "haut bleibt gesund",
            "langfristiger erfolg", "prävention",
        ],
    },
}

PATHS_PROC = {
    "botox": {
        "label": "Botox",
        "kind": "procedure",
        "terms": ["botulinumtoxin", "dysport", "xeomin", "fältchen-spritze", "boti", "botox"],
    },
    "fillers": {
        "label": "Hyaluronic Fillers",
        "kind": "procedure",
        "terms": [
            "lippenunterspritzung", "wangenfiller", "jawline-filler", "nasolabialfalten-filler",
            "tränenrinnen-filler", "unterspritzen", "unterspritzung", "juvederm", "restylane",
            "lippenfiller", "dermal filler",
        ],
    },
    "laser": {
        "label": "Laser",
        "kind": "procedure",
        "terms": ["fraxel", "co2-laser", "fraktionierter laser", "pigmentlaser", "ipl", "laserbehandlung"],
    },
    "microneedling-rf": {
        "label": "Microneedling / RF",
        "kind": "procedure",
        "terms": ["microneedling", "dermapen", "morpheus8", "rf-needling"],
    },
    "peels": {
        "label": "Chemical Peels",
        "kind": "procedure",
        "terms": ["aha-peeling", "bha-peeling", "tca-peeling", "fruchtsäurepeeling", "chemisches peeling"],
    },
    "threads": {
        "label": "Thread Lifts",
        "kind": "procedure",
        "terms": ["thread lift", "fadenlifting", "pdo-fäden", "pdo faden", "silhouette soft"],
    },
    "facelift": {
        "label": "Facelift & Chirurgie",
        "kind": "procedure",
        "terms": ["facelift", "halslift", "lidstraffung", "blepharoplastik", "stirnlift"],
    },
    "ultrasound": {
        "label": "Ultrasound Lifting",
        "kind": "procedure",
        "terms": ["ultraschall-lifting", "ultherapy", "hifu"],
    },
    "body-contouring": {
        "label": "Fat Reduction / Body Contouring",
        "kind": "procedure",
        "terms": ["kryolipolyse", "coolsculpting", "fettwegspritze"],
    },
    "prp": {
        "label": "PRP / Vampire Lift",
        "kind": "procedure",
        "terms": ["vampir-lifting", "eigenbluttherapie", "prp"],
    },
}

PATHS_ING = {
    "hyaluronic-acid": {
        "label": "Hyaluronic Acid",
        "kind": "ingredient",
        "terms": ["hyaluronsäure", "hyaluron", "hyaluronic acid"],
    },
    "retinol": {
        "label": "Retinol / Retinal / Tretinoin",
        "kind": "ingredient",
        "terms": ["retinol", "retinal", "tretinoin", "retinoide", "vitamin-a-derivat", "tret"],
    },
    "vitamin-c": {
        "label": "Vitamin C",
        "kind": "ingredient",
        "terms": ["vitamin c", "vitamin-c", "ascorbinsäure", "l-ascorbic"],
    },
    "niacinamide": {
        "label": "Niacinamide",
        "kind": "ingredient",
        "terms": ["niacinamid", "niacinamide", "vitamin b3"],
    },
    "peptides": {
        "label": "Peptides",
        "kind": "ingredient",
        "terms": ["peptide", "signal-peptide", "kupfer-peptide", "kupferpeptid"],
    },
    "collagen": {
        "label": "Collagen",
        "kind": "ingredient",
        "terms": ["kollagen", "collagen drinks", "kollagen-booster"],
    },
    "vitamin-e": {
        "label": "Vitamin E",
        "kind": "ingredient",
        "terms": ["vitamin e", "tocopherol"],
    },
    "bakuchiol": {
        "label": "Bakuchiol",
        "kind": "ingredient",
        "terms": ["bakuchiol"],
    },
    "spf": {
        "label": "SPF",
        "kind": "ingredient",
        "terms": ["sonnenschutz", "spf", "lsf", "sonnencreme"],
    },
    "aha-bha": {
        "label": "AHA/BHA Acids",
        "kind": "ingredient",
        "terms": ["glykolsäure", "salicylsäure", "milchsäure", "exfoliant", "aha", "bha"],
    },
}

FILLER_CTX = re.compile(r"\b(spritze|unterspritz|termin|arzt|ärztin|filler|injekt)\b", re.I)
HA_TOPICAL = re.compile(r"\b(serum|creme|pflege|topisch|feuchtigkeit)\b", re.I)


def build_matchers(catalog: dict) -> dict[str, list[tuple[str, re.Pattern]]]:
    return {cid: compile_terms(meta["terms"]) for cid, meta in catalog.items()}


CONCERN_M = build_matchers(CONCERNS)
NEED_M = build_matchers(NEEDS)
PROC_M = build_matchers(PATHS_PROC)
ING_M = build_matchers(PATHS_ING)


def find_hits(text: str, matchers: dict[str, list[tuple[str, re.Pattern]]]) -> dict[str, list[tuple[int, str]]]:
    """category -> list of (pos, term) non-negated hits."""
    hits: dict[str, list[tuple[int, str]]] = {}
    lower = text
    occupied: list[tuple[int, int]] = []

    # Collect all candidate matches across cats, prefer longer terms globally
    candidates = []
    for cid, terms in matchers.items():
        for term, pat in terms:
            for m in pat.finditer(lower):
                if negated(text, m.start()):
                    continue
                candidates.append((len(term), m.start(), m.end(), cid, term))
    candidates.sort(key=lambda x: (-x[0], x[1]))

    used_spans = []
    for _, start, end, cid, term in candidates:
        if any(start < e and end > s for s, e in used_spans):
            continue
        # Special: ebenmäßig* only Even Complexion need — handled by catalog exclusivity
        used_spans.append((start, end))
        hits.setdefault(cid, []).append((start, term))
    return hits


def find_path_hits(text: str) -> dict[str, list[tuple[int, str, str]]]:
    """id -> (pos, term, kind)"""
    out: dict[str, list[tuple[int, str, str]]] = {}
    # procedures
    for cid, hits in find_hits(text, PROC_M).items():
        for pos, term in hits:
            out.setdefault(cid, []).append((pos, term, "procedure"))
    # ingredients with HA context rule
    for cid, hits in find_hits(text, ING_M).items():
        for pos, term in hits:
            if cid == "hyaluronic-acid":
                if FILLER_CTX.search(text):
                    # count as fillers instead if injection context
                    out.setdefault("fillers", []).append((pos, term, "procedure"))
                    continue
                if not HA_TOPICAL.search(text):
                    continue
            out.setdefault(cid, []).append((pos, term, "ingredient"))
    return out


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def patch_dashboard(payload: dict) -> None:
    text = OUT_JS.read_text(encoding="utf-8")
    m = re.match(r"/\*\*.*?\*/\s*window\.DashboardData\s*=\s*", text, re.S)
    if not m:
        raise SystemExit("Could not parse dashboard_generated.js")
    body = text[m.end() :].rstrip().rstrip(";")
    data = json.loads(body)
    data["agingPaths"] = payload
    data["meta"]["chart6"] = "agingPaths v1"
    js = (
        "/** AUTO-GENERATED from classified_v8.jsonl — do not edit by hand */\n"
        f"window.DashboardData = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    )
    OUT_JS.write_text(js, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(CLASSIFIED))
    args = parser.parse_args()
    rows = load_jsonl(Path(args.input))
    print(f"Loaded {len(rows)}")

    concern_c: Counter = Counter()
    need_c: Counter = Counter()
    concern_term: dict[str, Counter] = defaultdict(Counter)
    need_term: dict[str, Counter] = defaultdict(Counter)
    # co-occurrence: concern|need id -> path id -> {total, strong}
    co: dict[str, dict[str, Counter]] = defaultdict(lambda: defaultdict(Counter))
    classified = 0
    unclassified_terms: Counter = Counter()
    by_seg_concern: dict[str, Counter] = defaultdict(Counter)
    by_seg_need: dict[str, Counter] = defaultdict(Counter)

    quote_pool: dict[str, list[dict]] = defaultdict(list)

    for r in rows:
        text = r.get("text") or ""
        if len(text) < 30:
            continue
        ch = find_hits(text, CONCERN_M)
        nh = find_hits(text, NEED_M)
        # Collision: ebenmäßig already only in needs; uneben in pores unless teint→hyperpigmentation
        if "pores-texture" in ch and re.search(r"uneben\w*.{0,20}(teint|hautton|farbe)", text, re.I):
            # move to hyperpigmentation
            ch.pop("pores-texture", None)
            ch.setdefault("hyperpigmentation", []).append((0, "uneben+teint"))

        if not ch and not nh:
            for w in re.findall(r"[A-Za-zÄÖÜäöüß]{5,}", text.lower()):
                if w not in {
                    "nicht", "oder", "aber", "wenn", "auch", "noch", "schon", "haben",
                    "werden", "kann", "meine", "deine", "diese", "etwas", "hautpflege",
                    "wirklich", "einfach", "vielleicht", "eigentlich", "gesicht", "wegen",
                }:
                    unclassified_terms[w] += 1
            continue
        classified += 1
        seg = r.get("segment") or "unknown"

        for cid, hits in ch.items():
            concern_c[cid] += 1
            by_seg_concern[seg][cid] += 1
            for _, term in hits:
                concern_term[cid][term] += 1
            if len(quote_pool[f"concern:{cid}"]) < 40:
                quote_pool[f"concern:{cid}"].append(
                    {"id": r["id"], "text": text[:400], "segment": seg, "mood": r.get("mood")}
                )

        for nid, hits in nh.items():
            need_c[nid] += 1
            by_seg_need[seg][nid] += 1
            for _, term in hits:
                need_term[nid][term] += 1
            if len(quote_pool[f"need:{nid}"]) < 40:
                quote_pool[f"need:{nid}"].append(
                    {"id": r["id"], "text": text[:400], "segment": seg, "mood": r.get("mood")}
                )

        paths = find_path_hits(text)
        if not paths:
            continue

        # sentence split for strong/weak
        sentences = re.split(r"[.!?!\n]+", text)

        def sentence_index(pos: int) -> int:
            acc = 0
            for i, s in enumerate(sentences):
                acc += len(s) + 1
                if pos < acc:
                    return i
            return max(0, len(sentences) - 1)

        keys = [f"concern:{c}" for c in ch] + [f"need:{n}" for n in nh]
        for key in keys:
            cat_id = key.split(":", 1)[1]
            src_hits = ch.get(cat_id) or nh.get(cat_id) or [(0, "")]
            src_pos = src_hits[0][0]
            src_si = sentence_index(src_pos)
            for pid, phits in paths.items():
                ppos = phits[0][0]
                psi = sentence_index(ppos)
                strong = abs(src_si - psi) <= 1
                co[key][pid]["total"] += 1
                if strong:
                    co[key][pid]["strong"] += 1
                else:
                    co[key][pid]["weak"] += 1

    def pack_side(counter: Counter, catalog: dict, term_map: dict[str, Counter], kind: str) -> list[dict]:
        items = []
        for cid, count in counter.most_common():
            meta = catalog[cid]
            terms = term_map[cid]
            top_term, top_n = (terms.most_common(1)[0] if terms else ("", 0))
            concentration = round(top_n / count, 3) if count else 0
            items.append(
                {
                    "id": cid,
                    "label": meta["label"],
                    "kind": kind,
                    "count": count,
                    "pair": meta.get("pair"),
                    "top_term": top_term,
                    "concentration": concentration,
                    "concentrated": concentration >= 0.6,
                }
            )
        return items

    concerns = pack_side(concern_c, CONCERNS, concern_term, "concern")
    needs = pack_side(need_c, NEEDS, need_term, "need")

    # Build drilldowns
    drilldowns = {}
    path_meta = {**PATHS_PROC, **PATHS_ING}
    for key, paths in co.items():
        basis = sum(v["total"] for v in paths.values())
        # threshold: max(15, 3% of basis)
        min_n = max(15, int(round(basis * 0.03))) if basis else 15
        rows_out = []
        for pid, stats in sorted(paths.items(), key=lambda x: -x[1]["total"]):
            if stats["total"] < min_n and stats["total"] < max(15, int(basis * 0.03 or 0)):
                # still include if >= 15 OR >= 3%
                if stats["total"] < 15 and (basis == 0 or stats["total"] / basis < 0.03):
                    continue
            meta = path_meta.get(pid) or {"label": pid, "kind": "procedure"}
            rows_out.append(
                {
                    "id": pid,
                    "label": meta["label"],
                    "kind": meta.get("kind", "procedure"),
                    "count": stats["total"],
                    "strong": stats.get("strong", 0),
                    "weak": stats.get("weak", 0),
                }
            )
        drilldowns[key] = {
            "basis": basis,
            "low_n": basis < 30,
            "paths": rows_out,
        }

    payload = {
        "eyebrow": "6. Aging Concerns, Skin Needs & Paths",
        "title": "Aging Concerns, Skin Needs & The Paths to Solve Them",
        "note": "Mehrfachnennungen möglich, Summe über 100 %",
        "n_total": len(rows),
        "n_classified": classified,
        "classified_share_pct": round(100.0 * classified / len(rows), 1) if rows else 0,
        "unclassified_themes": [w for w, _ in unclassified_terms.most_common(5)],
        "concerns": concerns,
        "needs": needs,
        "drilldowns": drilldowns,
        "quotes": {k: v[:8] for k, v in quote_pool.items()},
        "by_segment": {
            "concerns": {s: dict(c) for s, c in by_seg_concern.items()},
            "needs": {s: dict(c) for s, c in by_seg_need.items()},
        },
    }

    patch_dashboard(payload)
    print(f"Classified {classified}/{len(rows)} ({payload['classified_share_pct']}%)")
    print("Top concerns:", [(c["id"], c["count"]) for c in concerns[:5]])
    print("Top needs:", [(n["id"], n["count"]) for n in needs[:5]])
    print(f"Drilldown keys: {len(drilldowns)}")
    print(f"Wrote into {OUT_JS}")


if __name__ == "__main__":
    main()
