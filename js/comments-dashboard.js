(function () {
  const COLORS = [
    '#5b8def', '#3ecf8e', '#a78bfa', '#f5a623', '#ef6b6b',
    '#56cfe1', '#ff8fab', '#82c91e', '#ffd43b', '#748ffc',
  ];

  const SENTIMENT_LABELS = {
    positive: 'Позитив',
    neutral: 'Нейтрал',
    negative: 'Негатив',
  };

  const { comments, summary } = window.CommentsData;
  let activeFilter = null;
  let quoteOffset = 0;
  const QUOTE_PAGE = 8;

  const tooltip = document.getElementById('tooltip');
  const quotesList = document.getElementById('quotes-list');
  const quotesFilter = document.getElementById('quotes-filter');
  const quotesCount = document.getElementById('quotes-count');
  const showMoreBtn = document.getElementById('show-more');

  function showTooltip(x, y, html) {
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    const rect = tooltip.getBoundingClientRect();
    let left = x + 14;
    let top = y + 14;
    if (left + rect.width > window.innerWidth - 12) left = x - rect.width - 14;
    if (top + rect.height > window.innerHeight - 12) top = y - rect.height - 14;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function renderSentimentRow() {
    const row = document.getElementById('sentiment-row');
    row.innerHTML = Object.entries(summary.bySentiment).map(([key, val]) => {
      const pct = ((val / summary.total) * 100).toFixed(1);
      return `<div class="sentiment-pill">
        <span class="sentiment-pill__dot sentiment-pill__dot--${key}"></span>
        <span>${SENTIMENT_LABELS[key]}:</span>
        <strong>${val}</strong>
        <span>(${pct}%)</span>
      </div>`;
    }).join('');
  }

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const large = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
  }

  function getFilteredComments(filter) {
    if (!filter) return [];
    if (filter.type === 'persona') return comments.filter((c) => c.persona === filter.value);
    if (filter.type === 'topic') return comments.filter((c) => c.topic === filter.value);
    if (filter.type === 'matrix') {
      return comments.filter((c) => c.persona === filter.persona && c.topic === filter.topic);
    }
    return [];
  }

  function renderQuotes(filter, reset = true) {
    if (reset) quoteOffset = 0;
    const filtered = getFilteredComments(filter);
    activeFilter = filter;

    if (!filter) {
      quotesFilter.textContent = 'Выберите сегмент на графике';
      quotesList.innerHTML = `<div class="quotes-placeholder">
        <span class="quotes-placeholder__icon">"</span>
        <p>Наведите на сегмент круговой или столбчатой диаграммы, либо кликните ячейку тепловой карты.</p>
        <p class="quotes-placeholder__hint">Показываем до 8 цитат с ID, автором, датой и текстом.</p>
      </div>`;
      quotesCount.textContent = '';
      showMoreBtn.hidden = true;
      return;
    }

    let label = '';
    if (filter.type === 'persona') label = `Аудитория: ${filter.value}`;
    if (filter.type === 'topic') label = `Тема: ${filter.value}`;
    if (filter.type === 'matrix') label = `${filter.persona} · ${filter.topic}`;

    quotesFilter.textContent = `${label} — ${filtered.length} комментариев`;

    const slice = filtered.slice(quoteOffset, quoteOffset + QUOTE_PAGE);
    const cards = slice.map((c) => `
      <article class="quote-card quote-card--${c.sentiment}">
        <p class="quote-card__text">${c.text}</p>
        <div class="quote-card__meta">
          <span class="quote-card__id">#${c.id}</span>
          <span><strong>${c.author}</strong> · ${c.persona}</span>
          <span>${c.topic}</span>
          <span>${c.date}</span>
          <span>${SENTIMENT_LABELS[c.sentiment]}</span>
        </div>
      </article>
    `).join('');

    if (reset) {
      quotesList.innerHTML = cards || '<p class="quotes-placeholder">Нет комментариев для этого фильтра.</p>';
    } else {
      quotesList.insertAdjacentHTML('beforeend', cards);
    }

    const shown = Math.min(quoteOffset + QUOTE_PAGE, filtered.length);
    quotesCount.textContent = `Показано ${shown} из ${filtered.length}`;
    showMoreBtn.hidden = shown >= filtered.length;
  }

  showMoreBtn.addEventListener('click', () => {
    quoteOffset += QUOTE_PAGE;
    renderQuotes(activeFilter, false);
  });

  function renderPersonaChart() {
    const svg = document.getElementById('persona-chart');
    const legend = document.getElementById('persona-legend');
    const entries = Object.entries(summary.byPersona).sort((a, b) => b[1] - a[1]);
    const cx = 150;
    const cy = 160;
    const r = 110;
    const ir = 62;
    let angle = 0;

    let paths = `<text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="#e8ecf4" font-size="22" font-weight="700">${summary.total}</text>`;
    paths += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#8b95a8" font-size="11">комментариев</text>`;

    entries.forEach(([label, value], i) => {
      const slice = (value / summary.total) * 360;
      const start = angle;
      const end = angle + slice;
      const color = COLORS[i % COLORS.length];
      const d = describeArc(cx, cy, r, start, end - 0.4);
      const mid = start + slice / 2;
      const pct = ((value / summary.total) * 100).toFixed(1);

      paths += `<path class="chart-segment" data-type="persona" data-value="${label}"
        d="${d}" fill="${color}" stroke="#0f1117" stroke-width="2"
        tabindex="0" role="button" aria-label="${label}: ${value}">
        <title>${label}: ${value} (${pct}%)</title>
      </path>`;

      const innerD = describeArc(cx, cy, ir, start, end - 0.4);
      paths += `<path d="${innerD}" fill="#1c2333" pointer-events="none"/>`;

      angle = end;
    });

    svg.innerHTML = paths;

    legend.innerHTML = entries.map(([label, value], i) => {
      const pct = ((value / summary.total) * 100).toFixed(1);
      return `<li class="legend__item" data-type="persona" data-value="${label}">
        <span class="legend__swatch" style="background:${COLORS[i % COLORS.length]}"></span>
        <span class="legend__label">${label}</span>
        <span class="legend__value">${value} <span style="color:var(--text-muted);font-weight:400">(${pct}%)</span></span>
      </li>`;
    }).join('');

    bindSegmentEvents(svg, 'persona');
    bindLegendEvents(legend, 'persona');
  }

  function renderTopicChart() {
    const svg = document.getElementById('topic-chart');
    const entries = Object.entries(summary.byTopic).sort((a, b) => b[1] - a[1]);
    const max = entries[0][1];
    const padL = 130;
    const padR = 20;
    const padT = 16;
    const padB = 16;
    const barH = 22;
    const gap = 8;
    const chartW = 520 - padL - padR;
    const height = padT + padB + entries.length * (barH + gap);

    svg.setAttribute('viewBox', `0 0 520 ${height}`);

    let content = '';
    entries.forEach(([label, value], i) => {
      const y = padT + i * (barH + gap);
      const w = (value / max) * chartW;
      const color = COLORS[i % COLORS.length];
      const pct = ((value / summary.total) * 100).toFixed(1);

      content += `<g class="bar-group" data-type="topic" data-value="${label}" tabindex="0" role="button">
        <text x="${padL - 8}" y="${y + barH / 2 + 4}" text-anchor="end" fill="#8b95a8" font-size="11">${label.length > 16 ? label.slice(0, 15) + '…' : label}</text>
        <rect class="bar-rect" x="${padL}" y="${y}" width="${w}" height="${barH}" rx="5" fill="${color}"/>
        <text x="${padL + w + 6}" y="${y + barH / 2 + 4}" fill="#e8ecf4" font-size="11" font-weight="600">${value}</text>
        <title>${label}: ${value} (${pct}%)</title>
      </g>`;
    });

    svg.innerHTML = content;
    bindSegmentEvents(svg, 'topic');
  }

  function renderHeatmap() {
    const container = document.getElementById('heatmap');
    const personas = Object.keys(summary.byPersona).sort((a, b) => summary.byPersona[b] - summary.byPersona[a]);
    const topics = Object.keys(summary.byTopic).sort((a, b) => summary.byTopic[b] - summary.byTopic[a]);
    const values = Object.values(summary.matrix);
    const maxVal = Math.max(...values);

    const cols = topics.length + 1;
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';
    grid.style.gridTemplateColumns = `110px repeat(${topics.length}, 1fr)`;

    grid.appendChild(document.createElement('div'));

    topics.forEach((t) => {
      const el = document.createElement('div');
      el.className = 'heatmap-col-label';
      el.textContent = t;
      el.title = t;
      grid.appendChild(el);
    });

    personas.forEach((persona) => {
      const rowLabel = document.createElement('div');
      rowLabel.className = 'heatmap-row-label';
      rowLabel.textContent = persona;
      grid.appendChild(rowLabel);

      topics.forEach((topic) => {
        const key = `${persona}|${topic}`;
        const val = summary.matrix[key] || 0;
        const intensity = val / maxVal;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'heatmap-cell';
        cell.dataset.persona = persona;
        cell.dataset.topic = topic;
        cell.textContent = val || '';
        cell.style.background = val
          ? `rgba(91, 141, 239, ${0.12 + intensity * 0.78})`
          : 'rgba(255,255,255,0.03)';
        cell.title = `${persona} × ${topic}: ${val} комментариев`;

        cell.addEventListener('mouseenter', (e) => {
          showTooltip(e.clientX, e.clientY, `<strong>${persona} · ${topic}</strong>${val} комментариев · клик для цитат`);
        });
        cell.addEventListener('mousemove', (e) => showTooltip(e.clientX, e.clientY, `<strong>${persona} · ${topic}</strong>${val} комментариев · клик для цитат`));
        cell.addEventListener('mouseleave', hideTooltip);
        cell.addEventListener('click', () => {
          document.querySelectorAll('.heatmap-cell--active').forEach((c) => c.classList.remove('heatmap-cell--active'));
          cell.classList.add('heatmap-cell--active');
          highlightCharts(null);
          renderQuotes({ type: 'matrix', persona, topic });
          document.getElementById('quotes-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        grid.appendChild(cell);
      });
    });

    container.innerHTML = '';
    container.appendChild(grid);
  }

  function highlightCharts(activeType, activeValue) {
    document.querySelectorAll('.chart-segment, .bar-group, .legend__item').forEach((el) => {
      const type = el.dataset.type;
      const value = el.dataset.value;
      const isMatch = activeType && type === activeType && value === activeValue;
      el.classList.toggle('chart-segment--dim', !!activeType && !isMatch);
      el.classList.toggle('bar-group--dim', !!activeType && !isMatch);
      el.classList.toggle('chart-segment--hover', isMatch);
      el.classList.toggle('bar-group--hover', isMatch);
      el.classList.toggle('legend__item--active', isMatch);
    });
  }

  function bindSegmentEvents(container, type) {
    const selector = type === 'persona' ? '.chart-segment' : '.bar-group';

    container.querySelectorAll(selector).forEach((el) => {
      const value = el.dataset.value;
      const count = type === 'persona' ? summary.byPersona[value] : summary.byTopic[value];
      const pct = ((count / summary.total) * 100).toFixed(1);

      el.addEventListener('mouseenter', (e) => {
        highlightCharts(type, value);
        showTooltip(e.clientX, e.clientY, `<strong>${value}</strong>${count} комментариев (${pct}%)`);
        renderQuotes({ type, value });
      });

      el.addEventListener('mousemove', (e) => {
        showTooltip(e.clientX, e.clientY, `<strong>${value}</strong>${count} комментариев (${pct}%)`);
      });

      el.addEventListener('mouseleave', () => {
        hideTooltip();
        highlightCharts(null);
      });

      el.addEventListener('click', () => {
        renderQuotes({ type, value });
        document.getElementById('quotes-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      el.addEventListener('focus', () => {
        highlightCharts(type, value);
        renderQuotes({ type, value });
      });

      el.addEventListener('blur', () => highlightCharts(null));
    });
  }

  function bindLegendEvents(legend, type) {
    legend.querySelectorAll('.legend__item').forEach((el) => {
      const value = el.dataset.value;
      el.addEventListener('mouseenter', () => {
        highlightCharts(type, value);
        renderQuotes({ type, value });
      });
      el.addEventListener('mouseleave', () => highlightCharts(null));
      el.addEventListener('click', () => renderQuotes({ type, value }));
    });
  }

  renderSentimentRow();
  renderPersonaChart();
  renderTopicChart();
  renderHeatmap();
})();
