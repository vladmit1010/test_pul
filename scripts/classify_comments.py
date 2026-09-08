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
DEFAULT_INPUT = ROOT / "data" / "merged_filtered_v10.csv"
OUT_JSONL = ROOT / "data" / "classified_v10.jsonl"
OUT_REVIEW = ROOT / "data" / "review_queue_v10.csv"
CONFIG = ROOT / "scripts" / "classify_config.json"

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

# German-rich label text for better embedding match (LOP REV 6 moods)
MOOD_LABELS = {
    "enthusiastic": (
        "begeistert ich liebe mein ergebnis bester entschluss empfehle es weiter "
        "endlich für mich game changer fühle mich wie neugeboren"
    ),
    "satisfied": (
        "zufrieden gutes ergebnis würde es wieder machen hat funktioniert "
        "macht seinen job kein drama einfach gut gemacht"
    ),
    "seeking": (
        "was kostet wie lange hält es erfahrung frage vergleiche noch unsicher "
        "information womit soll ich anfangen lohnt sich worauf achten"
    ),
    "conflicted": (
        "hin und hergerissen zwiespältig ambivalent einerseits andererseits "
        "schäme mich gesellschaftsdruck schönheitsdruck eigentlich dagegen aber "
        "will und will nicht unsicher ob ich es machen soll reizt mich aber angst"
    ),
    "disappointed": (
        "enttäuscht hat nichts gebracht geld verschwendet enttäuschend schlecht bereue "
        "sieht man kaum einen unterschied habe mir mehr erwartet"
    ),
    "cautioning": (
        "vorsicht informieren komplikationen warnung bitte beachten risiko finger weg "
        "arzt klinik frozen look lasst euch nicht blenden zweite meinung"
    ),
}

SEGMENT_LABELS = {
    "procedure-open": (
        "hatte schon botox filler behandlung termin auffrischung wartung nächster termin "
        "maintenance nachspritzen lasse regelmäßig machen zweite sitzung"
    ),
    "procedure-curious": (
        "überlege es mir angst traue mich nicht erste beratung vorsichtig interessiert "
        "aber unsicher tut laser weh angst vor nadeln irgendwann vielleicht"
    ),
    "skincare-first": (
        "kein botox keine nadeln nur skincare hautpflege retinol serum creme ohne eingriff "
        "setze auf pflege nie unters messer anti-aging-routine"
    ),
}

