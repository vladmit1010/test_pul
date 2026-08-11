#!/usr/bin/env python3
"""Generiert 850 realistische PULSAR-Demo-Kommentare (Kosmetik, DE)."""

import json
import random
from pathlib import Path

random.seed(850)

ROOT = Path(__file__).resolve().parent.parent

FLOW_EDGES = [
    ("f-ad", "f-read"), ("f-ad", "f-price"),
    ("f-ref", "f-read"), ("f-ref", "f-book"),
    ("f-self", "f-compare"), ("f-self", "f-ask"),
    ("f-read", "f-compare"), ("f-read", "f-wait"), ("f-read", "f-book"),
    ("f-compare", "f-book"), ("f-compare", "f-wait"),
    ("f-ask", "f-book"), ("f-ask", "f-wait"),
    ("f-price", "f-quit"), ("f-price", "f-wait"),
    ("f-book", "f-happy-rec"), ("f-book", "f-happy"), ("f-book", "f-sad"), ("f-book", "f-warn"),
    ("f-wait", "f-read"), ("f-wait", "f-quit"),
]

FLOW_OUTCOMES = ["f-happy-rec", "f-happy", "f-sad", "f-warn"]
FLOW_ENTRY = ["f-ad", "f-ref", "f-self"]
FLOW_MID = ["f-read", "f-compare", "f-ask", "f-price", "f-book", "f-wait", "f-quit"]

