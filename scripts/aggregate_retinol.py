#!/usr/bin/env python3
"""Aggregate Chart 7 — Retinol Deep-Dive (Fears vs Hopes)."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLASSIFIED = ROOT / "data" / "classified_v10.jsonl"
OUT_JS = ROOT / "data" / "dashboard_generated.js"

RETINOL_MENTION = re.compile(
    r"\b(retinol|retinal|tretinoin|retinoide?n?|vitamin-?a-derivat|\btret\b)\b",
    re.I,
)
NEGATION = re.compile(
    r"\b(kein|keine|keinen|nicht|nie|bloß kein|ohne|zum glück kein|kein purging)\b",
    re.I,
)
PERSISTENCE = re.compile(
    r"\b(durchhalten|durchgehalten|nicht aufgegeben|nach (drei|3|vier|4|sechs|6|einigen) monaten|"
    r"erst schlimm.{0,40}(dann|jetzt)|anfangs.{0,40}(jetzt|dann)|eingewöhn|"
    r"hat sich gelohnt|langfristig)\b",
    re.I,
)
DROPOUT = re.compile(
    r"\b(abgebrochen|aufgehört|nicht mehr benutzt|verträglichkeit.{0,20}nicht|"
    r"zu stark|kann (es )?nicht vertragen|wieder abgesetzt)\b",
    re.I,
)


def negated(text: str, start: int, window: int = 40) -> bool:
    return bool(NEGATION.search(text[max(0, start - window) : start]))


def compile_terms(terms: list[str]) -> list[tuple[str, re.Pattern]]:
    items = [(t, re.compile(re.escape(t), re.I)) for t in terms]
    items.sort(key=lambda x: -len(x[0]))
    return items


FEARS = {
    "purging": {
        "label": "Purging & Initial Breakouts",
        "terms": [
            "purging",
            "erst schlimmer geworden",
            "pickel am anfang",
            "eingewöhnungsphase",
            "umstellungsphase",
        ],
    },
            "irritation": {
        "label": "Irritation & Redness",
        "terms": [
            "rötungen",
            "rötung",
            "brennt",
            "brennen",
            "reizung",
            "irritiert",
            "gereizt",
            "gereizte haut",
            "peeling-effekt",
            "haut pellt",
            "pellt sich",
            "hautbrennen",
            "rot geworden",
        ],
    },
    "over-drying": {
        "label": "Over-Drying",
        "terms": [
            "zu trocken",
            "übertrocknet",
            "austrocknet",
            "austrocknung",
            "schuppt",
            "schuppen",
            "spannungsgefühl",
            "raubt feuchtigkeit",
            "trockene haut",
            "trockenes haut",
        ],
    },
    "photosensitivity": {
        "label": "Photosensitivity / Sun Sensitivity",
        "terms": [
            "empfindlich gegenüber sonne",
            "nur abends",
            "sonnenbrandgefahr",
            "im sommer pausieren",
            "sonnenempfindlich",
            "tagsüber kein retinol",
            "nicht tagsüber",
            "lichtempfindlich",
            "retinol und sonne",
            "sonne und retinol",
            "sonnenschutzpflicht",
        ],
    },
    "overuse": {
        "label": "Fear of Overuse & Wrong Application",
        "terms": [
            "zu viel benutzt",
            "retinol-gesicht",
            "überdosierung",
            "falsche anwendung",
            "zu oft angewendet",
            "falsch einschleichen",
            "einschleichen",
        ],
    },
    "interplay": {
        "label": "Ingredient Interplay",
        "terms": [
            "wechselwirkung",
            "nicht kombinieren",
            "zusammen mit vitamin c",
            "mit säuren kombinieren",
            "darf nicht benutzt werden mit",
        ],
    },
    "health": {
        "label": "Health Concerns",
        "terms": [
            "nicht in der schwangerschaft",
            "schwangerschaft",
            "stillzeit",
            "kontraindikation",
            "gesundheitliche bedenken",
        ],
    },
    "slow-results": {
        "label": "Slow, Invisible Results",
        "terms": [
            "dauert ewig",
            "sehe noch nichts",
            "geduld erforderlich",
            "keine schnelle wirkung",
            "nach monaten immer noch nichts",
            "braucht zeit",
        ],
    },
}

HOPES = {
            "wrinkle-reduction": {
        "label": "Wrinkle & Fine Line Reduction",
        "terms": [
            "glättet falten",
            "weniger feine linien",
            "sichtbare faltenreduktion",
            "gegen falten",
            "anti falten",
            "faltenreduzier",
            "anti-aging-wirkung",
            "anti aging wirkung",
            "glattere haut",
        ],
    },
    "collagen": {
        "label": "Collagen Stimulation",
        "terms": [
            "regt kollagen an",
            "kollagenaufbau",
            "kollagenproduktion",
            "arbeitet in der tiefe",
            "wirkt in der dermis",
            "zellerneuerung",
            "zell-erneuerung",
            "kollagen",
            "collagen",
        ],
    },
    "gold-standard": {
        "label": "Gold Standard Credibility",
        "terms": [
            "goldstandard",
            "gold standard",
            "wissenschaftlich",
            "von dermatologen empfohlen",
            "studienlage",
            "bewiesen",
        ],
    },
    "texture": {
        "label": "Texture & Pore Refinement",
        "terms": [
            "feinere poren",
            "glattere textur",
            "ebenmäßigere haut",
            "samtiges hautgefühl",
            "feinporig",
        ],
    },
    "pigmentation": {
        "label": "Reduction of Pigmentation",
        "terms": [
            "weniger pigmentierung",
            "weniger pigmentflecken",
            "weniger dunkle flecken",
            "flecken sind blasser",
            "gegen pigmentflecken",
        ],
    },
    "acne": {
        "label": "Acne & Blemish Control",
        "terms": [
            "hilft auch gegen pickel",
            "reinere haut",
            "weniger unreinheiten",
            "gegen pickel",
            "gegen akne",
        ],
    },
    "payoff": {
        "label": "Payoff After Persistence",
        "terms": [
            "hat sich gelohnt durchzuhalten",
            "nach drei monaten kam die wende",
            "erst schlimm, dann super",
            "nicht aufgegeben",
            "langfristige verbesserung",
            "haut hat sich komplett verändert",
        ],
    },
    "confidence": {
        "label": "Confidence from Visible Change",
        "terms": [
            "endlich sichtbare ergebnisse",
            "stolz auf meine haut",
            "ohne make-up",
            "bekomme komplimente",
            "sichtbare ergebnisse",
        ],
    },
}

FEAR_M = {k: compile_terms(v["terms"]) for k, v in FEARS.items()}
HOPE_M = {k: compile_terms(v["terms"]) for k, v in HOPES.items()}


def find_cats(text: str, matchers: dict, catalog: dict) -> dict[str, str]:
    """Return {cat_id: matched_term} — longest match wins per span, specific cats preferred."""
    candidates = []
    for cid, terms in matchers.items():
        for term, pat in terms:
            for m in pat.finditer(text):
                if negated(text, m.start()):
                    continue
                candidates.append((len(term), m.start(), m.end(), cid, term))
    candidates.sort(key=lambda x: (-x[0], x[1]))
    used = []
    hits = {}
    for _, start, end, cid, term in candidates:
        if any(start < e and end > s for s, e in used):
            continue
        # Payoff requires persistence cue in text
        if cid == "payoff" and not PERSISTENCE.search(text):
            continue
        used.append((start, end))
        if cid not in hits:
            hits[cid] = term
    return hits


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
    data["retinolDeepDive"] = payload
    data["meta"]["chart7"] = "retinolDeepDive v1"
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

    fear_c: Counter = Counter()
    hope_c: Counter = Counter()
    by_seg = defaultdict(lambda: {"fears": Counter(), "hopes": Counter(), "n": 0})
    quotes = defaultdict(list)

    n_retinol = 0
    n_fear_only = 0
    n_hope_only = 0
    n_both = 0
    n_neither = 0
    n_persist = 0
    n_dropout = 0
    dropout_reasons = Counter()

    for r in rows:
        text = r.get("text") or ""
        if len(text) < 30:
            continue
        if not RETINOL_MENTION.search(text):
            continue
        n_retinol += 1
        seg = r.get("segment") or "unknown"
        by_seg[seg]["n"] += 1

        fears = find_cats(text, FEAR_M, FEARS)
        hopes = find_cats(text, HOPE_M, HOPES)

        # Specificity: if collagen + wrinkle both, keep both (different dims per spec)
        # Gold standard vs collagen — both allowed

        if fears and not hopes:
            n_fear_only += 1
        elif hopes and not fears:
            n_hope_only += 1
        elif fears and hopes:
            n_both += 1
        else:
            n_neither += 1

        if PERSISTENCE.search(text) and fears:
            n_persist += 1
        if DROPOUT.search(text):
            n_dropout += 1
            if "irritation" in fears or re.search(r"reiz|rötung|brennt", text, re.I):
                dropout_reasons["Irritation / Rötung"] += 1
            elif "over-drying" in fears or re.search(r"trocken|schupp", text, re.I):
                dropout_reasons["Austrocknung"] += 1
            elif "purging" in fears:
                dropout_reasons["Purging"] += 1
            else:
                dropout_reasons["Sonstige / Unverträglichkeit"] += 1

        for cid in fears:
            fear_c[cid] += 1
            by_seg[seg]["fears"][cid] += 1
            key = f"fear:{cid}"
            if len(quotes[key]) < 30:
                quotes[key].append(
                    {"id": r["id"], "text": text[:400], "segment": seg, "mood": r.get("mood")}
                )
        for cid in hopes:
            hope_c[cid] += 1
            by_seg[seg]["hopes"][cid] += 1
            key = f"hope:{cid}"
            if len(quotes[key]) < 30:
                quotes[key].append(
                    {"id": r["id"], "text": text[:400], "segment": seg, "mood": r.get("mood")}
                )

    fears_out = [
        {"id": cid, "label": FEARS[cid]["label"], "count": fear_c[cid], "side": "fear"}
        for cid, _ in fear_c.most_common()
    ]
    # include zero cats? Spec says fixed list — include all sorted by count
    for cid in FEARS:
        if cid not in fear_c:
            fears_out.append({"id": cid, "label": FEARS[cid]["label"], "count": 0, "side": "fear"})
    fears_out.sort(key=lambda x: -x["count"])

    hopes_out = [
        {"id": cid, "label": HOPES[cid]["label"], "count": hope_c[cid], "side": "hope"}
        for cid, _ in hope_c.most_common()
    ]
    for cid in HOPES:
        if cid not in hope_c:
            hopes_out.append({"id": cid, "label": HOPES[cid]["label"], "count": 0, "side": "hope"})
    hopes_out.sort(key=lambda x: -x["count"])

    fear_total = sum(fear_c.values())
    hope_total = sum(hope_c.values())
    ment_total = fear_total + hope_total or 1

    payload = {
        "eyebrow": "7. Retinol Deep-Dive",
        "title": "Retinol: The Fears and the Hopes",
        "note": "Mehrfachnennungen möglich, ein Kommentar kann beidseitig zählen",
        "n_retinol": n_retinol,
        "n_classified": n_retinol - n_neither,
        "unclassified_share_pct": round(100.0 * n_neither / n_retinol, 1) if n_retinol else 0,
        "fear_mentions": fear_total,
        "hope_mentions": hope_total,
        "fear_share_pct": round(100.0 * fear_total / ment_total, 1),
        "hope_share_pct": round(100.0 * hope_total / ment_total, 1),
        "fear_only": n_fear_only,
        "hope_only": n_hope_only,
        "both": n_both,
        "neither": n_neither,
        "persistence_n": n_persist,
        "dropout_n": n_dropout,
        "dropout_reasons": [{"reason": r, "count": c} for r, c in dropout_reasons.most_common(3)],
        "fears": fears_out,
        "hopes": hopes_out,
        "quotes": {k: v[:8] for k, v in quotes.items()},
        "by_segment": {
            s: {
                "n": v["n"],
                "fears": dict(v["fears"]),
                "hopes": dict(v["hopes"]),
            }
            for s, v in by_seg.items()
        },
    }

    patch_dashboard(payload)
    print(f"Retinol posts: {n_retinol}")
    print(f"Fears {fear_total} ({payload['fear_share_pct']}%) · Hopes {hope_total} ({payload['hope_share_pct']}%)")
    print(f"onlyF={n_fear_only} onlyH={n_hope_only} both={n_both} neither={n_neither}")
    print("Top fears:", [(x["id"], x["count"]) for x in fears_out[:4]])
    print("Top hopes:", [(x["id"], x["count"]) for x in hopes_out[:4]])
    print(f"Wrote {OUT_JS}")


if __name__ == "__main__":
    main()
