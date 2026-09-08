# Chart brief updates (client) — full specs

Source: client text, 2026-09. Source of truth for charts **1, 4, 5, 6** deltas vs prior LOP REV build.

---

## 1 – MOOD MAP

### 1. Titel
**THE EMOTIONAL SPECTRUM OF ANTI-AGING**

### 2. Diagrammtyp
Horizontale Spektrum-Darstellung – ein durchgehender Balken, der die gesamte Breite einnimmt und in sechs Abschnitte unterteilt ist. Die Breite jedes Abschnitts entspricht seinem Anteil an den **klassifizierbaren** Kommentaren.

**Reihenfolge (fest, links → rechts):**  
Enthusiastic – Satisfied – Intrigued – Conflicted – Disappointed – Warning

Achse: Grad der **Zuwendung** zur bzw. **Abwendung** von der Kategorie. Links = vollständige Zuwendung, rechts = aktive Abwendung. Achsendefinition als Untertitel/Achsenbeschriftung ausweisen (nicht als beliebige Reihenfolge lesbar).

**Farbe:** durchgehender Verlauf warm → kühl, ohne harte Farbsprünge; Abschnittsgrenzen durch dünne Trennlinien.

**Verbindliche Bestandteile:**
- Beschriftung: Kategoriename, Prozentwert, absolute Fallzahl (n)
- bei schmalen Abschnitten: Label außerhalb mit Verbindungslinie
- kurze Definitions-Legende je Kategorie unterhalb
- Fußzeile: Erhebungszeitraum, Plattform-Verteilung
- Fußzeile: Anteile beziehen sich auf klassifizierbare Kommentare; Anteil dieser Menge am Gesamtkorpus angeben
- Fußzeile: Kommentare mit konkreter Warnung an Dritte vorrangig als **Warning**
- pro Kategorie 2–3 repräsentative, gekürzte, anonymisierte Originalzitate + Plattform (Tooltip)

**Optional:** Marker für gewichteten Mittelwert (Kategorien 1–6). Orientierungswert, keine Messgröße; unterstellt gleiche Abstände.

### 3. Kategorien (feste Liste, 6 Dimensionen)
Alle sechs auf einer Achse – emotionale Haltung gegenüber Anti-Aging. Auch für Personen ohne Eingriff.

| ID | Definition | Signalwörter / Phrasen (Beispiele) |
|---|---|---|
| **Enthusiastic** | Überschwängliche Begeisterung, aktive Befürwortung, Stolz, spontane Weiterempfehlung, Normalisierung von Eingriff/Pflegeroutine | „Ich liebe mein Ergebnis", „Bester Entschluss meines Lebens", „Kann ich nur empfehlen", „Fühle mich wie neugeboren", „Sieht so natürlich aus, dass niemand es merkt", „Endlich mache ich es für mich", „Meine Haut hat sich komplett verändert", „Game Changer" |
| **Satisfied** | Ruhige, sachliche Zufriedenheit ohne Überschwang; Ergebnis = Erwartung | „Bin zufrieden mit dem Ergebnis", „Hat genau das gemacht, was ich wollte", „Kein Drama, einfach gut gemacht", „Würde es wieder machen, nichts Besonderes dabei", „Sieht gepflegt aus, mehr wollte ich nicht", „Macht seinen Job" |
| **Intrigued** | Neugierig, informationssuchend, abwägend; oft Unsicherheit, ohne Ergebnisbewertung | „Was kostet das ungefähr?", „Wie lange hält das?", „Hat jemand Erfahrung mit X vs. Y?", „Wollte nur mal fragen, wie das abläuft", „Kenne mich noch nicht so aus", „Womit soll ich anfangen?", „Lohnt sich das?", „Worauf muss ich achten?" |
| **Conflicted** | Innerer Widerspruch: Wunsch + Widerwille, sozialer Druck, Scham, Ambivalenz | „Eigentlich bin ich dagegen, aber …", „Ich weiß, es ist oberflächlich, trotzdem …", „Man muss ja heute", „Traue mich nicht, darüber zu reden", „Hin- und hergerissen", „Will mich nicht verbiegen, aber gefallen möchte ich schon", „Ich schäme mich fast, dass es mich stört", „Alle machen es, ich fühle mich unter Druck", „Bin froh, dass ich es gemacht habe, aber empfehlen würde ich es niemandem" |
| **Disappointed** | Erwartungen nicht erfüllt; Frustration Zeit/Geld ohne Effekt; Bereuen – **ohne** medizinische Komplikation und **ohne** Warnung an Dritte | „Hat nichts gebracht", „Geld zum Fenster rausgeworfen", „Würde ich nicht wieder machen", „Sieht man kaum einen Unterschied", „Habe mir mehr erwartet", „Ergebnis war schnell wieder weg", „Nach einem Jahr immer noch nichts" |
| **Warning** | Besorgnis als **Warnung an andere**: Komplikationen, Ärzte/Kliniken/Methoden, Vorsicht/Zweitmeinung | „Bitte vorher gut informieren", „Bei mir kam es zu Komplikationen", „Finger weg von diesem Arzt/dieser Klinik", „Frozen Look, sehr unnatürlich", „Vorsicht, das kann schiefgehen", „Hätte ich vorher wissen müssen", „Lasst euch nicht von Instagram blenden" |