# (text_template, attitude, topic, procedure, journey, warning|None, trust|None, flow|None)
SEEDS = [
    ("Botox zum ersten Mal — ich hatte Angst vor der „Maske“, aber der Arzt setzte Mikrodosen. Nach {days} Tagen frischer, Mimik blieb.", "delighted", "botox", "Botox", "j7", None, "tp2", "f-happy-rec"),
    ("Lippenfiller schön, aber {days} Tage Knoten. Niemand sagte, dass das normal ist — ich habe panisch reagiert.", "cautious", "fillers", "Filler", "j6", "w4", "tm4", "f-happy"),
    ("Wichtig: nicht zum Kosmetiker ohne med. Ausbildung. Bei einer Freundin Komplikation nach billigem Botox.", "warning", "botox", "Botox", "j3", "w1", "tp1", "f-warn"),
    ("Biorevitalisierung Juvederm — Haut wie nach Urlaub. Teuer, aber alle 6 Monate machbar.", "satisfied", "bio", "Biorev.", "j7", None, "tp2", "f-happy"),
    ("In der Beratung Ampulle gezeigt, Kontraindikationen erklärt. Sofort Vertrauen.", "delighted", "doctor", "Botox", "j4", "w3", "tp3", "f-book"),
    ("Stirn „eingefroren“, Augenbrauen verrutscht — wohl Überdosierung. Arzt weigerte sich zu korrigieren.", "disappointed", "botox", "Botox", "j7", "w2", "tm1", "f-sad"),
    ("Lese PULSAR seit einem Monat vor dem ersten Botox. Angst bleibt, aber Wissen hilft.", "cautious", "botox", "Botox", "j2", None, None, "f-read"),
    ("TCA-Peeling — Gesicht schälte sich eine Woche. Warnung vor Sozialpause stimmt.", "warning", "peel", "Peeling", "j6", "w4", "tm4", "f-warn"),
    ("Klinik sauber, Einwegmaterial, Arzt ist Dermatologe. Dafür zahle ich gern mehr.", "delighted", "clinic", "Filler", "j4", "w1", "tp4", "f-book"),
    ("In der Werbung {price} €, an der Kasse Aufschlag für „Premium-Präparat“. Reine Abzocke.", "disappointed", "price", "Botox", "j3", None, "tm2", "f-quit"),
    ("Haar-Mesotherapie — 4 Sitzungen, Dichte wirklich gestiegen. Empfehlung, aber Geduld nötig.", "satisfied", "bio", "Meso", "j8", None, "tp2", "f-happy-rec"),
    ("Botox und Filler nicht am selben Tag! Schwellung war heftig.", "warning", "sidefx", "Filler", "j5", "w6", "tm4", "f-warn"),
    ("Laser gegen Pigmentflecken — 2 Sitzungen, Flecken heller. Mit Betäubung ok.", "satisfied", "laser", "Laser", "j7", None, "tp1", "f-happy"),
    ("Allergie abgefragt, Test gemacht. Kleine Geste, aber man fühlt sich ernst genommen.", "delighted", "doctor", "Botox", "j4", "w7", "tp3", "f-book"),
    ("Filler unter Augen — 2 Wochen Bluterguss. Ergebnis ok, aber vorbereiten.", "cautious", "fillers", "Filler", "j6", "w4", "tm4", "f-happy"),
    ("Freundin empfahl Klinik — kein Fehler. Mundpropaganda schlägt Werbung.", "delighted", "clinic", "Biorev.", "j8", None, "tp1", "f-happy-rec"),
    ("Null Effekt nach einem Monat. Arzt sagt „bei jedem anders“. Geld weg.", "disappointed", "botox", "Botox", "j7", "w2", "tm5", "f-sad"),
    ("Vorher/Nachher-Fotos und Beleg gespeichert — half bei Reklamation.", "warning", "clinic", "Filler", "j5", "w8", "tm2", "f-warn"),
    ("Dachte Botox bedeutet für immer „nicht lächeln“. Nach 4 Monaten alles zurück.", "cautious", "botox", "Botox", "j2", None, None, "f-read"),
    ("Anruf am 3. Tag — nachgefragt wie es geht. Selten, aber schön.", "delighted", "doctor", "Biorev.", "j6", None, "tp5", "f-happy"),
    ("„Entenlippen“ — Filler verrutscht nach 2 Monaten. Zu viel gespritzt, warne alle.", "warning", "fillers", "Filler", "j7", "w5", "tm1", "f-warn"),
    ("50%-Aktion — 10 Personen Schlange, 15 Min. pro Patient. Fließband.", "disappointed", "price", "Botox", "j5", "w2", "tm3", "f-sad"),
    ("Erstes Mal Biorevitalisierung — Angst vor Nadeln. Ergebnis hat sich gelohnt.", "satisfied", "bio", "Biorev.", "j7", None, "tp2", "f-happy"),
    ("Behandlerin erklärte Kontraindikationen nicht, nur „unterschreiben“. Bin gegangen.", "disappointed", "doctor", "Filler", "j4", "w7", "tm3", "f-quit"),
    ("Laserabrasion — 5 Tage zu Hause, Gesicht rot. Aber Poren wirklich feiner.", "satisfied", "laser", "Laser", "j6", "w4", "tp2", "f-happy"),
    ("Suche Klinik in {city} — wer hatte Botox bei Dr. {name}?", "cautious", "clinic", "Botox", "j2", None, None, "f-compare"),
    ("Natürliches Ergebnis — niemand merkt, dass ich was gemacht habe. Das ist Handwerk.", "delighted", "doctor", "Botox", "j8", None, "tp2", "f-happy-rec"),
    ("Peeling + Sonne = Pigment schlimmer. Warnung: SPF jeden Tag.", "warning", "peel", "Peeling", "j6", "w7", "tm5", "f-warn"),
    ("Gesichts-Mesotherapie — 8 Sitzungen Kurs. Haut strahlt, aber Marathon.", "satisfied", "bio", "Meso", "j7", None, "tp5", "f-happy"),
    ("Präparat-Zertifikat verlangt — abgelehnt. Bin umgedreht und gegangen.", "warning", "clinic", "Botox", "j3", "w3", "tp4", "f-quit"),
    ("Botox zwischen den Augenbrauen — Falte weg, Mimik natürlich. PULSAR half bei der Klinikwahl.", "delighted", "botox", "Botox", "j8", None, "tp2", "f-happy-rec"),
    ("Effekt gefällt, Preis sticht aber.", "satisfied", "price", "Botox", "j7", None, None, "f-happy"),
    ("Arzt erklärte alles verständlich — ohne Druck.", "delighted", "doctor", "Filler", "j4", None, "tp3", "f-book"),
    ("Schwellung nach 4 Tagen weg, wie versprochen.", "satisfied", "recovery", "Botox", "j6", "w4", "tm4", "f-happy"),
    ("Angst vor „flacher Stirn“ — wer hat Erfahrung?", "cautious", "botox", "Botox", "j2", None, None, "f-ask"),
    ("Nach Botox 4 Stunden nicht hingelegt — strikt befolgt.", "satisfied", "recovery", "Botox", "j6", "w4", None, "f-happy"),
    ("Filler hielt kürzer als angekündigt.", "disappointed", "fillers", "Filler", "j7", "w5", "tm5", "f-sad"),
    ("Klinik mit PULSAR-Rating 4,9 — hat sich gelohnt.", "delighted", "clinic", "Botox", "j3", None, "tp4", "f-book"),
    ("Bluterguss unter Augen — 10 Tage, aber Tränenrinne weg.", "satisfied", "fillers", "Filler", "j7", None, "tm4", "f-happy"),
    ("Botox-Aktion {price} € — misstrauisch.", "cautious", "price", "Botox", "j2", "w2", None, "f-price"),
    ("Empfehlung erst nach persönlicher Beratung.", "warning", "doctor", "Botox", "j8", "w1", "tp3", "f-warn"),
]

