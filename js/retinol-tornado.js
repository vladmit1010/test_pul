/**
 * Chart 7 — Retinol tornado (Fears ↔ Hopes), shared scale.
 */
window.PulsarRetinolTornado = {
  render(opts) {
    const { containerEl, hintEl, data, onSelect, showTip, hideTip } = opts;
    if (!containerEl || !data) return;

    const esc = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    if (hintEl) {
      hintEl.textContent =
        `${data.note || ''} · n=${(data.n_retinol || 0).toLocaleString('de-DE')} Retinol-Beiträge · ` +
        `Fears ${data.fear_share_pct}% / Hopes ${data.hope_share_pct}%`;
    }

    const fears = data.fears || [];
    const hopes = data.hopes || [];
    const max = Math.max(1, ...fears.map((x) => x.count), ...hopes.map((x) => x.count));

    const fearRows = fears
      .map((item) => {
        const pct = item.count ? Math.max(4, Math.round((item.count / max) * 100)) : 0;
        return `<button type="button" class="tornado-item tornado-item--fear" data-side="fear" data-id="${esc(item.id)}">
          <span class="tornado-item__label">${esc(item.label)}</span>
          <span class="tornado-item__value">${item.count}</span>
          <span class="tornado-item__track">
            <span class="tornado-item__fill" style="width:${pct}%"></span>
          </span>
        </button>`;
      })
      .join('');

    const hopeRows = hopes
      .map((item) => {
        const pct = item.count ? Math.max(4, Math.round((item.count / max) * 100)) : 0;
        return `<button type="button" class="tornado-item tornado-item--hope" data-side="hope" data-id="${esc(item.id)}">
          <span class="tornado-item__track">
            <span class="tornado-item__fill" style="width:${pct}%"></span>
          </span>
          <span class="tornado-item__value">${item.count}</span>
          <span class="tornado-item__label">${esc(item.label)}</span>
        </button>`;
      })
      .join('');

    const drop = (data.dropout_reasons || [])
      .map((r) => `${esc(r.reason)} (${r.count})`)
      .join(' · ');

    containerEl.innerHTML = `
      <div class="tornado-ratio">
        <span class="tornado-ratio__fear">Fears ${data.fear_share_pct}%</span>
        <span class="tornado-ratio__mid">${(data.fear_mentions || 0).toLocaleString('de-DE')} vs ${(data.hope_mentions || 0).toLocaleString('de-DE')}</span>
        <span class="tornado-ratio__hope">Hopes ${data.hope_share_pct}%</span>
      </div>
      <div class="tornado-grid">
        <div class="tornado-col">
          <h4 class="tornado-col__title tornado-col__title--fear">Fears</h4>
          ${fearRows}
        </div>
        <div class="tornado-axis" aria-hidden="true"></div>
        <div class="tornado-col">
          <h4 class="tornado-col__title tornado-col__title--hope">Hopes</h4>
          ${hopeRows}
        </div>
      </div>
      <p class="tornado-meta">
        nur Fears ${data.fear_only || 0} · nur Hopes ${data.hope_only || 0} · beides ${data.both || 0} ·
        Persistenz ${data.persistence_n || 0} · Abbruch ${data.dropout_n || 0}${drop ? ` (${drop})` : ''}
      </p>
      ${segmentBlock(data)}`;

    function segmentBlock(d) {
      const by = d.by_segment || {};
      const labels = {
        'skincare-first': 'Skincare-First',
        'procedure-curious': 'Curious',
        'procedure-open': 'Open',
      };
      const rows = Object.keys(labels)
        .map((sid) => {
          const v = by[sid];
          if (!v || !v.n) return '';
          const f = Object.values(v.fears || {}).reduce((s, n) => s + n, 0);
          const h = Object.values(v.hopes || {}).reduce((s, n) => s + n, 0);
          const tot = f + h || 1;
          return `<div class="tornado-seg__row">
            <span class="tornado-seg__label">${labels[sid]}</span>
            <span class="tornado-seg__n">n=${v.n}</span>
            <span class="tornado-seg__bar" title="Fears ${f} / Hopes ${h}">
              <span class="tornado-seg__fear" style="width:${Math.round((f / tot) * 100)}%"></span>
              <span class="tornado-seg__hope" style="width:${Math.round((h / tot) * 100)}%"></span>
            </span>
            <span class="tornado-seg__pct">${Math.round((f / tot) * 100)}% / ${Math.round((h / tot) * 100)}%</span>
          </div>`;
        })
        .join('');
      if (!rows) return '';
      return `<div class="tornado-seg">
        <h4 class="tornado-seg__title">Nach Segment (Fear / Hope Mentions)</h4>
        ${rows}
      </div>`;
    }

    containerEl.querySelectorAll('.tornado-item[data-id]').forEach((el) => {
      const side = el.dataset.side;
      const id = el.dataset.id;
      const item = (side === 'fear' ? fears : hopes).find((x) => x.id === id);
      el.addEventListener('click', () => {
        if (onSelect && item) onSelect({ side, id, label: item.label });
      });
      el.addEventListener('mousemove', (e) => {
        if (!showTip || !item) return;
        showTip(
          `<strong>${esc(item.label)}</strong><br>${item.count} Nennungen · ${side === 'fear' ? 'Fear' : 'Hope'}`,
          e.clientX,
          e.clientY,
        );
      });
      el.addEventListener('mouseleave', () => hideTip && hideTip());
    });
  },
};
