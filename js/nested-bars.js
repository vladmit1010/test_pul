/**
 * Charts 4 & 5 — readable drill-down bars (ingredient/procedure → tones).
 * Overview: horizontal bars. Detail: grouped tone breakdown on click.
 */
(function (global) {
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shortLabel(label, max = 34) {
    const primary = String(label || '')
      .split('/')[0]
      .trim();
    if (primary.length <= max) return primary;
    return `${primary.slice(0, max - 1)}…`;
  }

  function totalValue(proc) {
    return (proc.tones || []).reduce((s, t) => s + (t.count || 0), 0);
  }

  function renderNestedBars(opts) {
    const {
      containerEl,
      legendEl,
      hintEl,
      data,
      onSelectOuter,
      onSelectTone,
      onZoomOut,
      showTip,
      hideTip,
    } = opts;

    if (!containerEl || !data) return;

    const procedures = data.procedures || [];
    const sentimentMap = Object.fromEntries((data.sentiments || []).map((s) => [s.id, s]));
    const tax = data.taxonomy || {};
    const sectionMeta = {
      a: {
        label: tax.level2a?.label || 'Group A',
        color: tax.level2a?.color || '#8ecae6',
      },
      b: {
        label: tax.level2b?.label || 'Group B',
        color: tax.level2b?.color || '#7ecdb8',
      },
    };
    const sectionOrder = ['a', 'b'];

    function sectionKey(meta) {
      if (meta.groupId === 'level2a') return 'a';
      if (meta.groupId === 'level2b') return 'b';
      if (meta.polarity === 'concern' || meta.polarity === 'positive') return 'a';
      if (meta.polarity === 'result' || meta.polarity === 'negative') return 'b';
      return 'a';
    }

    let selectedId = null;

    function setHint() {
      if (!hintEl) return;
      if (selectedId) {
        const p = procedures.find((x) => x.id === selectedId);
        hintEl.textContent = `${p?.label || ''} — Klick auf Zeile für Zitate · Zurück für Übersicht`;
      } else {
        hintEl.textContent =
          data.hint ||
          'Wirkstoff wählen für Details · Balken = Erwähnungen · Klick filtert Zitate';
      }
    }

    function renderLegend() {
      if (!legendEl) return;
      const items = sectionOrder
        .filter((key) => sectionMeta[key])
        .map(
          (key) => `<span class="bubble-legend__item">
          <span class="bubble-legend__swatch" style="background:${sectionMeta[key].color}"></span>
          ${esc(shortLabel(sectionMeta[key].label, 48))}
        </span>`,
        );
      legendEl.innerHTML = items.join('');
    }

    function bindBar(el, onClick, tipHtml) {
      el.addEventListener('click', onClick);
      if (showTip && tipHtml) {
        el.addEventListener('mousemove', (e) => showTip(tipHtml(e), e.clientX, e.clientY));
        el.addEventListener('mouseleave', () => hideTip && hideTip());
      }
    }

    function renderOverview() {
      const max = Math.max(...procedures.map(totalValue), 1);
      const rows = procedures
        .map((p) => {
          const v = totalValue(p);
          const w = Math.max(4, Math.round((v / max) * 100));
          const active = selectedId === p.id;
          return `<button type="button" class="nested-bar nested-bar--l1${active ? ' nested-bar--active' : ''}"
            data-id="${esc(p.id)}">
            <span class="nested-bar__label" title="${esc(p.label)}">${esc(shortLabel(p.label))}</span>
            <span class="nested-bar__track">
              <span class="nested-bar__fill" style="width:${w}%"></span>
            </span>
            <span class="nested-bar__value">${v}</span>
          </button>`;
        })
        .join('');

      containerEl.innerHTML = `<div class="nested-bars__overview">${rows}</div>`;
      setHint();

      containerEl.querySelectorAll('.nested-bar--l1').forEach((el) => {
        const p = procedures.find((x) => x.id === el.dataset.id);
        bindBar(
          el,
          () => {
            selectedId = p.id;
            renderDetail();
            if (onSelectOuter) onSelectOuter(p.id);
          },
          () =>
            `<strong>${esc(p.label)}</strong><br>${totalValue(p)} Erwähnungen · Klick für Aufschlüsselung`,
        );
      });
    }

    function renderDetail() {
      const proc = procedures.find((x) => x.id === selectedId);
      if (!proc) {
        selectedId = null;
        renderOverview();
        return;
      }

      const tones = (proc.tones || [])
        .map((t) => ({
          ...t,
          meta: sentimentMap[t.tone] || {},
        }))
        .sort((a, b) => b.count - a.count);

      const grouped = { a: [], b: [] };
      tones.forEach((t) => {
        grouped[sectionKey(t.meta)].push(t);
      });

      const maxInDetail = Math.max(...tones.map((t) => t.count), 1);
      let sections = '';

      sectionOrder.forEach((key) => {
        const items = grouped[key];
        if (!items.length) return;
        const color = sectionMeta[key].color;
        const rows = items
          .map((t) => {
            const w = Math.max(4, Math.round((t.count / maxInDetail) * 100));
            const label = t.meta.label || t.tone;
            const fillColor = t.meta.color || color;
            return `<button type="button" class="nested-bar nested-bar--l2" data-tone="${esc(t.tone)}">
              <span class="nested-bar__label" title="${esc(label)}">${esc(shortLabel(label, 42))}</span>
              <span class="nested-bar__track">
                <span class="nested-bar__fill" style="width:${w}%;background:${fillColor}"></span>
              </span>
              <span class="nested-bar__value">${t.count}</span>
            </button>`;
          })
          .join('');
        sections += `<div class="nested-bars__group">
          <p class="nested-bars__group-title">${esc(shortLabel(sectionMeta[key].label, 56))}</p>
          ${rows}
        </div>`;
      });

      containerEl.innerHTML = `<div class="nested-bars__detail">
        <button type="button" class="nested-bars__back pulsar-btn">← Zurück zur Übersicht</button>
        <h4 class="nested-bars__title">${esc(proc.label)}</h4>
        <p class="nested-bars__subtitle">${totalValue(proc)} Erwähnungen gesamt</p>
        ${sections}
      </div>`;
      setHint();

      containerEl.querySelector('.nested-bars__back')?.addEventListener('click', () => {
        selectedId = null;
        renderOverview();
        if (onZoomOut) onZoomOut();
      });

      containerEl.querySelectorAll('.nested-bar--l2').forEach((el) => {
        const toneId = el.dataset.tone;
        const t = tones.find((x) => x.tone === toneId);
        bindBar(
          el,
          () => {
            if (onSelectTone) onSelectTone(proc.id, toneId);
          },
          () =>
            `<strong>${esc(proc.label)}</strong><br>${esc(t?.meta?.label || toneId)} · ${t?.count || 0} Kommentare`,
        );
      });
    }

    renderLegend();
    if (selectedId) renderDetail();
    else renderOverview();

    return {
      select(id) {
        selectedId = id;
        renderDetail();
      },
      clear() {
        selectedId = null;
        renderOverview();
      },
    };
  }

  global.PulsarNestedBars = { renderNestedBars };
})(window);
