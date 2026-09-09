/**
 * Chart 7 — Retinol Deep-Dive: multiple views + reading guides on the same data.
 */
window.PulsarRetinolViews = {
  render(opts) {
    const { containerEl, hintEl, data, onSelect, showTip, hideTip } = opts;
    if (!containerEl || !data) return;

    const themes = [...(data.bubbles || [])].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const families = data.families || [];
    const storageKey = 'retinol-view-v2';
    const allowed = ['butterfly', 'balance', 'matrix', 'cards', 'gap', 'story'];
    let mode = localStorage.getItem(storageKey) || 'story';
    if (!allowed.includes(mode)) mode = 'story';

    const esc = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const fmt = (n) => Number(n || 0).toLocaleString('de-DE');
    const signed = (n) => `${n > 0 ? '+' : ''}${Number(n)}`;

    function verdict(t) {
      const v = Number(t.net_valence) || 0;
      if (v <= -40) return { id: 'fear', label: 'Sorge dominiert', hint: 'Barrier / Risiko' };
      if (v >= 40) return { id: 'hope', label: 'Hoffnung dominiert', hint: 'Beleg / Benefit' };
      return { id: 'mixed', label: 'Gemischt', hint: 'Aufklärung nötig' };
    }

    const views = [
      {
        id: 'story',
        label: '1 · Story',
        blurb: 'Was bedeutet das? — Kernaussagen zuerst',
        read: [
          'Oben: die 4 wichtigsten Takeaways aus den Zahlen.',
          'Dann Top-Sorgen und Top-Hoffnungen nach Volumen.',
          'Klick auf eine Karte öffnet passende Quotes rechts.',
        ],
      },
      {
        id: 'cards',
        label: '2 · Karten',
        blurb: 'Eine Karte = ein Thema — Zahl, Urteil, Angst/Hoffnung',
        read: [
          'Sortiert nach Volumen (wie oft das Thema vorkommt).',
          'Badge sagt: Sorge / Hoffnung / gemischt.',
          'Balken darunter = absolute Angst- vs. Hoffnungs-Nennungen.',
        ],
      },
      {
        id: 'butterfly',
        label: '3 · Butterfly',
        blurb: 'Angst links · Hoffnung rechts — direkter Vergleich',
        read: [
          'Gleiche Skala links und rechts → Längen vergleichbar.',
          'Langer Balken links = viel Sorge zu diesem Thema.',
          'Langer Balken rechts = viel Hoffnung / positives Framing.',
        ],
      },
      {
        id: 'gap',
        label: '4 · Gap',
        blurb: 'Zwei Punkte je Thema — wie weit Angst und Hoffnung auseinanderliegen',
        read: [
          'Linker Punkt = Angst-Nennungen, rechter = Hoffnung.',
          'Lange Linie = große Schieflage (eine Seite dominiert klar).',
          'Kurze Linie = kontrovers / ausgeglichen.',
        ],
      },
      {
        id: 'balance',
        label: '5 · Balance %',
        blurb: 'Prozent Angst vs Hoffnung — unabhängig vom Volumen',
        read: [
          'Volumen steht rechts als Zahl.',
          'Balken = Anteile (immer 100%), nicht absolute Größe.',
          'Gut, um Tipping Points zu sehen (z. B. 80% Angst).',
        ],
      },
      {
        id: 'matrix',
        label: '6 · Priority',
        blurb: 'X = Stimmung · Y = wie groß das Thema ist',
        read: [
          'Rechts oben = groß + hoffnungsvoll → als Beleg nutzen.',
          'Links oben = groß + sorgenvoll → prioritäre Barrier.',
          'Unten = Nischenthemen (weniger Volumen).',
        ],
      },
    ];

    function tipHtml(t, side) {
      const fearQ = (t.quotes_fear || []).slice(0, 1);
      const hopeQ = (t.quotes_hope || []).slice(0, 1);
      const quotes = [
        ...fearQ.map((q) => ({ ...q, side: 'Angst' })),
        ...hopeQ.map((q) => ({ ...q, side: 'Hoffnung' })),
      ];
      if (side === 'fear') quotes.reverse();
      const qBlock = quotes
        .slice(0, 2)
        .map(
          (q) =>
            `<div class="retinol-tip__q"><em>${esc(q.side)}</em> „${esc((q.text || '').slice(0, 140))}${(q.text || '').length > 140 ? '…' : ''}“</div>`,
        )
        .join('');
      const verd = verdict(t);
      return `<strong>${esc(t.label)}</strong> · ${esc(verd.label)}<br>
        ${fmt(t.volume)} · Angst ${fmt(t.fear)} / Hoffnung ${fmt(t.hope)} · Valenz ${signed(t.net_valence)} pp<br>
        erlebt ${t.experienced_pct}% · ${esc(t.family_label || '')}
        ${qBlock}`;
    }

    function emit(sel) {
      if (typeof onSelect === 'function') onSelect(sel);
    }

    function bindToggle(root) {
      let activeId = null;
      let activeSide = null;
      function clear() {
        root.querySelectorAll('.is-active, .is-dim').forEach((el) => {
          el.classList.remove('is-active', 'is-dim');
        });
        activeId = null;
        activeSide = null;
      }
      function activate(id, side) {
        if (activeId === id && activeSide === (side || null)) {
          clear();
          emit(null);
          return;
        }
        activeId = id;
        activeSide = side || null;
        root.querySelectorAll('[data-id]').forEach((el) => {
          const match = el.dataset.id === id && (!side || !el.dataset.side || el.dataset.side === side);
          const sameTheme = el.dataset.id === id;
          el.classList.toggle('is-active', match || (sameTheme && !el.dataset.side));
          el.classList.toggle('is-dim', !sameTheme);
        });
        const t = themes.find((x) => x.id === id);
        if (!t) return;
        const pick = side || (t.hope >= t.fear ? 'hope' : 'fear');
        emit({ id: t.id, label: t.label, side: pick, volume: t.volume });
      }
      return { clear, activate };
    }

    function buildInsights() {
      if (!themes.length) return [];
      const top = themes[0];
      const topFear = [...themes].sort((a, b) => b.fear - a.fear)[0];
      const topHope = [...themes].sort((a, b) => b.hope - a.hope)[0];
      const mostSkewFear = [...themes].filter((t) => t.volume >= 30).sort((a, b) => a.net_valence - b.net_valence)[0];
      const mostSkewHope = [...themes].filter((t) => t.volume >= 30).sort((a, b) => b.net_valence - a.net_valence)[0];
      const out = [];
      out.push({
        kind: 'volume',
        title: 'Meistbesprochen',
        text: `„${top.label}“ mit ${fmt(top.volume)} Nennungen — ${verdict(top).label.toLowerCase()} (Valenz ${signed(top.net_valence)}).`,
        id: top.id,
        side: top.fear >= top.hope ? 'fear' : 'hope',
      });
      if (topFear) {
        out.push({
          kind: 'fear',
          title: 'Stärkste Sorge',
          text: `Meiste Angst-Signale: „${topFear.label}“ (${fmt(topFear.fear)} Angst vs ${fmt(topFear.hope)} Hoffnung).`,
          id: topFear.id,
          side: 'fear',
        });
      }
      if (topHope) {
        out.push({
          kind: 'hope',
          title: 'Stärkste Hoffnung',
          text: `Meiste Hoffnungs-Signale: „${topHope.label}“ (${fmt(topHope.hope)} Hoffnung vs ${fmt(topHope.fear)} Angst).`,
          id: topHope.id,
          side: 'hope',
        });
      }
      if (mostSkewFear && mostSkewFear.id !== topFear?.id) {
        out.push({
          kind: 'skew',
          title: 'Klarste Barrier',
          text: `Unter den größeren Themen kippt „${mostSkewFear.label}“ am stärksten in Sorge (${signed(mostSkewFear.net_valence)} pp).`,
          id: mostSkewFear.id,
          side: 'fear',
        });
      } else if (mostSkewHope) {
        out.push({
          kind: 'skew',
          title: 'Klarster Beleg',
          text: `„${mostSkewHope.label}“ ist unter den größeren Themen am hoffnungsvollsten (${signed(mostSkewHope.net_valence)} pp).`,
          id: mostSkewHope.id,
          side: 'hope',
        });
      }
      out.push({
        kind: 'meta',
        title: 'Gesamtbild',
        text: `Über alle Themen: ${data.fear_share_pct}% Angst- vs ${data.hope_share_pct}% Hoffnungs-Nennungen (n=${fmt(data.n_retinol)} Retinol-Beiträge).`,
        id: null,
      });
      return out.slice(0, 5);
    }

    function shell(inner) {
      const fam = families
        .map((f) => `<span class="retinol-fam" style="--c:${esc(f.color)}"><i></i>${esc(f.label)}</span>`)
        .join('');
      const tabs = views
        .map(
          (v) =>
            `<button type="button" class="retinol-tab${v.id === mode ? ' is-on' : ''}" data-mode="${v.id}">${esc(v.label)}</button>`,
        )
        .join('');
      const current = views.find((v) => v.id === mode);
      const read = `<details class="retinol-howto" open>
        <summary>Wie lese ich diese Ansicht?</summary>
        <ul>${(current?.read || []).map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
        <p class="retinol-howto__base"><strong>Grundlogik:</strong> Jedes Retinol-Thema hat eine Angst- und eine Hoffnungsseite.
        <em>Volumen</em> = wie oft das Thema vorkommt.
        <em>Valenz</em> = Hoffnung minus Sorge (−100 bis +100).
        Farbe = Anwendungs-/Verträglichkeits-Themen vs. Wirkungs-Themen.</p>
      </details>`;

      const journey =
        data.persistence_n || data.dropout_n
          ? `<div class="retinol-journey">
              <span>Verlauf überwunden: <strong>${fmt(data.persistence_n)}</strong> (${data.persistence_share_pct || 0}%)</span>
              <span>Abbruch: <strong>${fmt(data.dropout_n)}</strong> (${data.dropout_share_pct || 0}%)</span>
              ${(data.dropout_reasons || [])
                .map((d) => `<span class="retinol-journey__reason">${esc(d.reason)} (${fmt(d.count)})</span>`)
                .join('')}
            </div>`
          : '';

      const seg = data.by_segment || {};
      const segLabels = {
        'skincare-first': 'Skincare-First',
        'procedure-curious': 'Procedure-Curious',
        'procedure-open': 'Procedure-Open',
      };
      const segHtml = Object.keys(segLabels)
        .filter((id) => seg[id])
        .map((id) => {
          const v = seg[id];
          const f = Object.values(v.fear || {}).reduce((s, n) => s + n, 0);
          const h = Object.values(v.hope || {}).reduce((s, n) => s + n, 0);
          const tot = f + h || 1;
          return `<div class="retinol-seg__row">
            <span class="retinol-seg__label">${segLabels[id]}</span>
            <span class="retinol-seg__n">n=${fmt(v.n)}</span>
            <span class="retinol-seg__bar">
              <span class="retinol-seg__fear" style="width:${Math.round((f / tot) * 100)}%"></span>
              <span class="retinol-seg__hope" style="width:${Math.round((h / tot) * 100)}%"></span>
            </span>
            <span class="retinol-seg__pct">${Math.round((f / tot) * 100)}% / ${Math.round((h / tot) * 100)}%</span>
          </div>`;
        })
        .join('');

      return `
        <div class="retinol-ratio">
          <span class="retinol-ratio__fear">Fears ${data.fear_share_pct}%</span>
          <span class="retinol-ratio__mid">${fmt(data.fear_mentions)} vs ${fmt(data.hope_mentions)}</span>
          <span class="retinol-ratio__hope">Hopes ${data.hope_share_pct}%</span>
        </div>
        <div class="retinol-tabs" role="tablist">${tabs}</div>
        <p class="retinol-view-blurb">${esc(current?.blurb || '')}</p>
        ${read}
        <div class="retinol-legend">${fam}</div>
        <div class="retinol-view" data-mode="${mode}">${inner}</div>
        ${journey}
        ${segHtml ? `<div class="retinol-seg"><h4 class="retinol-seg__title">Nach Segment (Fear / Hope)</h4>${segHtml}</div>` : ''}
      `;
    }

    function renderStory() {
      const insights = buildInsights();
      const fearTop = [...themes].sort((a, b) => b.fear - a.fear).slice(0, 4);
      const hopeTop = [...themes].sort((a, b) => b.hope - a.hope).slice(0, 4);
      return `<div class="rb-story">
        <div class="rb-story__insights">
          ${insights
            .map(
              (ins) => `<button type="button" class="rb-insight rb-insight--${esc(ins.kind)}" ${
                ins.id ? `data-id="${esc(ins.id)}" data-side="${esc(ins.side || '')}"` : 'disabled'
              }>
                <span class="rb-insight__kicker">${esc(ins.title)}</span>
                <span class="rb-insight__text">${esc(ins.text)}</span>
              </button>`,
            )
            .join('')}
        </div>
        <div class="rb-story__cols">
          <div>
            <h4 class="rb-story__h">Top Sorgen (Angst-Nennungen)</h4>
            ${fearTop
              .map(
                (t) => `<button type="button" class="rb-mini" data-id="${esc(t.id)}" data-side="fear" style="--c:${esc(t.color)}">
                  <span>${esc(t.label)}</span><strong>${fmt(t.fear)}</strong>
                </button>`,
              )
              .join('')}
          </div>
          <div>
            <h4 class="rb-story__h">Top Hoffnungen</h4>
            ${hopeTop
              .map(
                (t) => `<button type="button" class="rb-mini" data-id="${esc(t.id)}" data-side="hope" style="--c:${esc(t.color)}">
                  <span>${esc(t.label)}</span><strong>${fmt(t.hope)}</strong>
                </button>`,
              )
              .join('')}
          </div>
        </div>
      </div>`;
    }

    function renderCards() {
      return `<div class="rb-cards">
        ${themes
          .map((t, i) => {
            const verd = verdict(t);
            const maxSide = Math.max(t.fear, t.hope, 1);
            return `<button type="button" class="rb-card" data-id="${esc(t.id)}" style="--c:${esc(t.color)}">
              <span class="rb-card__rank">#${i + 1}</span>
              <span class="rb-card__name">${esc(t.label)}</span>
              <span class="rb-card__badge rb-card__badge--${verd.id}">${esc(verd.label)}</span>
              <span class="rb-card__vol"><strong>${fmt(t.volume)}</strong> Nennungen · Valenz ${signed(t.net_valence)}</span>
              <span class="rb-card__bars">
                <span class="rb-card__fear" style="width:${((t.fear / maxSide) * 100).toFixed(0)}%"></span>
                <span class="rb-card__hope" style="width:${((t.hope / maxSide) * 100).toFixed(0)}%"></span>
              </span>
              <span class="rb-card__foot"><span>Angst ${fmt(t.fear)}</span><span>Hoffnung ${fmt(t.hope)}</span></span>
              <span class="rb-card__hint">${esc(verd.hint)} · ${esc(t.family_label || '')}</span>
            </button>`;
          })
          .join('')}
      </div>`;
    }

    function renderButterfly() {
      const maxSide = Math.max(...themes.map((t) => Math.max(t.fear || 0, t.hope || 0)), 1);
      const rows = themes
        .map((t) => {
          const fPct = Math.max(2, ((t.fear || 0) / maxSide) * 100);
          const hPct = Math.max(2, ((t.hope || 0) / maxSide) * 100);
          return `<div class="rb-row" data-id="${esc(t.id)}">
            <button type="button" class="rb-bar rb-bar--fear" data-id="${esc(t.id)}" data-side="fear" style="--w:${fPct.toFixed(1)}%">
              <span class="rb-bar__val">${fmt(t.fear)}</span>
            </button>
            <div class="rb-mid">
              <span class="rb-mid__name">${esc(t.label)}</span>
              <span class="rb-mid__meta">${fmt(t.volume)} · ${signed(t.net_valence)} pp · ${esc(verdict(t).label)}</span>
            </div>
            <button type="button" class="rb-bar rb-bar--hope" data-id="${esc(t.id)}" data-side="hope" style="--w:${hPct.toFixed(1)}%">
              <span class="rb-bar__val">${fmt(t.hope)}</span>
            </button>
          </div>`;
        })
        .join('');
      return `<div class="rb-butterfly">
        <div class="rb-butterfly__head"><span>Angst / Sorge</span><span></span><span>Hoffnung</span></div>
        ${rows}
      </div>`;
    }

    function renderGap() {
      const maxSide = Math.max(...themes.map((t) => Math.max(t.fear || 0, t.hope || 0)), 1);
      return `<div class="rb-gap">
        ${themes
          .map((t) => {
            const fPos = ((t.fear || 0) / maxSide) * 100;
            const hPos = ((t.hope || 0) / maxSide) * 100;
            const left = Math.min(fPos, hPos);
            const width = Math.abs(hPos - fPos);
            return `<button type="button" class="rb-gap__row" data-id="${esc(t.id)}">
              <span class="rb-gap__name">${esc(t.label)}</span>
              <span class="rb-gap__track">
                <span class="rb-gap__line" style="left:${left}%;width:${Math.max(width, 0.8)}%"></span>
                <span class="rb-gap__dot rb-gap__dot--fear" style="left:${fPos}%" title="Angst ${fmt(t.fear)}"></span>
                <span class="rb-gap__dot rb-gap__dot--hope" style="left:${hPos}%" title="Hoffnung ${fmt(t.hope)}"></span>
              </span>
              <span class="rb-gap__vals"><em>${fmt(t.fear)}</em> → <em>${fmt(t.hope)}</em></span>
            </button>`;
          })
          .join('')}
        <p class="rb-gap__legend"><span class="rb-gap__dot rb-gap__dot--fear"></span> Angst &nbsp;&nbsp; <span class="rb-gap__dot rb-gap__dot--hope"></span> Hoffnung &nbsp;&nbsp; Position = absolute Nennungen (gemeinsame Skala)</p>
      </div>`;
    }

    function renderBalance() {
      return `<div class="rb-balance">
        ${themes
          .map((t) => {
            const vol = t.volume || 1;
            const fPct = Math.round(((t.fear || 0) / vol) * 100);
            const hPct = 100 - fPct;
            return `<button type="button" class="rb-bal" data-id="${esc(t.id)}" style="--c:${esc(t.color)}">
              <span class="rb-bal__top">
                <span class="rb-bal__name">${esc(t.label)}</span>
                <span class="rb-bal__n">${fmt(t.volume)}</span>
              </span>
              <span class="rb-bal__track">
                <span class="rb-bal__fear" style="width:${fPct}%" data-side="fear"></span>
                <span class="rb-bal__hope" style="width:${hPct}%" data-side="hope"></span>
              </span>
              <span class="rb-bal__foot">
                <span>Angst ${fPct}% (${fmt(t.fear)})</span>
                <span>${esc(verdict(t).label)} · ${signed(t.net_valence)}</span>
                <span>Hoffnung ${hPct}% (${fmt(t.hope)})</span>
              </span>
            </button>`;
          })
          .join('')}
      </div>`;
    }

    function renderMatrix() {
      const W = 760;
      const H = 480;
      const pad = { t: 28, r: 28, b: 52, l: 64 };
      const plotW = W - pad.l - pad.r;
      const plotH = H - pad.t - pad.b;
      const maxVol = Math.max(...themes.map((t) => t.volume), 1);
      const xOf = (v) => pad.l + ((Number(v) + 100) / 200) * plotW;
      const yOf = (vol) => {
        const t = Math.log10(vol + 1) / Math.log10(maxVol + 1);
        return pad.t + (1 - t) * plotH;
      };
      const rOf = (vol) => 10 + 16 * Math.sqrt(vol / maxVol);

      const placed = themes.map((t, i) => ({
        ...t,
        idx: i + 1,
        x: xOf(t.net_valence),
        y: yOf(t.volume),
        r: rOf(t.volume),
        short: t.label.length > 20 ? `${t.label.slice(0, 18)}…` : t.label,
      }));

      for (let iter = 0; iter < 50; iter += 1) {
        for (let i = 0; i < placed.length; i += 1) {
          for (let j = i + 1; j < placed.length; j += 1) {
            const a = placed[i];
            const b = placed[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy) || 0.01;
            const minD = a.r + b.r + 6;
            if (dist < minD) {
              const f = ((minD - dist) / dist) * 0.5;
              a.x -= dx * f;
              a.y -= dy * f;
              b.x += dx * f;
              b.y += dy * f;
            }
          }
        }
        placed.forEach((p) => {
          p.x = Math.min(pad.l + plotW - p.r, Math.max(pad.l + p.r, p.x));
          p.y = Math.min(pad.t + plotH - p.r, Math.max(pad.t + p.r, p.y));
        });
      }

      placed.forEach((p) => {
        p.labelX = p.net_valence >= 0 ? p.x + p.r + 8 : p.x - p.r - 8;
        p.labelY = p.y;
        p.anchor = p.net_valence >= 0 ? 'start' : 'end';
      });

      const zeroX = xOf(0);
      const yTicks = [maxVol, Math.round(maxVol / 4), Math.max(15, Math.round(maxVol / 16))];
      const yTickSvg = yTicks
        .map((v) => {
          const y = yOf(v);
          return `<line class="retinol-grid" x1="${pad.l}" y1="${y}" x2="${pad.l + plotW}" y2="${y}" />
            <text class="retinol-tick" x="${pad.l - 8}" y="${y + 3}" text-anchor="end">${fmt(v)}</text>`;
        })
        .join('');

      const nodes = [...placed]
        .sort((a, b) => b.r - a.r)
        .map(
          (p) => `<g class="retinol-bubble" data-id="${esc(p.id)}" role="button">
            <circle class="retinol-bubble__dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(1)}" fill="${esc(p.color)}" fill-opacity="0.8" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
            <text class="retinol-bubble__n" x="${p.x.toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" text-anchor="middle">${p.idx}</text>
            <text class="retinol-callout" x="${p.labelX.toFixed(1)}" y="${(p.labelY + 3).toFixed(1)}" text-anchor="${p.anchor}">${p.idx}. ${esc(p.short)}</text>
          </g>`,
        )
        .join('');

      return `<div class="rb-matrix">
        <svg class="retinol-svg" viewBox="0 0 ${W} ${H}" role="img">
          ${yTickSvg}
          <line class="retinol-zero" x1="${zeroX}" y1="${pad.t}" x2="${zeroX}" y2="${pad.t + plotH}" />
          <rect class="retinol-frame" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="none" />
          <text class="retinol-axis-label" x="${pad.l + plotW / 2}" y="${H - 12}" text-anchor="middle">Netto-Valenz (Hoffnung − Sorge)</text>
          <text class="retinol-axis-label" x="16" y="${pad.t + plotH / 2}" text-anchor="middle" transform="rotate(-90 16 ${pad.t + plotH / 2})">Volumen (Nennungen)</text>
          <text class="retinol-tick" x="${pad.l}" y="${H - 30}" text-anchor="start">−100 Sorge</text>
          <text class="retinol-tick" x="${pad.l + plotW}" y="${H - 30}" text-anchor="end">+100 Hoffnung</text>
          ${nodes}
        </svg>
        <p class="rb-matrix__note">Oben = viel diskutiert · rechts = Hoffnung · links = Sorge</p>
      </div>`;
    }

    function paint() {
      if (hintEl) {
        hintEl.textContent =
          `${data.note || ''} · n=${fmt(data.n_retinol)} Retinol-Beiträge · ` +
          `Fears ${data.fear_share_pct}% / Hopes ${data.hope_share_pct}% · ` +
          `6 Ansichten · Klick = Quotes`;
      }

      const inner =
        mode === 'story'
          ? renderStory()
          : mode === 'cards'
            ? renderCards()
            : mode === 'balance'
              ? renderBalance()
              : mode === 'gap'
                ? renderGap()
                : mode === 'matrix'
                  ? renderMatrix()
                  : renderButterfly();

      containerEl.innerHTML = shell(inner);

      containerEl.querySelectorAll('.retinol-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          mode = btn.dataset.mode;
          localStorage.setItem(storageKey, mode);
          emit(null);
          paint();
        });
      });

      const ctl = bindToggle(containerEl.querySelector('.retinol-view'));
      const wire = (sel, sideFromEl) => {
        containerEl.querySelectorAll(sel).forEach((el) => {
          if (el.disabled) return;
          const t = themes.find((x) => x.id === el.dataset.id);
          el.addEventListener('mouseenter', (e) => {
            if (t && showTip) showTip(tipHtml(t, el.dataset.side), e.clientX, e.clientY);
          });
          el.addEventListener('mouseleave', () => hideTip && hideTip());
          el.addEventListener('click', (e) => {
            hideTip && hideTip();
            if (!el.dataset.id) return;
            let side = el.dataset.side || null;
            if (sideFromEl) {
              const hit = e.target.closest('[data-side]');
              if (hit) side = hit.dataset.side;
            }
            ctl.activate(el.dataset.id, side || undefined);
          });
        });
      };

      if (mode === 'butterfly') wire('.rb-bar');
      else if (mode === 'balance') wire('.rb-bal', true);
      else if (mode === 'cards') wire('.rb-card');
      else if (mode === 'gap') wire('.rb-gap__row');
      else if (mode === 'story') {
        wire('.rb-insight[data-id]');
        wire('.rb-mini');
      } else wire('.retinol-bubble');
    }

    if (!themes.length) {
      containerEl.innerHTML = '<p class="retinol-empty">Keine Retinol-Themen.</p>';
      return;
    }
    paint();
  },
};

window.PulsarRetinolBubbles = window.PulsarRetinolViews;
