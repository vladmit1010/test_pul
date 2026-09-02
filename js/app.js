/**
 * App entry — classic script only (no ES modules, no fetch).
 * Open index.html directly in a browser; no Python/server required.
 *
 * Charts are data-driven: moodMap.moods and topicLandscape.topics
 * can change length / labels / ids without touching this file.
 */
(function () {
  const D = window.PulsarData;
  if (!D) return;

  const PAGE = 5;
  /** @type {{ type: 'mood'|'topic', id: string } | null} */
  let activeFilter = null;
  let quotePage = 0;

  const quoteList = document.getElementById('quote-list');
  const quoteContext = document.getElementById('quote-context');
  const quoteFilters = document.getElementById('quote-filters');
  const quoteMeta = document.getElementById('quote-meta');
  const quoteMore = document.getElementById('quote-more');
  const tip = document.getElementById('pulsar-tip');

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function moodById(id) {
    return (D.moodMap?.moods || []).find((m) => m.id === id);
  }

  function topicById(id) {
    return (D.topicLandscape?.topics || []).find((t) => t.id === id);
  }

  function segmentById(id) {
    return (D.segmentation?.segments || []).find((s) => s.id === id);
  }

  function topicColor(topic, index) {
    if (topic.color) return topic.color;
    const palette = D.topicLandscape?.palette || ['#7ecdb8', '#b4a7d6', '#8ecae6'];
    return palette[index % palette.length];
  }

  function totalFrom(items) {
    return items.reduce((s, x) => s + (x.count || 0), 0);
  }

  function commentProcedure(c) {
    if (c.procedure) return c.procedure;
    const topics = c.topics || [];
    if (topics.includes('botox')) return 'botox';
    if (topics.includes('fillers')) return 'filler';
    if (topics.includes('laser')) return 'laser';
    if (topics.includes('peel')) return 'chemical-peel';
    return null;
  }

  function commentTone(c) {
    if (c.tone) return c.tone;
    if (c.mood === 'enthusiastic' || c.mood === 'satisfied') return 'positive';
    if (c.mood === 'hesitant' || c.mood === 'cautious') return 'cautious';
    if (c.mood === 'disappointed') return 'negative';
    if (c.mood === 'warning') return 'warning';
    return 'cautious';
  }

  function filterComments(filter) {
    if (!filter) return [];
    if (filter.type === 'mood') {
      return D.comments.filter((c) => c.mood === filter.id);
    }
    if (filter.type === 'topic') {
      return D.comments.filter((c) => (c.topics || []).includes(filter.id));
    }
    if (filter.type === 'segment') {
      return D.comments.filter((c) => c.segment === filter.id);
    }
    if (filter.type === 'procedure') {
      return D.comments.filter((c) => commentProcedure(c) === filter.id);
    }
    if (filter.type === 'tone') {
      return D.comments.filter((c) => commentTone(c) === filter.id);
    }
    if (filter.type === 'bubble-tone') {
      return D.comments.filter(
        (c) => commentProcedure(c) === filter.procedure && commentTone(c) === filter.tone,
      );
    }
    if (filter.type === 'flow') {
      return D.comments.filter((c) => c.flow === filter.id);
    }
    return [];
  }

  function accentForFilter(filter) {
    if (!filter) return 'var(--rose)';
    if (filter.type === 'mood') return moodById(filter.id)?.color || 'var(--rose)';
    if (filter.type === 'segment') return segmentById(filter.id)?.color || 'var(--rose)';
    if (filter.type === 'procedure') {
      const p = (D.procedureBubbles?.procedures || []).find((x) => x.id === filter.id);
      return p?.shell || 'var(--sky)';
    }
    if (filter.type === 'tone') {
      const s = (D.procedureBubbles?.sentiments || []).find((x) => x.id === filter.id);
      return s?.color || 'var(--rose)';
    }
    if (filter.type === 'bubble-tone') {
      const s = (D.procedureBubbles?.sentiments || []).find((x) => x.id === filter.tone);
      return s?.color || 'var(--rose)';
    }
    if (filter.type === 'topic') {
      const topics = D.topicLandscape?.topics || [];
      const idx = topics.findIndex((t) => t.id === filter.id);
      return topicColor(topics[idx] || {}, Math.max(idx, 0));
    }
    if (filter.type === 'flow') {
      const n = (D.behaviorFlow?.nodes || []).find((x) => x.id === filter.id);
      return n?.color || 'var(--rose)';
    }
    return 'var(--rose)';
  }

  function clearHighlights() {
    document.querySelectorAll('.mood-slice-g').forEach((el) => {
      el.classList.remove(
        'mood-slice-g--active',
        'mood-slice-g--dim',
        'mood-slice-g--hover',
        'mood-slice-g--preview',
      );
      el.style.removeProperty('--pop');
      el.style.removeProperty('--glow');
    });
    document.querySelectorAll('.mood-legend__item--active').forEach((el) => {
      el.classList.remove('mood-legend__item--active');
    });
    document.querySelectorAll('.topic-bar--active, .topic-bar--dim').forEach((el) => {
      el.classList.remove('topic-bar--active', 'topic-bar--dim');
    });
    document.querySelectorAll('.flow-node').forEach((el) => {
      el.classList.remove('flow-node--active', 'flow-node--dim', 'flow-node--hover');
    });
    document.querySelectorAll('.flow-edge').forEach((el) => {
      el.classList.remove('flow-edge--hover', 'flow-edge--dim');
    });
    updateMoodCenter(null);
    updateSegCenter(null);
  }

  function setPiePop(el, pop) {
    const color =
      el.closest('.mood-slice')?.dataset.color ||
      el.style.getPropertyValue('--glow').trim() ||
      '#7ecdb8';
    el.style.setProperty('--pop', String(pop));
    el.style.setProperty('--glow', color);
  }

  function syncMoodSelection(selectedId) {
    document.querySelectorAll('#mood-chart .mood-slice').forEach((el) => {
      const match = el.dataset.id === selectedId;
      const vis = el.querySelector('.mood-slice-g');
      if (!vis) return;
      vis.classList.toggle('mood-slice-g--active', match);
      vis.classList.toggle('mood-slice-g--dim', !match);
      vis.classList.remove('mood-slice-g--hover', 'mood-slice-g--preview');
      setPiePop(vis, match ? 14 : 0);
    });
    document.querySelectorAll('#mood-legend .mood-legend__item').forEach((el) => {
      el.classList.toggle('mood-legend__item--active', el.dataset.id === selectedId);
    });
    previewMoodStats(selectedId, false);
  }

  function syncSegSelection(selectedId) {
    document.querySelectorAll('#seg-chart .mood-slice').forEach((el) => {
      const match = el.dataset.id === selectedId;
      const vis = el.querySelector('.mood-slice-g');
      if (!vis) return;
      vis.classList.toggle('mood-slice-g--active', match);
      vis.classList.toggle('mood-slice-g--dim', !match);
      vis.classList.remove('mood-slice-g--hover', 'mood-slice-g--preview');
      setPiePop(vis, match ? 14 : 0);
    });
    document.querySelectorAll('#seg-legend .mood-legend__item').forEach((el) => {
      el.classList.toggle('mood-legend__item--active', el.dataset.id === selectedId);
    });
    previewSegStats(selectedId, false);
  }

  function updateMoodCenter(mood, opts = {}) {
    const label = document.getElementById('mood-center-label');
    const value = document.getElementById('mood-center-value');
    const countEl = document.getElementById('mood-center-count');
    const badge = document.getElementById('mood-center');
    if (!label || !value) return;

    if (!mood) {
      label.textContent = '';
      value.textContent = '';
      if (countEl) countEl.textContent = '';
      if (badge) {
        badge.classList.add('mood-center--hidden');
        badge.classList.remove('mood-center--live', 'mood-center--preview');
      }
      return;
    }

    const total = totalFrom(D.moodMap.moods);
    const pct = total ? ((mood.count / total) * 100).toFixed(0) : '0';
    label.textContent = mood.label;
    value.textContent = `${pct}%`;
    if (countEl) countEl.textContent = `${mood.count} comments`;
    if (badge) {
      badge.classList.remove('mood-center--hidden');
      badge.classList.add('mood-center--live');
      badge.classList.toggle('mood-center--preview', !!opts.preview);
    }
  }

  function previewMoodStats(moodId, isPreview) {
    const mood = moodById(moodId);
    updateMoodCenter(mood, { preview: isPreview });
    if (!mood || !quoteContext) return;
    const total = totalFrom(D.moodMap.moods);
    const pct = total ? ((mood.count / total) * 100).toFixed(1) : '0';
    quoteContext.textContent = isPreview
      ? `Preview: ${mood.label} — ${mood.count} (${pct}%)`
      : `${mood.label} — ${mood.count} (${pct}%)`;
  }

  function updateSegCenter(seg, opts = {}) {
    const label = document.getElementById('seg-center-label');
    const value = document.getElementById('seg-center-value');
    const countEl = document.getElementById('seg-center-count');
    const badge = document.getElementById('seg-center');
    if (!label || !value) return;

    if (!seg) {
      label.textContent = '';
      value.textContent = '';
      if (countEl) countEl.textContent = '';
      if (badge) {
        badge.classList.add('mood-center--hidden');
        badge.classList.remove('mood-center--live', 'mood-center--preview');
      }
      return;
    }

    const total = totalFrom(D.segmentation.segments);
    const pct = total ? ((seg.count / total) * 100).toFixed(0) : '0';
    label.textContent = seg.label;
    value.textContent = `${pct}%`;
    if (countEl) countEl.textContent = `${seg.count} comments`;
    if (badge) {
      badge.classList.remove('mood-center--hidden');
      badge.classList.add('mood-center--live');
      badge.classList.toggle('mood-center--preview', !!opts.preview);
    }
  }

  function previewSegStats(segId, isPreview) {
    const seg = segmentById(segId);
    updateSegCenter(seg, { preview: isPreview });
    if (!seg || !quoteContext) return;
    const total = totalFrom(D.segmentation.segments);
    const pct = total ? ((seg.count / total) * 100).toFixed(1) : '0';
    quoteContext.textContent = isPreview
      ? `Preview: ${seg.label} — ${seg.count} (${pct}%)`
      : `${seg.label} — ${seg.count} (${pct}%)`;
  }

  function applyHighlights(filter) {
    clearHighlights();
    if (!filter) return;

    if (filter.type === 'mood') {
      syncMoodSelection(filter.id);
    }

    if (filter.type === 'topic') {
      document.querySelectorAll('.topic-bar').forEach((el) => {
        const match = el.dataset.id === filter.id;
        el.classList.toggle('topic-bar--active', match);
        el.classList.toggle('topic-bar--dim', !match);
      });
    }

    if (filter.type === 'segment') {
      syncSegSelection(filter.id);
    }

    if (filter.type === 'flow') {
      document.querySelectorAll('.flow-node').forEach((el) => {
        const match = el.dataset.id === filter.id;
        el.classList.toggle('flow-node--active', match);
        el.classList.toggle('flow-node--dim', !match);
        el.classList.remove('flow-node--hover');
      });
      document.querySelectorAll('.flow-edge').forEach((el) => {
        const related = el.dataset.from === filter.id || el.dataset.to === filter.id;
        el.classList.toggle('flow-edge--hover', related);
        el.classList.toggle('flow-edge--dim', !related);
      });
    }
  }

  function setFilter(filter) {
    if (activeFilter && filter && filtersEqual(activeFilter, filter)) {
      clearFilter();
      return;
    }
    activeFilter = filter;
    quotePage = 0;
    applyHighlights(filter);
    updateQuoteHeader(filter);
    renderQuotes(true);
    window.dispatchEvent(new CustomEvent('pulsar-filter-change', { detail: { filter: activeFilter } }));
  }

  function filtersEqual(a, b) {
    if (!a || !b || a.type !== b.type) return false;
    if (a.type === 'bubble-tone') {
      return a.procedure === b.procedure && a.tone === b.tone;
    }
    return a.id === b.id;
  }

  function clearFilter() {
    activeFilter = null;
    quotePage = 0;
    clearHighlights();
    quoteContext.textContent = 'Click a chart segment to see quotes';
    quoteFilters.innerHTML = '';
    quoteList.innerHTML = `<div class="quote-empty">
      <div class="quote-empty__icon">❝</div>
      <p>Click a mood, topic, or segment — matching quotes appear here.</p>
    </div>`;
    quoteMeta.textContent = '';
    quoteMore.hidden = true;
    window.dispatchEvent(new CustomEvent('pulsar-filter-change', { detail: { filter: null } }));
  }

  function updateQuoteHeader(filter) {
    if (!filter) return;

    if (filter.type === 'mood') {
      const mood = moodById(filter.id);
      const total = totalFrom(D.moodMap.moods);
      const pct = total ? ((mood.count / total) * 100).toFixed(1) : '0';
      quoteContext.textContent = `${mood.label} — ${mood.count} (${pct}%)`;
      quoteFilters.innerHTML = `<span class="quote-chip">${esc(mood.label)}</span>`;
      return;
    }

    if (filter.type === 'topic') {
      const topic = topicById(filter.id);
      const total = totalFrom(D.topicLandscape.topics);
      const pct = total ? Math.round((topic.count / total) * 100) : 0;
      quoteContext.textContent = `Topic: ${topic.label}`;
      quoteFilters.innerHTML = `
        <span class="quote-chip">${esc(topic.label)}</span>
        <span class="quote-chip">${topic.count} mentions</span>
        <span class="quote-chip">${pct}%</span>`;
      return;
    }

    if (filter.type === 'segment') {
      const seg = segmentById(filter.id);
      const total = totalFrom(D.segmentation.segments);
      const pct = total ? ((seg.count / total) * 100).toFixed(1) : '0';
      quoteContext.textContent = `${seg.label} — ${seg.count} (${pct}%)`;
      quoteFilters.innerHTML = `<span class="quote-chip">${esc(seg.label)}</span>`;
      return;
    }

    if (filter.type === 'procedure') {
      const p = (D.procedureBubbles?.procedures || []).find((x) => x.id === filter.id);
      const count = (p?.tones || []).reduce((s, t) => s + (t.count || 0), 0);
      quoteContext.textContent = `Procedure: ${p?.label || filter.id}`;
      quoteFilters.innerHTML = `
        <span class="quote-chip">${esc(p?.label || filter.id)}</span>
        <span class="quote-chip">${count} mentions</span>`;
      return;
    }

    if (filter.type === 'tone') {
      const s = (D.procedureBubbles?.sentiments || []).find((x) => x.id === filter.id);
      const count = (D.procedureBubbles?.procedures || []).reduce((sum, p) => {
        const hit = (p.tones || []).find((t) => t.tone === filter.id);
        return sum + (hit?.count || 0);
      }, 0);
      quoteContext.textContent = `Emotion: ${s?.label || filter.id}`;
      quoteFilters.innerHTML = `
        <span class="quote-chip">${esc(s?.label || filter.id)}</span>
        <span class="quote-chip">${count} mentions</span>`;
      return;
    }

    if (filter.type === 'bubble-tone') {
      const p = (D.procedureBubbles?.procedures || []).find((x) => x.id === filter.procedure);
      const s = (D.procedureBubbles?.sentiments || []).find((x) => x.id === filter.tone);
      const toneCount = (p?.tones || []).find((t) => t.tone === filter.tone)?.count || 0;
      quoteContext.textContent = `${p?.label || ''} · ${s?.label || filter.tone}`;
      quoteFilters.innerHTML = `
        <span class="quote-chip">${esc(p?.label || '')}</span>
        <span class="quote-chip">${esc(s?.label || filter.tone)}</span>
        <span class="quote-chip">${toneCount} mentions</span>`;
      return;
    }

    if (filter.type === 'flow') {
      const n = (D.behaviorFlow?.nodes || []).find((x) => x.id === filter.id);
      quoteContext.textContent = `Flow: ${n?.label || filter.id}`;
      quoteFilters.innerHTML = `
        <span class="quote-chip">${esc(n?.label || filter.id)}</span>
        <span class="quote-chip">${n?.count || 0} mentions</span>`;
    }
  }

  function renderQuotes(reset) {
    if (!activeFilter) return;
    const all = filterComments(activeFilter);
    const color = accentForFilter(activeFilter);
    if (reset) quoteList.innerHTML = '';

    if (!all.length) {
      quoteList.innerHTML = `<div class="quote-empty"><p>No quotes for this selection in the demo set.</p></div>`;
      quoteMeta.textContent = '';
      quoteMore.hidden = true;
      return;
    }

    const slice = all.slice(quotePage * PAGE, (quotePage + 1) * PAGE);
    const html = slice
      .map(
        (q) => `<article class="pulsar-quote" style="--quote-color:${color}">
        <p class="pulsar-quote__text">${esc(q.text)}</p>
        <div class="pulsar-quote__tags">
          ${(q.tags || []).map((t) => `<span class="pulsar-tag">${esc(t)}</span>`).join('')}
        </div>
        <div class="pulsar-quote__foot">#${q.id} · ${esc(D.meta.source)}</div>
      </article>`,
      )
      .join('');

    if (reset) quoteList.innerHTML = html;
    else quoteList.insertAdjacentHTML('beforeend', html);

    const shown = Math.min((quotePage + 1) * PAGE, all.length);
    quoteMeta.textContent = `${shown} of ${all.length}`;
    quoteMore.hidden = shown >= all.length;
  }

  function showTip(html, x, y) {
    if (!tip) return;
    tip.innerHTML = html;
    tip.hidden = false;
    const pad = 12;
    const rect = tip.getBoundingClientRect();
    let left = x + pad;
    let top = y + pad;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - pad;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  }

  function hideTip() {
    if (tip) tip.hidden = true;
  }

  function renderOverview() {
    const o = D.overview;
    if (!o) return;
    const eyebrow = document.querySelector('.pulsar-hero .pulsar-eyebrow');
    const title = document.querySelector('.pulsar-hero .pulsar-title');
    const desc = document.querySelector('.pulsar-hero .pulsar-desc');
    if (eyebrow) eyebrow.textContent = o.eyebrow;
    if (title) title.textContent = o.title;
    if (desc) desc.innerHTML = `${esc(o.description)}<em>${esc(o.note)}</em>`;
  }

  function buildKpis() {
    const cfg = D.kpiConfig || {};
    const moods = D.moodMap?.moods || [];
    const topics = D.topicLandscape?.topics || [];
    const total = totalFrom(moods) || D.comments?.length || 0;

    const positiveIds = new Set(cfg.positiveMoodIds || ['enthusiastic', 'satisfied']);
    const positiveCount = moods
      .filter((m) => positiveIds.has(m.id))
      .reduce((s, m) => s + (m.count || 0), 0);

    const warningId = cfg.warningMoodId || 'warning';
    const warningCount = moodById(warningId)?.count || 0;

    const topicId = cfg.highlightTopicId || 'botox';
    const highlightTopic = topicById(topicId);
    const topicLabel = highlightTopic?.label || topicId;
    const topicCount = highlightTopic?.count || 0;

    const pct = (n) => (total ? `${Math.round((n / total) * 100)}%` : '0%');

    if (D.meta) D.meta.totalComments = total;

    return [
      {
        label: 'Comments',
        value: String(total),
        hint: D.meta?.scanMode === 'full' ? 'analyzed' : 'in the sample',
        color: 'var(--rose)',
      },
      {
        label: 'Positive',
        value: pct(positiveCount),
        hint: 'satisfied with result',
        color: 'var(--mint)',
      },
      {
        label: 'With warning',
        value: pct(warningCount),
        hint: 'warn others',
        color: 'var(--coral)',
      },
      {
        label: `About ${topicLabel}`,
        value: String(topicCount),
        hint: 'mentions',
        color: 'var(--lavender)',
      },
    ];
  }

  function renderKpis() {
    const row = document.getElementById('kpi-row');
    if (!row) return;
    const kpis = buildKpis();
    row.innerHTML = kpis
      .map(
        (k) => `<article class="kpi-card" style="--kpi-color: ${k.color}">
        <span class="kpi-card__label">${esc(k.label)}</span>
        <strong class="kpi-card__value">${esc(k.value)}</strong>
        <span class="kpi-card__hint">${esc(k.hint)}</span>
      </article>`,
      )
      .join('');
  }

  function polar(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  /** Donut slice path (outer arc → inner arc) */
  function donutPath(cx, cy, rOut, rIn, startAngle, endAngle) {
    const sweep = Math.max(endAngle - startAngle, 0.01);
    const end = startAngle + sweep;
    const [x1, y1] = polar(cx, cy, rOut, startAngle);
    const [x2, y2] = polar(cx, cy, rOut, end);
    const [x3, y3] = polar(cx, cy, rIn, end);
    const [x4, y4] = polar(cx, cy, rIn, startAngle);
    const large = sweep > 180 ? 1 : 0;
    return [
      `M ${x1} ${y1}`,
      `A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${rIn} ${rIn} 0 ${large} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');
  }

  function hexToRgb(hex) {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return { r: 126, g: 205, b: 184 };
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function mixHex(hex, toward, amount) {
    const a = hexToRgb(hex);
    const b = hexToRgb(toward);
    const m = (x, y) => Math.round(x + (y - x) * amount);
    const to = (n) => n.toString(16).padStart(2, '0');
    return `#${to(m(a.r, b.r))}${to(m(a.g, b.g))}${to(m(a.b, b.b))}`;
  }

  function renderMoodMap() {
    const mm = D.moodMap;
    if (!mm) return;

    document.getElementById('mood-eyebrow').textContent = mm.eyebrow;
    document.getElementById('mood-title').textContent = mm.title;

    const moods = mm.moods || [];
    const svg = document.getElementById('mood-chart');
    const total = totalFrom(moods);
    const cx = 160;
    const cy = 160;
    const r = 132;
    let angle = 0;

    const slices = moods
      .map((m) => {
        const sweep = total ? (m.count / total) * 360 : 0;
        const start = angle;
        const end = angle + sweep;
        const mid = start + sweep / 2;
        angle = end;
        const pct = total ? Math.round((m.count / total) * 100) : 0;
        const d = piePath(cx, cy, r, start, end - 0.45);
        const rim = mixHex(m.color, '#ffffff', 0.35);
        const rad = ((mid - 90) * Math.PI) / 180;
        const ox = Math.cos(rad);
        const oy = Math.sin(rad);
        const [lx, ly] = polar(cx, cy, r * 0.62, mid);
        return `<g class="mood-slice" data-id="${esc(m.id)}" data-mid="${mid}" data-color="${esc(m.color)}">
          <path class="mood-hit" d="${d}" fill="transparent"/>
          <g class="mood-slice-g" style="--ox:${ox}; --oy:${oy}; --pop:0; --glow:${esc(m.color)}">
            <path class="mood-slice__body" d="${d}" fill="${m.color}" stroke="#0c0e14" stroke-width="3"/>
            <path class="mood-slice__rim" d="${donutPath(cx, cy, r, r - 6, start, end - 0.45)}" fill="${rim}" opacity="0" pointer-events="none"/>
            <text class="mood-slice__pct" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" pointer-events="none">${pct}%</text>
          </g>
        </g>`;
      })
      .join('');

    svg.innerHTML = `${slices}
      <g id="mood-center" class="mood-center mood-center--hidden" pointer-events="none">
        <circle class="mood-center-bg" cx="${cx}" cy="${cy}" r="52"/>
        <text id="mood-center-label" class="mood-center-label" x="${cx}" y="${cy - 12}" text-anchor="middle"></text>
        <text id="mood-center-value" class="mood-center-value" x="${cx}" y="${cy + 10}" text-anchor="middle"></text>
        <text id="mood-center-count" class="mood-center-count" x="${cx}" y="${cy + 28}" text-anchor="middle"></text>
      </g>`;

    document.getElementById('mood-legend').innerHTML = moods
      .map((m) => {
        const pct = total ? Math.round((m.count / total) * 100) : 0;
        return `<button type="button" class="mood-legend__item" data-id="${esc(m.id)}">
        <span class="mood-legend__swatch" style="background:${m.color}"></span>
        <span class="mood-legend__label">${esc(m.label)}</span>
        <span class="mood-legend__pct">${pct}%</span>
      </button>`;
      })
      .join('');

    let hoverLeaveTimer = null;
    let currentHoverId = null;

    function visualOf(sliceRoot) {
      return sliceRoot.querySelector('.mood-slice-g');
    }

    function paintIdleHover(sliceRoot) {
      svg.querySelectorAll('.mood-slice').forEach((s) => {
        const on = s === sliceRoot;
        const vis = visualOf(s);
        vis.classList.toggle('mood-slice-g--dim', !on);
        vis.classList.toggle('mood-slice-g--hover', on);
        vis.classList.remove('mood-slice-g--preview', 'mood-slice-g--active');
        setPiePop(vis, on ? 10 : 0);
      });
      previewMoodStats(sliceRoot.dataset.id, false);
    }

    /** When pinned: never move slices on hover — only highlight + stats (avoids border flicker). */
    function paintSelectedHover(sliceRoot) {
      const selectedId = activeFilter.id;
      const hoveringOther = sliceRoot.dataset.id !== selectedId;
      svg.querySelectorAll('.mood-slice').forEach((s) => {
        const isSelected = s.dataset.id === selectedId;
        const isHover = s === sliceRoot;
        const vis = visualOf(s);
        vis.classList.toggle('mood-slice-g--active', isSelected);
        vis.classList.toggle('mood-slice-g--preview', isHover && hoveringOther);
        vis.classList.toggle('mood-slice-g--hover', isHover && !hoveringOther);
        vis.classList.toggle('mood-slice-g--dim', !isSelected && !isHover);
        setPiePop(vis, isSelected ? 14 : 0);
      });
      previewMoodStats(sliceRoot.dataset.id, hoveringOther);
    }

    function restoreMoodVisual() {
      currentHoverId = null;
      if (activeFilter?.type === 'mood') {
        syncMoodSelection(activeFilter.id);
        updateQuoteHeader(activeFilter);
        return;
      }
      svg.querySelectorAll('.mood-slice').forEach((s) => {
        const vis = visualOf(s);
        vis.classList.remove(
          'mood-slice-g--dim',
          'mood-slice-g--hover',
          'mood-slice-g--preview',
          'mood-slice-g--active',
        );
        setPiePop(vis, 0);
      });
      updateMoodCenter(null);
      if (activeFilter) {
        updateQuoteHeader(activeFilter);
      } else if (quoteContext) {
        quoteContext.textContent = 'Click a chart segment to see quotes';
      }
    }

    function enterSlice(sliceRoot) {
      clearTimeout(hoverLeaveTimer);
      if (currentHoverId === sliceRoot.dataset.id) return;
      currentHoverId = sliceRoot.dataset.id;
      // Only "selected hover" when this chart owns the filter; otherwise idle hover still works
      if (activeFilter?.type === 'mood') paintSelectedHover(sliceRoot);
      else paintIdleHover(sliceRoot);
    }

    function leaveSlice() {
      clearTimeout(hoverLeaveTimer);
      hoverLeaveTimer = setTimeout(() => {
        restoreMoodVisual();
      }, 60);
    }

    svg.querySelectorAll('.mood-slice').forEach((el) => {
      const hit = el.querySelector('.mood-hit');
      hit.addEventListener('click', () => setFilter({ type: 'mood', id: el.dataset.id }));
      hit.addEventListener('mouseenter', () => enterSlice(el));
      hit.addEventListener('mouseleave', leaveSlice);
    });

    document.querySelectorAll('#mood-legend .mood-legend__item').forEach((el) => {
      el.addEventListener('click', () => setFilter({ type: 'mood', id: el.dataset.id }));
      el.addEventListener('mouseenter', () => {
        const slice = svg.querySelector(`.mood-slice[data-id="${el.dataset.id}"]`);
        if (slice) enterSlice(slice);
      });
      el.addEventListener('mouseleave', leaveSlice);
    });
  }

  function renderTopicLandscape() {
    const tl = D.topicLandscape;
    if (!tl) return;

    document.getElementById('topic-eyebrow').textContent = tl.eyebrow;
    document.getElementById('topic-title').textContent = tl.title;

    const topics = [...(tl.topics || [])].sort((a, b) => (b.count || 0) - (a.count || 0));
    const total = totalFrom(topics);
    const max = topics.reduce((m, t) => Math.max(m, t.count || 0), 0) || 1;
    const root = document.getElementById('topics-chart');

    root.innerHTML = topics
      .map((t, i) => {
        const color = topicColor(t, i);
        const pct = total ? Math.round((t.count / total) * 100) : 0;
        const width = Math.max(4, Math.round(((t.count || 0) / max) * 100));
        return `<button type="button" class="topic-bar" data-id="${esc(t.id)}" role="listitem" style="--bar-color:${color}">
          <span class="topic-bar__label">${esc(t.label)}</span>
          <span class="topic-bar__track"><span class="topic-bar__fill" style="width:${width}%"></span></span>
          <span class="topic-bar__value">${t.count} <small>(${pct}%)</small></span>
        </button>`;
      })
      .join('');

    root.querySelectorAll('.topic-bar').forEach((el) => {
      const topic = topicById(el.dataset.id);
      el.addEventListener('click', () => setFilter({ type: 'topic', id: el.dataset.id }));
      el.addEventListener('mousemove', (e) => {
        showTip(
          `<strong>Topic: ${esc(topic.label)}</strong><br>${topic.count} comments · click to pin`,
          e.clientX,
          e.clientY,
        );
      });
      el.addEventListener('mouseleave', hideTip);
    });
  }

  /** Full pie slice from center */
  function piePath(cx, cy, r, startAngle, endAngle) {
    const sweep = Math.max(endAngle - startAngle, 0.01);
    const end = startAngle + sweep;
    const [x1, y1] = polar(cx, cy, r, startAngle);
    const [x2, y2] = polar(cx, cy, r, end);
    const large = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  function renderSegmentation() {
    const sg = D.segmentation;
    if (!sg) return;

    document.getElementById('seg-eyebrow').textContent = sg.eyebrow;
    document.getElementById('seg-title').textContent = sg.title;

    const segments = sg.segments || [];
    const svg = document.getElementById('seg-chart');
    const total = totalFrom(segments);
    const cx = 210;
    const cy = 210;
    const r = 175;
    const labelR = 100;
    const box = 128;
    let angle = 0;

    const slices = segments
      .map((s) => {
        const sweep = total ? (s.count / total) * 360 : 0;
        const start = angle;
        const end = angle + sweep;
        const mid = start + sweep / 2;
        angle = end;
        const pct = total ? Math.round((s.count / total) * 100) : 0;
        const d = piePath(cx, cy, r, start, end - 0.4);
        const rim = mixHex(s.color, '#ffffff', 0.35);
        const rad = ((mid - 90) * Math.PI) / 180;
        const ox = Math.cos(rad);
        const oy = Math.sin(rad);
        const [lx, ly] = polar(cx, cy, labelR, mid);
        const quote = esc(s.quote || '');
        return `<g class="mood-slice" data-id="${esc(s.id)}" data-mid="${mid}" data-color="${esc(s.color)}">
          <path class="mood-hit" d="${d}" fill="transparent"/>
          <g class="mood-slice-g" style="--ox:${ox}; --oy:${oy}; --pop:0; --glow:${esc(s.color)}">
            <path class="mood-slice__body" d="${d}" fill="${s.color}" stroke="#0c0e14" stroke-width="3"/>
            <path class="mood-slice__rim" d="${donutPath(cx, cy, r, r - 7, start, end - 0.4)}" fill="${rim}" opacity="0" pointer-events="none"/>
            <foreignObject x="${lx - box / 2}" y="${ly - box / 2}" width="${box}" height="${box}" pointer-events="none">
              <div xmlns="http://www.w3.org/1999/xhtml" class="seg-quote">
                <span class="seg-quote__pct">${pct}%</span>
                <span class="seg-quote__text">${quote}</span>
              </div>
            </foreignObject>
          </g>
        </g>`;
      })
      .join('');

    svg.innerHTML = `${slices}
      <g id="seg-center" class="mood-center mood-center--hidden" pointer-events="none">
        <circle class="mood-center-bg" cx="${cx}" cy="${cy}" r="58"/>
        <text id="seg-center-label" class="mood-center-label" x="${cx}" y="${cy - 12}" text-anchor="middle"></text>
        <text id="seg-center-value" class="mood-center-value" x="${cx}" y="${cy + 10}" text-anchor="middle"></text>
        <text id="seg-center-count" class="mood-center-count" x="${cx}" y="${cy + 28}" text-anchor="middle"></text>
      </g>`;

    document.getElementById('seg-legend').innerHTML = segments
      .map((s) => {
        const pct = total ? Math.round((s.count / total) * 100) : 0;
        return `<button type="button" class="mood-legend__item" data-id="${esc(s.id)}">
        <span class="mood-legend__swatch" style="background:${s.color}"></span>
        <span class="mood-legend__label">${esc(s.label)}</span>
        <span class="mood-legend__pct">${pct}%</span>
      </button>`;
      })
      .join('');

    let hoverLeaveTimer = null;
    let currentHoverId = null;

    function visualOf(sliceRoot) {
      return sliceRoot.querySelector('.mood-slice-g');
    }

    function paintIdleHover(sliceRoot) {
      svg.querySelectorAll('.mood-slice').forEach((s) => {
        const on = s === sliceRoot;
        const vis = visualOf(s);
        vis.classList.toggle('mood-slice-g--dim', !on);
        vis.classList.toggle('mood-slice-g--hover', on);
        vis.classList.remove('mood-slice-g--preview', 'mood-slice-g--active');
        setPiePop(vis, on ? 10 : 0);
      });
      previewSegStats(sliceRoot.dataset.id, false);
    }

    function paintSelectedHover(sliceRoot) {
      const selectedId = activeFilter.id;
      const hoveringOther = sliceRoot.dataset.id !== selectedId;
      svg.querySelectorAll('.mood-slice').forEach((s) => {
        const isSelected = s.dataset.id === selectedId;
        const isHover = s === sliceRoot;
        const vis = visualOf(s);
        vis.classList.toggle('mood-slice-g--active', isSelected);
        vis.classList.toggle('mood-slice-g--preview', isHover && hoveringOther);
        vis.classList.toggle('mood-slice-g--hover', isHover && !hoveringOther);
        vis.classList.toggle('mood-slice-g--dim', !isSelected && !isHover);
        setPiePop(vis, isSelected ? 14 : 0);
      });
      previewSegStats(sliceRoot.dataset.id, hoveringOther);
    }

    function restoreSegVisual() {
      currentHoverId = null;
      if (activeFilter?.type === 'segment') {
        syncSegSelection(activeFilter.id);
        updateQuoteHeader(activeFilter);
        return;
      }
      svg.querySelectorAll('.mood-slice').forEach((s) => {
        const vis = visualOf(s);
        vis.classList.remove(
          'mood-slice-g--dim',
          'mood-slice-g--hover',
          'mood-slice-g--preview',
          'mood-slice-g--active',
        );
        setPiePop(vis, 0);
      });
      updateSegCenter(null);
      if (activeFilter) {
        updateQuoteHeader(activeFilter);
      } else if (quoteContext) {
        quoteContext.textContent = 'Click a chart segment to see quotes';
      }
    }

    function enterSlice(sliceRoot) {
      clearTimeout(hoverLeaveTimer);
      if (currentHoverId === sliceRoot.dataset.id) return;
      currentHoverId = sliceRoot.dataset.id;
      // Only "selected hover" when this chart owns the filter; otherwise idle hover still works
      if (activeFilter?.type === 'segment') paintSelectedHover(sliceRoot);
      else paintIdleHover(sliceRoot);
    }

    function leaveSlice() {
      clearTimeout(hoverLeaveTimer);
      hoverLeaveTimer = setTimeout(() => {
        restoreSegVisual();
      }, 60);
    }

    svg.querySelectorAll('.mood-slice').forEach((el) => {
      const hit = el.querySelector('.mood-hit');
      hit.addEventListener('click', () => setFilter({ type: 'segment', id: el.dataset.id }));
      hit.addEventListener('mouseenter', () => enterSlice(el));
      hit.addEventListener('mouseleave', leaveSlice);
    });

    document.querySelectorAll('#seg-legend .mood-legend__item').forEach((el) => {
      el.addEventListener('click', () => setFilter({ type: 'segment', id: el.dataset.id }));
      el.addEventListener('mouseenter', () => {
        const slice = svg.querySelector(`.mood-slice[data-id="${el.dataset.id}"]`);
        if (slice) enterSlice(slice);
      });
      el.addEventListener('mouseleave', leaveSlice);
    });
  }

  function renderBehaviorFlow() {
    const flow = D.behaviorFlow;
    if (!flow) return;

    const eyebrow = document.getElementById('flow-eyebrow');
    const title = document.getElementById('flow-title');
    const hintEl = document.getElementById('flow-hint');
    const labelsEl = document.getElementById('flow-labels');
    const svg = document.getElementById('flow-chart');
    if (!svg) return;

    if (eyebrow) eyebrow.textContent = flow.eyebrow || '6. Behavior Flow';
    if (title) title.textContent = flow.title || 'How people move toward a procedure';
    if (hintEl) hintEl.textContent = flow.hint || 'Click a node for quotes';

    const layerLabels = flow.layerLabels || ['Entry', 'Behavior', 'Decision', 'Outcome'];
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const W = 960;
    const colX = [70, 280, 490, 700];
    const nodeW = 118;
    const nodeH = 48;
    const gapY = 14;
    const pos = {};

    [0, 1, 2, 3].forEach((layer) => {
      const layerNodes = nodes.filter((n) => n.layer === layer);
      const totalH = layerNodes.length * nodeH + Math.max(0, layerNodes.length - 1) * gapY;
      const startY = 56 + (280 - totalH) / 2;
      layerNodes.forEach((n, i) => {
        pos[n.id] = {
          x: colX[layer],
          y: startY + i * (nodeH + gapY),
          w: nodeW,
          h: nodeH,
          node: n,
        };
      });
    });

    if (labelsEl) {
      labelsEl.innerHTML = layerLabels
        .map((lbl, i) => {
          const left = (((colX[i] + nodeW / 2) / W) * 100).toFixed(1);
          return `<span class="behavior-label" style="left:${left}%">${esc(lbl)}</span>`;
        })
        .join('');
    }

    const maxEdge = Math.max(1, ...edges.map((e) => e.count || 0));
    const edgesSvg = edges
      .map((e) => {
        const a = pos[e.from];
        const b = pos[e.to];
        if (!a || !b) return '';
        const x1 = a.x + a.w;
        const y1 = a.y + a.h / 2;
        const x2 = b.x;
        const y2 = b.y + b.h / 2;
        const mx = (x1 + x2) / 2;
        const sw = 1.5 + ((e.count || 0) / maxEdge) * 5;
        const op = 0.22 + ((e.count || 0) / maxEdge) * 0.55;
        return `<path class="flow-edge" data-from="${esc(e.from)}" data-to="${esc(e.to)}" data-count="${e.count || 0}"
          d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}"
          fill="none" stroke="#e8a0bf" stroke-width="${sw}" opacity="${op}"/>`;
      })
      .join('');

    const nodesSvg = nodes
      .map((n) => {
        const p = pos[n.id];
        if (!p) return '';
        const label = n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label;
        return `<g class="flow-node" data-id="${esc(n.id)}" style="--glow:${esc(n.color)}" tabindex="0" role="button">
          <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="10"
            fill="${n.color}22" stroke="${n.color}" stroke-width="1.5"/>
          <text x="${p.x + p.w / 2}" y="${p.y + 20}" text-anchor="middle" fill="#e8ecf4" font-size="10" font-weight="600">${esc(label)}</text>
          <text x="${p.x + p.w / 2}" y="${p.y + 36}" text-anchor="middle" fill="#8b95a8" font-size="9">${n.count || 0}</text>
        </g>`;
      })
      .join('');

    svg.setAttribute('viewBox', `0 0 ${W} 420`);
    svg.innerHTML = edgesSvg + nodesSvg;

    function paintHover(id) {
      const selectedId = activeFilter?.type === 'flow' ? activeFilter.id : null;
      svg.querySelectorAll('.flow-node').forEach((el) => {
        const isSelected = selectedId && el.dataset.id === selectedId;
        const isHover = el.dataset.id === id;
        el.classList.toggle('flow-node--active', !!isSelected);
        el.classList.toggle('flow-node--hover', isHover && !isSelected);
        el.classList.toggle('flow-node--dim', !isSelected && !isHover);
      });
      svg.querySelectorAll('.flow-edge').forEach((el) => {
        const related =
          el.dataset.from === id ||
          el.dataset.to === id ||
          (selectedId && (el.dataset.from === selectedId || el.dataset.to === selectedId));
        el.classList.toggle('flow-edge--hover', related);
        el.classList.toggle('flow-edge--dim', !related);
      });
    }

    function restoreFlowVisual() {
      if (activeFilter?.type === 'flow') {
        applyHighlights(activeFilter);
        updateQuoteHeader(activeFilter);
        return;
      }
      svg.querySelectorAll('.flow-node').forEach((el) => {
        el.classList.remove('flow-node--hover', 'flow-node--dim', 'flow-node--active');
      });
      svg.querySelectorAll('.flow-edge').forEach((el) => {
        el.classList.remove('flow-edge--hover', 'flow-edge--dim');
      });
      if (activeFilter) updateQuoteHeader(activeFilter);
      else if (quoteContext) quoteContext.textContent = 'Click a chart segment to see quotes';
    }

    nodes.forEach((n) => {
      const el = svg.querySelector(`.flow-node[data-id="${n.id}"]`);
      if (!el) return;
      el.addEventListener('click', () => setFilter({ type: 'flow', id: n.id }));
      el.addEventListener('mouseenter', () => paintHover(n.id));
      el.addEventListener('mousemove', (e) => {
        showTip(
          `<strong>${esc(n.label)}</strong><br>${n.count || 0} mentions · click for quotes`,
          e.clientX,
          e.clientY,
        );
      });
      el.addEventListener('mouseleave', () => {
        hideTip();
        restoreFlowVisual();
      });
    });

    edges.forEach((e) => {
      const a = nodes.find((n) => n.id === e.from);
      const b = nodes.find((n) => n.id === e.to);
      const el = svg.querySelector(`.flow-edge[data-from="${e.from}"][data-to="${e.to}"]`);
      if (!el) return;
      el.style.cursor = 'pointer';
      el.addEventListener('mouseenter', (ev) => {
        svg.querySelectorAll('.flow-edge').forEach((p) => {
          p.classList.toggle('flow-edge--hover', p === el);
          p.classList.toggle('flow-edge--dim', p !== el);
        });
        showTip(
          `<strong>${esc(a?.label || e.from)} → ${esc(b?.label || e.to)}</strong><br>${e.count || 0} transitions`,
          ev.clientX,
          ev.clientY,
        );
      });
      el.addEventListener('mousemove', (ev) => {
        showTip(
          `<strong>${esc(a?.label || e.from)} → ${esc(b?.label || e.to)}</strong><br>${e.count || 0} transitions`,
          ev.clientX,
          ev.clientY,
        );
      });
      el.addEventListener('mouseleave', () => {
        hideTip();
        restoreFlowVisual();
      });
    });
  }

  function renderProcedureBubbleChart() {
    const pb = D.procedureBubbles;
    if (!pb || !window.PulsarBubbles) return;

    const view = buildBubbleViewData(pb, bubbleMode);

    document.getElementById('bubble-eyebrow').textContent =
      bubbleMode === 'procedure'
        ? '5A. Procedure-open — Procedure popularity · Variant A (rings)'
        : '5A. Procedure-open — Emotion lens · Variant A (rings)';
    document.getElementById('bubble-title').textContent =
      bubbleMode === 'procedure'
        ? pb.title
        : 'How do emotions break down across procedures?';

    window.PulsarBubbles.renderProcedureBubbles({
      svg: document.getElementById('bubble-chart'),
      legendEl: document.getElementById('bubble-legend'),
      hintEl: document.getElementById('bubble-hint'),
      zoomOutBtn: document.getElementById('bubble-zoom-out'),
      data: view,
      showTip,
      hideTip,
      onSelectProcedure: (id) => {
        if (bubbleMode === 'procedure') setFilter({ type: 'procedure', id });
        else setFilter({ type: 'tone', id });
      },
      onSelectTone: (outerId, innerId) => {
        if (bubbleMode === 'procedure') {
          setFilter({ type: 'bubble-tone', procedure: outerId, tone: innerId });
        } else {
          setFilter({ type: 'bubble-tone', procedure: innerId, tone: outerId });
        }
      },
      onZoomOut: () => {
        if (
          activeFilter?.type === 'procedure' ||
          activeFilter?.type === 'tone' ||
          activeFilter?.type === 'bubble-tone'
        ) {
          clearFilter();
        }
      },
    });
  }

  function renderProcedurePackedChart() {
    const pb = D.procedureBubbles;
    if (!pb || !window.PulsarSunburst) return;

    const view = buildBubbleViewData(pb, bubbleMode);

    document.getElementById('bubble-pack-eyebrow').textContent =
      bubbleMode === 'procedure'
        ? '5A. Procedure-open — Procedure popularity · Variant B (sunburst)'
        : '5A. Procedure-open — Emotion lens · Variant B (sunburst)';
    document.getElementById('bubble-pack-title').textContent =
      bubbleMode === 'procedure'
        ? pb.title
        : 'How do emotions break down across procedures?';

    window.PulsarSunburst.renderSunburst({
      svg: document.getElementById('bubble-pack-chart'),
      legendEl: document.getElementById('bubble-pack-legend'),
      hintEl: document.getElementById('bubble-pack-hint'),
      mode: bubbleMode,
      data: {
        ...view,
        hintPack:
          bubbleMode === 'procedure'
            ? 'Variant B · sunburst · inner = procedures · outer = emotions · click for quotes'
            : 'Variant B · sunburst · inner = emotions · outer = procedures · click for quotes',
      },
      showTip,
      hideTip,
      onSelectOuter: (id) => {
        if (bubbleMode === 'procedure') setFilter({ type: 'procedure', id });
        else setFilter({ type: 'tone', id });
      },
      onSelectInner: (outerId, innerId) => {
        if (bubbleMode === 'procedure') {
          setFilter({ type: 'bubble-tone', procedure: outerId, tone: innerId });
        } else {
          setFilter({ type: 'bubble-tone', procedure: innerId, tone: outerId });
        }
      },
    });
  }

  /** Shared hierarchy for both bubble variants. */
  let bubbleMode = 'procedure'; // 'procedure' | 'emotion'

  function buildBubbleViewData(pb, mode) {
    const procedures = pb.procedures || [];
    const sentiments = pb.sentiments || [];

    if (mode !== 'emotion') {
      return {
        ...pb,
        hint: 'Variant A · outer = procedures · inner = emotions · click ring to zoom',
        hintPack: 'Variant B · sunburst · inner = procedures · outer = emotions · click for quotes',
      };
    }

    // Flip: outer = emotions, inner = procedures
    return {
      ...pb,
      hint: 'Variant A · outer = emotions · inner = procedures · click ring to zoom',
      hintPack: 'Variant B · sunburst · inner = emotions · outer = procedures · click for quotes',
      sentiments: procedures.map((p) => ({
        id: p.id,
        label: p.label,
        color: p.shell || '#8ecae6',
      })),
      procedures: sentiments.map((s) => ({
        id: s.id,
        label: s.label,
        shell: s.color,
        tones: procedures.map((p) => ({
          tone: p.id,
          count: (p.tones || []).find((t) => t.tone === s.id)?.count || 0,
        })),
      })),
    };
  }

  function syncBubbleModeButtons() {
    document.querySelectorAll('.bubble-mode__btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.mode === bubbleMode);
    });
  }

  function setBubbleMode(mode) {
    if (mode !== 'procedure' && mode !== 'emotion') return;
    if (bubbleMode === mode) return;
    bubbleMode = mode;
    syncBubbleModeButtons();
    if (
      activeFilter?.type === 'procedure' ||
      activeFilter?.type === 'tone' ||
      activeFilter?.type === 'bubble-tone'
    ) {
      clearFilter();
    }
    renderProcedureBubbleChart();
    renderProcedurePackedChart();
  }

  document.querySelectorAll('.bubble-mode__btn').forEach((btn) => {
    btn.addEventListener('click', () => setBubbleMode(btn.dataset.mode));
  });

  if (quoteMore) {
    quoteMore.addEventListener('click', () => {
      quotePage += 1;
      renderQuotes(false);
    });
  }

  renderOverview();
  renderKpis();
  renderMoodMap();
  renderTopicLandscape();
  renderSegmentation();
  syncBubbleModeButtons();
  renderProcedureBubbleChart();
  renderProcedurePackedChart();
  renderBehaviorFlow();
})();