/**
 * Variant B — Sunburst (2 rings).
 * Hover via polar hit-test (no leave/enter flicker between wedges).
 * Category hover: whole wedge pops as one unit.
 * file:// safe.
 */
(function (global) {
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function polar(cx, cy, r, angleDeg) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function unitFromAngle(angleDeg) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return [Math.cos(a), Math.sin(a)];
  }

  /** Annular sector from r0→r1, angles in degrees (0 = top, clockwise). */
  function ringPath(cx, cy, r0, r1, a0, a1) {
    const sweep = Math.max(a1 - a0, 0.01);
    const end = a0 + sweep;
    const large = sweep > 180 ? 1 : 0;
    const [x0, y0] = polar(cx, cy, r1, a0);
    const [x1, y1] = polar(cx, cy, r1, end);
    const [x2, y2] = polar(cx, cy, r0, end);
    const [x3, y3] = polar(cx, cy, r0, a0);
    return [
      `M ${x0} ${y0}`,
      `A ${r1} ${r1} 0 ${large} 1 ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${r0} ${r0} 0 ${large} 0 ${x3} ${y3}`,
      'Z',
    ].join(' ');
  }

  function midAngle(a0, a1) {
    return (a0 + a1) / 2;
  }

  function lighten(hex, amount) {
    const h = String(hex || '#888').replace('#', '');
    if (h.length !== 6) return hex;
    const n = parseInt(h, 16);
    const r = Math.min(255, ((n >> 16) & 255) + amount);
    const g = Math.min(255, ((n >> 8) & 255) + amount);
    const b = Math.min(255, (n & 255) + amount);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function angleContains(a0, a1, ang) {
    // Segments are [a0, a1) in clockwise degrees from top
    if (a1 >= a0) return ang >= a0 && ang < a1;
    return ang >= a0 || ang < a1;
  }

  function renderSunburst(opts) {
    const {
      svg,
      legendEl,
      hintEl,
      mode = 'procedure',
      data,
      onSelectOuter,
      onSelectInner,
      showTip,
      hideTip,
    } = opts;

    if (!svg || !data) return;

    const W = 640;
    const H = 560;
    const cx = W / 2;
    const cy = H / 2 + 6;
    const rHole = 62;
    const rInner = 148;
    const rOuter = 232;

    const sentimentMap = Object.fromEntries((data.sentiments || []).map((s) => [s.id, s]));
    const groups = (data.procedures || []).map((p) => {
      const value = (p.tones || []).reduce((s, t) => s + (t.count || 0), 0);
      return { ...p, value };
    });
    const total = groups.reduce((s, g) => s + g.value, 0) || 1;

    const inner = [];
    const outer = [];
    let cursor = 0;

    groups.forEach((g) => {
      const sweep = (g.value / total) * 360;
      const a0 = cursor;
      const a1 = cursor + sweep;
      inner.push({
        id: g.id,
        label: g.label,
        color: g.shell || '#8ecae6',
        value: g.value,
        a0,
        a1,
      });

      let tCursor = a0;
      (g.tones || []).forEach((t) => {
        const tSweep = (t.count / total) * 360;
        if (tSweep <= 0) return;
        const t0 = tCursor;
        const t1 = tCursor + tSweep;
        const meta = sentimentMap[t.tone] || {};
        outer.push({
          outerId: g.id,
          innerId: t.tone,
          label: meta.label || t.tone,
          color: meta.color || lighten(g.shell || '#8ecae6', 30),
          count: t.count,
          parentLabel: g.label,
          a0: t0,
          a1: t1,
        });
        tCursor = t1;
      });

      cursor = a1;
    });

    const GROW = 1.1;
    const GROW_LEAF = 1.2;

    const innerHtml = inner
      .map((seg) => {
        const mid = midAngle(seg.a0, seg.a1);
        const [lx, ly] = polar(cx, cy, (rHole + rInner) / 2, mid);
        const d = ringPath(cx, cy, rHole, rInner, seg.a0, seg.a1);
        const wide = seg.a1 - seg.a0 >= 18;
        const label = wide
          ? `<text class="sun-label sun-label--inner" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${esc(seg.label)}</text>`
          : '';
        return `<g class="sun-seg sun-seg--inner" data-id="${esc(seg.id)}"
          data-a0="${seg.a0}" data-a1="${seg.a1}" style="--glow:${esc(seg.color)}">
          <path class="sun-seg__path" d="${d}" fill="${seg.color}" stroke="#0c0e14" stroke-width="2.5"/>
          ${label}
        </g>`;
      })
      .join('');

    const outerHtml = outer
      .map((seg) => {
        const mid = midAngle(seg.a0, seg.a1);
        const [lx, ly] = polar(cx, cy, (rInner + rOuter) / 2, mid);
        const d = ringPath(cx, cy, rInner, rOuter, seg.a0, seg.a1);
        const wide = seg.a1 - seg.a0 >= 10;
        const label = wide
          ? `<text class="sun-label sun-label--outer" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${esc(seg.label)}</text>`
          : '';
        return `<g class="sun-seg sun-seg--leaf" data-outer="${esc(seg.outerId)}" data-inner="${esc(seg.innerId)}"
          data-a0="${seg.a0}" data-a1="${seg.a1}" style="--glow:${esc(seg.color)}">
          <path class="sun-seg__path" d="${d}" fill="${seg.color}" stroke="#0c0e14" stroke-width="2"/>
          ${label}
        </g>`;
      })
      .join('');

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.classList.add('sun-svg');
    svg.innerHTML = `
      <rect class="sun-bg" width="${W}" height="${H}" fill="transparent"/>
      <g class="sun-stage">
        ${innerHtml}
        ${outerHtml}
        <g class="sun-center" pointer-events="none">
          <circle cx="${cx}" cy="${cy}" r="${rHole - 4}" class="sun-center__bg"/>
          <text class="sun-center__value" x="${cx}" y="${cy - 6}" text-anchor="middle">${total}</text>
          <text class="sun-center__label" x="${cx}" y="${cy + 14}" text-anchor="middle">mentions</text>
        </g>
        <rect class="sun-pick" x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
      </g>`;

    if (hintEl) {
      hintEl.textContent =
        data.hintPack ||
        'Variant B · sunburst · hover a wedge to highlight · click for quotes';
    }

    if (legendEl) {
      legendEl.innerHTML = (data.sentiments || [])
        .map(
          (s) => `<span class="bubble-legend__item">
          <span class="bubble-legend__swatch" style="background:${s.color}"></span>
          ${esc(s.label)}
        </span>`,
        )
        .join('');
    }

    const centerValue = svg.querySelector('.sun-center__value');
    const centerLabel = svg.querySelector('.sun-center__label');
    const pick = svg.querySelector('.sun-pick');

    let leaveTimer = null;
    let hoverKey = null;
    let pinned = null; // { type: 'category'|'leaf', id|outerId+innerId }

    function svgPoint(clientX, clientY) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return pt.matrixTransform(ctm.inverse());
    }

    /** Polar pick: angle from top clockwise, radius from center. */
    function hitTest(clientX, clientY) {
      const p = svgPoint(clientX, clientY);
      if (!p) return null;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const r = Math.hypot(dx, dy);
      if (r < rHole - 2 || r > rOuter * 1.24) return null;

      let ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (ang < 0) ang += 360;

      if (r <= rInner) {
        const seg = inner.find((s) => angleContains(s.a0, s.a1, ang));
        return seg ? { type: 'category', id: seg.id, seg } : null;
      }

      const leaf = outer.find((s) => angleContains(s.a0, s.a1, ang));
      return leaf
        ? { type: 'leaf', outerId: leaf.outerId, innerId: leaf.innerId, seg: leaf }
        : null;
    }

    function setInnerPath(el, grow = 1) {
      const a0 = +el.dataset.a0;
      const a1 = +el.dataset.a1;
      const path = el.querySelector('.sun-seg__path');
      // Grow both edges from center so the whole inner ring gets larger.
      path.setAttribute('d', ringPath(cx, cy, rHole * grow, rInner * grow, a0, a1));
    }

    function setLeafPath(el, innerGrow = 1, outerGrow = innerGrow) {
      const a0 = +el.dataset.a0;
      const a1 = +el.dataset.a1;
      const path = el.querySelector('.sun-seg__path');
      // Keep leaf attached to its parent ring by using matching innerGrow.
      path.setAttribute('d', ringPath(cx, cy, rInner * innerGrow, rOuter * outerGrow, a0, a1));
    }

    function resetAllPaths() {
      svg.querySelectorAll('.sun-seg--inner').forEach((el) => setInnerPath(el, 1));
      svg.querySelectorAll('.sun-seg--leaf').forEach((el) => setLeafPath(el, 1, 1));
    }

    function clearHover() {
      hoverKey = null;
      svg.classList.remove('sun-svg--hovering');
      svg.querySelectorAll('.sun-seg').forEach((el) => {
        el.classList.remove('sun-seg--group', 'sun-seg--leaf-focus', 'sun-seg--dim');
      });
      resetAllPaths();
      if (centerValue) centerValue.textContent = String(total);
      if (centerLabel) centerLabel.textContent = 'mentions';
    }

    function scheduleClear() {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => {
        if (pinned) applyPinnedState();
        else clearHover();
        hideTip && hideTip();
      }, 80);
    }

    function cancelClear() {
      clearTimeout(leaveTimer);
    }

    function applyPinnedState() {
      if (!pinned) {
        clearHover();
        return;
      }
      hoverKey = null;
      svg.classList.remove('sun-svg--hovering');
      svg.querySelectorAll('.sun-seg').forEach((el) => {
        el.classList.remove('sun-seg--group', 'sun-seg--leaf-focus', 'sun-seg--dim');
      });
      resetAllPaths();
      if (pinned.type === 'category') hoverCategory(pinned.id);
      else hoverLeaf(pinned.outerId, pinned.innerId);
    }

    /** Category + leaves: whole wedge grows ~10% from center. */
    function hoverCategory(id) {
      const key = `cat:${id}`;
      if (hoverKey === key) return;
      hoverKey = key;
      cancelClear();
      svg.classList.add('sun-svg--hovering');
      const seg = inner.find((x) => x.id === id);

      svg.querySelectorAll('.sun-seg--inner').forEach((el) => {
        const match = el.dataset.id === id;
        el.classList.toggle('sun-seg--group', match);
        el.classList.toggle('sun-seg--dim', !match);
        el.classList.remove('sun-seg--leaf-focus');
        setInnerPath(el, match ? GROW : 1);
      });
      svg.querySelectorAll('.sun-seg--leaf').forEach((el) => {
        const match = el.dataset.outer === id;
        el.classList.toggle('sun-seg--group', match);
        el.classList.toggle('sun-seg--dim', !match);
        el.classList.remove('sun-seg--leaf-focus');
        if (match) setLeafPath(el, GROW, GROW);
        else setLeafPath(el, 1, 1);
      });

      if (seg && centerValue && centerLabel) {
        centerValue.textContent = String(seg.value);
        centerLabel.textContent = seg.label;
      }
    }

    /** Focused leaf grows more; parent/siblings stay at +10%. */
    function hoverLeaf(outerId, innerId) {
      const key = `leaf:${outerId}:${innerId}`;
      if (hoverKey === key) return;
      hoverKey = key;
      cancelClear();
      svg.classList.add('sun-svg--hovering');
      const seg = outer.find((x) => x.outerId === outerId && x.innerId === innerId);

      svg.querySelectorAll('.sun-seg--inner').forEach((el) => {
        const match = el.dataset.id === outerId;
        el.classList.toggle('sun-seg--group', match);
        el.classList.toggle('sun-seg--dim', !match);
        el.classList.remove('sun-seg--leaf-focus');
        setInnerPath(el, match ? GROW : 1);
      });
      svg.querySelectorAll('.sun-seg--leaf').forEach((el) => {
        const isFocus = el.dataset.outer === outerId && el.dataset.inner === innerId;
        const isSibling = el.dataset.outer === outerId && !isFocus;
        el.classList.toggle('sun-seg--leaf-focus', isFocus);
        el.classList.toggle('sun-seg--group', isSibling);
        el.classList.toggle('sun-seg--dim', !isFocus && !isSibling);
        if (isFocus) setLeafPath(el, GROW, GROW_LEAF);
        else if (isSibling) setLeafPath(el, GROW, GROW);
        else setLeafPath(el, 1, 1);
      });

      if (seg && centerValue && centerLabel) {
        centerValue.textContent = String(seg.count);
        centerLabel.textContent = seg.label;
      }
    }

    function previewOverPinned(hit) {
      applyPinnedState();
      if (!hit || !hit.seg) return;

      if (hit.type === 'category') {
        const innerEl = svg.querySelector(`.sun-seg--inner[data-id="${hit.id}"]`);
        if (innerEl) {
          innerEl.classList.add('sun-seg--group');
          innerEl.classList.remove('sun-seg--dim');
          setInnerPath(innerEl, GROW);
        }
        svg.querySelectorAll(`.sun-seg--leaf[data-outer="${hit.id}"]`).forEach((el) => {
          el.classList.add('sun-seg--group');
          el.classList.remove('sun-seg--dim');
          setLeafPath(el, GROW, GROW);
        });
        if (centerValue && centerLabel) {
          centerValue.textContent = String(hit.seg.value);
          centerLabel.textContent = hit.seg.label;
        }
        return;
      }

      const parentInner = svg.querySelector(`.sun-seg--inner[data-id="${hit.outerId}"]`);
      if (parentInner) {
        parentInner.classList.add('sun-seg--group');
        parentInner.classList.remove('sun-seg--dim');
        setInnerPath(parentInner, GROW);
      }
      const focusLeaf = svg.querySelector(
        `.sun-seg--leaf[data-outer="${hit.outerId}"][data-inner="${hit.innerId}"]`,
      );
      if (focusLeaf) {
        focusLeaf.classList.add('sun-seg--leaf-focus');
        focusLeaf.classList.remove('sun-seg--dim');
        setLeafPath(focusLeaf, GROW, GROW_LEAF);
      }
      svg.querySelectorAll(`.sun-seg--leaf[data-outer="${hit.outerId}"]`).forEach((el) => {
        if (el === focusLeaf) return;
        el.classList.add('sun-seg--group');
        el.classList.remove('sun-seg--dim');
        setLeafPath(el, GROW, GROW);
      });
      if (centerValue && centerLabel) {
        centerValue.textContent = String(hit.seg.count);
        centerLabel.textContent = hit.seg.label;
      }
    }

    function applyPointer(e, withTip) {
      const hit = hitTest(e.clientX, e.clientY);
      if (!hit) {
        if (pinned) {
          applyPinnedState();
          hideTip && hideTip();
          return;
        }
        scheduleClear();
        return;
      }
      cancelClear();

      if (pinned) {
        const samePinnedCategory =
          hit.type === 'category' && pinned.type === 'category' && pinned.id === hit.id;
        const samePinnedLeaf =
          hit.type === 'leaf' &&
          pinned.type === 'leaf' &&
          pinned.outerId === hit.outerId &&
          pinned.innerId === hit.innerId;
        if (!samePinnedCategory && !samePinnedLeaf) {
          previewOverPinned(hit);
          if (withTip && showTip && hit.seg) {
            if (hit.type === 'category') {
              showTip(
                `<strong>${esc(hit.seg.label)}</strong><br>${hit.seg.value} mentions · click for quotes`,
                e.clientX,
                e.clientY,
              );
            } else {
              showTip(
                `<strong>${esc(hit.seg.parentLabel)} · ${esc(hit.seg.label)}</strong><br>${hit.seg.count} comments · click for quotes`,
                e.clientX,
                e.clientY,
              );
            }
          }
          return;
        }
      }

      if (hit.type === 'category') {
        hoverCategory(hit.id);
        if (withTip && showTip && hit.seg) {
          showTip(
            `<strong>${esc(hit.seg.label)}</strong><br>${hit.seg.value} mentions · click for quotes`,
            e.clientX,
            e.clientY,
          );
        }
      } else {
        hoverLeaf(hit.outerId, hit.innerId);
        if (withTip && showTip && hit.seg) {
          showTip(
            `<strong>${esc(hit.seg.parentLabel)} · ${esc(hit.seg.label)}</strong><br>${hit.seg.count} comments · click for quotes`,
            e.clientX,
            e.clientY,
          );
        }
      }
    }

    pick.addEventListener('mousemove', (e) => applyPointer(e, true));
    pick.addEventListener('mouseleave', () => scheduleClear());
    pick.addEventListener('click', (e) => {
      const hit = hitTest(e.clientX, e.clientY);
      if (!hit) {
        pinned = null;
        clearHover();
        hideTip && hideTip();
        return;
      }
      e.stopPropagation();
      if (hit.type === 'category') {
        const same = pinned && pinned.type === 'category' && pinned.id === hit.id;
        pinned = same ? null : { type: 'category', id: hit.id };
        applyPinnedState();
        if (onSelectOuter) onSelectOuter(hit.id);
      } else if (onSelectInner) {
        const same =
          pinned &&
          pinned.type === 'leaf' &&
          pinned.outerId === hit.outerId &&
          pinned.innerId === hit.innerId;
        pinned = same ? null : { type: 'leaf', outerId: hit.outerId, innerId: hit.innerId };
        applyPinnedState();
        onSelectInner(hit.outerId, hit.innerId);
      }
    });

    function syncPinnedFromFilter(filter) {
      if (!filter) {
        pinned = null;
        clearHover();
        return;
      }

      if (mode === 'procedure') {
        if (filter.type === 'procedure') {
          pinned = { type: 'category', id: filter.id };
          applyPinnedState();
          return;
        }
        if (filter.type === 'bubble-tone') {
          pinned = { type: 'leaf', outerId: filter.procedure, innerId: filter.tone };
          applyPinnedState();
          return;
        }
        pinned = null;
        clearHover();
        return;
      }

      // mode === 'emotion': category=tone, leaf=(outer=tone, inner=procedure)
      if (filter.type === 'tone') {
        pinned = { type: 'category', id: filter.id };
        applyPinnedState();
        return;
      }
      if (filter.type === 'bubble-tone') {
        pinned = { type: 'leaf', outerId: filter.tone, innerId: filter.procedure };
        applyPinnedState();
        return;
      }
      pinned = null;
      clearHover();
    }

    window.addEventListener('pulsar-filter-change', (ev) => {
      syncPinnedFromFilter(ev?.detail?.filter || null);
    });
  }

  global.PulsarSunburst = { renderSunburst };
})(window);