EXTRA_SNIPPETS = [
    ("{proc} zum {n}. Mal — diesmal deutlich besser als beim ersten Versuch.", "satisfied"),
    ("Nach {proc} keine Sport/Sauna für 14 Tage — schwer, aber eingehalten.", "satisfied"),
    ("Klinik in {city} empfohlen, Beratung war ehrlich und unverbindlich.", "delighted"),
    ("{proc}: leichte Rötung am ersten Tag, am {days}. Tag alles normal.", "satisfied"),
    ("Überlege {proc} seit Wochen — noch unsicher wegen Nebenwirkungen.", "cautious"),
    ("Preis für {proc} variiert stark — von {price} bis dreifachem Betrag.", "cautious"),
    ("Arzt hat Chargennummer notiert und mir gezeigt — top Transparenz.", "delighted"),
    ("Personal wirkte gestresst, Wartezeit 40 Minuten trotz Termin.", "disappointed"),
    ("Ergebnis natürlich, Kollegen haben nichts gemerkt — genau so wollte ich es.", "delighted"),
    ("Starke Schwellung nach {proc}, Arzt sagte das sei ungewöhnlich.", "disappointed"),
    ("Fragt in der Community nach Erfahrungen mit {proc} — bitte teilen!", "cautious"),
    ("Warnung: Billig-Angebot für {proc} oft verdünntes Präparat.", "warning"),
    ("Nach {proc} Sonnenschutz SPF 50 — Dermatologin bestand darauf.", "warning"),
    ("Mesotherapie-Kur: Hautbild besser, aber 6 Termine sind zeitintensiv.", "satisfied"),
    ("Peeling zu aggressiv — Hyperpigmentierung danach.", "disappointed"),
    ("Laser-Sitzung unangenehm, aber Ergebnis nach 3 Wochen sichtbar.", "satisfied"),
    ("Biorevitalisierung: Glow ja, aber Nadeln im Gesicht sind ungewohnt.", "cautious"),
    ("Filler in Wangen — Volumen zurück, sieht frisch aus ohne überfüllt.", "delighted"),
    ("Botox an Krähenfüßen — Lächeln noch möglich, Falten weicher.", "delighted"),
    ("Rechnung enthielt Zusatzpositionen, die nicht besprochen waren.", "disappointed"),
    ("Klinik riecht steril, Ablauf klar erklärt — gutes Gefühl.", "delighted"),
    ("Erholung nach {proc} dauerte länger als angekündigt ({days} Tage).", "cautious"),
    ("Kombi aus Peeling und Biorev. — Haut glatt, empfehlenswert mit Pause dazwischen.", "satisfied"),
    ("Unfreundliche Rezeption, Behandlung selbst war ok.", "disappointed"),
    ("Arzt riet von {proc} ab — ehrlich statt nur Umsatz.", "delighted"),
    ("Nebenwirkung Juckreiz nach {proc}, Antihistamin half.", "cautious"),
    ("Instagram-Werbung vs. Realität — Ergebnis dezenter als im Reel.", "disappointed"),
    ("PULSAR-Thread zur Klinikwahl hat mir die Entscheidung erleichtert.", "delighted"),
    ("Zwei Wochen nach {proc} noch leichte Taubheit — normal?", "cautious"),
    ("Asymmetrie nach {proc} — Korrekturtermin kostenlos angeboten.", "satisfied"),
]

