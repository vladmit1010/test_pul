/**
 * Chart blueprint — from Revitalift Dashboard_Beschreibungen Diagramme.docx
 * Spec only (no live PULSAR data). Used by blueprint.html to align on chart scope.
 */
window.BlueprintCharts = {
  meta: {
    title: 'Revitalift Dashboard — Chart Blueprint',
    subtitle: 'Which charts do we want? Spec from client document · wireframes only',
    sourceDoc: 'Revitalift Dashboard_Beschreibungen Diagramme.docx',
  },
  charts: [
    {
      id: 'mood-map',
      number: 1,
      name: 'Mood Map',
      title: 'THE EMOTIONAL SPECTRUM OF ANTI-AGING',
      type: 'Donut chart',
      typeDetail:
        'Percentage distribution · warm → cool color gradient (Enthusiastic → Advisory) to support the emotional spectrum visually.',
      dataSource: 'PULSAR — text analysis',
      categoryMode: 'fixed',
      categories: [
        {
          id: 'enthusiastic',
          label: 'Enthusiastic',
          color: '#f0a86e',
          signals: [
            '„Ich liebe mein Ergebnis"',
            '„Bester Entschluss meines Lebens"',
            '„Kann ich nur empfehlen"',
            '„Endlich mache ich es für mich"',
          ],
        },
        {
          id: 'satisfied',
          label: 'Satisfied',
          color: '#e8c98a',
          signals: [
            '„Bin zufrieden mit dem Ergebnis"',
            '„Hat genau das gemacht, was ich wollte"',
            '„Würde es wieder machen"',
          ],
        },
        {
          id: 'neutral',
          label: 'Neutral',
          color: '#b8c4d4',
          signals: [
            '„Was kostet das ungefähr?"',
            '„Wie lange hält das?"',
            '„Hat jemand Erfahrung mit X vs. Y?"',
          ],
        },
        {
          id: 'disappointed',
          label: 'Disappointed',
          color: '#c9a0b8',
          signals: [
            '„Hat nichts gebracht"',
            '„Geld zum Fenster rausgeworfen"',
            '„Habe mir mehr erwartet"',
          ],
        },
        {
          id: 'advisory',
          label: 'Advisory',
          color: '#7eb8d4',
          signals: [
            '„Bitte vorher gut informieren"',
            '„Bei mir kam es zu Komplikationen"',
            '„Vorsicht, das kann schiefgehen"',
          ],
        },
      ],
      audience:
        'All cleaned, on-topic comments (min. 30–50 chars) with personal stance on anti-aging (Botox/filler, laser, facelift). Exclude spam/ads and comments without personal positioning. If mixed tones: dominant / last tone wins; in doubt → Advisory.',
      interaction: 'Click segment → matching quotes',
    },
    {
      id: 'topic-landscape',
      number: 2,
      name: 'Topic Landscape',
      title: 'THE TOP CONVERSATIONS DRIVING THE CATEGORY',
      type: 'Horizontal bar chart (ranked)',
      typeDetail:
        'Top 10 topics by mention count · each bar has a stacked mini-split: green = positive share, red = negative/warning share within that topic.',
      dataSource: 'PULSAR — text analysis (dynamic top 10)',
      categoryMode: 'dynamic-top-10',
      exampleClusters: [
        'Botox / neuromodulators',
        'Hyaluronic fillers',
        'Laser therapies',
        'Skincare actives (Retinol, Vit C, Niacinamide…)',
        'Wrinkles & signs of aging',
        'Thread lift & ultrasound lifting',
        'Surgical procedures (facelift, blepharoplasty)',
        'Chemical peel / microneedling',
        'Preventive / holistic methods',
        'Celebrity & influencer discourse',
        'Cost discussions',
        'Societal pressure & beauty standards',
      ],
      audience:
        'Comments naming, comparing or asking about a concrete anti-aging topic. Exclude automotive “facelift”, spam, off-topic. Comparisons count for both topics (e.g. “Laser top, Botox flop”).',
      interaction: 'Click bar → quotes for that topic cluster',
    },
    {
      id: 'segmentation',
      number: 3,
      name: 'Consumer Segmentation',
      title: 'ONE CATEGORY, THREE ANTI-AGING MINDSETS',
      type: 'Donut chart',
      typeDetail:
        'Three segments with legend definitions · warm/saturated = Procedure-Open, mixed = Procedure-Curious, cool/clear = Skincare-First.',
      dataSource: 'PULSAR — text analysis',
      categoryMode: 'fixed',
      categories: [
        {
          id: 'procedure-open',
          label: 'Procedure-Open',
          color: '#e8a0bf',
          signals: [
            '„Mein nächster Termin ist in X Wochen"',
            '„Muss ich alle 6 Monate auffrischen"',
            '„Wartungsspritze / Auffrischungstermin"',
          ],
        },
        {
          id: 'procedure-curious',
          label: 'Procedure-Curious',
          color: '#b4a7d6',
          signals: [
            '„Überlege es mir schon lange, aber traue mich nicht"',
            '„Angst vor Nadeln / Frozen Look"',
            '„Brauche erst eine Beratung"',
          ],
        },
        {
          id: 'skincare-first',
          label: 'Skincare-First',
          color: '#7ecdb8',
          signals: [
            '„Ich würde nie unters Messer gehen"',
            '„Kein Botox für mich, aber Retinol jeden Abend"',
            '„Effektive Skincare reicht mir"',
          ],
        },
      ],
      audience:
        'Personal stance on procedures and/or skincare as alternative. Exclude pure info without positioning, spam, automotive facelift. Mixed signals → current dominant attitude.',
      interaction: 'Click segment → quotes for that mindset',
    },
    {
      id: 'procedure-effects',
      number: 4,
      name: 'Procedure-Open & Procedure-Curious',
      title: 'PROCEDURES, EFFECTS AND SCARES',
      type: 'Nested bubble chart',
      typeDetail:
        'Level 1: one main bubble per top procedure (size = mentions). Level 2: sub-bubbles for positive effects (green) and negative fears/complications (red/orange) within that procedure.',
      dataSource: 'PULSAR — text analysis (dynamic top 10 procedures)',
      categoryMode: 'dynamic-nested',
      outerExamples: [
        'Botox / neuromodulators',
        'Hyaluronic fillers',
        'Laser therapies',
        'Microneedling / RF',
        'Chemical peel',
        'Thread lift',
        'Surgical facelift / blepharoplasty',
        'Ultrasound lifting (HIFU)',
        'Body contouring',
        'PRP / vampire lift',
      ],
      innerGroups: [
        {
          label: 'Positive effects (green)',
          examples: [
            'Visible wrinkle reduction',
            'Natural-looking result',
            'Confidence / empowerment',
            'Long-lasting effect',
            'Quick recovery',
            'Volume / contouring',
          ],
        },
        {
          label: 'Negative fears & complications (red/orange)',
          examples: [
            'Unnatural look (frozen, duck lips)',
            'Complications / side effects',
            'Cost & repeat treatments',
            'Regret / disappointment',
            'Fear of needles / pain',
            'Social stigma',
            'Wrong provider / botched result',
          ],
        },
      ],
      audience:
        'Comments naming procedures — focus Procedure-Open & Procedure-Curious. Exclude Skincare-First, automotive facelift, pure clinic ads. Multi-procedure comparisons count for each procedure cluster.',
      interaction: 'Click procedure or sub-bubble → filtered quotes',
    },
    {
      id: 'skincare-ingredients',
      number: 5,
      name: 'Skincare-First',
      title: 'INGREDIENTS, CONCERNS AND DESIRED RESULTS',
      type: 'Nested bubble chart',
      typeDetail:
        'Level 1: main bubble per top ingredient (size = mentions). Level 2: signs of aging (blue/grey) + desired results (green) linked to that ingredient.',
      dataSource: 'PULSAR — text analysis (dynamic top 10 ingredients)',
      categoryMode: 'dynamic-nested',
      outerExamples: [
        'Hyaluronic acid',
        'Retinol / retinal / tretinoin',
        'Vitamin C',
        'Niacinamide',
        'Peptides',
        'Collagen',
        'Vitamin E',
        'Bakuchiol',
        'SPF / sun protection',
        'AHA / BHA acids',
      ],
      innerGroups: [
        {
          label: 'Signs of aging — trigger (blue/grey)',
          examples: [
            'Wrinkles & fine lines',
            'Dryness',
            'Loss of elasticity',
            'Pigmentation',
            'Dark circles',
            'Dull complexion',
            'Large pores',
            'Collagen loss',
          ],
        },
        {
          label: 'Desired results — outcome (green)',
          examples: [
            'Plump, hydrated skin',
            'Visible wrinkle reduction',
            'Even, radiant tone',
            'Firmness & lift',
            'Youthful fresh look',
            'Reduced spots',
            'Refined pores / texture',
            'Long-term prevention',
          ],
        },
      ],
      audience:
        'Comments about skincare actives as primary solution (Skincare-First). Exclude comments focused on invasive procedures. Ingredient comparisons count for both ingredients.',
      interaction: 'Click ingredient or sub-bubble → filtered quotes',
    },
    {
      id: 'decision-drivers',
      number: 6,
      name: 'Category-Wide Decision Drivers',
      title: 'WHOM DO GERMAN CONSUMERS TRUST WHEN IT COMES TO ANTI-AGING?',
      type: 'Horizontal bar chart',
      typeDetail:
        '7 fixed categories, sorted by value descending · values taken directly from Appinio survey (no re-analysis).',
      dataSource: 'Appinio survey — fixed values (n=450, DE consumers)',
      categoryMode: 'fixed-survey',
      categories: [
        { label: 'Clinically tested efficacy', value: 86.4 },
        { label: 'Innovative ingredients', value: 73.9 },
        { label: 'Recommendations by experts', value: 72.0 },
        { label: 'Price-performance ratio', value: 54.9 },
        { label: 'Recommendations by friends', value: 51.1 },
        { label: 'Popularity of the brand', value: 26.2 },
        { label: 'Market leader / tradition', value: 25.8 },
      ],
      audience:
        'Appinio question “Emotional Trust Builders” only — final percentages, no PULSAR text mining for this chart.',
      interaction: 'Optional: click bar for survey context / no comment filter',
    },
  ],
};