**Abgrenzung:** Disappointed = eigenes Ergebnis; Warning = richtet sich an Dritte.

### 4. Zielgruppe / Filter
Alle bereinigten, thematisch relevanten Kommentare (**≥ 30 Zeichen**) mit persönlicher Haltung/Urteil/emotionaler Reaktion zu Anti-Aging: Eingriffe (Botox, Filler, Laser, Facelift, Lidstraffung …) **und** Pflege/Wirkstoffe (Retinol, Vit C, Hyaluron, SPF …) **sowie** Umgang mit dem eigenen Älterwerden.

**Ausgeschlossen:** reine Produktwerbung, Klinik-Promotion, Spam, automotive „Facelift", News ohne eigene Meinung, reine Verfahrensbeschreibung ohne Positionierung.

### Zuordnungsregeln
- (a) Genau **eine** Haupt-Tonalität; Haltung des Kommentars als Ganzes, nicht nur letzter Satz  
- (b) Zeitlicher Verlauf → **Endzustand**  
- (c) Echte Ambivalenz → **Conflicted**, nicht Warning  
- (d) Konkrete Warnung an Dritte → **Warning** (auch wenn sonst positiv)  
- (e) Verneinung / Konjunktiv / Ironie / Sarkasmus nicht affirmativ („Kein Botox für mich, aber Retinol…" ≠ Botox-Zustimmung)  
- (f) Flexionen, Plural, Komposita der Signalwörter zählen  
- (g) Umgangssprache und englische Diskursformulierungen zählen  

### Zusätzlich auszugeben
- Gesamtkorpus (n); klassifizierbar (n + %); nicht klassifizierbar (Anteil)  
- Anteil mit mehr als einer erkennbaren Tonalität  
- Erhebungszeitraum, Plattform-Verteilung  
- **Nur Auswertung, nicht im Chart:** dieselbe Verteilung nach den 3 Mindset-Segmenten  

**Rename vs alter Build:** Seeking → **Intrigued**, Cautioning → **Warning**. Viz: Spektrum statt Pie/Donut.

---

## 4 – SKINCARE-FIRST WORDCLOUD

### 1. Titel
**The Language of Skincare-First Consumers**

### 2. Diagrammtyp
Wordcloud – Wortgröße ∝ **relative** Erwähnungshäufigkeit im Segment (Nennungen pro 1.000 Wörter des Segment-Korpus), nicht absolute Häufigkeit.

**Verbindlich:**
- Größen-Normalisierung nach Zeichenlänge (deutsche Komposita nicht bevorteilen)  
- max. **40** Begriffe  
- Tooltip: absolute Nennungen + repräsentatives, gekürztes, anonymisiertes Zitat  
- Fußzeile: Fallzahl Segment (n), Erhebungszeitraum  

### 3. Kategorien (dynamisch im festen semantischen Feld)
Extraktion der häufigsten Begriffe, mit denen Nutzerinnen **Zustand und Gefühl der Haut** beschreiben. Ziel: Konsumentensprache über Haut – **nicht** Produkte, Wirkstoffe oder Routinen.

**Einschließen:**
- Adjektive/Partizipien („trocken", „strahlend", „samtig")  
- Verben des Empfindens/Erscheinens („spannt", „brennt", „glänzt", „zieht ein")  
- 2–3-Wort-Fügungen als Einheit („große Poren", „ebenmäßiger Teint", „fühlt sich an wie")  
- bildhafte Umschreibungen („wie Krepppapier", „Film auf der Haut", „babyweich")  

**Hart ausschließen (unabhängig von Häufigkeit):**
- Produktnamen/-gattungen (Serum, Creme, Reinigung, Maske, Toner)  
- Wirkstoffe (Retinol, Vitamin C, Niacinamid, Hyaluronsäure, Peptide, SPF)  
- Marken, Verfahrensnamen  
- Routine-/Anwendungsbegriffe (Morgenroutine, Layering, Dosierung, auftragen)  
- Stoppwörter, Füllwörter, Höflichkeit, Plattform-Rauschen (Instagram, Post, Kommentar, Video, Link)  

**Verarbeitung:**
- (a) Lemmatisieren, Schreibvarianten zusammenführen  
- (b) Nur wenn Bezug zu Haut/Gesicht/Teint; Allgemeinsprache ausschließen („frische Luft")  
- (c) Verneinung kennzeichnen, nicht als affirmativen Zustand zählen („nicht mehr so fahl")  
- (d) Mehrdeutigkeit über Kontext: „matt" / „glänzend" je nach Ausstrahlung vs. Öligkeit  

**Orientierung (nicht abschließend):**

*Negativ:* trocken, spannt, schuppig, fahl, glanzlos, grau, müde, uneben, rau, große Poren, verstopfte Poren, schlaff, dünn, kraftlos, empfindlich, gereizt, gerötet, brennt, juckt, fleckig, knittrig, eingefallen, „sieht müde aus", „wie Krepppapier"

*Erwünscht/erreicht:* frisch, strahlend, glowy, glatt, prall, rosig, ebenmäßig, samtig, weich, geschmeidig, elastisch, straff, feinporig, ausgeruht, klar, gesund, „babyweich", „wie neu"

### 4. Zielgruppe
Nur **Skincare-First**. Aus: Procedure-primär, Spam, automotive, reine Werbung ohne Nutzerkommentar, &lt; 30 Zeichen.

### Zusätzlich auszugeben
- Tabelle: Top **20** Übergewichtung vs Procedure-Open/Curious (Verhältnis)  
- Fallzahl, Zeitraum, Plattformen  
- Anteil Beiträge ohne Zustandsbeschreibung  
- Verteilung auf Valenz-Gruppen  

---

## 5 – PROCEDURE-OPEN & PROCEDURE-CURIOUS WORDCLOUD

### 1. Titel
**The Language of Procedure-Open & Procedure-Curious**

### 2. Diagrammtyp
Wordcloud – relative Häufigkeit (pro 1.000 Wörter Segment-Korpus).

**Zusätzliche Ebene:** Begriffe überwiegend aus **Procedure-Curious** abweichend markieren (Schnitt/Umrandung). Curious ≈ Vorher, Open ≈ Nachher → Bewegung Erwägung → Erfahrung.

**Verbindlich:**
- Zeichenlängen-Normalisierung; max. 40 Begriffe  
- Tooltip: absolute n, Verteilung Open vs Curious, Zitat  
- Fußzeile: n Open und n Curious getrennt, Zeitraum  
- Farbgruppen &lt; 3 % der dargestellten Begriffe nicht als eigene Gruppe; Restanteil in Legende  

### 3. Kategorien (dynamisch, keine feste Liste)
Gefühle, Ängste, Bedenken, Erfahrungen rund um Eingriffe – Erwägung **und** Rückschau. Ziel: emotionale Sprache der Entscheidung – **nicht** Verfahrensnamen.

**Einschließen:** Emotionsbegriffe; Zögern/Empfinden; Sorgen als Frage/Konditional; befürchtete/eingetretene Ergebnisse; Heilung/Rückschau; Prozess/Kontrolle; Scham/Rechtfertigung. Mehrwortfügungen als Einheit.

**Hart ausschließen:**
- Verfahren/Produkte (Botox, Filler, Laser, HIFU, Fadenlifting, Facelift, Microneedling, Marken)  
- Wirkstoffe  
- rein organisatorisch ohne Emotion (Termin, Praxis, Uhrzeit)  
- Stoppwörter / Plattform-Rauschen  

Sonst würde die Cloud zur Verfahrensliste.

**Verarbeitung:**
- (a) Lemmatisieren / Varianten mergen  
- (b) Verneinung nicht affirmativ („hatte zum Glück keine Angst")  
- (c) Ironie/Sarkasmus nicht  
- (d) Nur Kontext kosmetischer Eingriff  
- (e) Farbgruppen **nicht** ausbalancieren – nur Korpus  

**Orientierung – sechs thematische Farbfelder (nicht abschließend):**

1. **Angst / körperliches Risiko:** Angst, Panik, Schiss, mulmig, „traue mich nicht", Nadeln, „tut das weh", Schmerzen, Verbrennung, Narben, Komplikation, Nebenwirkung, allergische Reaktion, irreversibel, „nicht rückgängig", „was wenn es schiefgeht", „bleibende Schäden"  
2. **Sorge um Ergebnis:** Frozen Look, unnatürlich, „sieht man das", überspritzt, „zu viel", „wie eine andere Person", „nicht mehr ich", entstellt, asymmetrisch, Instagram-Gesicht  
3. **Scham / sozialer Druck:** heimlich, „traue mich nicht zu erzählen", Partner weiß nichts, „was denken die anderen", eitel, oberflächlich, Rechtfertigung  
4. **Prozess / Kontrolle:** Ausfallzeit, Downtime, geschwollen, blaue Flecken, „wie lange sieht man das", Nachsorge, „ewig wiederholen", Abhängigkeit, „wem vertrauen", „was wenn ich bereue"  
5. **Erleichterung / Zufriedenheit danach:** endlich, erleichtert, „hätte früher", „nicht so schlimm", kaum Schmerzen, „niemand gemerkt", natürlich, ausgeruht, Selbstbewusstsein, „bereue nichts", „bestes Geld"  
6. **Ernüchterung / Bedauern danach:** enttäuscht, „nichts gebracht", „nicht wert", nicht wieder, bereue, zu wenig Effekt, schnell weg, teures Lehrgeld, Korrektur nötig  

### 4. Zielgruppe
Nur **Procedure-Open** und **Procedure-Curious**. Aus: klar Skincare-First, automotive Facelift, Laser/IPL außerhalb Anti-Aging, Spam/Werbung/Klinik-Promo, &lt; 30 Zeichen.

Häufigkeit je Teilsegment auf Korpusgröße **normalisieren**, bevor zusammengeführt.

### Zusätzlich auszugeben
- Top **20** Übergewichtung Curious vs Open (Verhältnis) — strategisch wichtigster Kontrast  
- Fallzahlen beider Teilsegmente; Zeitraum; Plattformen  
- Anteil Beiträge ohne emotionale Äußerung  
- Verteilung auf die Farbgruppen  
- Verhältnis Vorher- vs Nachher-Sprache  
- innerhalb Nachher: Erleichterung vs Ernüchterung (Plausibilitätscheck)  

---

## 6 – AGING CONCERNS AND THE PATHS TO SOLVE THEM

### 1. Titel
**Aging Concerns & The Paths to Solve Them**

### 2. Diagrammtyp
Interaktiv, zweistufig.

**Ansicht 1:** nummerierte Rangliste der Aging Concerns (absteigend nach n). Je Zeile: Rang, Name, einzeilige Kurzbeschreibung, absolute n als Sekundärwert. **Keine %-Werte** (Mehrfachzählung). Zeilen klickbar.

**Ansicht 2 (Klick Concern):** horizontale Balken der Lösungswege – blau Procedures, gelb/orange Ingredients, gemeinsam nach Häufigkeit; Zurück-Button.

**Verbindlich (beide Ansichten):**
- absolute n; Hinweis „Mehrfachnennungen möglich"  
- Fußzeile: Zeitraum, Plattformen  
- Drill-down-Untertitel: „Basis: n Beiträge, die Concern + ≥1 Lösungsweg nennen"  
- Warnung „geringe Fallzahl" wenn Basis &lt; 30  
- 2–3 Zitate je Concern und je Lösungsweg (Tooltip)  
- **Konzentrationskennzahl** je Concern: Anteil Volumen auf den häufigsten Suchbegriff; wenn **&gt; 60 %** → Zeile markieren (Rang nicht gleichwertig zu breiten Kategorien)  

### 3. Kategorien (feste Liste)
Zuordnung vorab:

- (a) Concern zählt bei **Problem- und Wunschformulierung** (dieselbe Sorge); pro Beitrag Concern nur **einmal**  
- (b) „ebenmäßig*", „gleichmäßiger Hautton", „fleckig" → nur Hyperpigmentation  
- (c) „uneben*", „raue Haut" → Pores/Texture, außer mit Teint/Hautton/Farbe → Hyperpigmentation  
- (d) Jeder Suchbegriff genau einer Kategorie; bei Konflikt die spezifischere  
- (e) Flexionen/Plural/Komposita  
- (f) Umgangssprache/Englisch  
- (g) Verneinung/Konjunktiv/Ironie nicht affirmativ  

#### Aging Concerns

| Concern | Suchbegriffe (inkl. Wunschformen) |
|---|---|
| **Structural Wrinkling** | Falten, Fältchen, feine Linien, Stirnfalten, Zornesfalte, Nasolabialfalten, Krähenfüße, Marionettenfalten, tiefe Falten, Faltenbildung, glattere Haut, weniger Falten, Faltenreduktion |
| **Sagging and Loss of Contour** | schlaffe Haut, Erschlaffung, Spannkraft verloren, hängende Wangen, Konturverlust, Jawline verloren, Hängebäckchen, Doppelkinn, straffere Haut, festere Konturen, mehr Spannkraft |
| **Collagen & Volume Loss** | Kollagenabbau, Kollagenverlust, Haut wird dünner, dünnere Haut, Volumenverlust, eingefallene Wangen, „Gesicht wirkt eingefallen" |
| **Barrier Fragility / Dryness** | trockene Haut, spannt, schuppig, Feuchtigkeitsmangel, Barriere geschädigt, empfindliche Haut, gereizte Haut, pralle Haut, mehr Feuchtigkeit, gut durchfeuchtet |
| **Hyperpigmentation** | Altersflecken, Pigmentflecken, dunkle Flecken, Sonnenflecken, Melasma, ungleichmäßiger Teint, fleckiger Hautton, ebenmäßiger Teint, ebenmäßiger Hautton, gleichmäßiger Hautton |
| **Dullness** | fahle Haut, fahler Teint, glanzlos, grauer Teint, müde Haut, keine Ausstrahlung, strahlender Teint, Leuchtkraft, frischer Teint |
| **Dark Circles & Under-Eye** | Augenringe, dunkle Schatten unter den Augen, Tränensäcke, müde Augen, Schlupflider, „sehe immer müde aus" |
| **Enlarged Pores & Texture** | große Poren, vergrößerte Poren, unebene Textur, raue Haut, Unebenheiten, feinporig, weniger sichtbare Poren, glatte Textur |
| **Neck, Décolleté & Hands** *(neu)* | Halsfalten, Truthahnhals, schlaffer Hals, Décolleté-Fältchen, Knitterfalten am Décolleté, Handrücken, „meine Hände verraten mein Alter", „der Hals verrät alles", Altersflecken auf den Händen |

#### Lösungswege – Procedures (blau)
Botox; Hyaluronic Fillers; Laser; Microneedling/RF; Chemical Peels; Thread Lifts; Facelift & Chirurgie; Ultrasound Lifting; Fat Reduction / Body Contouring; PRP / Vampire Lift  
(Synonyme wie im Client-Text: Dysport, Xeomin, Fraxel, HIFU, Ultherapy, …)

#### Lösungswege – Ingredients (gelb/orange)
Hyaluronic Acid *(Kontext: Spritze/Arzt → Fillers; Serum/Creme → Ingredient; ohne Kontext nicht zählen)*; Retinol/Retinal/Tretinoin; Vitamin C; Niacinamide; Peptides; Collagen; Vitamin E; Bakuchiol; SPF; AHA/BHA Acids  

### 4. Zielgruppe
- Ansicht 1: alle Mindset-Segmente mit ≥1 Concern  
- Ansicht 2: zusätzlich ≥1 Procedure- oder Ingredient-Kategorie  
- Mehrfachzählung über Kategorien erlaubt  
- Aus: automotive Facelift, Laser/IPL außerhalb Anti-Aging, Spam, Werbung/Klinik ohne Nutzerkommentar, &lt; 30 Zeichen  

**Drill-down:**
- (a) Ko-Okkurrenz nur auf **Beitragsebene** (nicht Thread)  
- (b) gleicher/angrenzender Satz = stark, sonst schwach; beide zählen, stark/schwach ausweisen  
- (c) anzeigen: ≥ 15 Nennungen **oder** ≥ 3 % der Drill-down-Basis (höherer Schwellenwert)  
- (d) Verneinung nicht affirmativ („bloß kein Botox" ≠ Botox) — kritisch für Skincare-First  

### Zusätzlich auszugeben
- Gesamtkorpus; klassifizierbar ≥1 Concern (n + %); Restanteil + Top-5 Freitext-Themen der Restmenge  
- Zeitraum, Plattformen  
- Rangfolge **getrennt nach 3 Mindset-Segmenten**  

**Vs alter Build:** keine separate Needs-Spalte; Wunschformen in Concerns; neue Concern-Kategorie Neck/Décolleté/Hands; Ranked list statt dual concerns/needs bars.
