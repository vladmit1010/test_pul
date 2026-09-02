/**
 * Revitalift dashboard — reads all numbers from window.DashboardData
 */
(function () {
  const D = window.DashboardData;
  const U = window.DashboardUtils;
  if (!D) return;

  function topicPool() {
    return U ? U.getTopicPool(D.topicLandscape) : D.topicLandscape?.topics || [];
  }

  function displayTopics() {
    return U ? U.getTopicLandscapeTopics(D.topicLandscape) : [...topicPool()].sort((a, b) => b.count - a.count);
  }

  function findTopic(id) {
    return U ? U.findTopic(D.topicLandscape, id) : topicPool().find((t) => t.id === id);
  }

  const PAGE = 8;
  let activeFilter = null;
  let quotePage = 0;

  const commentIndex = window.DashboardCommentIndex;
  const commentPool = commentIndex?.pool || [];

  const quoteList = document.getElementById('quote-list');
  const quoteContext = document.getElementById('quote-context');
  const quoteFilters = document.getElementById('quote-filters');
  const quoteMeta = document.getElementById('quote-meta');
  const quotePrev = document.getElementById('quote-prev');
  const quoteNext = document.getElementById('quote-next');
  const quotesPanel = document.getElementById('quotes-panel');
  const tip = document.getElementById('pulsar-tip');

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function totalFrom(items) {
    return items.reduce((s, x) => s + (x.count || 0), 0);
  }

  function polar(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  function piePath(cx, cy, r, startAngle, endAngle) {
    const sweep = Math.max(endAngle - startAngle, 0.01);
    const end = startAngle + sweep;
    const [x1, y1] = polar(cx, cy, r, startAngle);
    const [x2, y2] = polar(cx, cy, r, end);
    const large = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

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

  function mixHex(hex, toward, amount) {
    const h = String(hex || '').replace('#', '');
    const parse = (s) => parseInt(s, 16);
    const a =
      h.length === 6
        ? { r: parse(h.slice(0, 2)), g: parse(h.slice(2, 4)), b: parse(h.slice(4, 6)) }
        : { r: 126, g: 205, b: 184 };
    const b = { r: 255, g: 255, b: 255 };
    if (toward === '#0c0e14') b.r = 12;
    const m = (x, y) => Math.round(x + (y - x) * amount);
    const to = (n) => n.toString(16).padStart(2, '0');
    return `#${to(m(a.r, b.r))}${to(m(a.g, b.g))}${to(m(a.b, b.b))}`;
  }

  function setPiePop(el, pop) {
    const color = el.closest('.mood-slice')?.dataset.color || '#7ecdb8';
    el.style.setProperty('--pop', String(pop));
    el.style.setProperty('--glow', color);
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

  function poolComments(indices) {
    if (!indices?.length) return [];
    return indices.map((i) => commentPool[i]).filter(Boolean);
  }

  function filterComments(filter) {
    if (!filter) return [];
    if (commentIndex) {
      if (filter.type === 'mood') return poolComments(commentIndex.mood?.[filter.id]);
      if (filter.type === 'topic') return poolComments(commentIndex.topic?.[filter.id]);
      if (filter.type === 'segment') return poolComments(commentIndex.segment?.[filter.id]);
      if (filter.type === 'procedure') return poolComments(commentIndex.procedure?.[filter.id]);
      if (filter.type === 'procedure-tone') {
        return poolComments(commentIndex['procedure-tone']?.[`${filter.procedure}|${filter.tone}`]);
      }
      if (filter.type === 'ingredient') return poolComments(commentIndex.ingredient?.[filter.id]);
      if (filter.type === 'ingredient-tone') {
        return poolComments(commentIndex['ingredient-tone']?.[`${filter.ingredient}|${filter.tone}`]);
      }
      return [];
    }
    if (filter.type === 'mood') return D.comments.filter((c) => c.mood === filter.id);
    if (filter.type === 'topic') return D.comments.filter((c) => (c.topics || []).includes(filter.id));
    if (filter.type === 'segment') return D.comments.filter((c) => c.segment === filter.id);
    if (filter.type === 'procedure') return D.comments.filter((c) => c.procedure === filter.id);
    if (filter.type === 'procedure-tone') {
      return D.comments.filter(
        (c) => c.procedure === filter.procedure && c.procedureTone === filter.tone,
      );
    }
    if (filter.type === 'ingredient') return D.comments.filter((c) => c.ingredient === filter.id);
    if (filter.type === 'ingredient-tone') {
      return D.comments.filter(
        (c) => c.ingredient === filter.ingredient && c.ingredientTone === filter.tone,
      );
    }
    return [];
  }

  function categoryTotal(filter) {
    if (!filter) return 0;
    if (filter.type === 'mood') return D.moodMap.moods.find((x) => x.id === filter.id)?.count || 0;
    if (filter.type === 'topic') return findTopic(filter.id)?.count || 0;
    if (filter.type === 'segment') return D.segmentation.segments.find((x) => x.id === filter.id)?.count || 0;
    if (filter.type === 'procedure' || filter.type === 'procedure-tone') {
      const block = U ? U.resolveBubbleChart(D.procedureEffects, 'chart4') : D.procedureEffects;
      const pid = filter.type === 'procedure' ? filter.id : filter.procedure;
      const proc = block.procedures?.find((x) => x.id === pid);
      if (filter.type === 'procedure-tone') {
        return proc?.tones?.find((t) => t.tone === filter.tone)?.count || 0;
      }
      return (proc?.tones || []).reduce((sum, t) => sum + (t.count || 0), 0);
    }
    if (filter.type === 'ingredient' || filter.type === 'ingredient-tone') {
      const block = U ? U.resolveBubbleChart(D.skincareIngredients, 'chart5') : D.skincareIngredients;
      const iid = filter.type === 'ingredient' ? filter.id : filter.ingredient;
      const ing = block.procedures?.find((x) => x.id === iid);
      if (filter.type === 'ingredient-tone') {
        return ing?.tones?.find((t) => t.tone === filter.tone)?.count || 0;
      }
      return (ing?.tones || []).reduce((sum, t) => sum + (t.count || 0), 0);
    }
    return 0;
  }

  function filtersEqual(a, b) {
    if (!a || !b || a.type !== b.type) return false;
    if (a.type === 'procedure-tone') return a.procedure === b.procedure && a.tone === b.tone;
    if (a.type === 'ingredient-tone') return a.ingredient === b.ingredient && a.tone === b.tone;
    return a.id === b.id;
  }

  function clearHighlights() {
    document.querySelectorAll('.mood-slice-g').forEach((el) => {
      el.classList.remove('mood-slice-g--active', 'mood-slice-g--dim', 'mood-slice-g--hover');
      el.style.removeProperty('--pop');
    });
    document.querySelectorAll('.mood-legend__item--active').forEach((el) => {
      el.classList.remove('mood-legend__item--active');
    });
    document.querySelectorAll('.topic-bar--active, .topic-bar--dim').forEach((el) => {
      el.classList.remove('topic-bar--active', 'topic-bar--dim');
    });
    document.querySelectorAll('.driver-bar--active, .driver-bar--dim').forEach((el) => {
      el.classList.remove('driver-bar--active', 'driver-bar--dim');
    });
  }

  function applyHighlights(filter) {
    clearHighlights();
    if (!filter) return;
    if (filter.type === 'mood' || filter.type === 'segment') {
      const chartId = filter.type === 'mood' ? 'mood-chart' : 'seg-chart';
      document.querySelectorAll(`#${chartId} .mood-slice`).forEach((el) => {
        const match = el.dataset.id === filter.id;
        const vis = el.querySelector('.mood-slice-g');
        if (!vis) return;
        vis.classList.toggle('mood-slice-g--active', match);
        vis.classList.toggle('mood-slice-g--dim', !match);
        setPiePop(vis, match ? 12 : 0);
      });
      const legId = filter.type === 'mood' ? 'mood-legend' : 'seg-legend';
      document.querySelectorAll(`#${legId} .mood-legend__item`).forEach((el) => {
        el.classList.toggle('mood-legend__item--active', el.dataset.id === filter.id);
      });
    }
    if (filter.type === 'topic') {
      document.querySelectorAll('.topic-bar').forEach((el) => {
        const match = el.dataset.id === filter.id;
        el.classList.toggle('topic-bar--active', match);
        el.classList.toggle('topic-bar--dim', !match);
      });
    }
    if (filter.type === 'driver') {
      document.querySelectorAll('.driver-bar').forEach((el) => {
        const match = el.dataset.id === filter.id;
        el.classList.toggle('driver-bar--active', match);
        el.classList.toggle('driver-bar--dim', !match);
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
    renderQuotes();
  }

  function clearFilter() {
    activeFilter = null;
    quotePage = 0;
    clearHighlights();
    quoteContext.textContent = 'Click a chart segment to see quotes';
    quoteFilters.innerHTML = '';
    quoteList.innerHTML = `<div class="quote-empty"><div class="quote-empty__icon">❝</div><p>Click a segment — matching sample quotes appear here.</p></div>`;
    quoteMeta.textContent = '';
    if (quotePrev) quotePrev.disabled = true;
    if (quoteNext) quoteNext.disabled = true;
  }

  function updateQuoteHeader(filter) {
    if (!filter) return;
    if (filter.type === 'driver') {
      const drv = D.decisionDrivers.drivers.find((x) => x.id === filter.id);
      quoteContext.textContent = `Survey: ${drv?.label || filter.id}`;
      quoteFilters.innerHTML = `<span class="quote-chip">Appinio · fixed %</span><span class="quote-chip">${drv?.percent || 0}%</span>`;
      return;
    }
    const chips = [];
    if (filter.type === 'mood') {
      const m = D.moodMap.moods.find((x) => x.id === filter.id);
      quoteContext.textContent = `${m?.label || filter.id}`;
      chips.push(m?.label);
    }
    if (filter.type === 'topic') {
      const t = findTopic(filter.id);
      quoteContext.textContent = `Topic: ${t?.label || filter.id}`;
      chips.push(t?.label, `${t?.count || 0} mentions`);
    }
    if (filter.type === 'segment') {
      const s = D.segmentation.segments.find((x) => x.id === filter.id);
      quoteContext.textContent = s?.label || filter.id;
      chips.push(s?.label);
    }
    if (filter.type === 'procedure') {
      const resolved = U ? U.resolveBubbleChart(D.procedureEffects, 'chart4') : D.procedureEffects;
      const p = resolved.procedures.find((x) => x.id === filter.id);
      quoteContext.textContent = `Verfahren: ${p?.label || filter.id}`;
      chips.push(p?.label);
    }
    if (filter.type === 'procedure-tone') {
      const resolved = U ? U.resolveBubbleChart(D.procedureEffects, 'chart4') : D.procedureEffects;
      const p = resolved.procedures.find((x) => x.id === filter.procedure);
      const s = U
        ? U.findSentiment(resolved.sentiments, filter.tone)
        : resolved.sentiments.find((x) => x.id === filter.tone);
      quoteContext.textContent = `${p?.label} · ${s?.label || filter.tone}`;
      chips.push(p?.label, s?.label);
    }
    if (filter.type === 'ingredient') {
      const resolved = U ? U.resolveBubbleChart(D.skincareIngredients, 'chart5') : D.skincareIngredients;
      const p = resolved.procedures.find((x) => x.id === filter.id);
      quoteContext.textContent = `Wirkstoff: ${p?.label || filter.id}`;
      chips.push(p?.label);
    }
    if (filter.type === 'ingredient-tone') {
      const resolved = U ? U.resolveBubbleChart(D.skincareIngredients, 'chart5') : D.skincareIngredients;
      const p = resolved.procedures.find((x) => x.id === filter.ingredient);
      const s = U
        ? U.findSentiment(resolved.sentiments, filter.tone)
        : resolved.sentiments.find((x) => x.id === filter.tone);
      quoteContext.textContent = `${p?.label} · ${s?.label || filter.tone}`;
      chips.push(p?.label, s?.label);
    }
    quoteFilters.innerHTML = chips.filter(Boolean).map((c) => `<span class="quote-chip">${esc(c)}</span>`).join('');
  }

  function renderQuotes() {
    if (!activeFilter) return;
    if (activeFilter.type === 'driver') {
      quoteList.innerHTML = `<div class="quote-empty"><p>Chart 6 uses fixed Appinio survey values — no PULSAR comment filter.</p></div>`;
      quoteMeta.textContent = '';
      if (quotePrev) quotePrev.disabled = true;
      if (quoteNext) quoteNext.disabled = true;
      return;
    }
    const all = filterComments(activeFilter);
    const totalInCategory = categoryTotal(activeFilter);
    if (!all.length) {
      const hint =
        totalInCategory > 0
          ? `${totalInCategory.toLocaleString('de-DE')} comments in this segment — none in the quote sample yet.`
          : 'No comments for this selection.';
      quoteList.innerHTML = `<div class="quote-empty"><p>${esc(hint)}</p></div>`;
      quoteMeta.textContent = totalInCategory ? `${totalInCategory.toLocaleString('de-DE')} total` : '';
      if (quotePrev) quotePrev.disabled = true;
      if (quoteNext) quoteNext.disabled = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(all.length / PAGE));
    if (quotePage >= totalPages) quotePage = totalPages - 1;
    const start = quotePage * PAGE;
    const slice = all.slice(start, start + PAGE);
    const html = slice
      .map(
        (q) => `<article class="pulsar-quote" style="--quote-color:var(--rose)">
        <p class="pulsar-quote__text">${esc(q.text)}</p>
        <div class="pulsar-quote__tags">${(q.tags || []).map((t) => `<span class="pulsar-tag">${esc(t)}</span>`).join('')}</div>
        <div class="pulsar-quote__foot">#${esc(q.id)}</div>
      </article>`,
      )
      .join('');
    quoteList.innerHTML = html;
    quoteList.scrollTop = 0;

    const pageLabel = `Page ${quotePage + 1} / ${totalPages}`;
    const shownLabel = `${start + 1}–${start + slice.length} of ${all.length.toLocaleString('de-DE')} quotes`;
    const corpusLabel =
      totalInCategory > all.length
        ? ` · ${totalInCategory.toLocaleString('de-DE')} in corpus`
        : '';
    quoteMeta.textContent = `${pageLabel} · ${shownLabel}${corpusLabel}`;

    if (quotePrev) quotePrev.disabled = quotePage <= 0;
    if (quoteNext) quoteNext.disabled = quotePage >= totalPages - 1;
  }

  function renderKpis() {
    const row = document.getElementById('kpi-row');
    if (!row) return;
    const moods = D.moodMap.moods;
    const total = D.meta.total_comments || totalFrom(moods);
    const pos = moods
      .filter((m) => m.id === 'enthusiastic' || m.id === 'satisfied')
      .reduce((s, m) => s + m.count, 0);
    const advisory = moods.find((m) => m.id === 'advisory')?.count || 0;
    const topTopic = displayTopics()[0] || [...topicPool()].sort((a, b) => b.count - a.count)[0];
    row.innerHTML = [
      { label: 'Comments', value: String(total), hint: 'sample total', color: 'var(--rose)' },
      { label: 'Positive mood', value: `${Math.round((pos / total) * 100)}%`, hint: 'enthusiastic + satisfied', color: 'var(--mint)' },
      { label: 'Advisory', value: `${Math.round((advisory / total) * 100)}%`, hint: 'warnings & caution', color: 'var(--sky)' },
      { label: `Top topic`, value: String(topTopic?.count || 0), hint: topTopic?.label || '', color: 'var(--lavender)' },
    ]
      .map(
        (k) => `<article class="kpi-card" style="--kpi-color:${k.color}">
        <span class="kpi-card__label">${esc(k.label)}</span>
        <strong class="kpi-card__value">${esc(k.value)}</strong>
        <span class="kpi-card__hint">${esc(k.hint)}</span>
      </article>`,
      )
      .join('');
  }

  function bindDonutInteractions(svg, filterType, legendId, onPreview) {
    let timer = null;
    function enter(slice) {
      clearTimeout(timer);
      const id = slice.dataset.id;
      if (activeFilter?.type === filterType) {
        svg.querySelectorAll('.mood-slice').forEach((s) => {
          const sel = s.dataset.id === activeFilter.id;
          const hov = s === slice;
          const vis = s.querySelector('.mood-slice-g');
          vis.classList.toggle('mood-slice-g--active', sel);
          vis.classList.toggle('mood-slice-g--hover', hov && !sel);
          vis.classList.toggle('mood-slice-g--dim', !sel && !hov);
          setPiePop(vis, sel ? 12 : 0);
        });
      } else {
        svg.querySelectorAll('.mood-slice').forEach((s) => {
          const on = s === slice;
          const vis = s.querySelector('.mood-slice-g');
          vis.classList.toggle('mood-slice-g--hover', on);
          vis.classList.toggle('mood-slice-g--dim', !on);
          setPiePop(vis, on ? 8 : 0);
        });
      }
      if (onPreview) onPreview(id);
    }
    function leave() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (activeFilter?.type === filterType) applyHighlights(activeFilter);
        else clearHighlights();
        if (onPreview) onPreview(null);
      }, 60);
    }
    svg.querySelectorAll('.mood-slice').forEach((el) => {
      const hit = el.querySelector('.mood-hit');
      hit.addEventListener('click', () => setFilter({ type: filterType, id: el.dataset.id }));
      hit.addEventListener('mouseenter', () => enter(el));
      hit.addEventListener('mouseleave', leave);
    });
    document.querySelectorAll(`#${legendId} .mood-legend__item`).forEach((el) => {
      el.addEventListener('click', () => setFilter({ type: filterType, id: el.dataset.id }));
      el.addEventListener('mouseenter', () => {
        const slice = svg.querySelector(`.mood-slice[data-id="${el.dataset.id}"]`);
        if (slice) enter(slice);
      });
      el.addEventListener('mouseleave', leave);
    });
  }

  function renderMoodMap() {
    const mm = D.moodMap;
    document.getElementById('mood-eyebrow').textContent = mm.eyebrow;
    document.getElementById('mood-title').textContent = mm.title;
    const moods = mm.moods;
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
        const [lx, ly] = polar(cx, cy, r * 0.62, mid);
        const rad = ((mid - 90) * Math.PI) / 180;
        return `<g class="mood-slice" data-id="${esc(m.id)}" data-color="${esc(m.color)}">
          <path class="mood-hit" d="${d}" fill="transparent"/>
          <g class="mood-slice-g" style="--ox:${Math.cos(rad)};--oy:${Math.sin(rad)};--pop:0;--glow:${esc(m.color)}">
            <path class="mood-slice__body" d="${d}" fill="${m.color}" stroke="#0c0e14" stroke-width="3"/>
            <text class="mood-slice__pct" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${pct}%</text>
          </g>
        </g>`;
      })
      .join('');
    svg.innerHTML = slices;
    document.getElementById('mood-legend').innerHTML = moods
      .map((m) => {
        const pct = total ? Math.round((m.count / total) * 100) : 0;
        return `<button type="button" class="mood-legend__item" data-id="${esc(m.id)}">
          <span class="mood-legend__swatch" style="background:${m.color}"></span>
          <span class="mood-legend__label">${esc(m.label)}</span>
          <span class="mood-legend__pct">${pct}% · ${m.count}</span>
        </button>`;
      })
      .join('');
    bindDonutInteractions(svg, 'mood', 'mood-legend');
  }

  function renderTopics() {
    const tl = D.topicLandscape;
    document.getElementById('topic-eyebrow').textContent = tl.eyebrow;
    document.getElementById('topic-title').textContent = tl.title;
    const topics = displayTopics();
    const max = topics.reduce((m, t) => Math.max(m, t.count), 0) || 1;
    const root = document.getElementById('topics-chart');
    root.innerHTML = topics
      .map((t) => {
        const width = Math.max(4, Math.round((t.count / max) * 100));
        const posW = t.count ? Math.round((t.positive / t.count) * width) : 0;
        const negW = width - posW;
        return `<button type="button" class="topic-bar" data-id="${esc(t.id)}" role="listitem">
          <span class="topic-bar__label">${esc(t.label)}</span>
          <span class="topic-bar__track-split" style="width:${width}%">
            <span class="topic-bar__fill-pos" style="width:${posW}%"></span>
            <span class="topic-bar__fill-neg" style="width:${negW}%"></span>
          </span>
          <span class="topic-bar__value">${t.count}</span>
        </button>`;
      })
      .join('');
    root.querySelectorAll('.topic-bar').forEach((el) => {
      const t = topics.find((x) => x.id === el.dataset.id);
      el.addEventListener('click', () => setFilter({ type: 'topic', id: el.dataset.id }));
      el.addEventListener('mousemove', (e) => {
        showTip(
          `<strong>${esc(t.label)}</strong><br>${t.count} mentions · +${t.positive} / −${t.negative}`,
          e.clientX,
          e.clientY,
        );
      });
      el.addEventListener('mouseleave', hideTip);
    });
  }

  function renderSegmentation() {
    const sg = D.segmentation;
    document.getElementById('seg-eyebrow').textContent = sg.eyebrow;
    document.getElementById('seg-title').textContent = sg.title;
    const segments = sg.segments;
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
        const [lx, ly] = polar(cx, cy, labelR, mid);
        const rad = ((mid - 90) * Math.PI) / 180;
        return `<g class="mood-slice" data-id="${esc(s.id)}" data-color="${esc(s.color)}">
          <path class="mood-hit" d="${d}" fill="transparent"/>
          <g class="mood-slice-g" style="--ox:${Math.cos(rad)};--oy:${Math.sin(rad)};--pop:0;--glow:${esc(s.color)}">
            <path class="mood-slice__body" d="${d}" fill="${s.color}" stroke="#0c0e14" stroke-width="3"/>
            <foreignObject x="${lx - box / 2}" y="${ly - box / 2}" width="${box}" height="${box}" pointer-events="none">
              <div xmlns="http://www.w3.org/1999/xhtml" class="seg-quote">
                <span class="seg-quote__pct">${pct}%</span>
                <span class="seg-quote__text">${esc(s.quote || '')}</span>
              </div>
            </foreignObject>
          </g>
        </g>`;
      })
      .join('');
    svg.innerHTML = slices;
    document.getElementById('seg-legend').innerHTML = segments
      .map((s) => {
        const pct = total ? Math.round((s.count / total) * 100) : 0;
        return `<button type="button" class="mood-legend__item" data-id="${esc(s.id)}">
          <span class="mood-legend__swatch" style="background:${s.color}"></span>
          <span class="mood-legend__label">${esc(s.label)}</span>
          <span class="mood-legend__pct">${pct}% · ${s.count}</span>
        </button>`;
      })
      .join('');
    bindDonutInteractions(svg, 'segment', 'seg-legend');
  }

  function renderNestedBubbles(cfg, chartId, legendId, hintId, filterPrefix) {
    if (!window.PulsarNestedBars) return;
    const chartKey = filterPrefix === 'procedure' ? 'chart4' : 'chart5';
    const block = U ? U.resolveBubbleChart(cfg, chartKey) : cfg;
    document.getElementById(hintId.replace('-hint', '-eyebrow')).textContent = block.eyebrow;
    document.getElementById(hintId.replace('-hint', '-title')).textContent = block.title;
    window.PulsarNestedBars.renderNestedBars({
      containerEl: document.getElementById(chartId),
      legendEl: document.getElementById(legendId),
      hintEl: document.getElementById(hintId),
      data: block,
      showTip,
      hideTip,
      onSelectOuter: (id) => {
        if (filterPrefix === 'procedure') setFilter({ type: 'procedure', id });
        else setFilter({ type: 'ingredient', id });
      },
      onSelectTone: (outerId, innerId) => {
        if (filterPrefix === 'procedure') {
          setFilter({ type: 'procedure-tone', procedure: outerId, tone: innerId });
        } else {
          setFilter({ type: 'ingredient-tone', ingredient: outerId, tone: innerId });
        }
      },
      onZoomOut: () => {
        if (
          activeFilter?.type === 'procedure' ||
          activeFilter?.type === 'procedure-tone' ||
          activeFilter?.type === 'ingredient' ||
          activeFilter?.type === 'ingredient-tone'
        ) {
          clearFilter();
        }
      },
    });
  }

  function renderDrivers() {
    const dd = D.decisionDrivers;
    document.getElementById('drv-eyebrow').textContent = dd.eyebrow;
    document.getElementById('drv-title').textContent = dd.title;
    document.getElementById('drv-source').textContent = dd.source;
    const drivers = [...dd.drivers].sort((a, b) => b.percent - a.percent);
    const max = drivers[0]?.percent || 100;
    const root = document.getElementById('drivers-chart');
    root.innerHTML = drivers
      .map(
        (d) => `<button type="button" class="driver-bar" data-id="${esc(d.id)}">
          <span class="driver-bar__label">${esc(d.label)}</span>
          <span class="driver-bar__track"><span class="driver-bar__fill" style="width:${Math.round((d.percent / max) * 100)}%"></span></span>
          <span class="driver-bar__value">${d.percent}%</span>
        </button>`,
      )
      .join('');
    root.querySelectorAll('.driver-bar').forEach((el) => {
      const d = drivers.find((x) => x.id === el.dataset.id);
      el.addEventListener('click', () => setFilter({ type: 'driver', id: el.dataset.id }));
      el.addEventListener('mousemove', (e) => {
        showTip(`<strong>${esc(d.label)}</strong><br>${d.percent}% · Appinio survey`, e.clientX, e.clientY);
      });
      el.addEventListener('mouseleave', hideTip);
    });
  }

  if (quotePrev) {
    quotePrev.addEventListener('click', () => {
      if (quotePage > 0) {
        quotePage -= 1;
        renderQuotes();
      }
    });
  }
  if (quoteNext) {
    quoteNext.addEventListener('click', () => {
      quotePage += 1;
      renderQuotes();
    });
  }

  if (quotesPanel && quoteList) {
    quotesPanel.addEventListener(
      'wheel',
      (e) => {
        const el = quoteList;
        if (el.scrollHeight <= el.clientHeight + 1) return;
        e.preventDefault();
        e.stopPropagation();
        const maxScroll = el.scrollHeight - el.clientHeight;
        el.scrollTop = Math.max(0, Math.min(maxScroll, el.scrollTop + e.deltaY));
      },
      { passive: false },
    );
  }

  renderKpis();
  renderMoodMap();
  renderTopics();
  renderSegmentation();
  renderNestedBubbles(D.procedureEffects, 'proc-chart', 'proc-legend', 'proc-hint', 'procedure');
  renderNestedBubbles(D.skincareIngredients, 'ing-chart', 'ing-legend', 'ing-hint', 'ingredient');
  renderDrivers();
})();
