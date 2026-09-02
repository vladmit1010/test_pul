/**
 * Demo / real data lives here as a plain JS global.
 * Works when opening index.html via file:// (no server, no fetch).
 *
 * Charts read arrays dynamically — change labels, ids, counts, or length
 * in moodMap.moods / topicLandscape.topics and the UI adapts.
 * Comments link via mood id and topics[] ids (multi-label ok).
 */
window.PulsarData = {
  meta: {
    source: 'PULSAR (Demo)',
    scanMode: 'sample',
  },
  overview: {
    eyebrow: '1. Executive Overview',
    title: 'How do German consumers really talk about anti-aging?',
    description:
      'Interactive overview of comments from PULSAR. Hover over an element or click it — quotes from the posts appear on the right.',
    note: 'Currently demo data; your results will be added later.',
  },
  /**
   * KPI cards are computed from moodMap / topicLandscape counts.
   * Change mood ids or highlightTopic when your categories change.
   */
  kpiConfig: {
    positiveMoodIds: ['enthusiastic', 'satisfied'],
    warningMoodId: 'warning',
    highlightTopicId: 'botox',
  },
  moodMap: {
    eyebrow: '2. Mood Map',
    title: 'The emotional spectrum of anti-aging',
    moods: [
      { id: 'enthusiastic', label: 'Enthusiastic', color: '#7ecdb8', count: 207 },
      { id: 'satisfied', label: 'Satisfied', color: '#8ecae6', count: 180 },
      { id: 'hesitant', label: 'Hesitant', color: '#b4a7d6', count: 165 },
      { id: 'disappointed', label: 'Disappointed', color: '#d4a0b8', count: 145 },
      { id: 'warning', label: 'Warning', color: '#e8a0bf', count: 153 },
    ],
  },
  topicLandscape: {
    eyebrow: '3. Topic Landscape',
    title: 'The conversations driving the category',
    /** Soft cool pastels — same family as moods / segments / bubbles */
    palette: ['#7ecdb8', '#8ecae6', '#b4a7d6', '#e8a0bf', '#d4a0b8', '#9db8d4', '#a8c9be', '#c4b0d8', '#7eb8d4', '#d8b0c4'],
    /**
     * Add / remove / rename freely — chart height and labels follow this list.
     * id must match comment.topics[] entries.
     */
    topics: [
      { id: 'bio', label: 'Biorevitalization', count: 99 },
      { id: 'botox', label: 'Botox', count: 94 },
      { id: 'fillers', label: 'Filler / Lips', count: 88 },
      { id: 'clinic', label: 'Clinic choice', count: 82 },
      { id: 'peel', label: 'Peelings', count: 71 },
      { id: 'price', label: 'Price & deals', count: 68 },
      { id: 'laser', label: 'Laser / devices', count: 55 },
      { id: 'sidefx', label: 'Side effects', count: 48 },
      { id: 'doctor', label: 'Doctor / practitioner', count: 44 },
      { id: 'recovery', label: 'Recovery', count: 36 },
    ],
  },
  /**
   * 4. Consumer segmentation — add/remove segments freely.
   * `quote` is the text drawn inside the slice. id ↔ comment.segment
   * Percentages are computed automatically: count / sum(all segment counts).
   * Only edit `count` (from full analysis later); never hardcode %.
   */
  segmentation: {
    eyebrow: '4. Consumer Segmentation',
    title: 'One category, three anti-aging mindsets',
    segments: [
      {
        id: 'procedure-open',
        label: 'Procedure-open',
        color: '#8ecae6',
        count: 187,
        quote: 'I already had procedures and want to prolong the results',
      },
      {
        id: 'procedure-curious',
        label: 'Procedure-curious',
        color: '#e8a0bf',
        count: 391,
        quote: 'I am interested, but hesitant and desire an in-between step',
      },
      {
        id: 'skincare-first',
        label: 'Skincare-first',
        color: '#7ecdb8',
        count: 272,
        quote: "I don't consider procedures but want my skincare to deliver the same results",
      },
    ],
  },
  /**
   * 5A. Zoomable bubble chart (Blasendiagramm)
   * Big circles = procedures. Inner bubbles = how people talk (tone).
   * Size = count. Colors from sentiments[].
   */
  procedureBubbles: {
    eyebrow: '5A. Procedure-open — Procedure popularity · Variant A (rings)',
    title: 'What are the most popular procedures?',
    hint: 'Variant A · 5 separate rings · click ring to zoom · tone bubbles = how people talk',
    hintPack: 'Variant B · sunburst · inner = category · outer = subcategory · click for quotes',
    sentiments: [
      { id: 'positive', label: 'Positive', color: '#7ecdb8' },
      { id: 'cautious', label: 'Cautious', color: '#b4a7d6' },
      { id: 'negative', label: 'Negative', color: '#d4a0b8' },
      { id: 'warning', label: 'Warning', color: '#e8a0bf' },
    ],
    procedures: [
      {
        id: 'botox',
        label: 'Botox',
        shell: '#8ecae6',
        tones: [
          { tone: 'positive', count: 52 },
          { tone: 'cautious', count: 28 },
          { tone: 'negative', count: 18 },
          { tone: 'warning', count: 14 },
        ],
      },
      {
        id: 'filler',
        label: 'Filler',
        shell: '#b4a7d6',
        tones: [
          { tone: 'positive', count: 34 },
          { tone: 'cautious', count: 30 },
          { tone: 'negative', count: 22 },
          { tone: 'warning', count: 16 },
        ],
      },
      {
        id: 'laser',
        label: 'Laser',
        shell: '#7ecdb8',
        tones: [
          { tone: 'positive', count: 26 },
          { tone: 'cautious', count: 14 },
          { tone: 'negative', count: 10 },
          { tone: 'warning', count: 6 },
        ],
      },
      {
        id: 'chemical-peel',
        label: 'Chemical peel',
        shell: '#9db8d4',
        tones: [
          { tone: 'positive', count: 18 },
          { tone: 'cautious', count: 16 },
          { tone: 'negative', count: 12 },
          { tone: 'warning', count: 8 },
        ],
      },
      {
        id: 'facelift',
        label: 'Face lift',
        shell: '#d4a8c4',
        tones: [
          { tone: 'positive', count: 10 },
          { tone: 'cautious', count: 12 },
          { tone: 'negative', count: 8 },
          { tone: 'warning', count: 5 },
        ],
      },
    ],
  },
  /**
   * 6. Behavior Flow — placeholder steps (rename freely later).
   * 4 layers left→right. Nodes = stages; edges = transitions (count = volume).
   * Comment filter: comment.flow === node.id
   */
  behaviorFlow: {
    eyebrow: '6. Behavior Flow',
    title: 'How people move toward a procedure',
    hint: 'Placeholder steps — rename nodes/layers in data.js · click a node for quotes',
    layerLabels: ['Entry', 'Behavior', 'Decision', 'Outcome'],
    nodes: [
      { id: 'f-ad', label: 'Ad / promo', layer: 0, color: '#b4a7d6', count: 42 },
      { id: 'f-ref', label: 'Referral', layer: 0, color: '#8ecae6', count: 58 },
      { id: 'f-self', label: 'Own research', layer: 0, color: '#e8a0bf', count: 71 },
      { id: 'f-read', label: 'Reads reviews', layer: 1, color: '#8ecae6', count: 96 },
      { id: 'f-compare', label: 'Compares clinics', layer: 1, color: '#9db8d4', count: 64 },
      { id: 'f-ask', label: 'Asks community', layer: 1, color: '#7ecdb8', count: 48 },
      { id: 'f-price', label: 'Checks prices', layer: 1, color: '#a8c9be', count: 55 },
      { id: 'f-book', label: 'Booked', layer: 2, color: '#7ecdb8', count: 74 },
      { id: 'f-wait', label: 'Still unsure', layer: 2, color: '#b4a7d6', count: 51 },
      { id: 'f-quit', label: 'Dropped off', layer: 2, color: '#d4a0b8', count: 28 },
      { id: 'f-happy-rec', label: 'Happy → recommends', layer: 3, color: '#7ecdb8', count: 33 },
      { id: 'f-happy', label: 'Happy', layer: 3, color: '#8ecae6', count: 41 },
      { id: 'f-sad', label: 'Disappointed', layer: 3, color: '#d4a0b8', count: 22 },
      { id: 'f-warn', label: 'Warns others', layer: 3, color: '#e8a0bf', count: 19 },
    ],
    edges: [
      { from: 'f-ad', to: 'f-read', count: 28 },
      { from: 'f-ad', to: 'f-price', count: 18 },
      { from: 'f-ref', to: 'f-read', count: 24 },
      { from: 'f-ref', to: 'f-book', count: 22 },
      { from: 'f-self', to: 'f-compare', count: 30 },
      { from: 'f-self', to: 'f-ask', count: 26 },
      { from: 'f-read', to: 'f-compare', count: 34 },
      { from: 'f-read', to: 'f-wait', count: 20 },
      { from: 'f-read', to: 'f-book', count: 28 },
      { from: 'f-compare', to: 'f-book', count: 26 },
      { from: 'f-compare', to: 'f-wait', count: 16 },
      { from: 'f-ask', to: 'f-book', count: 18 },
      { from: 'f-ask', to: 'f-wait', count: 14 },
      { from: 'f-price', to: 'f-quit', count: 16 },
      { from: 'f-price', to: 'f-wait', count: 20 },
      { from: 'f-book', to: 'f-happy-rec', count: 22 },
      { from: 'f-book', to: 'f-happy', count: 28 },
      { from: 'f-book', to: 'f-sad', count: 14 },
      { from: 'f-book', to: 'f-warn', count: 12 },
      { from: 'f-wait', to: 'f-read', count: 18 },
      { from: 'f-wait', to: 'f-quit', count: 12 },
    ],
  },
  comments: [
    {
      id: 1,
      text: 'Botox for the first time — I was scared of the “frozen face”, but the doctor used micro-doses. After 7 days I looked fresher, expression stayed natural.',
      mood: 'enthusiastic',
      topics: ['botox', 'doctor'],
      segment: 'procedure-curious',
      flow: 'f-happy-rec',
      tags: ['Enthusiastic', 'Botox'],
    },
    {
      id: 2,
      text: 'Lip filler looks good, but I had knots for 3 days. Nobody said that was normal — I panicked.',
      mood: 'hesitant',
      topics: ['fillers', 'recovery'],
      segment: 'procedure-curious',
      flow: 'f-wait',
      tags: ['Hesitant', 'Filler / Lips'],
    },
    {
      id: 3,
      text: 'Important: only go to doctors with medical training. A friend had a complication after cheap Botox.',
      mood: 'warning',
      topics: ['botox', 'doctor', 'sidefx'],
      segment: 'procedure-open',
      flow: 'f-warn',
      tags: ['Warning', 'Botox'],
    },
    {
      id: 4,
      text: 'Biorevitalization with Juvederm — skin looks like after a vacation. Expensive, but worth it every 6 months.',
      mood: 'satisfied',
      topics: ['bio', 'price'],
      segment: 'procedure-open',
      flow: 'f-happy',
      tags: ['Satisfied', 'Biorevitalization'],
    },
    {
      id: 5,
      text: 'In the consultation they showed the ampoule and explained contraindications. Instant trust.',
      mood: 'enthusiastic',
      topics: ['doctor', 'clinic'],
      segment: 'procedure-curious',
      flow: 'f-book',
      tags: ['Enthusiastic', 'Doctor / practitioner'],
    },
    {
      id: 6,
      text: 'Forehead “frozen”, brows shifted — likely overdosed. Doctor refused to correct it.',
      mood: 'disappointed',
      topics: ['botox', 'doctor', 'sidefx'],
      segment: 'procedure-open',
      flow: 'f-sad',
      tags: ['Disappointed', 'Botox'],
    },
    {
      id: 7,
      text: 'Reading reviews for a month before my first Botox. Still nervous, but knowledge helps.',
      mood: 'hesitant',
      topics: ['botox', 'clinic'],
      segment: 'procedure-curious',
      flow: 'f-read',
      tags: ['Hesitant', 'Botox'],
    },
    {
      id: 8,
      text: 'Advertised at €99, at the till an upsell for a “premium product”. Pure rip-off.',
      mood: 'disappointed',
      topics: ['price', 'clinic'],
      segment: 'procedure-curious',
      flow: 'f-price',
      tags: ['Disappointed', 'Price & deals'],
    },
    {
      id: 9,
      text: 'Don’t do Botox and filler on the same day! The swelling was intense.',
      mood: 'warning',
      topics: ['botox', 'fillers', 'sidefx'],
      segment: 'procedure-open',
      flow: 'f-warn',
      tags: ['Warning', 'Filler / Lips'],
    },
    {
      id: 10,
      text: 'Natural result — nobody notices I had anything done. That’s real craftsmanship.',
      mood: 'enthusiastic',
      topics: ['doctor', 'botox'],
      segment: 'procedure-open',
      flow: 'f-happy-rec',
      tags: ['Enthusiastic', 'Doctor / practitioner'],
    },
    {
      id: 11,
      text: 'Effect is fine, but the price still stings a bit.',
      mood: 'satisfied',
      topics: ['price', 'botox'],
      segment: 'procedure-open',
      flow: 'f-happy',
      tags: ['Satisfied', 'Price & deals'],
    },
    {
      id: 12,
      text: 'Zero effect after a month. Doctor said “everyone’s different”. Money gone.',
      mood: 'disappointed',
      topics: ['botox'],
      segment: 'procedure-open',
      flow: 'f-sad',
      tags: ['Disappointed', 'Botox'],
    },
    {
      id: 13,
      text: 'Filler migrated after 2 months — too much injected. Warning everyone.',
      mood: 'warning',
      topics: ['fillers', 'sidefx'],
      segment: 'procedure-open',
      flow: 'f-warn',
      tags: ['Warning', 'Filler / Lips'],
    },
    {
      id: 14,
      text: 'Swelling gone after 4 days, just as promised.',
      mood: 'satisfied',
      topics: ['recovery', 'botox'],
      segment: 'procedure-open',
      flow: 'f-happy',
      tags: ['Satisfied', 'Recovery'],
    },
    {
      id: 15,
      text: 'Still unsure about Botox because of side effects — anyone with experience?',
      mood: 'hesitant',
      topics: ['botox', 'sidefx'],
      segment: 'procedure-curious',
      flow: 'f-ask',
      tags: ['Hesitant', 'Botox'],
    },
    {
      id: 16,
      text: 'TCA peel — face shed for a week. The social-pause warning is real.',
      mood: 'warning',
      topics: ['peel', 'recovery'],
      segment: 'skincare-first',
      flow: 'f-warn',
      tags: ['Warning', 'Peelings'],
    },
    {
      id: 17,
      text: 'Laser for pigment spots — 2 sessions, spots lighter. Fine with numbing cream.',
      mood: 'satisfied',
      topics: ['laser'],
      segment: 'skincare-first',
      flow: 'f-happy',
      tags: ['Satisfied', 'Laser / devices'],
    },
    {
      id: 18,
      text: 'Clinic was spotless, disposable materials, doctor is a dermatologist. Happy to pay more.',
      mood: 'enthusiastic',
      topics: ['clinic', 'doctor'],
      segment: 'procedure-curious',
      flow: 'f-compare',
      tags: ['Enthusiastic', 'Clinic choice'],
    },
    {
      id: 19,
      text: 'I skip injectables — I just want a cream that actually firms like people promise after Botox.',
      mood: 'hesitant',
      topics: ['botox'],
      segment: 'skincare-first',
      flow: 'f-quit',
      tags: ['Hesitant', 'Skincare-first'],
    },
    {
      id: 20,
      text: 'Between serums and a full procedure — looking for something gentle in the middle.',
      mood: 'hesitant',
      topics: ['bio', 'peel'],
      segment: 'procedure-curious',
      flow: 'f-wait',
      tags: ['Hesitant', 'Procedure-curious'],
    },
    {
      id: 21,
      text: 'Thinking about a mini facelift — still scared of looking “done”. Need honest before/afters.',
      mood: 'hesitant',
      topics: ['clinic', 'doctor'],
      procedure: 'facelift',
      tone: 'cautious',
      segment: 'procedure-curious',
      flow: 'f-self',
      tags: ['Hesitant', 'Face lift'],
    },
    {
      id: 22,
      text: 'Facelift recovery was longer than promised. Result is good, but plan two weeks off.',
      mood: 'satisfied',
      topics: ['recovery'],
      procedure: 'facelift',
      tone: 'positive',
      segment: 'procedure-open',
      flow: 'f-book',
      tags: ['Satisfied', 'Face lift'],
    },
    {
      id: 23,
      text: 'Chemical peel left me red for days — worth it for texture, but warn your calendar.',
      mood: 'warning',
      topics: ['peel', 'recovery'],
      procedure: 'chemical-peel',
      tone: 'warning',
      segment: 'skincare-first',
      flow: 'f-ad',
      tags: ['Warning', 'Chemical peel'],
    },
  ],
};
