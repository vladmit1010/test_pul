/**
 * Chart 6 — ranked Aging Concerns + path drill-down (client brief 2026-09).
 */
window.PulsarAgingPaths = {
  render(opts) {
    const { containerEl, hintEl, data, onSelect, onDrill, showTip, hideTip } = opts;
    if (!containerEl || !data) return;

    let view = 'overview';
    let active = null;

    if (hintEl) {
      hintEl.textContent =
        `${data.note || 'Mehrfachnennungen möglich'} · klassifizierbar ${data.n_classified?.toLocaleString('de-DE') || 0}` +
        ` / ${data.n_total?.toLocaleString('de-DE') || 0} (${data.classified_share_pct || 0}%)`;
    }

    const esc = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    function renderOverview() {
      view = 'overview';
      active = null;
      const concerns = data.concerns || [];

      const rows = concerns
        .map((item, i) => {
          const conc = item.concentrated ? ' paths-rank__row--concentrated' : '';
          const star = item.concentrated ? ' <span class="paths-rank__star" title=">60% Volumen von einem Suchbegriff">★</span>' : '';
          const blurb = item.blurb || item.description || '';
          return `<button type="button" class="paths-rank__row${conc}" data-kind="concern" data-id="${esc(item.id)}">
            <span class="paths-rank__num">${i + 1}</span>
            <span class="paths-rank__body">
              <span class="paths-rank__name">${esc(item.label)}${star}</span>
              ${blurb ? `<span class="paths-rank__blurb">${esc(blurb)}</span>` : ''}
            </span>
            <span class="paths-rank__n">${(item.count || 0).toLocaleString('de-DE')}</span>
          </button>`;
        })
        .join('');

      containerEl.innerHTML = `
        <div class="paths-rank">
          <h4 class="paths-rank__title">Aging Concerns</h4>
          <div class="paths-rank__list">${rows}</div>
        </div>
        <p class="paths-footnote">Klick auf eine Zeile → Lösungswege (Procedures / Ingredients) · absolute n, keine %-Werte · ★ = Kategorie von einem Begriff dominiert (&gt;60%)</p>`;

      containerEl.querySelectorAll('.paths-rank__row').forEach((el) => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          const item = concerns.find((c) => c.id === id);
          if (!item) return;
          active = { kind: 'concern', id, label: item.label };
          if (typeof onSelect === 'function') onSelect(active);
          renderDrill(item);
        });
        el.addEventListener('mouseenter', () => {
          if (typeof showTip === 'function') showTip(el, el.querySelector('.paths-rank__name')?.textContent || '');
        });
        el.addEventListener('mouseleave', () => {
          if (typeof hideTip === 'function') hideTip();
        });
      });
    }

    function renderDrill(concern) {
      view = 'drill';
      const dd =
        (data.drilldowns && data.drilldowns[`concern:${concern.id}`]) ||
        (data.drilldowns && data.drilldowns[concern.id]) ||
        null;
      const list = (dd && dd.paths) || (data.paths && data.paths[concern.id]) || concern.paths || [];
      const paths = Array.isArray(list) ? list : [];
      const basis = (dd && dd.basis) || paths.reduce((s, p) => s + (p.count || 0), 0) || concern.count || 0;
      const max = Math.max(1, ...paths.map((p) => p.count || 0), 1);
      const low = basis < 30 ? '<p class="paths-drill__warn">⚠️ geringe Fallzahl (Basis &lt; 30)</p>' : '';

      const bars = paths
        .map((p) => {
          const w = Math.max(6, Math.round(((p.count || 0) / max) * 100));
          const tone = p.kind === 'ingredient' || p.type === 'ingredient' ? 'ing' : 'proc';
          return `<button type="button" class="paths-bar paths-bar--${tone}" data-path="${esc(p.id)}">
            <span class="paths-bar__label">${esc(p.label)}</span>
            <span class="paths-bar__track"><span class="paths-bar__fill" style="width:${w}%"></span></span>
            <span class="paths-bar__value">${p.count}</span>
          </button>`;
        })
        .join('');

      containerEl.innerHTML = `
        <div class="paths-drill">
          <button type="button" class="paths-drill__back" id="paths-back">← Zurück zur Rangliste</button>
          <h4 class="paths-drill__title">${esc(concern.label)}</h4>
          <p class="paths-drill__basis">Basis: ${basis.toLocaleString('de-DE')} Beiträge mit Concern + Lösungsweg</p>
          ${low}
          <div class="paths-drill__list">${bars || '<p class="paths-empty">Keine Lösungswege über dem Schwellenwert.</p>'}</div>
        </div>`;

      document.getElementById('paths-back')?.addEventListener('click', renderOverview);
      containerEl.querySelectorAll('.paths-bar').forEach((el) => {
        el.addEventListener('click', () => {
          if (typeof onDrill === 'function') {
            onDrill({ concernId: concern.id, pathId: el.dataset.path });
          }
          if (typeof onSelect === 'function') {
            onSelect({
              type: 'aging-path',
              id: el.dataset.path,
              label: el.querySelector('.paths-bar__label')?.textContent || el.dataset.path,
              parentKind: 'concern',
              parentId: concern.id,
              parentLabel: concern.label,
            });
          }
        });
      });
    }

    renderOverview();
  },
};