# Chart 2 topics — Block A + B from LOP REV prompts
TOPIC_KEYWORDS = {
    "botox": ["botox", "botulinum", "botulinotoxin", "dysport", "xeomin", "fältchen-spritze", "boti", "baby botox", "masseter"],
    "fillers": [
        "lippenfiller",
        "lippenunterspritz",
        "wangenfiller",
        "jawline-filler",
        "jawline filler",
        "nasolabialfalten-filler",
        "tränenrinnen-filler",
        "dermal filler",
        "hyaluron unterspritz",
        "unterspritz",
        "juvederm",
        "restylane",
        "skinbooster",
        "profhilo",
    ],
    "laser": ["laserbehandlung", "fraxel", "co2-laser", "co2 laser", "fraktionierter laser", "pigmentlaser", "ipl", "fotona"],
    "threads": [
        "fadenlifting",
        "thread lift",
        "pdo faden",
        "pdo-faden",
        "silhouette soft",
        "ultherapy",
        "hifu",
        "ultraschall-lifting",
        "ultraschalllifting",
    ],
    "facelift": ["facelift", "facelifting", "gesichtsstraffung", "lidstraffung", "blepharoplastik", "halslift", "stirnlift"],
    "peel": [
        "peeling",
        "microneedling",
        "fruchtsäure",
        "chemisches peeling",
        "aha-peeling",
        "bha-peeling",
        "dermapen",
        "morpheus8",
        "tca-peeling",
    ],
    "retinol": ["retinol", "retinal", "retinoid", "tretinoin", "vitamin a", "tret"],
    "vitamin-c": ["vitamin c", "vitamin-c", "ascorbinsäure", "l-ascorbic"],
    "hyaluronic-acid": ["hyaluronsäure", "hyaluron serum", "hyaluron creme", "hyaluron pflege", "ha-serum"],
    "niacinamide-peptides": ["niacinamid", "niacinamide", "vitamin b3", "peptide", "kupfer-peptid", "kupferpeptid"],
    "spf": ["spf", "sonnenschutz", "uv-schutz", "sonnencreme", "lichtschutzfaktor", "lsf", "face yoga", "gua sha", "prävention"],
    "aging-signs": [
        "hautalterung",
        "alterungserscheinungen",
        "alterszeichen",
        "elastizitätsverlust",
        "schlaffe haut",
        "altersflecken",
        "pigmentflecken",
        "volumenverlust",
        "erschlaffung",
        "faltenbildung",
        "nasolabialfalten",
        "stirnfalten",
        "krähenfüße",
        "marionettenfalten",
        "tiefe falten",
        "konturverlust",
    ],
    "price": [],
    "pressure": [
        "schönheitswahn",
        "jugendkult",
        "gesellschaftsdruck",
        "soll man",
        "alle machen es",
        "filter-druck",
        "beauty-standards",
        "alt wirken",
        "schamgefühl",
    ],
    "safety": [
        "nebenwirkung",
        "komplikation",
        "seriöser arzt",
        "zertifizierung",
        "zweite meinung",
        "beratungsqualität",
        "wem kann man glauben",
    ],
    "natural": [
        "natürlich altern",
        "natürlich aussehen",
        "ohne eingriff",
        "aging gracefully",
        "frozen look",
        "man soll es nicht sehen",
        "noch ich selbst",
    ],
    "celebrity": ["promi", "celebrity", "influencer", "kim kardashian", "vorher-nachher", "hat sie oder"],
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
    r"\b(willkommen bei|plätze frei|brandneue produkte|jetzt erhältlich|"
    r"erstbehandlung bei|termin per dm|#kosmetikstudio|#beautylounge|"
    r"buche jetzt|online bestellbar|link in bio|link unten|#ad\b|"
    r"\[anzeige\]|\(anzeige\)|termine?\s+verfügbar|jetzt bestellen|"
    r"tiktokshop|unsere kundinnen|bei uns im store|begrenzte termine|"
    r"rabattaktion|%\s*(rabatt|sparen)|wir bieten|unsere praxis|"
    r"unser studio|unsere (top-)?behandlung)\b",
    re.I,
)
PERSONAL_FIRSTPERSON = re.compile(
    r"\b(ich habe|ich hatte|ich bin|bei mir|mein ergebnis|meine haut|"
    r"mir wurde|ich bereue|meine erfahrung|hab mir|habe mir|"
    r"nach meiner|seit ich|ich würde es|bin begeistert von meinem)\b",
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
    r"🚨|mega toll|entdecke jetzt|we love|glow, aber wissenschaftlich|"
    r"buche jetzt|online bestellbar|link in bio|#ad\b|anzeige|"
    r"unsere kundinnen|wir bieten dir|für strahlende haut🤍)\b",
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
    r"null wirkung|hat nichts gebracht|geld verschwendet|bereu|enttäuscht|"
    r"geld zum fenster|würde ich nicht wieder|kaum einen unterschied|"
    r"habe mir mehr erwartet)\b",
    re.I,
)
CAUTIONING_OVERRIDE = re.compile(
    r"\b(finger weg|bitte vorher (gut )?informieren|lasst euch nicht|"
    r"hätte ich vorher wissen|komplikation(en)?|"
    r"warnung vor|abraten von|nicht empfehlen\.|sehr unnatürlich|"
    r"frozen look.{0,20}(vorsicht|warn|finger)|"
    r"zweite meinung (einholen|holen))\b",
    re.I,
)
ENTHUSIASTIC_OVERRIDE = re.compile(
    r"\b(begeistert|liebe es|beste entscheidung|empfehle|kaufempfehlung|"
    r"wunderschön|definitiv nachkaufen|mega gut|highlight|game.?changer|"
    r"wie neugeboren|klare kaufempfehlung|muss ich haben)\b",
    re.I,
)
SATISFIED_OVERRIDE = re.compile(
    r"\b(bin zufrieden|sehr zufrieden|zufrieden damit|würde es wieder|"
    r"hat genau das|macht seinen job|kein drama|gut gemacht|"
    r"lässt sich gut|zieht schnell ein|kann ich empfehlen)\b",
    re.I,
)
SEEKING_OVERRIDE = re.compile(
    r"\b(was kostet|wie lange hält|hat jemand erfahrung|wollte nur mal fragen|"
    r"kenne mich noch nicht|womit soll ich|lohnt sich|worauf muss ich|"
    r"wie läuft das ab|erfahrung mit|wieso braucht|ernst gemeinte frage|"
    r"überlege|unsicher|was haltet ihr|tipps\?|ratschlag)\b",
    re.I,
)
BEAUTY_MOOD_CTX = re.compile(
    r"\b(botox|filler|unterspritz|retinol|anti.?aging|schönheits|falten|ästhet|"
    r"hyaluron|facelift|laser|eingriff|hautpflege|skincare|microneedling|peeling|"
    r"neuromodulator|lidstraffung|fadenlift)\b",
    re.I,
)
CONFLICTED_OVERRIDE = re.compile(
    r"("
    r"hin-?\s*und\s*hergerissen|zwie(spältig|gespalten)|ambivalent|"
    r"einerseits.{0,120}andererseits|pro und contra|für und wider|"
    r"schäme mich|will mich nicht verbiegen|"
    r"weiß nicht(,| ob) ich .{0,30}(will|machen|soll|lassen|traut)|"
    r"traue mich (nicht|kaum).{0,30}aber|"
    r"eigentlich (dagegen|kein fan|nichts von|abgelehnt).{0,60}aber|"
    r"immer abgelehnt.{0,40}aber|"
    r"ich will( es)? und will( es)? nicht|"
    r"mit mir (selbst )?im konflikt|fühle mich zerrissen|"
    r"(gesellschaftsdruck|schönheitsdruck|sozialer druck|alle machen (es|botox|filler))"
    r".{0,100}(überlege|unsicher|vielleicht doch|trotzdem|mich gefragt)|"
    r"(überlege|unsicher|vielleicht doch).{0,80}"
    r"(gesellschaftsdruck|schönheitsdruck|sozialer druck|alle machen)|"
    r"(würde (gern|gerne)|reizt mich|verlockend|interessiert mich).{0,80}"
    r"(aber|doch).{0,60}(angst|sorge|schäme|unsicher|risiko|nebenwirkung|bereuen)|"
    r"(angst vor|sorge vor|schäme).{0,60}(aber|doch).{0,60}"
    r"(würde (gern|gerne)|überlege|reizt|verlockend)"
    r")",
    re.I,
)
CONFLICTED_SOFT = re.compile(
    r"\b(aber|doch|jedoch|einerseits|andererseits|trotzdem|obwohl|"
    r"unsicher|überlege|zwie|ambival|druck|schäme|dagegen)\b",
    re.I,
)
MIXED_CONFLICTED = re.compile(
    r"\b(aber|doch|jedoch|einerseits|andererseits|trotzdem|obwohl)\b",
    re.I,
)
NEGATION_NEAR = re.compile(
    r"\b(kein|keine|keinen|nicht|nie|bloß kein|ohne|kein interesse an)\b",
    re.I,
)


