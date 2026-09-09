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
    const raw = U ? U.getTopicLandscapeTopics(D.topicLandscape) : [...topicPool()].sort((a, b) => b.count - a.count);
    if (raw && raw.grouped) return raw;
    return raw;
  }

  function flatTopicsForKpi() {
    const d = displayTopics();
    if (d && d.grouped) return d.flat;
    return d;
  }

  function findTopic(id) {
    return U ? U.findTopic(D.topicLandscape, id) : topicPool().find((t) => t.id === id);
  }

  const PAGE = 8;
  let activeFilter = null;
  let quotePage = 0;

  let commentIndex = window.DashboardCommentIndex || null;
  let commentPool = commentIndex?.pool || [];

  function refreshCommentIndex() {
    commentIndex = window.DashboardCommentIndex || null;
    commentPool = commentIndex?.pool || [];
    if (activeFilter) renderQuotes();
  }

  // If comments.js used defer, it may arrive after this IIFE
  if (!commentIndex) {
    window.addEventListener('load', refreshCommentIndex);
  }
  document.addEventListener('DOMContentLoaded', refreshCommentIndex);

  function loadCommentIndexAsync() {
    if (window.DashboardCommentIndex) {
      refreshCommentIndex();
      return;
    }
    const existing = document.querySelector('script[data-dashboard-comments]');
    if (existing) return;
    const s = document.createElement('script');
    s.src = 'data/dashboard_comments.js';
    s.async = true;
    s.dataset.dashboardComments = '1';
    s.onload = refreshCommentIndex;
    s.onerror = () => console.warn('[dashboard] comment index failed to load');
    document.head.appendChild(s);
  }

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

  const TOPIC_SENTIMENT = {
    positive: { label: 'Positive', moods: ['enthusiastic', 'satisfied'] },
    neutral: { label: 'Neutral', moods: ['intrigued', 'seeking', 'conflicted'] },
    negative: { label: 'Negative / Warning', moods: ['disappointed', 'warning', 'cautioning'] },
  };

  function topicSentimentMoods(sentiment) {
    return TOPIC_SENTIMENT[sentiment]?.moods || [];
  }

  function foldText(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function themeSignalsFor(id) {
    return D.conversationLandscape?.themeSignals?.[id] || [];
  }

  function commentMatchesTheme(c, themeId) {
    const signals = themeSignalsFor(themeId);
    if (!signals.length) return false;
    const t = foldText(c.text);
    return signals.some((sig) => t.includes(sig));
  }

  function commentsMatchingTheme(themeId) {
    const pool = commentPool.length ? commentPool : D.comments || [];
    const out = [];
    for (let i = 0; i < pool.length; i += 1) {
      if (commentMatchesTheme(pool[i], themeId)) {
        out.push(pool[i]);
        if (out.length >= 200) break;
      }
    }
    return out;
  }

  function landscapeNodeQuotes(themeId) {
    return (D.conversationLandscape?.nodes || []).find((n) => n.id === themeId)?.quotes || [];
  }

  function landscapeEdgeQuotes(a, b) {
    const edges = D.conversationLandscape?.edges || [];
    const hit = edges.find(
      (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a),
    );
    return hit?.quotes || [];
  }

  function topClusterTheme() {
    const nodes = [...(D.conversationLandscape?.nodes || [])].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    return nodes[0] || null;
  }

  function filterComments(filter) {
    if (!filter) return [];
    // Ensure late-loaded comment index is picked up
    if (!commentIndex && window.DashboardCommentIndex) refreshCommentIndex();
    if (filter.type === 'word') {
      const term = (filter.id || '').toLowerCase();
      const pool = commentPool.length ? commentPool : D.comments || [];
      const segOk = (c) => {
        if (filter.segment === 'skincare-first') return c.segment === 'skincare-first';
        if (filter.segment === 'procedure') {
          return c.segment === 'procedure-open' || c.segment === 'procedure-curious';
        }
        return true;
      };
      return pool.filter((c) => segOk(c) && String(c.text || '').toLowerCase().includes(term));
    }
    if (filter.type === 'concern' || filter.type === 'need' || filter.type === 'path') {
      const quotes = D.agingPaths?.quotes || {};
      if (filter.type === 'concern') return quotes[`concern:${filter.id}`] || [];
      if (filter.type === 'need') return quotes[`need:${filter.id}`] || [];
      const term = (filter.label || filter.id || '').toLowerCase().split(/[\s/]+/)[0];
      const pool = commentPool.length ? commentPool : D.comments || [];
      return pool.filter((c) => String(c.text || '').toLowerCase().includes(term)).slice(0, 80);
    }
    if (filter.type === 'retinol-fear' || filter.type === 'retinol-hope') {
      const quotes = D.retinolDeepDive?.quotes || {};
      const key = filter.type === 'retinol-fear' ? `fear:${filter.id}` : `hope:${filter.id}`;
      return quotes[key] || [];
    }
    if (filter.type === 'topic-sentiment') {
      const moods = new Set(topicSentimentMoods(filter.sentiment));
      const base = commentIndex
        ? poolComments(commentIndex.topic?.[filter.id])
        : (D.comments || []).filter((c) => (c.topics || []).includes(filter.id));
      return base.filter((c) => moods.has(c.mood));
    }
    if (filter.type === 'topic-pair') {
      const base = commentIndex
        ? poolComments(commentIndex.topic?.[filter.a])
        : (D.comments || []).filter((c) => (c.topics || []).includes(filter.a));
      return base.filter((c) => (c.topics || []).includes(filter.b));
    }
    if (filter.type === 'cluster-theme') {
      const embedded = landscapeNodeQuotes(filter.id);
      if (embedded.length) return embedded;
      return commentsMatchingTheme(filter.id).slice(0, 120);
    }
    if (filter.type === 'cluster-theme-pair') {
      const embedded = landscapeEdgeQuotes(filter.a, filter.b);
      if (embedded.length) return embedded;
      const a = commentsMatchingTheme(filter.a);
      return a.filter((c) => commentMatchesTheme(c, filter.b)).slice(0, 120);
    }
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
    if (filter.type === 'mood') return (D.comments || []).filter((c) => c.mood === filter.id);
    if (filter.type === 'topic') return (D.comments || []).filter((c) => (c.topics || []).includes(filter.id));
    if (filter.type === 'segment') return (D.comments || []).filter((c) => c.segment === filter.id);
    return [];
  }

  function categoryTotal(filter) {
    if (!filter) return 0;
    if (filter.type === 'mood') return D.moodMap.moods.find((x) => x.id === filter.id)?.count || 0;
    if (filter.type === 'topic') return findTopic(filter.id)?.count || 0;
    if (filter.type === 'topic-pair') return filter.weight || filterComments(filter).length;
    if (filter.type === 'cluster-theme') {
      const n = (D.conversationLandscape?.nodes || []).find((x) => x.id === filter.id);
      return n?.weight || 0;
    }
    if (filter.type === 'cluster-theme-pair') return filter.weight || filterComments(filter).length;
    if (filter.type === 'topic-sentiment') {
      const t = findTopic(filter.id);
      if (!t) return 0;
      if (filter.sentiment === 'positive') return t.positive || 0;
      if (filter.sentiment === 'neutral') return t.neutral || 0;
      if (filter.sentiment === 'negative') return t.negative || 0;
      return t.count || 0;
    }
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
    if (a.type === 'word') return a.id === b.id && a.segment === b.segment;
    if (a.type === 'path') return a.id === b.id && a.parentId === b.parentId;
    if (a.type === 'topic-sentiment') return a.id === b.id && a.sentiment === b.sentiment;
    if (a.type === 'topic-pair' || a.type === 'cluster-theme-pair') {
      return (
        (a.a === b.a && a.b === b.b) ||
        (a.a === b.b && a.b === b.a)
      );
    }
    return a.id === b.id;
  }

  function clearHighlights() {
    document.querySelectorAll('.mood-slice-g').forEach((el) => {
      el.classList.remove('mood-slice-g--active', 'mood-slice-g--dim', 'mood-slice-g--hover');
      el.style.removeProperty('--pop');
    });
    document.querySelectorAll('.mood-spectrum__seg').forEach((el) => {
      el.classList.remove('is-active', 'is-dim');
    });
    document.querySelectorAll('.mood-legend__item--active').forEach((el) => {
      el.classList.remove('mood-legend__item--active');
    });
    document.querySelectorAll('.topic-bar--active, .topic-bar--dim').forEach((el) => {
      el.classList.remove('topic-bar--active', 'topic-bar--dim');
    });
    document.querySelectorAll('.topic-bar__fill--active, .topic-bar__fill--dim').forEach((el) => {
      el.classList.remove('topic-bar__fill--active', 'topic-bar__fill--dim');
    });
    document.querySelectorAll('.driver-bar--active, .driver-bar--dim').forEach((el) => {
      el.classList.remove('driver-bar--active', 'driver-bar--dim');
    });
  }

  function isSelfManagedChartFilter(filter) {
    return (
      filter?.type === 'cluster-theme' ||
      filter?.type === 'cluster-theme-pair' ||
      filter?.type === 'retinol-fear' ||
      filter?.type === 'retinol-hope'
    );
  }

  /** Chart 2 + 7 keep their own focus; only clear when filter is wiped or another chart owns it */
  function clearSelfManagedChartHighlights() {
    document.querySelectorAll('#retinol-chart .retinol-bubble').forEach((el) => {
      el.classList.remove('is-active', 'is-dim');
    });
    document.querySelectorAll('#retinol-chart .retinol-list__item.is-active').forEach((el) => {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('#landscape-chart .landscape-node').forEach((el) => {
      el.classList.remove('is-dim', 'is-active', 'is-neighbor');
    });
    document.querySelectorAll('#landscape-chart .landscape-edge').forEach((el) => {
      el.classList.remove('is-dim', 'is-active');
    });
    document.querySelectorAll('#landscape-legend .landscape-legend__item.is-active').forEach((el) => {
      el.classList.remove('is-active');
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
      if (filter.type === 'mood') {
        document.querySelectorAll('#mood-chart .mood-spectrum__seg').forEach((el) => {
          const match = el.dataset.id === filter.id;
          el.classList.toggle('is-active', match);
          el.classList.toggle('is-dim', !match);
        });
      }
      const legId = filter.type === 'mood' ? 'mood-legend' : 'seg-legend';
      document.querySelectorAll(`#${legId} .mood-legend__item`).forEach((el) => {
        el.classList.toggle('mood-legend__item--active', el.dataset.id === filter.id);
      });
    }
    if (filter.type === 'topic' || filter.type === 'topic-sentiment') {
      document.querySelectorAll('.topic-bar').forEach((el) => {
        const match = el.dataset.id === filter.id;
        el.classList.toggle('topic-bar--active', match);
        el.classList.toggle('topic-bar--dim', !match);
        if (filter.type === 'topic-sentiment') {
          el.querySelectorAll('[data-sentiment]').forEach((seg) => {
            const segMatch = match && seg.dataset.sentiment === filter.sentiment;
            seg.classList.toggle('topic-bar__fill--active', segMatch);
            seg.classList.toggle('topic-bar__fill--dim', match && !segMatch);
          });
        }
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
    if (!isSelfManagedChartFilter(filter)) {
      clearSelfManagedChartHighlights();
    }
    applyHighlights(filter);
    updateQuoteHeader(filter);
    renderQuotes();
  }

  function clearFilter() {
    activeFilter = null;
    quotePage = 0;
    clearHighlights();
    clearSelfManagedChartHighlights();
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
    if (filter.type === 'cluster-theme') {
      const label =
        D.conversationLandscape?.themeLabels?.[filter.id] ||
        (D.conversationLandscape?.nodes || []).find((x) => x.id === filter.id)?.label ||
        filter.id;
      const n = (D.conversationLandscape?.nodes || []).find((x) => x.id === filter.id);
      quoteContext.textContent = `Thema: ${label}`;
      chips.push(label, n?.weight ? `${n.weight} Treffer` : null);
    }
    if (filter.type === 'topic-pair' || filter.type === 'cluster-theme-pair') {
      quoteContext.textContent = `Paar: ${filter.labelA || filter.a} + ${filter.labelB || filter.b}`;
      chips.push('gemeinsam genannt', filter.weight ? `${filter.weight}×` : null);
    }
    if (filter.type === 'topic-sentiment') {
      const t = findTopic(filter.id);
      const sLabel = TOPIC_SENTIMENT[filter.sentiment]?.label || filter.sentiment;
      const n =
        filter.sentiment === 'positive'
          ? t?.positive
          : filter.sentiment === 'neutral'
            ? t?.neutral
            : t?.negative;
      quoteContext.textContent = `${t?.label || filter.id} · ${sLabel}`;
      chips.push(t?.label, sLabel, `${n || 0}`);
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
    if (filter.type === 'word') {
      quoteContext.textContent = `Begriff: ${filter.id}`;
      chips.push(filter.id, filter.segment === 'skincare-first' ? 'Skincare-First' : 'Procedure');
    }
    if (filter.type === 'concern') {
      quoteContext.textContent = `Concern: ${filter.label || filter.id}`;
      chips.push('Concern', filter.label || filter.id);
    }
    if (filter.type === 'need') {
      quoteContext.textContent = `Need: ${filter.label || filter.id}`;
      chips.push('Need', filter.label || filter.id);
    }
    if (filter.type === 'path') {
      quoteContext.textContent = `${filter.parentLabel || ''} → ${filter.label || filter.id}`;
      chips.push('Path', filter.label || filter.id);
    }
    if (filter.type === 'retinol-fear') {
      quoteContext.textContent = `Retinol Fear: ${filter.label || filter.id}`;
      chips.push('Retinol', 'Fear', filter.label || filter.id);
    }
    if (filter.type === 'retinol-hope') {
      quoteContext.textContent = `Retinol Hope: ${filter.label || filter.id}`;
      chips.push('Retinol', 'Hope', filter.label || filter.id);
    }
    quoteFilters.innerHTML = chips.filter(Boolean).map((c) => `<span class="quote-chip">${esc(c)}</span>`).join('');
  }

  function renderQuotes() {
    if (!activeFilter) return;
    if (activeFilter.type === 'driver') {
      quoteList.innerHTML = `<div class="quote-empty"><p>Chart 8 uses fixed Appinio survey values — no PULSAR comment filter.</p></div>`;
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

  function corpusFooterBits() {
    const m = D.meta || {};
    const bits = [];
    if (m.period) bits.push(m.period);
    if (m.platforms_label) bits.push(m.platforms_label);
    if (m.total_comments) bits.push(`n=${Number(m.total_comments).toLocaleString('de-DE')}`);
    return bits;
  }

  function ensureFootnote(panelOrChartId, text) {
    const panel =
      typeof panelOrChartId === 'string'
        ? document.getElementById(panelOrChartId)?.closest('.chart-panel') ||
          document.getElementById(panelOrChartId)
        : panelOrChartId;
    if (!panel || !text) return;
    let el = panel.querySelector(':scope > .chart-footnote');
    if (!el) {
      el = document.createElement('p');
      el.className = 'chart-footnote';
      panel.appendChild(el);
    }
    el.textContent = text;
  }

  function renderKpis() {
    const row = document.getElementById('kpi-row');
    if (!row) return;
    const moods = D.moodMap.moods;
    const total = D.meta.total_comments || totalFrom(moods);
    const pos = moods
      .filter((m) => m.id === 'enthusiastic' || m.id === 'satisfied')
      .reduce((s, m) => s + m.count, 0);
    const advisory = moods.find((m) => m.id === 'warning' || m.id === 'cautioning' || m.id === 'advisory')?.count || 0;
    const topTheme = topClusterTheme();
    const topTopic = topTheme
      ? { label: topTheme.label, count: topTheme.weight }
      : flatTopicsForKpi()[0] || [...topicPool()].sort((a, b) => b.count - a.count)[0];
    row.innerHTML = [
      { label: 'Comments', value: String(total), hint: 'klassifizierter Korpus', color: 'var(--rose)' },
      { label: 'Positive mood', value: `${Math.round((pos / total) * 100)}%`, hint: 'enthusiastic + satisfied', color: 'var(--mint)' },
      { label: 'Warning', value: `${Math.round((advisory / total) * 100)}%`, hint: 'warnings to others', color: 'var(--sky)' },
      {
        label: 'Top theme',
        value: String(topTopic?.count || 0),
        hint: topTopic?.label || '',
        color: 'var(--lavender)',
      },
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
    const host = document.getElementById('mood-chart');
    const total = totalFrom(moods) || 1;

    // Weighted mean marker (cats 1..6) — orientation only
    let weighted = 0;
    moods.forEach((m, i) => {
      weighted += (i + 1) * (m.count || 0);
    });
    const meanPos = ((weighted / total - 1) / 5) * 100;

    const axis = mm.axis_label || 'Zuwendung ← → Abwendung';
    const segments = moods
      .map((m) => {
        const pct = Math.round(((m.count || 0) / total) * 100);
        const flex = Math.max(pct, pct < 4 ? 4 : pct);
        return `<button type="button" class="mood-spectrum__seg" data-id="${esc(m.id)}" data-color="${esc(m.color)}" style="flex:${flex};--seg:${esc(m.color)}" title="${esc(m.label)}: ${pct}% · n=${m.count}">
          <span class="mood-spectrum__name">${esc(m.label)}</span>
          <span class="mood-spectrum__pct">${pct}%</span>
          <span class="mood-spectrum__n">n=${(m.count || 0).toLocaleString('de-DE')}</span>
        </button>`;
      })
      .join('');

    host.outerHTML = `<div id="mood-chart" class="mood-spectrum" aria-label="Mood spectrum">
      <p class="mood-spectrum__axis">${esc(axis)}</p>
      <div class="mood-spectrum__bar">${segments}
        <span class="mood-spectrum__mean" style="left:${meanPos.toFixed(2)}%" title="Gewichteter Mittelwert (Orientierung)"></span>
      </div>
    </div>`;

    document.getElementById('mood-legend').innerHTML = moods
      .map((m) => {
        const pct = Math.round(((m.count || 0) / total) * 100);
        return `<button type="button" class="mood-legend__item" data-id="${esc(m.id)}">
          <span class="mood-legend__swatch" style="background:${m.color}"></span>
          <span class="mood-legend__label">${esc(m.label)}</span>
          <span class="mood-legend__pct">${pct}% · ${(m.count || 0).toLocaleString('de-DE')}</span>
        </button>`;
      })
      .join('');

    const chart = document.getElementById('mood-chart');
    const activate = (id) => {
      chart.querySelectorAll('.mood-spectrum__seg').forEach((el) => {
        el.classList.toggle('is-active', el.dataset.id === id);
        el.classList.toggle('is-dim', el.dataset.id !== id);
      });
      document.querySelectorAll('#mood-legend .mood-legend__item').forEach((el) => {
        el.classList.toggle('mood-legend__item--active', el.dataset.id === id);
      });
      setFilter({ type: 'mood', id });
    };
    chart.querySelectorAll('.mood-spectrum__seg').forEach((el) => {
      el.addEventListener('click', () => activate(el.dataset.id));
    });
    document.querySelectorAll('#mood-legend .mood-legend__item').forEach((el) => {
      el.addEventListener('click', () => activate(el.dataset.id));
    });

    ensureFootnote(
      'mood-chart',
      [...corpusFooterBits(), mm.note || 'Anteile = klassifizierbare Kommentare'].filter(Boolean).join(' · '),
    );
  }

  function renderTopics() {
    // Topic Landscape bar chart removed — Conversation Cluster is chart 2.
    return;
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
    ensureFootnote(
      'seg-chart',
      [
        ...corpusFooterBits(),
        sg.note ||
          `Positioniert: ${(sg.n_positioned || 0).toLocaleString('de-DE')} · nicht repräsentativ für DE 39–65`,
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }

  function renderWordclouds() {
    if (!window.PulsarWordcloud) return;
    const skin = D.skincareWordcloud;
    const proc = D.procedureWordcloud;

    if (proc) {
      document.getElementById('proc-eyebrow').textContent = proc.eyebrow;
      document.getElementById('proc-title').textContent = proc.title;
      // Ensure curious outline is explained in legend
      const legend = [...(proc.legend || [])];
      if (!legend.some((l) => /curious/i.test(l.label || ''))) {
        legend.push({ id: 'curious-mark', label: 'gestrichelt ≈ eher Curious', color: 'transparent' });
      }
      window.PulsarWordcloud.render({
        containerEl: document.getElementById('proc-chart'),
        legendEl: document.getElementById('proc-legend'),
        hintEl: document.getElementById('proc-hint'),
        tableEl: document.getElementById('proc-table'),
        data: { ...proc, legend },
        showTip,
        hideTip,
        onSelect: (t) => setFilter({ type: 'word', id: t.term, segment: 'procedure' }),
      });
      ensureFootnote(
        'proc-chart',
        [...corpusFooterBits(), 'Open+Curious normalisiert · gestrichelte Begriffe: Curious-Anteil ≥55%']
          .filter(Boolean)
          .join(' · '),
      );
    }

    if (skin) {
      document.getElementById('ing-eyebrow').textContent = skin.eyebrow;
      document.getElementById('ing-title').textContent = skin.title;
      window.PulsarWordcloud.render({
        containerEl: document.getElementById('ing-chart'),
        legendEl: document.getElementById('ing-legend'),
        hintEl: document.getElementById('ing-hint'),
        tableEl: document.getElementById('ing-table'),
        data: skin,
        showTip,
        hideTip,
        onSelect: (t) => setFilter({ type: 'word', id: t.term, segment: 'skincare-first' }),
      });
      ensureFootnote(
        'ing-chart',
        [...corpusFooterBits(), 'Skincare-First only · Tabelle = relative Übergewichtung vs. Procedure']
          .filter(Boolean)
          .join(' · '),
      );
    }
  }

  function renderNestedBubbles(cfg, chartId, legendId, hintId, filterPrefix) {
    // Live dashboard uses wordclouds for charts 4–5.
    if (!window.PulsarNestedBars || !cfg) return;
    const chartKey = filterPrefix === 'procedure' ? 'chart4' : 'chart5';
    const block = U ? U.resolveBubbleChart(cfg, chartKey) : cfg;
    const eyebrowEl = document.getElementById(hintId.replace('-hint', '-eyebrow'));
    const titleEl = document.getElementById(hintId.replace('-hint', '-title'));
    if (eyebrowEl) eyebrowEl.textContent = block.eyebrow;
    if (titleEl) titleEl.textContent = block.title;
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

  function renderRetinolDeepDive() {
    if (!window.PulsarRetinolViews || !D.retinolDeepDive) return;
    const block = D.retinolDeepDive;
    document.getElementById('retinol-eyebrow').textContent = block.eyebrow;
    document.getElementById('retinol-title').textContent = block.title;
    window.PulsarRetinolViews.render({
      containerEl: document.getElementById('retinol-chart'),
      hintEl: document.getElementById('retinol-hint'),
      data: block,
      showTip,
      hideTip,
      onSelect: (sel) => {
        if (!sel) {
          clearFilter();
          return;
        }
        setFilter({
          type: sel.side === 'fear' ? 'retinol-fear' : 'retinol-hope',
          id: sel.id,
          label: sel.label,
        });
      },
    });
    ensureFootnote(
      'retinol-chart',
      [
        ...corpusFooterBits(),
        `klassifiziert ${(block.n_classified || 0).toLocaleString('de-DE')} / ${(block.n_retinol || 0).toLocaleString('de-DE')}`,
        `nicht klassifiziert ${block.unclassified_share_pct || 0}%`,
        block.note || 'Mehrfachnennungen möglich',
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }

  function renderAgingPaths() {
    if (!window.PulsarAgingPaths || !D.agingPaths) return;
    const block = D.agingPaths;
    document.getElementById('paths-eyebrow').textContent = block.eyebrow;
    document.getElementById('paths-title').textContent = block.title;
    window.PulsarAgingPaths.render({
      containerEl: document.getElementById('paths-chart'),
      hintEl: document.getElementById('paths-hint'),
      data: block,
      showTip,
      hideTip,
      onSelect: (sel) => {
        if (!sel) return;
        setFilter({
          type: sel.type,
          id: sel.id,
          label: sel.label,
          parentKind: sel.parentKind,
          parentId: sel.parentId,
          parentLabel: sel.parentLabel,
        });
      },
    });
    ensureFootnote(
      'paths-chart',
      [
        ...corpusFooterBits(),
        `klassifizierbar ${(block.n_classified || 0).toLocaleString('de-DE')} (${block.classified_share_pct || 0}%)`,
      ]
        .filter(Boolean)
        .join(' · '),
    );
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

  function renderConversationLandscape() {
    if (!window.PulsarConversationLandscape || !D.conversationLandscape) return;
    const block = D.conversationLandscape;
    document.getElementById('landscape-eyebrow').textContent = block.eyebrow || '2. Conversation Cluster';
    document.getElementById('landscape-title').textContent = block.title || 'Conversation Cluster';
    window.PulsarConversationLandscape.render({
      containerEl: document.getElementById('landscape-chart'),
      hintEl: document.getElementById('landscape-hint'),
      howtoEl: document.getElementById('landscape-howto'),
      legendEl: document.getElementById('landscape-legend'),
      detailEl: document.getElementById('landscape-detail'),
      data: block,
      showTip,
      hideTip,
      onSelect: (sel) => {
        if (!sel) {
          clearFilter();
          return;
        }
        if (sel.type === 'topic-pair') {
          setFilter({
            type: 'cluster-theme-pair',
            a: sel.a,
            b: sel.b,
            labelA: sel.labelA,
            labelB: sel.labelB,
            weight: sel.weight,
          });
          return;
        }
        if (sel.type === 'topic') setFilter({ type: 'cluster-theme', id: sel.id });
      },
    });
    ensureFootnote(
      'landscape-chart',
      [
        ...corpusFooterBits(),
        block.method || 'conversation themes',
        `${(block.nodes || []).length} Themen · ${(block.edges || []).length} Paare · ${(block.clusters || []).length} Cluster`,
      ]
        .filter(Boolean)
        .join(' · '),
    );
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

  function safe(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error(`[dashboard] ${name} failed`, err);
    }
  }

  safe('kpis', renderKpis);
  safe('mood', renderMoodMap);
  safe('segmentation', renderSegmentation);
  safe('wordclouds', renderWordclouds);
  safe('agingPaths', renderAgingPaths);
  safe('retinol', renderRetinolDeepDive);
  safe('drivers', renderDrivers);
  safe('landscape', renderConversationLandscape);

  (function bindDownloadMenu() {
    const btn = document.getElementById('download-btn');
    const panel = document.getElementById('download-panel');
    if (!btn || !panel) return;
    const close = () => {
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', close);
    panel.addEventListener('click', (e) => e.stopPropagation());
  })();

  // Load 5MB comment index after first paint — Chrome file:// often freezes on sync parse
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => setTimeout(loadCommentIndexAsync, 0));
  } else {
    setTimeout(loadCommentIndexAsync, 50);
  }
})();
