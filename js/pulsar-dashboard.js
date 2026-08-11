(function () {
  const D = window.PulsarData;
  const U = D.ui || {};
  const t = (key, fb) => (U[key] !== undefined ? U[key] : fb);

  const COLORS = ['#e8a0bf', '#7ecdb8', '#8ecae6', '#f0d9b5', '#f0948a', '#b4a7d6'];

  let activeFilter = null;
  let quotePage = 0;
  const PAGE = 6;

  const tip = document.getElementById('pulsar-tip');
  const quoteList = document.getElementById('quote-list');
  const quoteContext = document.getElementById('quote-context');
  const quoteMeta = document.getElementById('quote-meta');
  const quoteMore = document.getElementById('quote-more');
  const quoteFilters = document.getElementById('quote-filters');

  if (quoteMore) quoteMore.textContent = t('quoteMoreBtn', 'Ещё цитаты');

  function tipShow(x, y, title, body) {
    tip.innerHTML = `<strong>${title}</strong>${body}`;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let l = x + 12, ty = y + 12;
    if (l + r.width > innerWidth - 8) l = x - r.width - 12;
    if (ty + r.height > innerHeight - 8) ty = y - r.height - 12;
    tip.style.left = l + 'px';
    tip.style.top = ty + 'px';
  }

  function tipHide() { tip.hidden = true; }

  function severityLabel(s) {
    const map = U.severity || { high: 'важно', med: 'средне', low: 'совет' };
    return map[s] || s;
  }

  function renderKPIs() {
    document.getElementById('kpi-row').innerHTML = D.kpis.map((k) => `
      <div class="kpi-card" style="--accent-color:${k.color}">
        <div class="kpi-card__label">${k.label}</div>
        <div class="kpi-card__value">${k.value}</div>
        <div class="kpi-card__hint">${k.hint}</div>
      </div>
    `).join('');
  }

  function setActiveFilter(filter, label, chips) {
    activeFilter = filter;
    quotePage = 0;
    quoteContext.textContent = label;
    quoteFilters.innerHTML = (chips || []).map((c) => `<span class="quote-chip">${c}</span>`).join('');
    renderQuotes(true);
    clearHighlights();
    applyHighlight(filter);
  }

  function renderQuotes(reset) {
    if (reset) quoteList.innerHTML = '';
    if (!activeFilter) {
      quoteList.innerHTML = `<div class="quote-empty"><div class="quote-empty__icon">❝</div><p>${t('quoteEmptyClick', 'Кликните на сегмент диаграммы, предупреждение или этап цепочки.')}</p></div>`;
      quoteMeta.textContent = '';
      quoteMore.hidden = true;
      return;
    }

    const all = D.filterQuotes(activeFilter);
    const slice = all.slice(quotePage * PAGE, (quotePage + 1) * PAGE);

    if (reset && !slice.length) {
      quoteList.innerHTML = `<div class="quote-empty"><p>${t('quoteEmptyNoResults', 'Нет цитат для этого фильтра в демо-наборе.')}</p></div>`;
      quoteMeta.textContent = '';
      quoteMore.hidden = true;
      return;
    }

    const html = slice.map((q) => {
      const att = D.attitudes.find((a) => a.id === q.attitude);
      const top = D.topics.find((tp) => tp.id === q.topic);
      return `<article class="pulsar-quote" style="--quote-color:${att?.color || '#e8a0bf'}">
        <p class="pulsar-quote__text">${q.text}</p>
        <div class="pulsar-quote__tags">
          <span class="pulsar-tag">${att?.label || q.attitude}</span>
          <span class="pulsar-tag">${top?.label || q.topic}</span>
          <span class="pulsar-tag">${q.procedure}</span>
        </div>
        <div class="pulsar-quote__foot">#${q.id} · ${t('quoteSource', 'PULSAR (демо)')}</div>
      </article>`;
    }).join('');

    if (reset) quoteList.innerHTML = html;
    else quoteList.insertAdjacentHTML('beforeend', html);

    const shown = Math.min((quotePage + 1) * PAGE, all.length);
    const fmt = t('quoteShown', '{shown} из {total}').replace('{shown}', shown).replace('{total}', all.length);
    quoteMeta.textContent = fmt;
    quoteMore.hidden = shown >= all.length;
  }

  quoteMore.addEventListener('click', () => { quotePage++; renderQuotes(false); });

  function clearHighlights() {
    document.querySelectorAll('.att-bar--active, .warn-row--active, .proc-cell--active, .chart-slice--hover, .chart-slice--dim, .topic-bar-g--hover, .topic-bar-g--dim, .journey-node--active, .journey-node--dim, .journey-node--hover, .flow-node--active, .flow-node--dim, .flow-node--hover, .flow-edge--hover').forEach((el) => {
      el.classList.remove('att-bar--active', 'warn-row--active', 'proc-cell--active', 'chart-slice--hover', 'chart-slice--dim', 'topic-bar-g--hover', 'topic-bar-g--dim', 'journey-node--active', 'journey-node--dim', 'journey-node--hover', 'flow-node--active', 'flow-node--dim', 'flow-node--hover', 'flow-edge--hover');
    });
  }

  function applyHighlight(filter) {
    if (!filter) return;
    if (filter.type === 'attitude') {
      document.querySelectorAll(`.att-bar[data-id="${filter.value}"], .chart-slice[data-id="${filter.value}"]`).forEach((el) => el.classList.add('att-bar--active', 'chart-slice--hover'));
    }
    if (filter.type === 'topic') document.querySelector(`.topic-bar-g[data-id="${filter.value}"]`)?.classList.add('topic-bar-g--hover');
    if (filter.type === 'warning') document.querySelector(`.warn-row[data-id="${filter.value}"]`)?.classList.add('warn-row--active');
    if (filter.type === 'journey') document.querySelector(`.journey-node[data-id="${filter.value}"]`)?.classList.add('journey-node--active');
    if (filter.type === 'flow') document.querySelector(`.flow-node[data-id="${filter.value}"]`)?.classList.add('flow-node--active');
    if (filter.type === 'matrix') document.querySelector(`.proc-cell[data-proc="${filter.procedure}"][data-sent="${filter.sentiment}"]`)?.classList.add('proc-cell--active');
  }

  function bindFilter(type, value, label, chips, el) {
    const filter = { type, value };
    el.addEventListener('click', () => setActiveFilter(filter, label, chips));
    el.addEventListener('mouseenter', (e) => {
      if (type === 'attitude') {
        document.querySelectorAll('.chart-slice, .att-bar').forEach((n) => {
          const match = n.dataset.id === value;
          n.classList.toggle('chart-slice--dim', !match);
          n.classList.toggle('chart-slice--hover', match);
          n.classList.toggle('att-bar--active', match);
        });
      }
      if (type === 'topic') {
        document.querySelectorAll('.topic-bar-g').forEach((n) => {
          n.classList.toggle('topic-bar-g--dim', n.dataset.id !== value);
          n.classList.toggle('topic-bar-g--hover', n.dataset.id === value);
        });
      }
      if (type === 'journey') {
        document.querySelectorAll('.journey-node').forEach((n) => {
          n.classList.toggle('journey-node--dim', n.dataset.id !== value);
          n.classList.toggle('journey-node--hover', n.dataset.id === value);
        });
      }
      if (type === 'flow') {
        document.querySelectorAll('.flow-node').forEach((n) => {
          n.classList.toggle('flow-node--dim', n.dataset.id !== value);
          n.classList.toggle('flow-node--hover', n.dataset.id === value);
        });
      }
      renderQuotes(true);
      activeFilter = filter;
      quoteContext.textContent = label;
      quoteFilters.innerHTML = (chips || []).map((c) => `<span class="quote-chip">${c}</span>`).join('');
      const items = D.filterQuotes(filter);
      const seg = t('tipCommentsInSegment', '{n} комментариев в сегменте').replace('{n}', items.length);
      tipShow(e.clientX, e.clientY, label, seg);
    });
    el.addEventListener('mousemove', (e) => {
      const items = D.filterQuotes(filter);
      const pin = t('tipClickPin', '{n} коммент. · клик — закрепить').replace('{n}', items.length);
      tipShow(e.clientX, e.clientY, label, pin);
    });
    el.addEventListener('mouseleave', () => {
      tipHide();
      if (!el.classList.contains('att-bar--active') && !el.classList.contains('warn-row--active')) clearHighlights();
    });
  }

  function renderAttitude() {
    const total = D.attitudes.reduce((s, a) => s + a.count, 0);
    const svg = document.getElementById('attitude-chart');
    const cx = 160, cy = 160, r = 100;
    let angle = 0;
    let paths = `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#e8ecf4" font-size="26" font-weight="700">${total}</text>`;
    paths += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="#8b95a8" font-size="11">${t('ratingsLabel', 'оценок')}</text>`;

    D.attitudes.forEach((a) => {
      const slice = (a.count / total) * 360;
      const start = angle;
      const end = angle + slice - 0.5;
      const large = slice > 180 ? 1 : 0;
      const rad = (deg) => ((deg - 90) * Math.PI) / 180;
      const x1 = cx + r * Math.cos(rad(start));
      const y1 = cy + r * Math.sin(rad(start));
      const x2 = cx + r * Math.cos(rad(end));
      const y2 = cy + r * Math.sin(rad(end));
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      paths += `<path class="chart-slice" data-id="${a.id}" d="${d}" fill="${a.color}" stroke="#151922" stroke-width="2"/>`;
      angle += slice;
    });

    paths += `<circle cx="${cx}" cy="${cy}" r="58" fill="#151922"/>`;
    svg.innerHTML = paths;

    document.getElementById('attitude-bars').innerHTML = D.attitudes.map((a) => {
      const pct = ((a.count / total) * 100).toFixed(1);
      return `<div class="att-bar" data-id="${a.id}">
        <div class="att-bar__top"><span>${a.label}</span><span><strong>${a.count}</strong> · ${pct}%</span></div>
        <div class="att-bar__track"><div class="att-bar__fill" style="width:${pct}%;background:${a.color}"></div></div>
      </div>`;
    }).join('');

    D.attitudes.forEach((a) => {
      const pct = ((a.count / total) * 100).toFixed(1);
      document.querySelectorAll(`.chart-slice[data-id="${a.id}"], .att-bar[data-id="${a.id}"]`).forEach((el) => {
        bindFilter('attitude', a.id, `${a.label} — ${a.count} (${pct}%)`, [a.label, a.desc], el);
      });
    });
  }

  function renderTopics() {
    const svg = document.getElementById('topics-chart');
    const items = [...D.topics].sort((a, b) => b.count - a.count);
    const max = items[0].count;
    const padL = 148, padR = 48, barH = 24, gap = 10;
    const h = 20 + items.length * (barH + gap);
    svg.setAttribute('viewBox', `0 0 620 ${h}`);

    svg.innerHTML = items.map((tp, i) => {
      const y = 16 + i * (barH + gap);
      const w = (tp.count / max) * (620 - padL - padR);
      const c = COLORS[i % COLORS.length];
      const pct = ((tp.count / D.meta.totalComments) * 100).toFixed(0);
      return `<g class="topic-bar-g" data-id="${tp.id}">
        <text x="${padL - 10}" y="${y + 16}" text-anchor="end" fill="#8b95a8" font-size="12">${tp.label}</text>
        <rect x="${padL}" y="${y}" width="${w}" height="${barH}" rx="6" fill="${c}"/>
        <text x="${padL + w + 8}" y="${y + 16}" fill="#e8ecf4" font-size="11" font-weight="600">${tp.count} <tspan fill="#8b95a8" font-weight="400">(${pct}%)</tspan></text>
      </g>`;
    }).join('');

    const mentions = t('mentions', 'упоминаний');
    items.forEach((tp) => {
      document.querySelectorAll(`.topic-bar-g[data-id="${tp.id}"]`).forEach((el) => {
        bindFilter('topic', tp.id, `${t('topicPrefix', 'Тема:')} ${tp.label}`, [tp.label, `${tp.count} ${mentions}`], el);
      });
    });
  }

  function renderWarnings() {
    const max = D.warnings[0].count;
    const el = document.getElementById('warnings-chart');
    const warnLabel = t('warningLabel', 'Предупреждение');
    el.innerHTML = D.warnings.map((w) => {
      const pct = (w.count / max) * 100;
      return `<div class="warn-row" data-id="${w.id}">
        <span class="warn-row__text">${w.text}</span>
        <div class="warn-row__meta">
          <span class="warn-severity warn-severity--${w.severity}">${severityLabel(w.severity)}</span>
          <span class="warn-count">${w.count}</span>
        </div>
        <div class="warn-bar-mini"><div class="warn-bar-mini__fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');

    D.warnings.forEach((w) => {
      document.querySelectorAll(`.warn-row[data-id="${w.id}"]`).forEach((el) => {
        bindFilter('warning', w.id, `${warnLabel}: ${w.text.slice(0, 50)}…`, [warnLabel, `${w.count} ${t('mentions', 'упоминаний')}`], el);
      });
    });
  }

  function renderJourney() {
    const svg = document.getElementById('journey-chart');
    const nodes = D.journey;
    const nodeW = 88, nodeH = 72, gap = 24;
    const startX = 30;
    const cy = 90;
    const jComments = t('journeyComments', 'коммент.');

    let content = '';
    nodes.forEach((n, i) => {
      const x = startX + i * (nodeW + gap);
      const sentimentPct = Math.round(n.sentiment * 100);
      const posColor = sentimentPct > 55 ? '#7ecdb8' : sentimentPct > 40 ? '#f0d9b5' : '#f0948a';

      if (i < nodes.length - 1) {
        const nx = x + nodeW + gap / 2;
        content += `<line x1="${x + nodeW + 4}" y1="${cy}" x2="${nx - 4}" y2="${cy}" stroke="#2a3040" stroke-width="2" marker-end="url(#arrow)"/>`;
      }

      content += `<g class="journey-node" data-id="${n.id}">
        <rect x="${x}" y="${cy - nodeH / 2}" width="${nodeW}" height="${nodeH}" rx="12" fill="${n.color}22" stroke="${n.color}" stroke-width="1.5"/>
        <text x="${x + nodeW / 2}" y="${cy - 12}" text-anchor="middle" fill="#e8ecf4" font-size="11" font-weight="600">${n.label}</text>
        <text x="${x + nodeW / 2}" y="${cy + 8}" text-anchor="middle" fill="#8b95a8" font-size="10">${n.count} ${jComments}</text>
        <rect x="${x + 12}" y="${cy + 18}" width="${nodeW - 24}" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>
        <rect x="${x + 12}" y="${cy + 18}" width="${(nodeW - 24) * n.sentiment}" height="6" rx="3" fill="${posColor}"/>
      </g>`;
    });

    content = `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#2a3040"/></marker></defs>` + content;
    svg.innerHTML = content;

    const leg = U.journeyLegend || [
      'позитивный тон этапа', 'смешанный', 'тревога / негатив', 'полоска под этапом = доля позитива',
    ];
    const legColors = ['#7ecdb8', '#f0d9b5', '#f0948a', null];
    document.getElementById('journey-legend').innerHTML = leg.map((text, i) => {
      if (i === 3) return `<span class="journey-legend__item">${text}</span>`;
      return `<span class="journey-legend__item"><span class="journey-legend__dot" style="background:${legColors[i]}"></span> ${text}</span>`;
    }).join('');

    const stagePrefix = t('stagePrefix', 'Этап:');
    const toneLabel = t('tonePrefix', 'тон');
    nodes.forEach((n) => {
      document.querySelectorAll(`.journey-node[data-id="${n.id}"]`).forEach((el) => {
        bindFilter('journey', n.id, `${stagePrefix} ${n.label}`, [n.label, `${n.count} ${jComments}`, `${toneLabel} +${Math.round(n.sentiment * 100)}%`], el);
      });
    });
  }

  function renderMatrix() {
    const container = document.getElementById('proc-matrix');
    const procs = D.procedures;
    const cols = D.sentimentCols;
    const max = Math.max(...procs.flatMap((p) => D.matrix[p] || []));
    const mComments = t('matrixComments', 'коммент.');

    const grid = document.createElement('div');
    grid.className = 'proc-matrix-grid';
    grid.style.gridTemplateColumns = `100px repeat(${cols.length}, 1fr)`;

    grid.appendChild(document.createElement('div'));
    cols.forEach((c) => {
      const l = document.createElement('div');
      l.className = 'proc-matrix-label proc-matrix-label--col';
      l.textContent = c;
      grid.appendChild(l);
    });

    procs.forEach((proc) => {
      const rl = document.createElement('div');
      rl.className = 'proc-matrix-label proc-matrix-label--row';
      rl.textContent = proc;
      grid.appendChild(rl);

      (D.matrix[proc] || []).forEach((val, ci) => {
        const sent = cols[ci];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'proc-cell';
        cell.dataset.proc = proc;
        cell.dataset.sent = sent;
        cell.textContent = val;
        cell.style.background = `rgba(232, 160, 191, ${0.1 + (val / max) * 0.75})`;
        const filter = { type: 'matrix', procedure: proc, sentiment: sent };
        const label = `${proc} · ${sent} — ${val}`;
        cell.addEventListener('click', () => setActiveFilter(filter, label, [proc, sent, `${val} ${mComments}`]));
        cell.addEventListener('mouseenter', (e) => {
          renderQuotes(true);
          activeFilter = filter;
          quoteContext.textContent = label;
          quoteFilters.innerHTML = [proc, sent].map((c) => `<span class="quote-chip">${c}</span>`).join('');
          tipShow(e.clientX, e.clientY, label, t('tipClickPin', '{n} коммент. · клик — закрепить').replace('{n}', val));
        });
        cell.addEventListener('mousemove', (e) => tipShow(e.clientX, e.clientY, label, `${val} ${mComments}`));
        cell.addEventListener('mouseleave', tipHide);
        grid.appendChild(cell);
      });
    });

    container.innerHTML = '';
    container.appendChild(grid);
  }

  function renderBehaviorFlow() {
    const flow = D.behaviorFlow;
    if (!flow) return;

    const svg = document.getElementById('behavior-flow');
    const labelsEl = document.getElementById('behavior-labels');
    if (!svg) return;

    const layerLabels = flow.layerLabels || U.flowLayerLabels || ['L0', 'L1', 'L2', 'L3'];
    const colX = [70, 280, 490, 700];
    const nodeW = 118;
    const nodeH = 48;
    const gapY = 14;
    const layers = [0, 1, 2, 3];
    const pos = {};

    layers.forEach((layer) => {
      const nodes = flow.nodes.filter((n) => n.layer === layer);
      const totalH = nodes.length * nodeH + (nodes.length - 1) * gapY;
      const startY = 56 + (280 - totalH) / 2;
      nodes.forEach((n, i) => {
        pos[n.id] = { x: colX[layer], y: startY + i * (nodeH + gapY), w: nodeW, h: nodeH, node: n };
      });
    });

    labelsEl.innerHTML = layerLabels.map((lbl, i) =>
      `<span class="behavior-label" style="left:${((colX[i] + nodeW / 2) / 960 * 100).toFixed(1)}%">${lbl}</span>`
    ).join('');

    const maxEdge = Math.max(...flow.edges.map((e) => e.count));
    let edgesSvg = '';
    flow.edges.forEach((e) => {
      const a = pos[e.from];
      const b = pos[e.to];
      if (!a || !b) return;
      const x1 = a.x + a.w;
      const y1 = a.y + a.h / 2;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const mx = (x1 + x2) / 2;
      const sw = 1.5 + (e.count / maxEdge) * 5;
      const op = 0.25 + (e.count / maxEdge) * 0.55;
      edgesSvg += `<path class="flow-edge" data-from="${e.from}" data-to="${e.to}" data-count="${e.count}" d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="#e8a0bf" stroke-width="${sw}" opacity="${op}"><title>${e.count}</title></path>`;
    });

    let nodesSvg = '';
    flow.nodes.forEach((n) => {
      const p = pos[n.id];
      if (!p) return;
      nodesSvg += `<g class="flow-node" data-id="${n.id}" tabindex="0" role="button">
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="10" fill="${n.color}22" stroke="${n.color}" stroke-width="1.5"/>
        <text x="${p.x + p.w / 2}" y="${p.y + 20}" text-anchor="middle" fill="#e8ecf4" font-size="10" font-weight="600">${n.label.length > 16 ? n.label.slice(0, 15) + '…' : n.label}</text>
        <text x="${p.x + p.w / 2}" y="${p.y + 36}" text-anchor="middle" fill="#8b95a8" font-size="9">${n.count}</text>
      </g>`;
    });

    svg.innerHTML = edgesSvg + nodesSvg;

    const flowPrefix = t('flowPrefix', 'Поведение:');
    flow.nodes.forEach((n) => {
      document.querySelectorAll(`.flow-node[data-id="${n.id}"]`).forEach((el) => {
        bindFilter('flow', n.id, `${flowPrefix} ${n.label}`, [n.label, `${n.count}`], el);
      });
    });

    flow.edges.forEach((e) => {
      const a = flow.nodes.find((n) => n.id === e.from);
      const b = flow.nodes.find((n) => n.id === e.to);
      document.querySelectorAll(`.flow-edge[data-from="${e.from}"][data-to="${e.to}"]`).forEach((el) => {
        el.style.cursor = 'pointer';
        el.addEventListener('mouseenter', (ev) => {
          document.querySelectorAll('.flow-edge').forEach((p) => p.classList.toggle('flow-edge--hover', p === el));
          tipShow(ev.clientX, ev.clientY, `${t('flowEdgePrefix', 'Переход:')} ${a?.label} → ${b?.label}`, `${e.count} ${t('matrixComments', 'коммент.')}`);
        });
        el.addEventListener('mousemove', (ev) => {
          tipShow(ev.clientX, ev.clientY, `${a?.label} → ${b?.label}`, `${e.count} ${t('matrixComments', 'коммент.')}`);
        });
        el.addEventListener('mouseleave', () => {
          el.classList.remove('flow-edge--hover');
          tipHide();
        });
      });
    });
  }

  function renderTrust() {
    const maxP = D.trustPlus[0].count;
    const maxM = D.trustMinus[0].count;
    const el = document.getElementById('trust-chart');
    const praise = t('praiseLabel', 'Хвалят');
    const criticize = t('criticizeLabel', 'Ругают');

    const col = (items, type, title, max, fillClass) => `
      <div class="trust-col trust-col--${type}">
        <div class="trust-col__title">${title}</div>
        ${items.map((item) => `
          <div class="trust-item" data-type="trust-${type}" data-id="${item.id}">
            <span>${item.label}</span>
            <div class="trust-item__bar"><div class="${fillClass}" style="width:${(item.count / max) * 100}%"></div></div>
            <span class="trust-item__count">${item.count}</span>
          </div>
        `).join('')}
      </div>`;

    el.innerHTML = col(D.trustPlus, 'plus', t('trustPlusTitle', '✓ Хвалят'), maxP, 'trust-item__fill--plus') +
      col(D.trustMinus, 'minus', t('trustMinusTitle', '✗ Ругают'), maxM, 'trust-item__fill--minus');

    [...D.trustPlus, ...D.trustMinus].forEach((item) => {
      const isPlus = D.trustPlus.includes(item);
      document.querySelectorAll(`.trust-item[data-id="${item.id}"]`).forEach((el) => {
        bindFilter(isPlus ? 'trust-plus' : 'trust-minus', item.id, `${isPlus ? praise : criticize}: ${item.label}`, [item.label], el);
      });
    });
  }

  renderKPIs();
  renderAttitude();
  renderTopics();
  renderWarnings();
  renderBehaviorFlow();
  renderJourney();
  renderMatrix();
  renderTrust();
})();