TOPICS = ["botox", "fillers", "bio", "clinic", "doctor", "price", "recovery", "sidefx", "peel", "laser"]
PROCEDURES = ["Botox", "Filler", "Biorev.", "Peeling", "Laser", "Meso"]
JOURNEYS = ["j1", "j2", "j3", "j4", "j5", "j6", "j7", "j8"]
WARNINGS = [None, None, None, None, "w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"]
TRUST_PLUS = ["tp1", "tp2", "tp3", "tp4", "tp5"]
TRUST_MINUS = ["tm1", "tm2", "tm3", "tm4", "tm5"]
CITIES = ["Berlin", "München", "Hamburg", "Köln", "Frankfurt", "Stuttgart", "Düsseldorf", "Leipzig"]
NAMES = ["Meyer", "Schulz", "Weber", "Fischer", "Becker", "Wagner", "Hoffmann", "Koch"]


def pick_flow(attitude: str, journey: str) -> tuple[str, str, str]:
    """Returns flow node, flowFrom, flowTo."""
    if journey in ("j8",) and attitude in ("delighted", "satisfied"):
        outcome = random.choice(["f-happy-rec", "f-happy"])
    elif attitude in ("disappointed",):
        outcome = "f-sad"
    elif attitude == "warning":
        outcome = "f-warn"
    elif journey in ("j1", "j2"):
        entry = random.choice(FLOW_ENTRY)
        mid = random.choice(["f-read", "f-compare", "f-ask", "f-price"])
        if entry == "f-ref" and random.random() < 0.3:
            return "f-book", "f-ref", "f-book"
        return mid, entry, mid
    elif journey == "j3":
        node = random.choice(["f-compare", "f-read", "f-price", "f-wait"])
        fr = random.choice(FLOW_ENTRY + ["f-read"])
        return node, fr, node
    elif journey == "j4":
        return "f-book", random.choice(["f-read", "f-compare", "f-ask"]), "f-book"
    elif journey == "j5":
        return "f-book", random.choice(["f-read", "f-compare", "f-ask"]), "f-book"
    elif journey == "j6":
        return random.choice(["f-happy", "f-sad", "f-warn"]), "f-book", random.choice(["f-happy", "f-sad"])
    else:
        outcome = random.choice(FLOW_OUTCOMES)

    fr, to = random.choice([e for e in FLOW_EDGES if e[1] == outcome] or [("f-book", outcome)])
    return outcome, fr, to


