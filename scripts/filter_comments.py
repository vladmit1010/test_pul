#!/usr/bin/env python3
"""
Pre-filter merged PULSAR export for Revitalift anti-aging dashboard.

Input:  merged_all_deduped.csv
Config: data/definite_remove_terms.json
Output: data/merged_filtered_{suffix}.csv, data/merged_rejected_{suffix}.csv, data/filter_report_{suffix}.json

Usage:
  python3 scripts/filter_comments.py           # default suffix: v2
  python3 scripts/filter_comments.py --suffix v2
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path

from langdetect import LangDetectException, detect_langs

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "merged_all_deduped.csv"
CONFIG = ROOT / "data" / "definite_remove_terms.json"

# Brief: Mindestlänge ≥ 30 Zeichen
MIN_TEXT_LEN = 30
REQUIRE_GERMAN = True

csv.field_size_limit(50_000_000)

BEAUTY_WHITELIST = [
    r"\bbotox\b",
    r"botulinum",
    r"botulinotoxin",
    r"\bfiller\b",
    r"hyaluron",
    r"dermal filler",
    r"lippenfiller",
    r"skinbooster",
    r"profhilo",
    r"sculptra",
    r"radiesse",
    r"\bprp\b",
    r"vampir.?lifting",
    r"mesotherap",
    r"\bhifu\b",
    r"ultherapy",
    r"microneedling",
    r"mikronadel",
    r"\blaser\b",
    r"\bpeeling\b",
    r"chemisches peeling",
    r"fadenlifting",
    r"pdo.?fäden",
    r"facelifting",
    r"gesichts.?lift",
    r"wangenlifting",
    r"blepharoplast",
    r"lidstraffung",
    r"rhinoplast",
    r"nasenkorrektur",
    r"retinol",
    r"retinal",
    r"tretinoin",
    r"retinoid",
    r"niacinamid",
    r"vitamin c",
    r"ascorb",
    r"sonnenschutz",
    r"\bspf\b",
    r"anti.?aging",
    r"anti.?age",
    r"\bfalten\b",
    r"mimikfalten",
    r"krähenfü",
    r"stirnfalten",
    r"\bhaut\b",
    r"hautpflege",
    r"skincare",
    r"\bserum\b",
    r"\bcreme\b",
    r"gesichtscreme",
    r"gesichtsstraff",
    r"tränensäcke",
    r"augenringe",
    r"pigmentfleck",
    r"hyperpigment",
    r"melasma",
    r"glas.?skin",
    r"\bglow\b",
    r"kollagen",
    r"barriere",
    r"ceramide",
    r"bakuchiol",
    r"centella",
    r"\bcica\b",
    # Chart 6 — Neck / Décolleté / Hands aging
    r"halsfalten",
    r"truthahnhals",
    r"schlaffer hals",
    r"dekollet[eé]",
    r"knitterfalten",
    r"handrücken",
    r"hände verraten",
    r"hals verrät",
    r"altersflecken auf den händen",
    r"schönheits?op",
    r"ästhetik",
    r"kosmetik",
    r"dermatolog",
    r"plastische chirurg",
    r"unterspritz",
    r"injektion.*gesicht",
    r"frozen look",
    r"maskeneffekt",
    r"kissengesicht",
    r"pillow face",
    r"duckface",
    r"botched",
    r"komplikation",
    r"nebenwirkung",
    r"schwellung",
    r"bluterguss",
]

REVIEW_PRODUCT = [
    r"nivea",
    r"la roche",
    r"eucerin",
    r"avene",
    r"vichy",
    r"olay",
    r"neutrogena",
    r"cerave",
    r"the ordinary",
    r"sonnen",
    r"uv.?schutz",
    r"primer",
    r"moistur",
    r"feuchtigkeit",
    r"anti.?falten",
]

BEAUTY_RE = [re.compile(p, re.I) for p in BEAUTY_WHITELIST]
REVIEW_RE = [re.compile(p, re.I) for p in REVIEW_PRODUCT]

# Reject even if a weak beauty keyword matched (QA false positives)
POLITICAL_MARKERS = re.compile(
    r"\b(putin|trump|biden|ukraine|russland|moskau|kreml|afd|grönland|invasion|"
    r"panzer|blitzkrieg|führerbunker|blutin|vladi|nato|krieg|hamas|gaza|"
    r"palästina|israel|terrorgruppe)\b",
    re.I,
)
IDIOM_FALTEN = re.compile(
    r"stirn.{0,20}in falten legen|blatt.{0,30}falten|papier.{0,30}falten kann|"
    r"falten an den ecken|polsterung.{0,40}falten|"
    r"zitronenfalter|zitronen falten|"
    r"teig.{0,40}falten|falten.{0,40}teig|sauerteig|vollkornmehl|"
    r"wäsche.{0,30}falten|falten.{0,30}wäsche|kleidung falten|wäsche falten|"
    r"teppich.{0,40}falten|falten.{0,40}transport|beim transport.{0,30}falten|"
    r"jedes falten ist eine verdopplung|falten ist eine verdopplung|"
    r"falten.{0,40}vom sitzen|falten in der haut vom sitzen|geschichtete falten",
    re.I,
)
NON_COSMETIC_FILLER = re.compile(
    r"\b(filler episode|filler episodes|one piece|yugioh|anime|zztop|mediashop|"
    r"filler song|filler songs|no filler|killer no filler|filler waren|filler quasi|"
    r"filler classes|filler class|filler ark|\bark mit|kin \d{4}|hdfs \d|psyc \d|"
    r"epoxy.?filler|holz.?filler|balkon|truckstop|youtube.?kanal|youtube kacke|"
    r"filler blank|padded with filler|lazy writing|felt like filler)\b",
    re.I,
)
COSMETIC_FILLER = re.compile(
    r"\b(lippenfiller|dermal filler|hyaluron|unterspritz|juvederm|restylane|"
    r"skinbooster|profhilo|ästhetik|botox|gesichts|tränensäcke|wanzen|kinn|"
    r"nasolabial|marionette)\b",
    re.I,
)
FALTEN_WEAK = re.compile(r"\bfalten\b|krähenfü|stirnfalten|mimikfalten", re.I)
SKINCARE_CONTEXT = re.compile(
    r"\b(haut|skincare|creme|serum|gesicht|anti.?aging|botox|filler|retinol|"
    r"pflege|peeling|sonnenschutz|hyaluron|ästhetik|kosmetik|faltencreme|"
    r"anti.?falten)\b",
    re.I,
)
NON_BEAUTY_PRICE = re.compile(
    r"\b(industriestrom|diesel|schilling|tattoo|füllstoff|atomkraft|ei\b|bauer\b|"
    r"strompreis|batterie)\b",
    re.I,
)
NON_COSMETIC_PRODUCT = re.compile(
    r"\b(airpods|lego|legosteine?|ebay kleinanzeigen|iphone|playstation|xbox)\b",
    re.I,
)
STRONG_BEAUTY = re.compile(
    r"\b(botox|botulinum|filler|hyaluron|retinol|hautpflege|skincare|gesichtsbehandlung|"
    r"ästhetik|kosmetik|unterspritz|microneedling|peeling|sonnenschutz|anti.?aging|"
    r"lidstraffung|facelift|hifu|mesotherap)\b",
    re.I,
)
OFFTOPIC_NOISE = re.compile(
    r"\b(megathread|yorkie|yorkshire|samsung.*kamera|android v \d|hamas|gaza|"
    r"palästina|israel begeht|kriegsverbrechen|geld sklave|zahl sklave|"
    r"anne und felix|episode \d+ - die|vergewaltigung|mein hund ist|"
    r"official audio\)|official lyrics|neon vibes|scheiss dir nix|chuturu|misogynist|niggas|"
    r"chinesin nach deutschland|bewerbungsfoto|lichtgeschwindigkeit|gott-modus|"
    r"die nacht in der bibliothek|erotischen miniaturen|urbane legende|"
    r"gefallene engel|unsterbliche entitäten|buch henok|fiat-geldsystem|"
    r"wohnzimmer der gefühle|segelohr|amazon\.de/dp/|affiliate-link|"
    r"\bdlss\b|fotorealismus.*spiel|klebreis|bananenblät|"
    r"cbd blüten|cango|medcanonestop|doktorabc)\b",
    re.I,
)
HOME_FURNITURE = re.compile(
    r"\b(ecksofa|hukla|nappaleder|longlife nappaleder|polsterhocker|"
    r"hochflor teppich|sofa mit polster|dekadenliving|anti-aging-effekt.*leder)\b",
    re.I,
)
NON_COSMETIC_LASER = re.compile(
    r"\b(laserstrahl|hologramm|neon.?light|neonlichter|python//|"
    r"lichtgeschwindigkeit|gott-modus|official lyrics)\b",
    re.I,
)
COSMETIC_LASER_CTX = re.compile(
    r"\b(laserbehandlung|laser.*haut|pigmentfleck|haarentfernung|ipl|fotona|"
    r"laser.*gesicht|laser.*verbrannt|laser.*weg)\b",
    re.I,
)
JOINT_MEDICAL = re.compile(
    r"\b(gelenknahrung|gelenk.{0,30}hyaluron|arthrose|knorpel|knie.{0,20}schmerz)\b",
    re.I,
)
SKIN_CONTEXT = re.compile(
    r"\b(haut|gesicht|gesichts|skincare|augenringe|falten|creme|serum|ästhetik)\b",
    re.I,
)
POLITICAL_AUGENRINGE = re.compile(
    r"(augenringe.{0,100}(vermögenssteuer|merz|afd|politik|israel|hamas|bratpfanne))|"
    r"((vermögenssteuer|merz|afd|politik).{0,100}augenringe)",
    re.I,
)
INTERIOR_NOISE = re.compile(
    r"\b(wabi sabi|innenarchitekt|axel vervoort|creme trend.*kanye|"
    r"designlehre.*abgerundet)\b",
    re.I,
)
BOTOX_INSULT = re.compile(
    r"(\bbotox\b.{0,90}(sklave|schizophren|bratze|sex.?appeal|niggas|chuturu|"
    r"misogynist|shit nicht hören|dafür bezahlen|geschwollen))|"
    r"((sklave|schizophren|bratze|niggas).{0,90}\bbotox\b)",
    re.I,
)
FOREIGN_SCRIPT = re.compile(r"[\u0900-\u097F\u0600-\u06FF\u4E00-\u9FFF]")

# Brief excludes pure clinic/product ads. Hard CTA / ad markers.
MARKETING_CTA = re.compile(
    r"(buche jetzt|jetzt erhältlich|online bestellbar|link in bio|link unten|"
    r"#ad\b|\[anzeige\]|\(anzeige\)|anzeige\s*\||\|\s*anzeige|"
    r"termine?\s+verfügbar|plätze frei|rabattaktion|jetzt bestellen|"
    r"jetzt anfragen|termin per dm|\bdoctolib\b|willkommen bei|"
    r"brandneue produkte|erstbehandlung bei|#kosmetikstudio|#beautylounge|"
    r"#tiktokshop|tiktokshop|wir suchen ein modell|begrenzte termine|"
    r"jetzt über den link|shop now|%\s*(rabatt|sparen)|\d+\s*%\s*sparen)",
    re.I,
)
CLINIC_WE_VOICE = re.compile(
    r"\b(unsere kundinnen|unsere patientinnen|bei uns im (store|studio|institut)|"
    r"wir bieten|unsere praxis|unser studio|unsere behandlung|unsere top-behandlungen|"
    r"wir kombinieren|meine patientinnen)\b",
    re.I,
)
PERSONAL_CONSUMER = re.compile(
    r"\b(ich habe|ich hatte|ich bin|bei mir|mein ergebnis|meine haut hat|"
    r"mir wurde|ich bereue|ich überlege|meine erfahrung|ich würde|"
    r"hab mir|habe mir|nach meiner|seit ich)\b",
    re.I,
)

DE_MARKERS = re.compile(
    r"\b(der|die|das|und|ich|nicht|ist|mit|für|auf|eine|einem|habe|aber|auch|"
    r"nur|sehr|schon|wenn|wie|was|dass|bin|sind|wird|haben|können|würde|"
    r"meine|mein|bei|nach|oder|noch|mal|war|kann|sein|einer|dem|den|des|"
    r"skincare|hautpflege|falten|gesicht|creme|serum)\b",
    re.I,
)
DE_UMLAUT = re.compile(r"[äöüßÄÖÜ]")


def load_config() -> tuple[set[str], list[tuple[str, str, re.Pattern]]]:
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    excluded = set(data.get("excluded_sources", []))
    rules: list[tuple[str, str, re.Pattern]] = []
    for cat_id, block in data.get("categories", {}).items():
        for raw in block.get("patterns", []):
            rules.append((cat_id, raw, re.compile(raw, re.I)))
    return excluded, rules


EXCLUDED_SOURCES, DEFINITE_REMOVE = load_config()


def norm_row(row: dict[str, str] | list[str]) -> dict[str, str]:
    """Accept DictReader rows (preferred) or legacy 5-col positional lists."""
    if isinstance(row, dict):
        d = {
            "id": (row.get("id") or "").lstrip("\ufeff"),
            "source": row.get("source") or "",
            "title": row.get("title") or "",
            "content": row.get("content") or "",
            "date": row.get("date") or row.get("date (UTC)") or "",
        }
        return d
    keys = ["id", "source", "title", "content", "date"]
    padded = (list(row) + [""] * 5)[:5]
    d = dict(zip(keys, padded))
    d["id"] = d["id"].lstrip("\ufeff")
    return d


def combined_text(row: dict[str, str]) -> str:
    return f"{row.get('title', '')} {row.get('content', '')}".strip()


def count_matches(patterns: list[re.Pattern], text: str) -> int:
    return sum(1 for p in patterns if p.search(text))


def is_german(text: str) -> tuple[bool, str]:
    """Return (is_german, reason/detail)."""
    if DE_UMLAUT.search(text):
        return True, "umlaut"

    marker_hits = len(DE_MARKERS.findall(text))
    if marker_hits >= 3:
        return True, f"markers:{marker_hits}"

    sample = text[:500] if len(text) > 500 else text
    if len(sample) < 40:
        return marker_hits >= 1, f"short:markers:{marker_hits}"

    try:
        langs = detect_langs(sample)
    except LangDetectException:
        return marker_hits >= 2, "detect_failed"

    if not langs:
        return marker_hits >= 2, "no_lang"

    top = langs[0]
    de_prob = next((x.prob for x in langs if x.lang == "de"), 0.0)

    if top.lang == "de" and top.prob >= 0.50:
        return True, f"detect:de:{top.prob:.2f}"

    if de_prob >= 0.35 and marker_hits >= 1:
        return True, f"detect:de_mix:{de_prob:.2f}"

    if marker_hits >= 2:
        return True, f"markers_override:{marker_hits}"

    return False, f"detect:{top.lang}:{top.prob:.2f}"


def match_definite_remove(text: str) -> str | None:
    for cat_id, raw, pat in DEFINITE_REMOVE:
        if pat.search(text):
            return f"definite_remove:{cat_id}:{raw[:48]}"
    return None


def match_marketing_promo(text: str) -> str | None:
    """Drop pure ads/clinic marketing (brief: no personal stance). Keep personal consumer talk."""
    if MARKETING_CTA.search(text) and not PERSONAL_CONSUMER.search(text):
        return "keyword_trap:marketing_cta"
    hashtags = re.findall(r"#\w+", text)
    if len(hashtags) >= 6 and CLINIC_WE_VOICE.search(text) and not PERSONAL_CONSUMER.search(text):
        return "keyword_trap:clinic_hashtag_promo"
    if CLINIC_WE_VOICE.search(text) and MARKETING_CTA.search(text) and not PERSONAL_CONSUMER.search(text):
        return "keyword_trap:clinic_we_cta"
    # Long marketing copy: we-voice + many emoji stars + no personal consumer stance
    if (
        CLINIC_WE_VOICE.search(text)
        and not PERSONAL_CONSUMER.search(text)
        and len(text) >= 280
        and (text.count("✨") + text.count("🤍") + text.count("🌿")) >= 3
    ):
        return "keyword_trap:clinic_marketing_copy"
    return None


def match_keyword_trap(text: str, beauty_hits: int) -> str | None:
    """Beauty-adjacent keywords in politics, idioms, or wrong product context."""
    promo = match_marketing_promo(text)
    if promo:
        return promo
    if HOME_FURNITURE.search(text) and not STRONG_BEAUTY.search(text):
        return "keyword_trap:home_furniture"
    if INTERIOR_NOISE.search(text) and not STRONG_BEAUTY.search(text):
        return "keyword_trap:interior_design"
    if JOINT_MEDICAL.search(text) and not SKIN_CONTEXT.search(text):
        return "keyword_trap:joint_not_skincare"
    if POLITICAL_AUGENRINGE.search(text):
        return "keyword_trap:political_augenringe"
    if re.search(r"\blaser\b", text, re.I):
        if NON_COSMETIC_LASER.search(text) and not COSMETIC_LASER_CTX.search(text):
            return "keyword_trap:laser_non_cosmetic"
    if OFFTOPIC_NOISE.search(text) and not STRONG_BEAUTY.search(text):
        return "keyword_trap:offtopic_noise"
    if FOREIGN_SCRIPT.search(text) and beauty_hits <= 2 and not STRONG_BEAUTY.search(text):
        return "keyword_trap:foreign_script"
    if BOTOX_INSULT.search(text):
        return "keyword_trap:botox_gossip_insult"
    if POLITICAL_MARKERS.search(text) and not STRONG_BEAUTY.search(text):
        return "keyword_trap:politics_without_beauty"
    if POLITICAL_MARKERS.search(text) and beauty_hits <= 1:
        return "keyword_trap:politics_weak_beauty"
    if IDIOM_FALTEN.search(text) and not STRONG_BEAUTY.search(text):
        return "keyword_trap:idiom_falten"
    if re.search(r"\bfiller\b", text, re.I):
        if NON_COSMETIC_FILLER.search(text):
            return "keyword_trap:filler_non_cosmetic"
        if not COSMETIC_FILLER.search(text) and beauty_hits <= 1:
            return "keyword_trap:filler_without_cosmetic_context"
    if beauty_hits == 1 and FALTEN_WEAK.search(text) and not SKINCARE_CONTEXT.search(text):
        return "keyword_trap:weak_falten_only"
    if NON_COSMETIC_PRODUCT.search(text) and beauty_hits <= 1:
        return "keyword_trap:non_cosmetic_product"
    if re.search(r"\b112\b", text) and re.search(
        r"psychiatr|notfallsanitäter|rettungsdienst", text, re.I
    ):
        if not STRONG_BEAUTY.search(text):
            return "keyword_trap:medical_emergency_idiom"
    return None


def classify(row: dict[str, str]) -> tuple[bool, str]:
    text = combined_text(row)
    lower = text.lower()
    source = (row.get("source") or "").strip()

    if source in EXCLUDED_SOURCES:
        return False, f"source_excluded:{source}"

    if len(text) < MIN_TEXT_LEN:
        return False, "too_short"

    definite = match_definite_remove(text)
    if definite:
        return False, definite

    beauty_hits = count_matches(BEAUTY_RE, text)
    review_hits = count_matches(REVIEW_RE, text) if source == "Reviews" else 0

    trap_early = match_keyword_trap(text, beauty_hits)
    if trap_early:
        return False, trap_early

    if beauty_hits >= 1:
        if REQUIRE_GERMAN:
            ok_de, de_detail = is_german(text)
            if not ok_de:
                return False, f"language_not_german:{de_detail}"
        return True, "beauty_whitelist"

    if review_hits >= 2 or (source == "Reviews" and review_hits >= 1):
        trap_review = match_keyword_trap(text, beauty_hits + review_hits)
        if trap_review:
            return False, trap_review
        if REQUIRE_GERMAN:
            ok_de, de_detail = is_german(text)
            if not ok_de:
                return False, f"language_not_german:{de_detail}"
        return True, "review_skincare"

    if len(text) < 80 and re.fullmatch(
        r"[\s\W\d]*(botox|filler|é filler|el botox)[\s\W\d]*",
        lower,
        re.I,
    ):
        return False, "keyword_spam_short"

    return False, "no_beauty_signal"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--suffix", default="v2", help="Output file suffix (default: v2)")
    args = parser.parse_args()
    suffix = args.suffix

    out_filtered = ROOT / "data" / f"merged_filtered_{suffix}.csv"
    out_rejected = ROOT / "data" / f"merged_rejected_{suffix}.csv"
    out_report = ROOT / "data" / f"filter_report_{suffix}.json"

    out_filtered.parent.mkdir(parents=True, exist_ok=True)

    kept: list[dict[str, str]] = []
    rejected: list[dict[str, str]] = []
    reasons = Counter()
    sources_kept = Counter()
    sources_rejected = Counter()
    definite_by_category = Counter()

    language_rejects = Counter()
    processed = 0

    with INPUT.open(encoding="utf-8", errors="replace", newline="") as f:
        # Header-aware: merged_all_deduped.csv has slim extra cols before/after core fields
        reader = csv.DictReader(f, delimiter=";")
        if not reader.fieldnames or "content" not in reader.fieldnames:
            raise SystemExit(
                f"Expected CSV header with content column in {INPUT}; got {reader.fieldnames}"
            )

        for row in reader:
            item = norm_row(row)
            ok, reason = classify(item)
            src = item.get("source", "")
            if ok:
                kept.append(item)
                sources_kept[src] += 1
            else:
                item["reject_reason"] = reason
                rejected.append(item)
                reasons[reason] += 1
                sources_rejected[src] += 1
                if reason.startswith("definite_remove:"):
                    cat = reason.split(":")[1]
                    definite_by_category[cat] += 1
                if reason.startswith("language_not_german:"):
                    language_rejects[reason.split(":", 1)[1].split(":")[0]] += 1
            processed += 1
            if processed % 25000 == 0:
                print(
                    f"… {processed:,}  kept={len(kept):,}  rejected={len(rejected):,}",
                    flush=True,
                )

    fieldnames = ["id", "source", "title", "content", "date"]

    with out_filtered.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";", extrasaction="ignore")
        w.writeheader()
        w.writerows(kept)

    with out_rejected.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f, fieldnames=fieldnames + ["reject_reason"], delimiter=";", extrasaction="ignore"
        )
        w.writeheader()
        w.writerows(rejected)

    total = len(kept) + len(rejected)
    report = {
        "version": suffix,
        "input_file": str(INPUT.name),
        "config_file": str(CONFIG.relative_to(ROOT)),
        "excluded_sources": sorted(EXCLUDED_SOURCES),
        "require_german": REQUIRE_GERMAN,
        "definite_remove_pattern_count": len(DEFINITE_REMOVE),
        "total_rows": total,
        "kept": len(kept),
        "rejected": len(rejected),
        "kept_percent": round(100 * len(kept) / total, 2) if total else 0,
        "definite_remove_by_category": dict(definite_by_category.most_common()),
        "language_rejects_summary": dict(language_rejects.most_common(15)),
        "reject_reasons_top30": dict(reasons.most_common(30)),
        "kept_by_source": dict(sources_kept.most_common()),
        "rejected_by_source": dict(sources_rejected.most_common()),
        "outputs": {
            "filtered": str(out_filtered.relative_to(ROOT)),
            "rejected": str(out_rejected.relative_to(ROOT)),
            "report": str(out_report.relative_to(ROOT)),
        },
    }

    out_report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
