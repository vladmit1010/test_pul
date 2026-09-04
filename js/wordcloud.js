/**
 * Center-weighted wordcloud (no external deps).
 * Larger / more frequent terms pack near the center; smaller ones spiral outward.
 */
window.PulsarWordcloud = {
  render(opts) {
    const {
      containerEl,
      legendEl,
      hintEl,
      tableEl,
      data,
      onSelect,
      showTip,
      hideTip,
    } = opts;
    if (!containerEl || !data) return;

    if (hintEl) {
      const parts = [];
      if (data.n_docs != null) parts.push(`n=${data.n_docs.toLocaleString('de-DE')} Beiträge`);
      if (data.n_docs_open != null) {
        parts.push(
          `Open n=${data.n_docs_open.toLocaleString('de-DE')} · Curious n=${(data.n_docs_curious || 0).toLocaleString('de-DE')}`,
        );
      }
      parts.push('Größe ∝ relative Häufigkeit · große Begriffe näher am Zentrum');
      hintEl.textContent = parts.join(' · ');
    }

    if (legendEl) {
      legendEl.innerHTML = (data.legend || [])
        .map(
          (l) =>
            `<span class="wc-legend__item"><span class="wc-legend__swatch" style="background:${l.color}"></span>${l.label}</span>`,
        )
        .join('');
    }

    const terms = [...(data.terms || [])].sort((a, b) => b.weight - a.weight);
    if (!terms.length) {
      containerEl.innerHTML = '<p class="quote-empty">Keine Begriffe für dieses Segment.</p>';
      if (tableEl) tableEl.innerHTML = '';
      return;
    }

    const weights = terms.map((t) => t.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights) || 1;
    const scale = (w) => {
      const t = maxW === minW ? 0.5 : (w - minW) / (maxW - minW);
      // Slightly stronger size contrast for center hierarchy
      return 0.72 + t * 1.85;
    };

    containerEl.innerHTML = `<div class="wordcloud" role="list">${terms
      .map((t) => {
        const curious = (t.curious_share || 0) >= 0.55;
        const cls = curious ? 'wordcloud__term wordcloud__term--curious' : 'wordcloud__term';
        return `<button type="button" class="${cls}" role="listitem" data-term="${t.term}"
          style="font-size:${scale(t.weight).toFixed(2)}rem;color:${t.color};--wc-color:${t.color}">
          ${t.term}
        </button>`;
      })
      .join('')}</div>`;

    const cloudEl = containerEl.querySelector('.wordcloud');
    const GAP = 8;
    let lockedHeight = 0;

    const overlaps = (a, b) =>
      !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

    const layout = () => {
      if (!cloudEl) return;
      const W = Math.max(300, cloudEl.clientWidth || containerEl.clientWidth || 480);
      const buttons = [...cloudEl.querySelectorAll('.wordcloud__term')];

      const sizes = buttons.map((el) => {
        el.style.transform = 'none';
        el.style.left = '-9999px';
        el.style.top = '0px';
        el.style.visibility = 'hidden';
        const w = Math.ceil(el.offsetWidth) + GAP;
        const h = Math.ceil(el.offsetHeight) + GAP;
        el.style.visibility = '';
        return { w, h, bw: el.offsetWidth, bh: el.offsetHeight };
      });

      // Prefer table-synced height; otherwise start from a reasonable box
      let H = lockedHeight || Math.max(360, Math.round(W * 0.72));
      let placedFinal = null;
      const maxExpand = lockedHeight ? 0 : 6;

      for (let expand = 0; expand <= maxExpand; expand++) {
        const placed = [];
        const positions = [];
        const cx = W / 2;
        const cy = H / 2;
        let failed = false;
        const gapScale = lockedHeight && expand === 0 ? 0.85 : 1;

        for (let idx = 0; idx < buttons.length; idx++) {
          let { w, h, bw, bh } = sizes[idx];
          if (lockedHeight) {
            w = Math.ceil(w * gapScale);
            h = Math.ceil(h * gapScale);
          }
          let found = null;
          let angle = idx * 0.55;
          let radius = idx === 0 ? 0 : 4;
          const maxTries = 2800;

          for (let tries = 0; tries < maxTries; tries++) {
            const cxBox = cx + Math.cos(angle) * radius;
            const cyBox = cy + Math.sin(angle) * radius * 0.85;
            const x = cxBox - w / 2;
            const y = cyBox - h / 2;
            const box = { x, y, w, h };
            const inBounds = x >= 0 && y >= 0 && x + w <= W && y + h <= H;
            if (inBounds && !placed.some((p) => overlaps(box, p))) {
              found = {
                left: x + (w - bw) / 2,
                top: y + (h - bh) / 2,
                box,
              };
              break;
            }
            angle += 0.26;
            radius += 0.32 + Math.min(w, h) * 0.002;
          }

          if (!found) {
            failed = true;
            break;
          }
          placed.push(found.box);
          positions.push(found);
        }

        if (!failed) {
          placedFinal = positions;
          break;
        }
        if (!lockedHeight) H += 70;
      }

      cloudEl.style.height = `${H}px`;
      cloudEl.style.minHeight = `${H}px`;
      containerEl.style.minHeight = `${H}px`;

      if (!placedFinal) {
        let x = GAP;
        let y = GAP;
        let rowH = 0;
        buttons.forEach((el, idx) => {
          const { bw, bh } = sizes[idx];
          if (x + bw + GAP > W && x > GAP) {
            x = GAP;
            y += rowH + GAP;
            rowH = 0;
          }
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.transform = 'none';
          x += bw + GAP;
          rowH = Math.max(rowH, bh);
        });
        if (!lockedHeight) {
          const flowH = y + rowH + GAP;
          cloudEl.style.height = `${flowH}px`;
          containerEl.style.minHeight = `${flowH}px`;
        }
        return;
      }

      buttons.forEach((el, idx) => {
        const p = placedFinal[idx];
        el.style.left = `${Math.round(p.left)}px`;
        el.style.top = `${Math.round(p.top)}px`;
        el.style.transform = 'none';
      });
    };

    const matchTableHeight = () => {
      if (!tableEl) {
        layout();
        return;
      }
      const h = Math.round(tableEl.getBoundingClientRect().height);
      if (h > 180) {
        lockedHeight = h;
        containerEl.style.height = `${h}px`;
        cloudEl.style.height = `${h}px`;
        cloudEl.style.minHeight = `${h}px`;
      }
      layout();
    };

    requestAnimationFrame(() => {
      matchTableHeight();
      requestAnimationFrame(matchTableHeight);
    });

    if (typeof ResizeObserver !== 'undefined') {
      let t = null;
      const ro = new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(matchTableHeight, 80);
      });
      ro.observe(containerEl);
      if (tableEl) ro.observe(tableEl);
      cloudEl._wcRo = ro;
    }

    containerEl.querySelectorAll('.wordcloud__term').forEach((el) => {
      const t = terms.find((x) => x.term === el.dataset.term);
      el.addEventListener('click', () => onSelect && onSelect(t));
      el.addEventListener('mousemove', (e) => {
        if (!showTip || !t) return;
        const extra =
          t.curious_share != null
            ? `<br>Curious-Anteil: ${Math.round(t.curious_share * 100)}%`
            : '';
        showTip(
          `<strong>${t.term}</strong><br>${t.count} Nennungen · ${t.per_1000}/1k Wörter · ${t.family}${extra}`,
          e.clientX,
          e.clientY,
        );
      });
      el.addEventListener('mouseleave', () => hideTip && hideTip());
    });

    if (tableEl) {
      const rows = data.overweight || [];
      if (!rows.length) {
        tableEl.innerHTML = '';
        return;
      }
      tableEl.innerHTML = `
        <h4 class="wc-table__title">${data.overweight_label || 'Übergewichtung'}</h4>
        <div class="wc-table-wrap">
          <table class="wc-table">
            <colgroup>
              <col class="wc-col-term" />
              <col class="wc-col-ratio" />
              <col class="wc-col-rate" />
              <col class="wc-col-n" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Begriff</th>
                <th scope="col" class="wc-num">× Ratio</th>
                <th scope="col" class="wc-num">/1k</th>
                <th scope="col" class="wc-num">n</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((r) => {
                  const ratio = Number(r.ratio).toLocaleString('de-DE', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  });
                  const rate = Number(r.per_1000).toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                  const n = Number(r.count).toLocaleString('de-DE');
                  return `<tr data-term="${r.term}">
                    <td class="wc-term" title="${r.term}">${r.term}</td>
                    <td class="wc-num">${ratio}</td>
                    <td class="wc-num">${rate}</td>
                    <td class="wc-num">${n}</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>`;

      tableEl.querySelectorAll('tr[data-term]').forEach((tr) => {
        tr.addEventListener('click', () => {
          const term = tr.getAttribute('data-term');
          const hit = terms.find((x) => x.term === term) || { term, count: 0, family: 'other' };
          onSelect && onSelect(hit);
        });
      });

      requestAnimationFrame(matchTableHeight);
    }
  },
};
