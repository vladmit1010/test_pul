/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DASHBOARD DATA — EXAMPLE FILE (show this to agents / pipeline)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * All chart numbers live in this ONE file. Replace sample values with real
 * PULSAR / Appinio output. Comments[] link to chart filters via ids below.
 *
 * Charts 4 & 5 taxonomy (fixed DE labels, no counts):
 *   → js/dashboard-taxonomy-de.js
 * Full id reference for agents (all charts, no sample counts):
 *   → data/dashboard-reference.json
 * Counts for charts 4 & 5:
 *   → procedureEffects.aggregates / skincareIngredients.aggregates below
 *
 * Schema version: 1
 * Source doc: Revitalift Dashboard_Beschreibungen Diagramme.docx
 */
window.DashboardData = {
  meta: {
    schema_version: 1,
    source: 'Revitalift sample',
    scan_mode: 'sample',
    total_comments: 1240,
    survey_note: 'Chart 6 values are fixed Appinio (n=450) — do not recompute from comments',
  },

  /** Chart 1 — fixed 5 moods */
  moodMap: {
    eyebrow: '1. Mood Map',
    title: 'The emotional spectrum of anti-aging',
    moods: [
      { id: 'enthusiastic', label: 'Enthusiastic', color: '#f0a86e', count: 268 },
      { id: 'satisfied', label: 'Satisfied', color: '#e8c98a', count: 224 },
      { id: 'neutral', label: 'Neutral', color: '#b8c4d4', count: 186 },
      { id: 'disappointed', label: 'Disappointed', color: '#c9a0b8', count: 198 },
      { id: 'advisory', label: 'Advisory', color: '#7eb8d4', count: 164 },
    ],
  },

  /**
   * Chart 2 — Topic Landscape
   * FIXED: topN = 10 (always show top 10 on chart)
   * SEMI-FIXED: candidates[] = full taxonomy (~12 topic ids you track in analysis)
   * DYNAMIC: count, positive, negative per candidate (recomputed each run)
   * UI: DashboardUtils.getTopicLandscapeTopics() sorts by count → slice(topN)
   * Comments: topics[] uses same ids — filter works even for ranks 11–12 (no bar shown)
   */
  topicLandscape: {
    eyebrow: '2. Topic Landscape',
    title: 'The top conversations driving the category',
    topN: 10,
    candidates: [
      { id: 'botox', label: 'Botox / neuromodulators', count: 142, positive: 86, negative: 56 },
      { id: 'fillers', label: 'Hyaluronic fillers', count: 128, positive: 74, negative: 54 },
      { id: 'laser', label: 'Laser therapies', count: 96, positive: 68, negative: 28 },
      { id: 'retinol', label: 'Retinol & retinoids', count: 88, positive: 72, negative: 16 },
      { id: 'price', label: 'Cost discussions', count: 82, positive: 22, negative: 60 },
      { id: 'facelift', label: 'Surgical facelift', count: 71, positive: 38, negative: 33 },
      { id: 'celebrity', label: 'Celebrity / influencer', count: 64, positive: 30, negative: 34 },
      { id: 'peel', label: 'Chemical peel / microneedling', count: 58, positive: 40, negative: 18 },
      { id: 'pressure', label: 'Societal pressure', count: 52, positive: 12, negative: 40 },
      { id: 'spf', label: 'SPF / prevention', count: 48, positive: 42, negative: 6 },
      { id: 'threads', label: 'Thread lift / HIFU', count: 41, positive: 24, negative: 17 },
      { id: 'natural', label: 'Natural aging / no intervention', count: 36, positive: 28, negative: 8 },
    ],
  },

  /** Chart 3 — fixed 3 mindsets */
  segmentation: {
    eyebrow: '3. Consumer Segmentation',
    title: 'One category, three anti-aging mindsets',
    segments: [
      {
        id: 'procedure-open',
        label: 'Procedure-open',
        color: '#e8a0bf',
        count: 312,
        quote: 'I already had procedures and want to prolong the results',
      },
      {
        id: 'procedure-curious',
        label: 'Procedure-curious',
        color: '#b4a7d6',
        count: 498,
        quote: 'Interested, but hesitant — looking for a safer in-between step',
      },
      {
        id: 'skincare-first',
        label: 'Skincare-first',
        color: '#7ecdb8',
        count: 430,
        quote: "I don't consider procedures but want skincare to deliver results",
      },
    ],
  },

  /**
   * Chart 4 — Verfahren, Wirkungen und Ängste
   * Taxonomie (fix): js/dashboard-taxonomy-de.js → chart4
   * Zählungen (dynamisch): aggregates.procedures[] — nur Verfahren mit Mentions
   * Comments: procedure + procedureTone (ids aus Taxonomie)
   */
  procedureEffects: {
    eyebrow: '4. Procedure-Open & Procedure-Curious',
    title: 'Verfahren, Wirkungen und Ängste',
    hint: 'Außenring = Verfahren · innen grün = positive Effekte · rot = Ängste · Klick für Zitate',
    aggregates: {
      procedures: [
        {
          id: 'botox',
          shell: '#8ecae6',
          tones: [
            { tone: 'natural-look', count: 52 },
            { tone: 'wrinkle-reduction', count: 48 },
            { tone: 'frozen-look', count: 34 },
            { tone: 'vascular-complications', count: 18 },
          ],
        },
        {
          id: 'hyaluron-filler',
          shell: '#b4a7d6',
          tones: [
            { tone: 'self-confidence', count: 38 },
            { tone: 'volume-restoration', count: 32 },
            { tone: 'filler-migration', count: 28 },
            { tone: 'high-cost', count: 22 },
          ],
        },
        {
          id: 'hifu',
          shell: '#7ecdb8',
          tones: [
            { tone: 'skin-tightening', count: 26 },
            { tone: 'wrinkle-reduction', count: 22 },
            { tone: 'high-cost', count: 12 },
          ],
        },
        {
          id: 'laser',
          shell: '#9db8d4',
          tones: [
            { tone: 'wrinkle-reduction', count: 24 },
            { tone: 'natural-look', count: 20 },
            { tone: 'swelling', count: 14 },
          ],
        },
        {
          id: 'peeling',
          shell: '#d4a8c4',
          tones: [
            { tone: 'natural-look', count: 18 },
            { tone: 'redness-irritation', count: 14 },
            { tone: 'maintenance-burden', count: 10 },
          ],
        },
        {
          id: 'facelift',
          shell: '#e8c98a',
          tones: [
            { tone: 'self-confidence', count: 14 },
            { tone: 'high-cost', count: 16 },
            { tone: 'botched', count: 12 },
            { tone: 'frozen-look', count: 8 },
          ],
        },
      ],
    },
  },

  /**
   * Chart 5 — Wirkstoffe, Hautprobleme und Pflegeziele
   * Taxonomie (fix): js/dashboard-taxonomy-de.js → chart5
   * Zählungen (dynamisch): aggregates.procedures[] (= Wirkstoffe mit Mentions)
   * Comments: ingredient + ingredientTone (ids aus Taxonomie)
   */
  skincareIngredients: {
    eyebrow: '5. Skincare-First',
    title: 'Wirkstoffe, Hautprobleme und Pflegeziele',
    hint: 'Außenring = Wirkstoff · blau = Hautproblem · grün = gewünschtes Ergebnis',
    aggregates: {
      procedures: [
        {
          id: 'retinol',
          shell: '#b4a7d6',
          tones: [
            { tone: 'wrinkles', count: 44 },
            { tone: 'radiance', count: 36 },
            { tone: 'dryness', count: 22 },
          ],
        },
        {
          id: 'vitamin-c',
          shell: '#e8c98a',
          tones: [
            { tone: 'pigmentation', count: 38 },
            { tone: 'radiance', count: 34 },
            { tone: 'prevention', count: 18 },
          ],
        },
        {
          id: 'hyaluronic-acid',
          shell: '#8ecae6',
          tones: [
            { tone: 'dryness', count: 42 },
            { tone: 'firming', count: 28 },
            { tone: 'radiance', count: 24 },
          ],
        },
        {
          id: 'niacinamide',
          shell: '#7ecdb8',
          tones: [
            { tone: 'pigmentation', count: 26 },
            { tone: 'radiance', count: 22 },
            { tone: 'wrinkles', count: 16 },
          ],
        },
        {
          id: 'spf',
          shell: '#9db8d4',
          tones: [
            { tone: 'prevention', count: 48 },
            { tone: 'pigmentation', count: 20 },
          ],
        },
      ],
    },
  },

  /** Chart 6 — fixed Appinio survey % (not from comments) */
  decisionDrivers: {
    eyebrow: '6. Category-Wide Decision Drivers',
    title: 'Whom do German consumers trust when it comes to anti-aging?',
    source: 'Appinio · Emotional Trust Builders · n=450',
    drivers: [
      { id: 'clinical', label: 'Clinically tested efficacy', percent: 86.4 },
      { id: 'innovation', label: 'Innovative ingredients', percent: 73.9 },
      { id: 'experts', label: 'Recommendations by experts', percent: 72.0 },
      { id: 'price', label: 'Price-performance ratio', percent: 54.9 },
      { id: 'friends', label: 'Recommendations by friends', percent: 51.1 },
      { id: 'brand', label: 'Popularity of the brand', percent: 26.2 },
      { id: 'tradition', label: 'Market leader / tradition', percent: 25.8 },
    ],
  },

  /**
   * Sample comments — link via ids above.
   * Fields: mood, segment, topics[], procedure?, procedureTone?, ingredient?, ingredientTone?
   */
  comments: [
    {
      id: 1,
      text: 'Botox for the first time — micro-doses, natural result. Best decision, I only recommend going to a trained doctor.',
      mood: 'enthusiastic',
      segment: 'procedure-curious',
      topics: ['botox'],
      procedure: 'botox',
      procedureTone: 'natural-look',
      tags: ['Enthusiastic', 'Botox'],
    },
    {
      id: 2,
      text: 'What does lip filler cost roughly? Still comparing clinics and reading reviews.',
      mood: 'neutral',
      segment: 'procedure-curious',
      topics: ['fillers', 'price'],
      tags: ['Neutral', 'Fillers'],
    },
    {
      id: 3,
      text: 'Important: only go to doctors with medical training. A friend had complications after cheap Botox.',
      mood: 'advisory',
      segment: 'procedure-open',
      topics: ['botox'],
      procedure: 'botox',
      procedureTone: 'vascular-complications',
      tags: ['Advisory', 'Botox'],
    },
    {
      id: 4,
      text: 'Retinol every evening — wrinkles are softer after 8 weeks. No needles for me, skincare is enough.',
      mood: 'satisfied',
      segment: 'skincare-first',
      topics: ['retinol'],
      ingredient: 'retinol',
      ingredientTone: 'wrinkles',
      tags: ['Satisfied', 'Retinol'],
    },
    {
      id: 5,
      text: 'Laser for pigment spots — two sessions, spots lighter. Satisfied with the result.',
      mood: 'satisfied',
      segment: 'procedure-open',
      topics: ['laser'],
      procedure: 'laser',
      procedureTone: 'wrinkle-reduction',
      tags: ['Satisfied', 'Laser'],
    },
    {
      id: 6,
      text: 'Forehead frozen, brows shifted — likely overdosed. Would not do it again.',
      mood: 'disappointed',
      segment: 'procedure-open',
      topics: ['botox'],
      procedure: 'botox',
      procedureTone: 'frozen-look',
      tags: ['Disappointed', 'Botox'],
    },
    {
      id: 7,
      text: 'Vitamin C serum helped my dull skin — more even tone without any procedure.',
      mood: 'enthusiastic',
      segment: 'skincare-first',
      topics: ['retinol'],
      ingredient: 'vitamin-c',
      ingredientTone: 'radiance',
      tags: ['Enthusiastic', 'Vitamin C'],
    },
    {
      id: 8,
      text: 'Advertised at €99, upsell at the till. Pure rip-off — wasted money.',
      mood: 'disappointed',
      segment: 'procedure-curious',
      topics: ['price'],
      tags: ['Disappointed', 'Price'],
    },
    {
      id: 9,
      text: 'SPF 50 every day — prevention is cheaper than fixing damage later.',
      mood: 'satisfied',
      segment: 'skincare-first',
      topics: ['spf'],
      ingredient: 'spf',
      ingredientTone: 'prevention',
      tags: ['Satisfied', 'SPF'],
    },
    {
      id: 10,
      text: 'Thinking about a mini facelift — scared of looking “done”. Need honest before/afters.',
      mood: 'neutral',
      segment: 'procedure-curious',
      topics: ['facelift'],
      procedure: 'facelift',
      procedureTone: 'frozen-look',
      tags: ['Neutral', 'Face lift'],
    },
    {
      id: 11,
      text: 'Hyaluronic serum plumps my skin — dryness gone in winter.',
      mood: 'satisfied',
      segment: 'skincare-first',
      topics: ['retinol'],
      ingredient: 'hyaluronic-acid',
      ingredientTone: 'dryness',
      tags: ['Satisfied', 'Hyaluronic acid'],
    },
    {
      id: 12,
      text: 'Filler migrated after 2 months — warning everyone to choose the provider carefully.',
      mood: 'advisory',
      segment: 'procedure-open',
      topics: ['fillers'],
      procedure: 'hyaluron-filler',
      procedureTone: 'filler-migration',
      tags: ['Advisory', 'Filler'],
    },
    {
      id: 13,
      text: 'Social media makes everyone look 25 forever — pressure is insane.',
      mood: 'advisory',
      segment: 'procedure-curious',
      topics: ['pressure', 'celebrity'],
      tags: ['Advisory', 'Societal pressure'],
    },
    {
      id: 14,
      text: 'My maintenance Botox appointment is in 4 weeks — refreshes every 6 months for me.',
      mood: 'satisfied',
      segment: 'procedure-open',
      topics: ['botox'],
      procedure: 'botox',
      procedureTone: 'wrinkle-reduction',
      tags: ['Satisfied', 'Procedure-open'],
    },
    {
      id: 15,
      text: 'Niacinamide faded some dark spots — gentle and affordable.',
      mood: 'enthusiastic',
      segment: 'skincare-first',
      topics: ['retinol'],
      ingredient: 'niacinamide',
      ingredientTone: 'pigmentation',
      tags: ['Enthusiastic', 'Niacinamide'],
    },
    {
      id: 16,
      text: 'Chemical peel left me red for days — worth it for texture, but plan time off.',
      mood: 'advisory',
      segment: 'skincare-first',
      topics: ['peel'],
      procedure: 'peeling',
      procedureTone: 'redness-irritation',
      tags: ['Advisory', 'Peel'],
    },
    {
      id: 17,
      text: 'Does anyone have experience with HIFU vs thread lift? Still researching.',
      mood: 'neutral',
      segment: 'procedure-curious',
      topics: ['facelift'],
      tags: ['Neutral', 'Procedures'],
    },
    {
      id: 18,
      text: 'Celebrity “did she or didn’t she” posts stress me out more than wrinkles.',
      mood: 'disappointed',
      segment: 'procedure-curious',
      topics: ['celebrity', 'pressure'],
      tags: ['Disappointed', 'Celebrity'],
    },
  ],
};
