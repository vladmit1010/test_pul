/**
 * Renders chart blueprint from BlueprintCharts (spec + wireframes).
 */
(function () {
  const D = window.BlueprintCharts;
  if (!D) return;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function polar(cx, cy, r, start, end) {
    const rad = (a) => ((a - 90) * Math.PI) / 180;
    const x = (a) => cx + r * Math.cos(rad(a));
    const y = (a) => cy + r * Math.sin(rad(a));
    const sweep = Math.max(end - start, 0.01);
    const large = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x(start)} ${y(start)} A ${r} ${r} 0 ${large} 1 ${x(end)} ${y(end)} Z`;
  }

  function wireframeDonut(segments, cx, cy, r, hole) {
    const total = segments.reduce((s, x) => s + (x.weight || 1), 0);
    let angle = 0;
  return segments
      .map((seg) => {
        const sweep = ((seg.weight || 1) / total) * 360;
        const start = angle;
        const end = angle + sweep - 1;
        angle += sweep;
        const outer = polar(cx, cy, r, start, end);
        const inner = polar(cx, cy, hole, end, start);
        return `<path d="${outer} L ${cx + hole * Math.cos(((end - 90) * Math.PI) / 180)} ${cy + hole * Math.sin(((end - 90) * Math.PI) / 180)} ${inner}" fill="${seg.color}" opacity="0.92"/>`;
      })
      .join('');
  }

  function renderDonutWireframe(categories, holeRatio) {
    const segs = categories.map((c) => ({ color: c.color, weight: 1 }));
    const W = 320;
    const cx = W / 2;
    const cy = W / 2;
    const r = 140;
    const hole = r * (holeRatio || 0.52);
    let angle = 0;
    const total = segs.length;
    const slices = segs
      .map((seg, i) => {
        const sweep = 360 / total;
        const start = angle;
        const end = angle + sweep - 2;
        angle += sweep;
        const rad = (a) => ((a - 90) * Math.PI) / 180;
        const ox = (a, rad_) => cx + rad_ * Math.cos(rad(a));
        const oy = (a, rad_) => cy + rad_ * Math.sin(rad(a));
        const d = [
          `M ${ox(start, r)} ${oy(start, r)}`,
          `A ${r} ${r} 0 0 1 ${ox(end, r)} ${oy(end, r)}`,
          `L ${ox(end, hole)} ${oy(end, hole)}`,
          `A ${hole} ${hole} 0 0 0 ${ox(start, hole)} ${oy(start, hole)}`,
          'Z',
        ].join(' ');
        return `<path d="${d}" fill="${seg.color}" stroke="#0c0e14" stroke-width="2"/>`;
      })
      .join('');
    return `<svg viewBox="0 0 ${W} ${W}" aria-hidden="true">${slices}
      <circle cx="${cx}" cy="${cy}" r="${hole - 4}" fill="#10141e"/>
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#8b95a8" font-size="11">donut</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#e8ecf4" font-size="13" font-weight="600">%</text>
    </svg>`;
  }

  function renderTopicBarsWireframe() {
    const topics = [
      { label: 'Botox', pos: 62, neg: 38 },
      { label: 'Fillers', pos: 55, neg: 45 },
      { label: 'Laser', pos: 70, neg: 30 },
      { label: 'Retinol', pos: 78, neg: 22 },
      { label: 'Facelift', pos: 40, neg: 60 },
      { label: 'Price', pos: 25, neg: 75 },
      { label: 'Celebrities', pos: 50, neg: 50 },
      { label: 'Peel', pos: 65, neg: 35 },
      { label: 'SPF', pos: 82, neg: 18 },
      { label: 'Thread lift', pos: 48, neg: 52 },
    ];
    const rows = topics
      .map(
        (t, i) => `<g transform="translate(0, ${i * 28})">
        <text x="0" y="14" fill="#8b95a8" font-size="9">${esc(t.label)}</text>
        <rect x="72" y="2" width="200" height="14" rx="7" fill="rgba(255,255,255,0.06)"/>
        <rect x="72" y="2" width="${(200 * t.pos) / 100}" height="14" rx="7" fill="#7ecdb8" opacity="0.85"/>
        <rect x="${72 + (200 * t.pos) / 100}" y="2" width="${(200 * t.neg) / 100}" height="14" rx="7" fill="#d4a0b8" opacity="0.85"/>
      </g>`,
      )
      .join('');
    return `<svg viewBox="0 0 280 290" aria-hidden="true">
      <text x="72" y="-4" fill="#7ecdb8" font-size="8">+ sentiment</text>
      <text x="200" y="-4" fill="#d4a0b8" font-size="8">− / warning</text>
      <g transform="translate(8, 18)">${rows}</g>
    </svg>`;
  }

  function renderSurveyBarsWireframe(categories) {
    const max = Math.max(...categories.map((c) => c.value));
    const rows = categories
      .map((c, i) => {
        const w = (c.value / max) * 220;
        return `<g transform="translate(0, ${i * 32})">
          <text x="0" y="12" fill="#8b95a8" font-size="8">${esc(c.label.length > 22 ? c.label.slice(0, 21) + '…' : c.label)}</text>
          <rect x="0" y="16" width="${w}" height="10" rx="5" fill="#2870ed" opacity="0.85"/>
          <text x="${w + 6}" y="24" fill="#e8ecf4" font-size="9" font-weight="600">${c.value}%</text>
        </g>`;
      })
      .join('');
    return `<svg viewBox="0 0 280 250" aria-hidden="true"><g transform="translate(8, 8)">${rows}</g></svg>`;
  }

  function renderNestedBubblesWireframe(mode) {
    const isProc = mode === 'procedure';
    const outer = isProc
      ? ['Botox', 'Filler', 'Laser', 'Peel']
      : ['Retinol', 'Vit C', 'HA', 'Niacin.'];
    const innerA = isProc ? '#7ecdb8' : '#8ecae6';
    const innerB = isProc ? '#d4a0b8' : '#7ecdb8';
    const labelA = isProc ? 'effects +' : 'concerns';
    const labelB = isProc ? 'fears −' : 'results +';
    const shells = outer
      .map((name, i) => {
        const ox = 40 + (i % 2) * 130;
        const oy = 30 + Math.floor(i / 2) * 120;
        const r = 52;
        return `<g>
          <circle cx="${ox + r}" cy="${oy + r}" r="${r}" fill="none" stroke="#8ecae6" stroke-width="2" opacity="0.5"/>
          <text x="${ox + r}" y="${oy + r - 4}" text-anchor="middle" fill="#e8ecf4" font-size="9" font-weight="600">${esc(name)}</text>
          <circle cx="${ox + r - 18}" cy="${oy + r + 12}" r="14" fill="${innerA}" opacity="0.75"/>
          <circle cx="${ox + r + 20}" cy="${oy + r + 8}" r="11" fill="${innerA}" opacity="0.55"/>
          <circle cx="${ox + r}" cy="${oy + r + 22}" r="12" fill="${innerB}" opacity="0.75"/>
          <circle cx="${ox + r + 14}" cy="${oy + r - 16}" r="9" fill="${innerB}" opacity="0.5"/>
        </g>`;
      })
      .join('');
    return `<svg viewBox="0 0 280 260" aria-hidden="true">
      ${shells}
      <text x="8" y="252" fill="${innerA}" font-size="8">● ${labelA}</text>
      <text x="100" y="252" fill="${innerB}" font-size="8">● ${labelB}</text>
    </svg>`;
  }

  function wireframeFor(chart) {
    if (chart.id === 'mood-map' || chart.id === 'segmentation') {
      return renderDonutWireframe(chart.categories);
    }
    if (chart.id === 'topic-landscape') return renderTopicBarsWireframe();
    if (chart.id === 'decision-drivers') return renderSurveyBarsWireframe(chart.categories);
    if (chart.id === 'procedure-effects') return renderNestedBubblesWireframe('procedure');
    if (chart.id === 'skincare-ingredients') return renderNestedBubblesWireframe('skincare');
    return '';
  }

  function sourceBadge(chart) {
    if (chart.dataSource.includes('Appinio')) {
      return '<span class="bp-badge bp-badge--survey">Appinio · fixed %</span>';
    }
    return '<span class="bp-badge bp-badge--pulsar">PULSAR · text analysis</span>';
  }

  function specCategories(chart) {
    if (chart.categories && chart.categoryMode === 'fixed') {
      return `<h4>Categories (fixed · ${chart.categories.length})</h4>
        <ul class="bp-cat-list">${chart.categories
          .map(
            (c) => `<li class="bp-cat" style="--cat-color:${esc(c.color)}">
              <strong>${esc(c.label)}</strong>
              ${c.signals ? `<ul>${c.signals.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
              ${c.value != null ? `<span>${c.value}%</span>` : ''}
            </li>`,
          )
          .join('')}</ul>`;
    }
    if (chart.categoryMode === 'fixed-survey') {
      return `<h4>Categories (fixed survey values)</h4>
        <ul class="bp-cat-list">${chart.categories
          .map(
            (c) => `<li class="bp-cat" style="--cat-color:#2870ed">
              <strong>${esc(c.label)}</strong> — ${c.value}%
            </li>`,
          )
          .join('')}</ul>`;
    }
    if (chart.exampleClusters) {
      return `<h4>Example clusters (dynamic top 10)</h4>
        <div class="bp-pill-list">${chart.exampleClusters.map((x) => `<span class="bp-pill">${esc(x)}</span>`).join('')}</div>`;
    }
    if (chart.outerExamples) {
      return `<h4>Outer bubbles (dynamic top 10)</h4>
        <div class="bp-pill-list">${chart.outerExamples.map((x) => `<span class="bp-pill">${esc(x)}</span>`).join('')}</div>
        <h4>Inner sub-bubbles</h4>
        ${chart.innerGroups
          .map(
            (g) => `<div class="bp-inner-group">
              <strong>${esc(g.label)}</strong>
              <div class="bp-pill-list">${g.examples.map((x) => `<span class="bp-pill">${esc(x)}</span>`).join('')}</div>
            </div>`,
          )
          .join('')}`;
    }
    return '';
  }

  function renderOverview() {
    const el = document.getElementById('bp-overview');
    if (!el) return;
    el.innerHTML = D.charts
      .map(
        (c) => `<a class="bp-card" href="#${c.id}">
          <div class="bp-card__num">Diagram ${c.number}</div>
          <div class="bp-card__name">${esc(c.name)}</div>
          <div class="bp-card__type">${esc(c.type)}</div>
          <span class="bp-card__source${c.dataSource.includes('Appinio') ? ' bp-card__source--survey' : ''}">
            ${c.dataSource.includes('Appinio') ? 'Appinio' : 'PULSAR'}
          </span>
        </a>`,
      )
      .join('');
  }

  function renderCompare() {
    const el = document.getElementById('bp-compare');
    if (!el) return;
    el.innerHTML = `<h3>Blueprint vs. current demo (demo.html)</h3>
      <table>
        <thead><tr><th>#</th><th>Blueprint (target)</th><th>Current demo</th></tr></thead>
        <tbody>
          <tr><td>1</td><td class="new">Mood Map · 5 moods incl. Neutral + Advisory</td><td class="old">Hesitant + Warning instead</td></tr>
          <tr><td>2</td><td class="new">Topic bars · sentiment split per bar</td><td class="old">Simple bars, no split</td></tr>
          <tr><td>3</td><td class="new">3 mindsets donut</td><td class="new">Same (ok)</td></tr>
          <tr><td>4</td><td class="new">Nested bubbles · procedures + effects/scares</td><td class="old">Rings + sunburst variants</td></tr>
          <tr><td>5</td><td class="new">Nested bubbles · ingredients + concerns/results</td><td class="old">Missing</td></tr>
          <tr><td>6</td><td class="new">Trust drivers · Appinio fixed %</td><td class="old">Behavior flow (wrong)</td></tr>
        </tbody>
      </table>`;
  }

  function renderSections() {
    const root = document.getElementById('bp-sections');
    if (!root) return;
    root.innerHTML = D.charts
      .map(
        (c) => `<section class="bp-section" id="${c.id}">
          <div class="bp-section__head">
            <p class="pulsar-eyebrow">Diagram ${c.number} · ${esc(c.name)}</p>
            <h2 class="bp-section__title">${esc(c.title)}</h2>
            <div class="bp-badges">
              <span class="bp-badge bp-badge--type">${esc(c.type)}</span>
              ${sourceBadge(c)}
              <span class="bp-badge">${esc(c.categoryMode)}</span>
            </div>
          </div>
          <div class="bp-layout">
            <div class="bp-wireframe">${wireframeFor(c)}</div>
            <div class="bp-spec">
              <h4>Visualization</h4>
              <p>${esc(c.typeDetail)}</p>
              ${specCategories(c)}
              <h4>Audience &amp; filters</h4>
              <p>${esc(c.audience)}</p>
              <h4>Interaction</h4>
              <p>${esc(c.interaction)}</p>
            </div>
          </div>
        </section>`,
      )
      .join('');
  }

  const title = document.getElementById('bp-title');
  const sub = document.getElementById('bp-subtitle');
  if (title) title.textContent = D.meta.title;
  if (sub) sub.textContent = D.meta.subtitle;

  renderOverview();
  renderCompare();
  renderSections();
})();
