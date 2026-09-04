/**
 * Chart 6 — dual ranking (concerns / needs) + path drill-down.
 */
window.PulsarAgingPaths = {
  render(opts) {
    const { containerEl, hintEl, data, onSelect, onDrill, showTip, hideTip } = opts;
    if (!containerEl || !data) return;

    let view = 'overview'; // or 'drill'
    let active = null; // { kind, id, label }

    if (hintEl) {
      hintEl.textContent =
        `${data.note || ''} · klassifizierbar ${data.n_classified?.toLocaleString('de-DE') || 0}` +
        ` / ${data.n_total?.toLocaleString('de-DE') || 0} (${data.classified_share_pct || 0}%)`;
    }

    const esc = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    function pairGaps() {
      const concernRank = {};
      data.concerns.forEach((c, i) => {
        concernRank[c.id] = i;
      });
      const needRank = {};
      data.needs.forEach((n, i) => {
        needRank[n.id] = i;
      });
      const gaps = new Set();
      data.needs.forEach((n) => {
        if (!n.pair) return;
        const cr = concernRank[n.pair];
        const nr = needRank[n.id];
        if (cr == null || nr == null) return;
        if (Math.abs(cr - nr) >= 3) {
          gaps.add(n.id);
          gaps.add(n.pair);
        }
      });
      return gaps;
    }

    function renderOverview() {
      view = 'overview';
      active = null;
      const gaps = pairGaps();
      const maxC = Math.max(1, ...(data.concerns || []).map((x) => x.count));
      const maxN = Math.max(1, ...(data.needs || []).map((x) => x.count));

      const col = (items, max, tone) =>
        items
          .map((item) => {
            const w = Math.max(6, Math.round((item.count / max) * 100));
            const gap = gaps.has(item.id) ? ' paths-bar--gap' : '';
            const conc = item.concentrated ? ' paths-bar--concentrated' : '';
            return `<button type="button" class="paths-bar paths-bar--${tone}${gap}${conc}" data-kind="${item.kind}" data-id="${esc(item.id)}">
              <span class="paths-bar__label">${esc(item.label)}</span>
              <span class="paths-bar__track"><span class="paths-bar__fill" style="width:${w}%"></span></span>
              <span class="paths-bar__value">${item.count}</span>
            </button>`;
          })
          .join('');

      const concernById = Object.fromEntries((data.concerns || []).map((c) => [c.id, c]));
      const needById = Object.fromEntries((data.needs || []).map((n) => [n.id, n]));
      const gapParts = [];
      (data.needs || []).forEach((n) => {
        if (!n.pair || !gaps.has(n.id)) return;
        const c = concernById[n.pair];
        if (c) gapParts.push(`${esc(c.label)} ↔ ${esc(n.label)}`);
      });
      (data.concerns || []).forEach((c) => {
        if (!gaps.has(c.id) || !c.pair) return;
        const n = needById[c.pair];
        if (n && !gapParts.some((p) => p.includes(esc(n.label)))) {
          gapParts.push(`${esc(c.label)} ↔ ${esc(n.label)}`);
        }
      });
      const gapList = gapParts.slice(0, 4).join(' · ');

      containerEl.innerHTML = `
        <div class="paths-overview">
          <div class="paths-col">
            <h4 class="paths-col__title paths-col__title--concern">Top Aging Concerns</h4>
            <div class="paths-col__list">${col(data.concerns || [], maxC, 'concern')}</div>
          </div>
          <div class="paths-col">
            <h4 class="paths-col__title paths-col__title--need">Top Skin Needs</h4>
            <div class="paths-col__list">${col(data.needs || [], maxN, 'need')}</div>
          </div>
        </div>
        <p class="paths-footnote">Klick auf einen Balken → Lösungswege · gestrichelte Markierung = Rank-Gap ≥ 3 zwischen Concern↔Need · ★ = Kategorie von einem Begriff dominiert (&gt;60%)${
          gapList ? `<br><span class="paths-footnote__gaps">Gap-Paare: ${gapList}</span>` : ''
        }</p>`;

      containerEl.querySelectorAll('.paths-bar').forEach((el) => {
        const kind = el.dataset.kind;
        const id = el.dataset.id;
        const item = (kind === 'concern' ? data.concerns : data.needs).find((x) => x.id === id);
        el.addEventListener('click', () => {
          if (onSelect) onSelect({ type: kind, id, label: item?.label });
          renderDrill(kind, id, item?.label || id);
        });
        el.addEventListener('mousemove', (e) => {
          if (!showTip || !item) return;
          const pair = item.pair ? `<br>gekoppelt mit: ${item.pair}` : '';
          const conc = item.concentrated
            ? `<br>Konzentration: ${Math.round(item.concentration * 100)}% auf „${item.top_term}“`
            : '';
          showTip(
            `<strong>${esc(item.label)}</strong><br>${item.count} Nennungen${pair}${conc}`,
            e.clientX,
            e.clientY,
          );
        });
        el.addEventListener('mouseleave', () => hideTip && hideTip());
      });
    }

    function renderDrill(kind, id, label) {
      view = 'drill';
      active = { kind, id, label };
      const key = `${kind}:${id}`;
      const dd = (data.drilldowns && data.drilldowns[key]) || { basis: 0, paths: [], low_n: true };
      const paths = dd.paths || [];
      const max = Math.max(1, ...paths.map((p) => p.count));

      const bars = paths
        .map((p) => {
          const w = Math.max(6, Math.round((p.count / max) * 100));
          const tone = p.kind === 'ingredient' ? 'ingredient' : 'procedure';
          return `<button type="button" class="paths-bar paths-bar--${tone}" data-path="${esc(p.id)}" data-kind="${esc(p.kind)}">
            <span class="paths-bar__label">${esc(p.label)}</span>
            <span class="paths-bar__track"><span class="paths-bar__fill" style="width:${w}%"></span></span>
            <span class="paths-bar__value">${p.count}</span>
          </button>`;
        })
        .join('');

      const warn = dd.low_n
        ? `<p class="paths-warn">⚠ geringe Fallzahl (Basis n=${dd.basis})</p>`
        : '';

      containerEl.innerHTML = `
        <div class="paths-drill">
          <div class="paths-drill__head">
            <button type="button" class="paths-back" id="paths-back">← Zurück</button>
            <div>
              <h4 class="paths-drill__title">Lösungswege · ${esc(label)}</h4>
              <p class="paths-drill__sub">Basis: n=${dd.basis} Beiträge mit Concern/Need + Lösungsweg</p>
            </div>
          </div>
          ${warn}
          <div class="paths-drill__legend">
            <span class="paths-pill paths-pill--procedure">Procedures</span>
            <span class="paths-pill paths-pill--ingredient">Skincare Ingredients</span>
          </div>
          <div class="paths-col__list">${bars || '<p class="quote-empty">Keine Lösungswege oberhalb der Schwelle.</p>'}</div>
        </div>`;

      containerEl.querySelector('#paths-back')?.addEventListener('click', () => {
        renderOverview();
        if (onDrill) onDrill(null);
      });

      containerEl.querySelectorAll('.paths-bar[data-path]').forEach((el) => {
        const p = paths.find((x) => x.id === el.dataset.path);
        el.addEventListener('click', () => {
          if (onSelect) {
            onSelect({
              type: 'path',
              id: p.id,
              label: p.label,
              parentKind: kind,
              parentId: id,
              parentLabel: label,
            });
          }
        });
        el.addEventListener('mousemove', (e) => {
          if (!showTip || !p) return;
          showTip(
            `<strong>${esc(p.label)}</strong><br>${p.count} · stark ${p.strong || 0} / schwach ${p.weak || 0}`,
            e.clientX,
            e.clientY,
          );
        });
        el.addEventListener('mouseleave', () => hideTip && hideTip());
      });

      if (onDrill) onDrill(active);
    }

    renderOverview();
    return {
      showOverview: renderOverview,
      getView: () => view,
      getActive: () => active,
    };
  },
};
