/**
 * PULSAR — Demo-Daten: Kosmetik, Botox, Behandlungen (Deutsch)
 * Metriken werden aus window.PulsarComments berechnet.
 */
(function () {
  const ATTITUDE_DEFS = [
    { id: 'delighted', label: 'Begeistert', color: '#7ecdb8', desc: '„Beste Entscheidung“, „super Ergebnis“' },
    { id: 'satisfied', label: 'Zufrieden', color: '#8ecae6', desc: 'Ergebnis ok, mit Einschränkungen' },
    { id: 'cautious', label: 'Unsicher', color: '#f0d9b5', desc: 'Überlegen, Angst, fragen um Rat' },
    { id: 'disappointed', label: 'Enttäuscht', color: '#f0948a', desc: 'Effekt nicht wie erwartet' },
    { id: 'warning', label: 'Warnen', color: '#e8a0bf', desc: '„Macht nicht denselben Fehler“' },
  ];

  const TOPIC_DEFS = [
    { id: 'botox', label: 'Botox' },
    { id: 'fillers', label: 'Filler / Lippen' },
    { id: 'bio', label: 'Biorevitalisierung' },
    { id: 'clinic', label: 'Klinikwahl' },
    { id: 'doctor', label: 'Arzt / Behandler' },
    { id: 'price', label: 'Preis & Aktionen' },
    { id: 'recovery', label: 'Erholung' },
    { id: 'sidefx', label: 'Nebenwirkungen' },
    { id: 'peel', label: 'Peelings' },
    { id: 'laser', label: 'Laser / Geräte' },
  ];

  const WARNING_DEFS = [
    { id: 'w1', text: '„Nur zu geprüften Ärzten mit medizinischer Ausbildung gehen“', severity: 'high' },
    { id: 'w2', text: '„Nicht sparen — billiges Botox = Asymmetrie-Risiko“', severity: 'high' },
    { id: 'w3', text: '„Zertifikat des Präparats verlangen und Ampulle zeigen lassen“', severity: 'med' },
    { id: 'w4', text: '„Nach Behandlung min. 2 Wochen kein Sport/Sauna“', severity: 'med' },
    { id: 'w5', text: '„Filler können verrutschen — erfahrenen Arzt wählen“', severity: 'high' },
    { id: 'w6', text: '„Nicht mehrere Behandlungen an einem Tag“', severity: 'med' },
    { id: 'w7', text: '„Kontraindikationen lesen — Allergie ist möglich“', severity: 'low' },
    { id: 'w8', text: '„Belege und Vorher/Nachher-Fotos für Streitfälle aufbewahren“', severity: 'low' },
  ];

  const JOURNEY_DEFS = [
    { id: 'j1', label: 'Interesse', color: '#b4a7d6' },
    { id: 'j2', label: 'Liest Bewertungen', color: '#8ecae6' },
    { id: 'j3', label: 'Klinikwahl', color: '#f0d9b5' },
    { id: 'j4', label: 'Beratung', color: '#7ecdb8' },
    { id: 'j5', label: 'Behandlung', color: '#e8a0bf' },
    { id: 'j6', label: 'Erste Tage', color: '#f0948a' },
    { id: 'j7', label: 'Ergebnis', color: '#7ecdb8' },
    { id: 'j8', label: 'Empfehlung', color: '#8ecae6' },
  ];

  const FLOW_NODE_DEFS = [
    { id: 'f-ad', label: 'Werbung / Aktion', layer: 0, color: '#b4a7d6' },
    { id: 'f-ref', label: 'Empfehlung', layer: 0, color: '#8ecae6' },
    { id: 'f-self', label: 'Eigene Recherche', layer: 0, color: '#e8a0bf' },
    { id: 'f-read', label: 'Liest Bewertungen', layer: 1, color: '#8ecae6' },
    { id: 'f-compare', label: 'Vergleicht Kliniken', layer: 1, color: '#f0d9b5' },
    { id: 'f-ask', label: 'Fragt in Community', layer: 1, color: '#7ecdb8' },
    { id: 'f-price', label: 'Prüft Preise', layer: 1, color: '#56cfe1' },
    { id: 'f-book', label: 'Termin gebucht', layer: 2, color: '#7ecdb8' },
    { id: 'f-wait', label: 'Noch unsicher', layer: 2, color: '#f0d9b5' },
    { id: 'f-quit', label: 'Abgebrochen', layer: 2, color: '#f0948a' },
    { id: 'f-happy-rec', label: 'Zufrieden → empfiehlt', layer: 3, color: '#7ecdb8' },
    { id: 'f-happy', label: 'Zufrieden', layer: 3, color: '#8ecae6' },
    { id: 'f-sad', label: 'Enttäuscht', layer: 3, color: '#f0948a' },
    { id: 'f-warn', label: 'Warnt andere', layer: 3, color: '#e8a0bf' },
  ];

  const FLOW_EDGE_DEFS = [
    { from: 'f-ad', to: 'f-read' },
    { from: 'f-ad', to: 'f-price' },
    { from: 'f-ref', to: 'f-read' },
    { from: 'f-ref', to: 'f-book' },
    { from: 'f-self', to: 'f-compare' },
    { from: 'f-self', to: 'f-ask' },
    { from: 'f-read', to: 'f-compare' },
    { from: 'f-read', to: 'f-wait' },
    { from: 'f-read', to: 'f-book' },
    { from: 'f-compare', to: 'f-book' },
    { from: 'f-compare', to: 'f-wait' },
    { from: 'f-ask', to: 'f-book' },
    { from: 'f-ask', to: 'f-wait' },
    { from: 'f-price', to: 'f-quit' },
    { from: 'f-price', to: 'f-wait' },
    { from: 'f-book', to: 'f-happy-rec' },
    { from: 'f-book', to: 'f-happy' },
    { from: 'f-book', to: 'f-sad' },
    { from: 'f-book', to: 'f-warn' },
    { from: 'f-wait', to: 'f-read' },
    { from: 'f-wait', to: 'f-quit' },
  ];

  const TRUST_PLUS_DEFS = [
    { id: 'tp1', label: 'Erfahrener Arzt' },
    { id: 'tp2', label: 'Natürliches Ergebnis' },
    { id: 'tp3', label: 'Ehrliche Beratung' },
    { id: 'tp4', label: 'Hygiene / Klinik' },
    { id: 'tp5', label: 'Nachsorge' },
  ];

  const TRUST_MINUS_DEFS = [
    { id: 'tm1', label: 'Asymmetrie / Überkorrektur' },
    { id: 'tm2', label: 'Versteckte Zusatzkosten' },
    { id: 'tm3', label: 'Unfreundliches Personal' },
    { id: 'tm4', label: 'Lange Schwellung / Bluterguss' },
    { id: 'tm5', label: 'Kein sichtbares Ergebnis' },
  ];

  const PROCEDURES = ['Botox', 'Filler', 'Biorev.', 'Peeling', 'Laser', 'Meso'];
  const SENTIMENT_COLS = ['Begeistert', 'Zufrieden', 'Unsicher', 'Negativ'];
  const POSITIVE_ATTITUDES = new Set(['delighted', 'satisfied']);

  function countBy(items, keyFn) {
    const map = {};
    items.forEach((item) => {
      const key = keyFn(item);
      if (key == null) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }

  function sentimentFromAttitude(att) {
    if (att === 'delighted') return 'Begeistert';
    if (att === 'satisfied') return 'Zufrieden';
    if (att === 'cautious') return 'Unsicher';
    return 'Negativ';
  }

  function buildAggregates(comments) {
    const total = comments.length;
    const byAttitude = countBy(comments, (q) => q.attitude);
    const byTopic = countBy(comments, (q) => q.topic);
    const byWarning = countBy(comments, (q) => q.warning);
    const byJourney = countBy(comments, (q) => q.journey);
    const byFlow = countBy(comments, (q) => q.flow);
    const byTrust = countBy(comments, (q) => q.trust);

    const attitudes = ATTITUDE_DEFS.map((def) => ({
      ...def,
      count: byAttitude[def.id] || 0,
    }));

    const topics = TOPIC_DEFS.map((def) => ({
      ...def,
      count: byTopic[def.id] || 0,
    })).filter((t) => t.count > 0);

    const warnings = WARNING_DEFS.map((def) => ({
      ...def,
      count: byWarning[def.id] || 0,
    }))
      .filter((w) => w.count > 0)
      .sort((a, b) => b.count - a.count);

    const journey = JOURNEY_DEFS.map((def) => {
      const group = comments.filter((q) => q.journey === def.id);
      const positive = group.filter((q) => POSITIVE_ATTITUDES.has(q.attitude)).length;
      return {
        ...def,
        count: group.length,
        sentiment: group.length ? positive / group.length : 0,
      };
    });

    const flowNodes = FLOW_NODE_DEFS.map((def) => ({
      ...def,
      count: byFlow[def.id] || 0,
    }));

    const flowEdges = FLOW_EDGE_DEFS.map((def) => ({
      ...def,
      count: comments.filter((q) => q.flowFrom === def.from && q.flowTo === def.to).length,
    })).filter((e) => e.count > 0);

    const matrix = {};
    PROCEDURES.forEach((proc) => {
      matrix[proc] = SENTIMENT_COLS.map((sent) =>
        comments.filter(
          (q) => q.procedure === proc && sentimentFromAttitude(q.attitude) === sent,
        ).length,
      );
    });

    const trustPlus = TRUST_PLUS_DEFS.map((def) => ({
      ...def,
      count: byTrust[def.id] || 0,
    }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);

    const trustMinus = TRUST_MINUS_DEFS.map((def) => ({
      ...def,
      count: byTrust[def.id] || 0,
    }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);

    const positiveCount = comments.filter((q) => POSITIVE_ATTITUDES.has(q.attitude)).length;
    const warningCount = comments.filter((q) => q.warning).length;
    const botoxCount = byTopic.botox || 0;

    const kpis = [
      { label: 'Kommentare', value: String(total), hint: 'in der Stichprobe', color: '#e8a0bf' },
      {
        label: 'Positiv',
        value: total ? `${Math.round((positiveCount / total) * 100)}%` : '0%',
        hint: 'zufrieden mit Ergebnis',
        color: '#7ecdb8',
      },
      {
        label: 'Mit Warnung',
        value: total ? `${Math.round((warningCount / total) * 100)}%` : '0%',
        hint: 'warnen andere',
        color: '#f0948a',
      },
      { label: 'Über Botox', value: String(botoxCount), hint: 'Erwähnungen', color: '#b4a7d6' },
    ];

    return {
      meta: {
        source: 'PULSAR (Demo)',
        totalComments: total,
        period: 'Jan — Jul 2026',
        procedures: ['Botox', 'Filler', 'Biorevitalisierung', 'Peeling', 'Laser', 'Mesotherapie'],
      },
      kpis,
      attitudes,
      topics,
      warnings,
      journey,
      behaviorFlow: {
        layerLabels: ['Einstieg', 'Verhalten', 'Entscheidung', 'Ergebnis'],
        nodes: flowNodes,
        edges: flowEdges,
      },
      procedures: PROCEDURES,
      sentimentCols: SENTIMENT_COLS,
      matrix,
      trustPlus,
      trustMinus,
    };
  }

  const comments = window.PulsarComments || [];
  const aggregates = buildAggregates(comments);

  window.PulsarData = {
    ui: {
      ratingsLabel: 'Bewertungen',
      quoteEmptyClick: 'Klicken Sie auf ein Diagrammsegment, eine Warnung oder eine Phase in der Kette.',
      quoteEmptyNoResults: 'Keine Zitate für diesen Filter im Demo-Datensatz.',
      quoteSource: 'PULSAR (Demo)',
      quoteShown: '{shown} von {total}',
      quoteMoreBtn: 'Weitere Zitate',
      tipCommentsInSegment: '{n} Kommentare im Segment',
      tipClickPin: '{n} Komm. · Klick zum Fixieren',
      topicPrefix: 'Thema:',
      mentions: 'Erwähnungen',
      warningLabel: 'Warnung',
      severity: { high: 'wichtig', med: 'mittel', low: 'Tipp' },
      journeyComments: 'Komm.',
      journeyLegend: [
        'positiver Ton der Phase',
        'gemischt',
        'Unsicherheit / negativ',
        'Balken unter Phase = Anteil Positives',
      ],
      stagePrefix: 'Phase:',
      tonePrefix: 'Ton',
      matrixComments: 'Komm.',
      trustPlusTitle: '✓ Lob',
      trustMinusTitle: '✗ Kritik',
      praiseLabel: 'Lob',
      criticizeLabel: 'Kritik',
      flowPrefix: 'Verhalten:',
      flowEdgePrefix: 'Übergang:',
      flowLayerLabels: ['Einstieg', 'Verhalten', 'Entscheidung', 'Ergebnis'],
    },

    ...aggregates,

    getAllQuotes() {
      return comments;
    },

    filterQuotes(filter) {
      if (!filter) return [];
      return comments.filter((q) => {
        if (filter.type === 'attitude') return q.attitude === filter.value;
        if (filter.type === 'topic') return q.topic === filter.value;
        if (filter.type === 'warning') return q.warning === filter.value;
        if (filter.type === 'journey') return q.journey === filter.value;
        if (filter.type === 'flow') return q.flow === filter.value;
        if (filter.type === 'trust-plus') return q.trust === filter.value;
        if (filter.type === 'trust-minus') return q.trust === filter.value;
        if (filter.type === 'matrix') {
          return q.procedure === filter.procedure && sentimentFromAttitude(q.attitude) === filter.sentiment;
        }
        return false;
      });
    },

    _sentimentFromAttitude: sentimentFromAttitude,
  };
})();
