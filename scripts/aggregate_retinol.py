#!/usr/bin/env python3
"""
Chart 7 — Retinol Deep-Dive bubble chart.

11 fixed themes × (fear|hope) · net valence (x) · experienced share (y) · volume (area).

Usage:
  python3 scripts/aggregate_retinol.py
  python3 scripts/aggregate_retinol.py --input data/classified_v10.jsonl
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLASSIFIED = ROOT / "data" / "classified_v10.jsonl"
THEMES_PATH = ROOT / "data" / "retinol_themes.json"
OUT_JS = ROOT / "data" / "dashboard_generated.js"

RETINOL_MENTION = re.compile(
    r"\b(retinol|retinal|tretinoin|retinoide?n?|vitamin-?a-derivat|\btret\b)\b",
    re.I,
)
NEGATION = re.compile(
    r"\b(kein|keine|keinen|nicht|nie|bloß kein|bloss kein|ohne|zum glück kein|zum glueck kein)\b",
    re.I,
)
PERSISTENCE = re.compile(
    r"\b(durchhalten|durchgehalten|nicht aufgegeben|nach (drei|3|vier|4|sechs|6|einigen) monaten|"
    r"erst schlimm.{0,40}(dann|jetzt)|anfangs.{0,40}(jetzt|dann)|eingewöhn|"
    r"hat sich gelohnt|langfristig|purging ging vorbei|schlimm.?e phase war)\b",
    re.I,
)
DROPOUT = re.compile(
    r"\b(abgebrochen|aufgehört|aufgehoert|nicht mehr benutzt|wieder abgesetzt|"
    r"kann (es )?nicht vertragen|zu stark für mich|zu stark fuer mich|"
    r"höre auf|hoere auf|hör auf damit|hor auf damit|weggelassen|abgesetzt|"
    r"nie wieder retinol|kein retinol mehr)\b",
    re.I,
)
EXPERIENCED = re.compile(
    r"\b(bei mir|meine haut|ich habe|ich hatt[e]?|ich bin|ich war|ich nutz[te]?|"
    r"ich verwend[ete]?|ich schmier|ich trag|mir hat|bei mir war|nach \w+ monaten|"
    r"seit (einem |einer |\d+|wochen|monaten)|funktioniert(e)? bei mir|"
    r"verträgt(e)? ich|vertraegt(e)? ich|hat mir|wurde besser|wurde schlimmer|"
    r"ging vorbei|mein retinol|meinem retinol|mit retinol (arbeite|arbeite ich|angefangen)|"
    r"nehme (es |retinol )?schon|benutze (es |retinol )?schon|ich nehme)\b",
    re.I,
)
ANTICIPATED = re.compile(
    r"\b(ich habe gehört|ich habe gehoert|man sagt|soll (angeblich )?|"
    r"angeblich|werde ich|würde ich|wuerde ich|falls ich|wenn ich (anfange|starte)|"
    r"traue mich|habe angst|befürcht|befuercht|ob (das|es)|wie lange|"
    r"was passiert|kann man|darf man|sollte man|möchte (gerne )?|"
    r"interessiert mich|überleg|ueberleg)\b",
    re.I,
)
QUESTION = re.compile(r"\?")


def fold(s: str) -> str:
    s = (s or "").lower().replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def negated(text: str, start: int, window: int = 42) -> bool:
    return bool(NEGATION.search(text[max(0, start - window) : start]))


def compile_terms(terms: list[str]) -> list[tuple[str, re.Pattern]]:
    items = [(t, re.compile(re.escape(t), re.I)) for t in terms]
    items.sort(key=lambda x: -len(x[0]))
    return items


def load_themes(path: Path) -> tuple[dict, list[dict]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    themes = []
    for t in data["themes"]:
        themes.append(
            {
                **t,
                "fear_m": compile_terms([fold(x) for x in t.get("fear") or []]),
                "hope_m": compile_terms([fold(x) for x in t.get("hope") or []]),
            }
        )
    return data, themes


def side_hits(folded: str, matchers: list[tuple[str, re.Pattern]]) -> list[tuple[int, str]]:
    """Return [(start, term), ...] for non-negated matches."""
    out = []
    for term, pat in matchers:
        for m in pat.finditer(folded):
            if negated(folded, m.start()):
                continue
            out.append((m.start(), term))
    return out


def classify_theme_side(folded: str, theme: dict) -> str | None:
    """Dominant fear|hope for one theme, or None. Negated fear phrases that are hope signals still count via hope list."""
    fears = side_hits(folded, theme["fear_m"])
    hopes = side_hits(folded, theme["hope_m"])
    if not fears and not hopes:
        return None
    # Special: "kein purging" etc. — if hope matched and fear term was negated, hope wins
    if hopes and not fears:
        return "hope"
    if fears and not hopes:
        return "fear"
    # Both: pick side with more / longer matches; tie → hope if persistence journey else fear
    fear_score = sum(len(t) for _, t in fears)
    hope_score = sum(len(t) for _, t in hopes)
    if hope_score > fear_score:
        return "hope"
    if fear_score > hope_score:
        return "fear"
    if PERSISTENCE.search(folded):
        return "hope"
    # earlier fear mention → fear, else hope
    return "fear" if fears[0][0] <= hopes[0][0] else "hope"


def experience_axis(folded: str, text: str) -> str:
    """Return 'experienced' | 'anticipated'."""
    exp = bool(EXPERIENCED.search(folded))
    ant = bool(ANTICIPATED.search(folded) or QUESTION.search(text))
    if exp and not ant:
        return "experienced"
    if ant and not exp:
        return "anticipated"
    if exp and ant:
        # First-person past wins when both present (journey / reported outcome)
        if re.search(r"\b(war|hatte|wurde|ging|hat sich|bei mir)\b", folded):
            return "experienced"
        return "anticipated"
    # Default: if first-person present about use → experienced-ish; else anticipated
    if re.search(r"\b(ich|mein[e]?|mir)\b", folded) and re.search(
        r"\b(benutz|verwend|nehm|trag|schmier|mach)\b", folded
    ):
        return "experienced"
    return "anticipated"


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
    prefix = m.group(0)
    raw = text[m.end() :]
    if raw.rstrip().endswith(";"):
        raw = raw.rstrip()[:-1]
    data = json.loads(raw)
    data["retinolDeepDive"] = payload
    data.setdefault("meta", {})["chart7"] = "retinolDeepDive bubble v2"
    OUT_JS.write_text(prefix.rstrip() + "\n" + json.dumps(data, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(CLASSIFIED))
    ap.add_argument("--themes", default=str(THEMES_PATH))
    args = ap.parse_args()

    meta, themes = load_themes(Path(args.themes))
    families = meta["families"]
    min_n = int(meta.get("min_mentions") or 15)
    rows = load_jsonl(Path(args.input))

    # theme_id -> counters
    fear_c: Counter = Counter()
    hope_c: Counter = Counter()
    exp_c: Counter = Counter()  # experienced mentions per theme
    ant_c: Counter = Counter()
    by_seg = defaultdict(
        lambda: {
            "n": 0,
            "fear": Counter(),
            "hope": Counter(),
            "experienced": Counter(),
            "anticipated": Counter(),
        }
    )
    quotes = defaultdict(list)  # fear:id / hope:id

    n_retinol = 0
    n_classified = 0
    n_neither = 0
    n_persist = 0
    n_dropout = 0
    dropout_reasons = Counter()
    fear_mentions = 0
    hope_mentions = 0

    for r in rows:
        text = r.get("text") or ""
        if len(text) < 30:
            continue
        if not RETINOL_MENTION.search(text):
            continue
        n_retinol += 1
        folded = fold(text)
        seg = r.get("segment") or "unknown"
        by_seg[seg]["n"] += 1

        theme_sides: dict[str, str] = {}
        for th in themes:
            side = classify_theme_side(folded, th)
            if side:
                theme_sides[th["id"]] = side

        if not theme_sides:
            n_neither += 1
            continue
        n_classified += 1

        axis = experience_axis(folded, text)
        journey = bool(PERSISTENCE.search(folded))
        dropped = bool(DROPOUT.search(folded))

        if journey:
            n_persist += 1
        if dropped:
            n_dropout += 1
            if any(s == "fear" and tid.startswith("tolerability") for tid, s in theme_sides.items()) or re.search(
                r"reiz|roetung|rotung|brennt", folded
            ):
                dropout_reasons["Irritation / Rötung"] += 1
            elif any(tid == "purging-bad-phase" for tid in theme_sides) or "purging" in folded:
                dropout_reasons["Purging"] += 1
            elif re.search(r"trocken|schupp|spannungs", folded):
                dropout_reasons["Austrocknung"] += 1
            else:
                dropout_reasons["Sonstige / Unverträglichkeit"] += 1

        for tid, side in theme_sides.items():
            if side == "fear":
                fear_c[tid] += 1
                fear_mentions += 1
                by_seg[seg]["fear"][tid] += 1
            else:
                hope_c[tid] += 1
                hope_mentions += 1
                by_seg[seg]["hope"][tid] += 1

            if axis == "experienced":
                exp_c[tid] += 1
                by_seg[seg]["experienced"][tid] += 1
            else:
                ant_c[tid] += 1
                by_seg[seg]["anticipated"][tid] += 1

            qkey = f"{side}:{tid}"
            if len(quotes[qkey]) < 12:
                quotes[qkey].append(
                    {
                        "id": r.get("id"),
                        "text": text[:320],
                        "segment": seg,
                        "mood": r.get("mood"),
                        "source": r.get("source"),
                        "axis": axis,
                    }
                )

    bubbles = []
    rest = []
    for th in themes:
        tid = th["id"]
        f = fear_c[tid]
        h = hope_c[tid]
        vol = f + h
        if vol <= 0:
            rest.append({"id": tid, "label": th["label"], "volume": 0, "fear": 0, "hope": 0})
            continue
        net = round(100.0 * (h - f) / vol, 1)
        e = exp_c[tid]
        a = ant_c[tid]
        ea = e + a
        experienced_pct = round(100.0 * e / ea, 1) if ea else 50.0
        fam = families[th["family"]]
        row = {
            "id": tid,
            "label": th["label"],
            "family": fam["id"],
            "family_label": fam["label"],
            "color": fam["color"],
            "volume": vol,
            "fear": f,
            "hope": h,
            "net_valence": net,
            "experienced": e,
            "anticipated": a,
            "experienced_pct": experienced_pct,
            "quotes_fear": quotes.get(f"fear:{tid}", [])[:3],
            "quotes_hope": quotes.get(f"hope:{tid}", [])[:3],
        }
        if vol < min_n:
            rest.append(row)
        else:
            bubbles.append(row)

    bubbles.sort(key=lambda x: -x["volume"])
    rest.sort(key=lambda x: -x["volume"])
    ment_total = fear_mentions + hope_mentions or 1
    journey_denom = n_persist + n_dropout or 1

    payload = {
        "eyebrow": meta.get("eyebrow") or "7. Retinol Deep-Dive",
        "title": meta.get("title") or "Retinol: The Fears and the Hopes Behind the Gold Standard",
        "viz": "bubble",
        "note": "Mehrfachnennungen möglich, ein Beitrag kann mehrere Themen betreffen",
        "axis": {
            "x": "Netto-Valenz (Hoffnung − Sorge) in Prozentpunkten",
            "x_unit": "pp",
            "y": "Erlebt vs. antizipiert (% erlebt)",
            "y_unit": "% erlebt",
        },
        "quadrants": [
            {
                "id": "fear-anticipated",
                "label": "Befürchtet, selten erlebt",
                "hint": "Barrieren aus Hörensagen — Aufklärung wirkt",
            },
            {
                "id": "fear-experienced",
                "label": "Negativ & erlebt",
                "hint": "Reale Probleme — Kommunikation allein löst sie nicht",
            },
            {
                "id": "hope-experienced",
                "label": "Erlebte Bestätigung",
                "hint": "Eignet sich als Beleg",
            },
        ],
        "families": list(families.values()),
        "n_retinol": n_retinol,
        "n_classified": n_classified,
        "unclassified_share_pct": round(100.0 * n_neither / n_retinol, 1) if n_retinol else 0,
        "fear_mentions": fear_mentions,
        "hope_mentions": hope_mentions,
        "fear_share_pct": round(100.0 * fear_mentions / ment_total, 1),
        "hope_share_pct": round(100.0 * hope_mentions / ment_total, 1),
        "persistence_n": n_persist,
        "dropout_n": n_dropout,
        "persistence_share_pct": round(100.0 * n_persist / journey_denom, 1),
        "dropout_share_pct": round(100.0 * n_dropout / journey_denom, 1),
        "dropout_reasons": [{"reason": r, "count": c} for r, c in dropout_reasons.most_common(3)],
        "min_mentions": min_n,
        "bubbles": bubbles,
        "rest": [
            {
                "id": x["id"],
                "label": x["label"],
                "volume": x["volume"],
                "fear": x.get("fear", 0),
                "hope": x.get("hope", 0),
            }
            for x in rest
        ],
        "quotes": {k: v[:8] for k, v in quotes.items()},
        "by_segment": {
            s: {
                "n": v["n"],
                "fear": dict(v["fear"]),
                "hope": dict(v["hope"]),
                "experienced": dict(v["experienced"]),
                "anticipated": dict(v["anticipated"]),
            }
            for s, v in by_seg.items()
        },
        # Back-compat for old tornado filters (aggregate sides as lists)
        "fears": [
            {"id": th["id"], "label": th["label"], "count": fear_c[th["id"]], "side": "fear"}
            for th in themes
        ],
        "hopes": [
            {"id": th["id"], "label": th["label"], "count": hope_c[th["id"]], "side": "hope"}
            for th in themes
        ],
    }

    patch_dashboard(payload)
    print(f"Retinol posts: {n_retinol} · classified {n_classified} · neither {n_neither}")
    print(
        f"Fears {fear_mentions} ({payload['fear_share_pct']}%) · "
        f"Hopes {hope_mentions} ({payload['hope_share_pct']}%)"
    )
    print(f"Bubbles (≥{min_n}): {len(bubbles)} · rest: {len(rest)}")
    for b in bubbles[:6]:
        print(
            f"  {b['volume']:5d}  val={b['net_valence']:+6.1f}  "
            f"exp={b['experienced_pct']:5.1f}%  {b['label']}"
        )
    print(f"Wrote {OUT_JS}")


if __name__ == "__main__":
    main()