def ensure_edge(flow: str, flow_from: str | None, flow_to: str | None) -> tuple[str, str, str]:
    """Stellt sicher, dass flowTo == flow und (flowFrom, flowTo) eine gültige Kante ist."""
    if flow_from and flow_to and flow_to == flow:
        if (flow_from, flow_to) in FLOW_EDGES:
            return flow, flow_from, flow_to
    matches = [e for e in FLOW_EDGES if e[1] == flow]
    if matches:
        fr, to = random.choice(matches)
        return to, fr, to
    fr, to = random.choice(FLOW_EDGES)
    return to, fr, to


def format_text(template: str) -> str:
    return template.format(
        days=random.choice([3, 4, 5, 7, 10, 14]),
        price=random.choice([49, 79, 99, 149, 199, 299]),
        city=random.choice(CITIES),
        name=random.choice(NAMES),
        proc=random.choice(PROCEDURES),
        n=random.choice([2, 3, 4, 5]),
    )


def build_comment(comment_id: int) -> dict:
    if comment_id <= len(SEEDS):
        text_t, attitude, topic, procedure, journey, warning, trust, flow = SEEDS[comment_id - 1]
        text = format_text(text_t)
        flow_from, flow_to = None, None
        if flow:
            matches = [e for e in FLOW_EDGES if e[1] == flow]
            if matches:
                flow_from, flow_to = random.choice(matches)
            else:
                flow_from, flow_to = "f-book", flow
        else:
            flow, flow_from, flow_to = pick_flow(attitude, journey)
    else:
        snippet, attitude = random.choice(EXTRA_SNIPPETS)
        topic = TOPICS[(comment_id + attitude.__hash__()) % len(TOPICS)]
        procedure = PROCEDURES[comment_id % len(PROCEDURES)]
        journey = JOURNEYS[comment_id % len(JOURNEYS)]
        warning = random.choice([None, None, None, None, None, None, None, "w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"])
        trust = None
        if attitude in ("delighted", "satisfied"):
            trust = TRUST_PLUS[comment_id % len(TRUST_PLUS)] if comment_id % 3 == 0 else None
        elif attitude in ("disappointed", "warning"):
            trust = TRUST_MINUS[comment_id % len(TRUST_MINUS)] if comment_id % 3 == 0 else None
        text = format_text(snippet)
        flow, flow_from, flow_to = pick_flow(attitude, journey)

    return {
        "id": comment_id,
        "text": text,
        "attitude": attitude,
        "topic": topic,
        "warning": warning,
        "journey": journey,
        "procedure": procedure,
        **dict(zip(["flow", "flowFrom", "flowTo"], ensure_edge(flow, flow_from, flow_to))),
        "trust": trust,
    }


def finalize_warnings(comments: list[dict]) -> None:
    """Ca. 23 % der Kommentare erhalten ein Warn-Tag."""
    target = round(len(comments) * 0.23)
    warn_ids = ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"]

    for c in comments:
        if c["attitude"] == "warning":
            c["warning"] = c["warning"] or random.choice(warn_ids)
        else:
            c["warning"] = None

    tagged = [c for c in comments if c["warning"]]
    pool = [c for c in comments if c["attitude"] != "warning"]
    random.shuffle(pool)
    for c in pool[: max(0, target - len(tagged))]:
        c["warning"] = random.choice(warn_ids)


def main() -> None:
    comments = [build_comment(i + 1) for i in range(850)]
    finalize_warnings(comments)

    json_path = ROOT / "data" / "pulsar-comments-de.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"total": len(comments), "comments": comments}, f, ensure_ascii=False, indent=2)

    js_path = ROOT / "js" / "pulsar-comments-de.js"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("/** 850 PULSAR-Demo-Kommentare (Kosmetik, DE) — auto-generiert */\n")
        f.write("window.PulsarComments = ")
        f.write(json.dumps(comments, ensure_ascii=False, separators=(",", ":")))
        f.write(";\n")

    print(f"Generiert: {len(comments)} Kommentare")
    print(f"  JSON: {json_path}")
    print(f"  JS:   {js_path}")


if __name__ == "__main__":
    main()