def is_negated_mention(text: str, term: str, window: int = 40) -> bool:
    """True if term appears near negation (verneinte Nennung zählt nicht)."""
    lower = text.lower()
    t = term.lower()
    start = 0
    while True:
        idx = lower.find(t, start)
        if idx < 0:
            return False
        left = lower[max(0, idx - window) : idx]
        if NEGATION_NEAR.search(left):
            return True
        start = idx + len(t)


def apply_mood_rules(text: str, mood: str, mood_scores: list[tuple[str, float]] | None = None) -> str:
    # Map legacy embedding ids
    if mood == "neutral":
        mood = "seeking"
    if mood == "advisory":
        mood = "cautioning"

    def fallback(exclude: set[str]) -> str:
        if mood_scores:
            for mid, _ in mood_scores:
                m = "seeking" if mid == "neutral" else ("cautioning" if mid == "advisory" else mid)
                if m not in exclude:
                    return m
        return "seeking"

    # 0) Marketing / clinic promo without personal consumer stance → Intrigued/seeking
    #    (brief: ads are not Enthusiastic; ideally filtered upstream)
    is_promo = bool(
        CLINIC_PROMO.search(text) or BRAND_PROMO.search(text) or PROMO_MOOD.search(text)
    )
    if is_promo and not PERSONAL_FIRSTPERSON.search(text):
        return "seeking"

    # 1) Concrete warning to others → Cautioning
    if CAUTIONING_OVERRIDE.search(text) or (
        re.search(r"\b(vorsicht|warnung|finger weg)\b", text, re.I)
        and re.search(r"\b(bitte|arzt|klinik|andere|euch|niemand)\b", text, re.I)
    ):
        return "cautioning"

    # 2) Unresolved ambivalence (needs beauty context)
    if CONFLICTED_OVERRIDE.search(text) and BEAUTY_MOOD_CTX.search(text):
        return "conflicted"

    # 3) Own negative outcome
    if RAGEBAIT.search(text) or NEGATIVE_EXPERIENCE.search(text) or DISAPPOINTED_OVERRIDE.search(text):
        return "disappointed"

    # 4) Strong personal positive (NOT bare promo — handled above)
    if ENTHUSIASTIC_OVERRIDE.search(text) or re.search(
        r"\b(bin begeistert|liebe diese|must-have|getestet und bin|"
        r"beste entscheidung|game.?changer|wie neugeboren)\b",
        text,
        re.I,
    ):
        # Short emoji praise / soft hype without personal outcome → satisfied
        if not PERSONAL_FIRSTPERSON.search(text) and len(text) < 120:
            return "satisfied"
        return "enthusiastic"

    if SATISFIED_OVERRIDE.search(text):
        return "satisfied"

    # 4b) Mixed stance in beauty talk → Conflicted (after hard pos/neg overrides)
    if (
        BEAUTY_MOOD_CTX.search(text)
        and MIXED_CONFLICTED.search(text)
        and POS_WORDS.search(text)
        and NEG_WORDS.search(text)
    ):
        return "conflicted"

    # 5) Questions / orientation / remaining edu
    if SEEKING_OVERRIDE.search(text) or BEAUTY_QUESTION.search(text):
        return "seeking"

    if CLINIC_EDU.search(text) or EDUCATIONAL.search(text):
        return "seeking"

    # Soft-correct overused embedding labels without cues
    if mood == "enthusiastic" and is_promo:
        return "seeking"
    if mood == "conflicted":
        if BEAUTY_MOOD_CTX.search(text) and CONFLICTED_SOFT.search(text):
            return "conflicted"
        return fallback({"conflicted"})
    if mood == "cautioning" and not re.search(
        r"\b(vorsicht|warn|komplikation|finger weg|risiko|nebeneffekt)\b", text, re.I
    ):
        return fallback({"cautioning", "conflicted"})

    return mood


