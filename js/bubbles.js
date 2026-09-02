/**
 * Zoomable bubble chart — 5 separate transparent procedure rings,
 * size ∝ comment count, soft float + hover bob. file:// safe.
 */
(function (global) {
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Tone bubbles sized by count (area ∝ count), packed inside parent. */
  function layoutTonesInside(tones, parentR, sentimentMap) {
    const list = (tones || []).map((t) => ({
      tone: t.tone,
      count: t.count || 0,
      color: sentimentMap[t.tone]?.color || '#8b95a8',
      label: sentimentMap[t.tone]?.label || t.tone,
    }));
    const n = list.length;
    if (!n) return [];

    const maxCount = Math.max(...list.map((t) => t.count), 1);
    const pad = 8;

    // Area proportional to count — visible size differences
    list.forEach((t) => {
      const share = Math.sqrt(t.count / maxCount);
      t.r = Math.max(11, share * parentR * 0.4);
    });

    if (n === 1) {
      list[0].x = 0;
      list[0].y = 0;
      list[0].r = Math.min(list[0].r, parentR * 0.48);
      return list;
    }

    // Ring radius: keep largest bubble inside the shell
    const maxChildR = Math.max(...list.map((t) => t.r));
    let ring = parentR - maxChildR - pad;
    ring = Math.max(ring, parentR * 0.28);

    // Scale down if neighbors would collide on the ring
    const chord = 2 * ring * Math.sin(Math.PI / n);
    const maxPairR = Math.max(
      ...list.map((t, i) => t.r + list[(i + 1) % n].r),
    );
    if (maxPairR + 4 > chord) {
      const s = (chord - 4) / maxPairR;
      list.forEach((t) => {
        t.r *= Math.max(0.55, s);
      });
      const newMax = Math.max(...list.map((t) => t.r));
      ring = Math.min(ring, parentR - newMax - pad);
    }

    list.forEach((t, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      t.x = Math.cos(ang) * ring;
      t.y = Math.sin(ang) * ring;
    });

    return list;
  }

  /**
   * Procedure circles: radius from sqrt(count), non-overlapping,
   * centered in the canvas with even margins (labels included).
   */
  function layoutProcedures(procs, W, H) {
    const n = procs.length;
    const padX = 40;
    const padTop = 40;
    const padBottom = 28;
    const gap = 20;
    const labelLift = 22;
    const minSide = Math.min(W, H);

    const values = procs.map((p) => p.value);
    const maxV = Math.max(...values, 1);

    let radii = values.map((v) => {
      const t = Math.sqrt(v / maxV);
      return minSide * (0.09 + 0.11 * t);
    });

    let maxPair = 0;
    for (let i = 0; i < n; i++) {
      maxPair = Math.max(maxPair, radii[i] + radii[(i + 1) % n]);
    }
    const orbit = (maxPair + gap) / (2 * Math.sin(Math.PI / n));

    let nodes = procs.map((p, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return {
        ...p,
        lx: Math.cos(ang) * orbit,
        ly: Math.sin(ang) * orbit,
        r: radii[i],
      };
    });

    function bounds(list) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      list.forEach((p) => {
        minX = Math.min(minX, p.lx - p.r);
        maxX = Math.max(maxX, p.lx + p.r);
        minY = Math.min(minY, p.ly - p.r - labelLift);
        maxY = Math.max(maxY, p.ly + p.r);
      });
      return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
    }

    let b = bounds(nodes);
    const availW = W - padX * 2;
    const availH = H - padTop - padBottom;
    const s = Math.min(1, availW / b.w, availH / b.h);
    if (s < 0.999) {
      nodes = nodes.map((p) => ({
        ...p,
        lx: p.lx * s,
        ly: p.ly * s,
        r: p.r * s,
      }));
      b = bounds(nodes);
    }

    const ox = padX + (availW - b.w) / 2 - b.minX;
    const oy = padTop + (availH - b.h) / 2 - b.minY;

    return nodes.map((p) => ({
      ...p,
      x: p.lx + ox,
      y: p.ly + oy,
    }));
  }

  function renderProcedureBubbles(opts) {
    const {
      svg,
      legendEl,
      hintEl,
      zoomOutBtn,
      data,
      onSelectProcedure,
      onSelectTone,
      onZoomOut,
      showTip,
      hideTip,
    } = opts;

    if (!svg || !data) return;

    const W = 720;
    const H = 560;
    const CX = W / 2;
    const CY = H / 2;

    const sentimentMap = Object.fromEntries((data.sentiments || []).map((s) => [s.id, s]));
    const procedures = (data.procedures || []).map((p) => ({
      ...p,
      value: (p.tones || []).reduce((s, t) => s + (t.count || 0), 0),
    }));

    const packedProcs = layoutProcedures(procedures, W, H);
    packedProcs.forEach((proc) => {
      proc.children = layoutTonesInside(proc.tones, proc.r, sentimentMap);
    });

    let focusId = null;
    const rootR = Math.min(W, H) * 0.48;

    function focusNode() {
      if (!focusId) return { x: CX, y: CY, r: rootR };
      const p = packedProcs.find((x) => x.id === focusId);
      return p ? { x: p.x, y: p.y, r: p.r * 1.15 } : { x: CX, y: CY, r: rootR };
    }

    function applyZoom(animate) {
      const f = focusNode();
      const k = Math.min(W, H) / (f.r * 2.25);
      const tx = CX - k * f.x;
      const ty = CY - k * f.y;
      const g = svg.querySelector('.bubble-stage');
      if (!g) return;
      g.style.transition = animate ? 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
      g.setAttribute('transform', `translate(${tx}, ${ty}) scale(${k})`);
      svg.classList.toggle('bubble-svg--zoomed', !!focusId);

      svg.querySelectorAll('.bubble-proc').forEach((el) => {
        el.classList.toggle('bubble-proc--dim', !!focusId && el.dataset.id !== focusId);
        el.classList.toggle('bubble-proc--focus', el.dataset.id === focusId);
      });

      if (zoomOutBtn) zoomOutBtn.hidden = !focusId;
      if (hintEl) {
        hintEl.textContent = focusId
          ? `Zoomed: ${packedProcs.find((p) => p.id === focusId)?.label || ''} — click a tone bubble or Zoom out`
          : data.hint || 'Click a procedure ring to zoom · tone bubbles = how people talk';
      }
    }

    function zoomTo(id) {
      focusId = id;
      applyZoom(true);
      if (id && onSelectProcedure) onSelectProcedure(id);
    }

    function zoomOut() {
      focusId = null;
      applyZoom(true);
      if (onZoomOut) onZoomOut();
    }

    const strokeColors = ['#8ecae6', '#b4a7d6', '#7ecdb8', '#9db8d4', '#d4a8c4'];

    const procHtml = packedProcs
      .map((proc, idx) => {
        const stroke = proc.shell || strokeColors[idx % strokeColors.length];
        const kids = (proc.children || [])
          .map((ch, ci) => {
            const x = proc.x + ch.x;
            const y = proc.y + ch.y;
            const delay = ((idx * 4 + ci) % 7) * 0.35;
            return `<g class="bubble-tone" data-procedure="${esc(proc.id)}" data-tone="${esc(ch.tone)}"
              transform="translate(${x}, ${y})" style="--float-delay:${delay}s">
              <g class="bubble-tone__motion">
                <circle class="bubble-tone__circle" r="${ch.r}" fill="${ch.color}"
                  fill-opacity="0.9" stroke="rgba(12,14,20,0.45)" stroke-width="1.25"/>
                <text class="bubble-tone__label" text-anchor="middle" dy="-0.15em">${esc(ch.label)}</text>
                <text class="bubble-tone__count" text-anchor="middle" dy="1.05em">${ch.count}</text>
              </g>
            </g>`;
          })
          .join('');

        const shellDelay = (idx % 5) * 0.4;
        return `<g class="bubble-proc" data-id="${esc(proc.id)}" style="--float-delay:${shellDelay}s">
          <g transform="translate(${proc.x}, ${proc.y})">
            <g class="bubble-proc__motion">
              <circle class="bubble-proc__shell" cx="0" cy="0" r="${proc.r}"
                fill="rgba(255,255,255,0.02)" stroke="${stroke}" stroke-opacity="0.95" stroke-width="2.75"/>
            </g>
          </g>
          ${kids}
          <text class="bubble-proc__title" x="${proc.x}" y="${proc.y - proc.r - 16}" text-anchor="middle">${esc(proc.label)}</text>
          <text class="bubble-proc__count" x="${proc.x}" y="${proc.y - proc.r - 3}" text-anchor="middle">${proc.value}</text>
        </g>`;
      })
      .join('');

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `<rect class="bubble-bg" width="${W}" height="${H}" fill="transparent"/>
      <g class="bubble-stage">${procHtml}</g>`;

    if (legendEl) {
      const legendItems = data.legendSentiments || data.sentiments || [];
      legendEl.innerHTML = legendItems
        .map(
          (s) => `<span class="bubble-legend__item">
          <span class="bubble-legend__swatch" style="background:${s.color}"></span>
          ${esc(s.label)}
        </span>`,
        )
        .join('');
    }

    svg.querySelectorAll('.bubble-proc__shell').forEach((shell) => {
      const g = shell.closest('.bubble-proc');
      const id = g.dataset.id;
      shell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (focusId === id) return;
        zoomTo(id);
      });
      shell.addEventListener('mouseenter', () => g.classList.add('bubble-proc--hover'));
      shell.addEventListener('mouseleave', () => {
        g.classList.remove('bubble-proc--hover');
        hideTip && hideTip();
      });
      shell.addEventListener('mousemove', (e) => {
        if (!showTip || focusId === id) return;
        const p = packedProcs.find((x) => x.id === id);
        showTip(
          `<strong>${esc(p.label)}</strong><br>${p.value} mentions · click to zoom`,
          e.clientX,
          e.clientY,
        );
      });
    });

    svg.querySelectorAll('.bubble-tone').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const procedure = el.dataset.procedure;
        const tone = el.dataset.tone;
        if (focusId !== procedure) zoomTo(procedure);
        if (onSelectTone) onSelectTone(procedure, tone);
      });
      el.addEventListener('mousemove', (e) => {
        if (!showTip) return;
        const proc = packedProcs.find((x) => x.id === el.dataset.procedure);
        const tone = proc?.children?.find((c) => c.tone === el.dataset.tone);
        showTip(
          `<strong>${esc(proc?.label || '')} · ${esc(tone?.label || '')}</strong><br>${tone?.count || 0} comments · click for quotes`,
          e.clientX,
          e.clientY,
        );
      });
      el.addEventListener('mouseleave', () => hideTip && hideTip());
    });

    svg.querySelector('.bubble-bg')?.addEventListener('click', () => {
      if (focusId) zoomOut();
    });

    if (zoomOutBtn) zoomOutBtn.onclick = () => zoomOut();

    applyZoom(false);
    return { zoomTo, zoomOut };
  }

  global.PulsarBubbles = { renderProcedureBubbles };
})(window);