def apply_segment_rules(text: str, segment: str) -> tuple[str | None, bool]:
    """Return (segment_id or None, positioned). Unpositioned → (None, False)."""
    lower = text.lower()

    # Explicit skincare-first rejection
    if re.search(
        r"\b(kein botox|keine nadel|ohne botox|nie unters messer|nie unter die nadel|"
        r"kein interesse an eingriff|setze lieber auf (gute )?pflege|"
        r"anti-?aging-?routine|voll auf retinol|prävention statt reparatur)\b",
        text,
        re.I,
    ):
        return "skincare-first", True

    # Procedure-open: past experience + maintenance language
    if re.search(
        r"\b(auffrisch|wartungsspritze|nachspritz|nächster termin|regelmäßig machen|"
        r"zweite(s|n)? (mal|sitzung)|dritte(s|n)? (mal|sitzung)|behandlungsserie|"
        r"hatte schon|habe .* gemacht und|lasse .* wieder|nachkorrektur)\b",
        text,
        re.I,
    ) and re.search(
        r"\b(botox|filler|unterspritz|laser|hifu|ultherapy|peeling|microneedling|"
        r"faden|facelift|behandlung|ästhetik)\b",
        text,
        re.I,
    ):
        return "procedure-open", True

    # Procedure-curious: interest + hesitation
    if BEAUTY_QUESTION.search(text) or CLINIC_EDU.search(text):
        return "procedure-curious", True
    if re.search(
        r"\b(überlege|traue mich nicht|angst vor|noch nicht so weit|"
        r"erst(mal)? informieren|irgendwann vielleicht|tut .{0,20} weh|"
        r"wie viel ausfallzeit|lohnt sich das oder)\b",
        text,
        re.I,
    ) and re.search(
        r"\b(botox|filler|laser|hifu|peeling|microneedling|faden|facelift|unterspritz|eingriff)\b",
        text,
        re.I,
    ):
        return "procedure-curious", True

    if re.search(r"\b(botox|filler|unterspritz|behandlung|ästhetik|hifu|laserbehandlung)\b", text, re.I):
        if PROCEDURE_CONTEXT.search(text):
            if re.search(r"\b(überlege|angst|erste mal|unsicher|würde)\b", text, re.I):
                return "procedure-curious", True
            if re.search(r"\b(hatte|termin|wieder|auffrisch|wartung|schon)\b", text, re.I):
                return "procedure-open", True
            return "procedure-curious", True

    # Implicit skincare-first: skincare as anti-aging strategy without procedures
    if re.search(
        r"\b(retinol|serum|spf|sonnenschutz|niacinamid|hautpflege|skincare|"
        r"feuchtigkeitscreme|morgenroutine|abendroutine)\b",
        text,
        re.I,
    ) and not re.search(
        r"\b(botox|filler|unterspritz|laserbehandlung|facelift|hifu|fadenlifting)\b",
        text,
        re.I,
    ):
        if re.search(r"\b(anti.?aging|falten|haut|routine|wirku?ng|ergebnis)\b", text, re.I):
            return "skincare-first", True

    # Embedding fallback: trust only if clear personal stance markers
    if segment in ("procedure-open", "procedure-curious", "skincare-first"):
        if re.search(
            r"\b(ich|mein|meine|mir|mich|habe|hatte|würde|will|möchte)\b",
            text,
            re.I,
        ):
            return segment, True

    return None, False


def keyword_hits(text: str, keywords: dict[str, list[str]]) -> dict[str, float]:
    lower = text.lower()
    hits = {}
    for tid, terms in keywords.items():
        for term in terms:
            if len(term) < 3:
                continue
            if term in lower and not is_negated_mention(text, term):
                hits[tid] = max(hits.get(tid, 0), 0.92)
                break
    return hits


def topic_keyword_hits(text: str) -> dict[str, float]:
    lower = text.lower()
    hits = {}
    for tid, terms in TOPIC_KEYWORDS.items():
        if tid == "price":
            if any(p.search(text) for p in PRICE_PATTERNS) and not PRICE_BLOCK.search(text):
                # Negated price talk still OK as topic; no term list
                hits[tid] = 0.9
            continue
        if tid == "spf":
            if any(p.search(text) for p in SPF_PATTERNS):
                # Skip if only negated SPF
                if not (
                    is_negated_mention(text, "spf")
                    and not any(p.search(text) for p in SPF_PATTERNS[1:])
                ):
                    hits[tid] = 0.9
            continue
        if tid == "hyaluronic-acid":
            # Topical only — injection context → fillers instead
            if re.search(r"\b(hyaluron|hyaluronsäure|\bha\b)\b", text, re.I):
                if re.search(r"\b(spritze|unterspritz|termin|arzt|filler|injekt)\b", text, re.I):
                    continue
                if re.search(r"\b(serum|creme|pflege|topisch|feuchtigkeit)\b", text, re.I):
                    if not is_negated_mention(text, "hyaluron"):
                        hits[tid] = 0.9
            continue
        for term in terms:
            if len(term) < 3:
                continue
            if term not in lower:
                continue
            if is_negated_mention(text, term):
                continue
            if tid == "fillers" and not COSMETIC_FILLER_TOPIC.search(text):
                if not re.search(
                    r"\bfiller\b.*(gesicht|lippe|ästhetik|unterspritz|hyaluron|jawline)|"
                    r"(gesicht|lippe|ästhetik|unterspritz|hyaluron|jawline).*\bfiller\b|"
                    r"unterspritz",
                    text,
                    re.I,
                ):
                    break
            if tid == "botox":
                if BOTOX_GOSSIP.search(text) or POLITICS_BOTOX.search(text):
                    break
                if "botox" in lower or "botulinum" in lower:
                    if not COSMETIC_BOTOX.search(text) and not BOTOX_SHORT.search(text):
                        # Allow Boti / Dysport / Xeomin without full context
                        if not re.search(r"\b(boti|dysport|xeomin|fältchen-spritze)\b", lower):
                            break
            if tid == "laser":
                if NON_COSMETIC_LASER_TOPIC.search(text) and not COSMETIC_LASER_TOPIC.search(text):
                    break
                # Exclude hair removal / tattoo / veins outside anti-aging
                if re.search(
                    r"\b(haarentfernung|tattoo.?entfer|besenreiser|gefäßlaser)\b",
                    text,
                    re.I,
                ):
                    break
                if "laser" in lower and not COSMETIC_LASER_TOPIC.search(text):
                    if not re.search(r"\b(ipl|fraxel|co2|pigmentlaser|fraktioniert)\b", lower):
                        break
            if tid == "celebrity" and not CELEBRITY_TOPIC.search(text):
                if not re.search(r"\b(vorher.?nachher|hat sie oder)\b", text, re.I):
                    break
            if tid == "aging-signs":
                # Specific aging-sign language only (bare "Falten"/"Trockenheit" too noisy)
                if not re.search(
                    r"\b(hautalterung|alterungserscheinungen|alterszeichen|"
                    r"elastizit[aä]tsverlust|schlaffe haut|altersflecken|"
                    r"pigmentflecken|volumenverlust|erschlaffung|faltenbildung|"
                    r"nasolabialfalten|stirnfalten|kr[aä]henf[uü](ß|sse)|"
                    r"marionettenfalten|tiefe[rn]? falten|konturverlust|"
                    r"anti.?aging.{0,40}(falte|alter)|hautalter)\b",
                    text,
                    re.I,
                ):
                    continue
            hits[tid] = 0.9
            break
    return hits


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
        emb_segment, seg_sc = seg_scores[0]
        mood = apply_mood_rules(text, mood, mood_scores)
        segment, positioned = apply_segment_rules(text, emb_segment)

        topic_kw = topic_keyword_hits(text)
        emb_topics = cosine_above(emb, topic_embs, topics, cfg["topic_threshold"])
        allow = set(cfg.get("topic_emb_allowlist") or [])
        for tid, sc in emb_topics:
            if tid in topic_kw:
                continue
            # Strict topics (botox/fillers/laser/…) only via keywords
            if allow and tid not in allow:
                continue
            topic_kw[tid] = sc
        kw_ids = [t for t, s in sorted(topic_kw.items(), key=lambda x: -x[1]) if s >= 0.85]
        emb_ids = [
            t
            for t, s in sorted(topic_kw.items(), key=lambda x: -x[1])
            if s < 0.85 and s >= cfg["topic_threshold"] and t not in kw_ids
        ]
        topics_ids = (kw_ids + emb_ids)[: cfg["topic_max"]]
        topic_merged = sorted(topic_kw.items(), key=lambda x: -x[1])

        pos = bool(POS_WORDS.search(text))
        neg = bool(NEG_WORDS.search(text))

        procedure = procedure_tone = ingredient = ingredient_tone = None
        proc_sc = ing_sc = 0.0

        if positioned and segment in ("procedure-open", "procedure-curious"):
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

        if positioned and segment == "skincare-first":
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

        min_conf = mood_sc if not positioned else min(mood_sc, seg_sc)
        results.append(
            {
                "id": row["id"],
                "source": row.get("source", ""),
                "text": text[:2000],
                "date": row.get("date", ""),
                "mood": mood,
                "mood_score": round(mood_sc, 4),
                "segment": segment,
                "segment_positioned": positioned,
                "segment_score": round(seg_sc, 4) if positioned else None,
                "topics": topics_ids,
                "topic_scores": {t: round(s, 4) for t, s in topic_merged[:8]},
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
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--output-jsonl", default=str(OUT_JSONL))
    parser.add_argument("--output-review", default=str(OUT_REVIEW))
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
