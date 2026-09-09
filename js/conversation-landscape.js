/**
 * Chart 2 — Conversation Cluster (force-directed theme network).
 * Interactive: node/edge/cluster select · neighbor highlight · detail panel
 */
window.PulsarConversationLandscape = {
  render(opts) {
    const { containerEl, hintEl, legendEl, detailEl, howtoEl, data, onSelect, showTip, hideTip } =
      opts;
    if (!containerEl || !data || !data.nodes?.length) {
      if (containerEl) {
        containerEl.innerHTML = '<p class="landscape-empty">Keine Cluster-Daten.</p>';
      }
      return;
    }

    const esc = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const fmt = (n) => Number(n || 0).toLocaleString('de-DE');

    if (hintEl) {
      hintEl.textContent = [data.axis_note, data.note].filter(Boolean).join(' · ');
    }

    if (howtoEl) {
      const steps = data.how_to || [];
      if (steps.length) {
        howtoEl.hidden = false;
        howtoEl.innerHTML = steps.map((s) => `<li>${esc(s)}</li>`).join('');
      } else {
        howtoEl.hidden = true;
      }
    }

    if (legendEl) {
      legendEl.innerHTML = `<p class="landscape-side__label">Communities</p>${(data.clusters || [])
        .map(
          (c) => `<button type="button" class="landscape-legend__item" data-cluster="${esc(c.id)}" style="--c:${esc(c.color)}">
            <span class="landscape-legend__swatch"></span>
            <span class="landscape-legend__text">
              <strong>${esc(c.fruit)}</strong> ${c.share_pct}%
              <small>${esc(c.subtitle || '')}</small>
            </span>
          </button>`,
        )
        .join('')}`;
    }

    const W = 900;
    const H = 720;
    const PAD = 70;
    const nodes = data.nodes.map((n) => ({
      ...n,
      x: ((n.x ?? 0) + 1) * 0.5 * (W - PAD * 2) + PAD,
      y: ((n.y ?? 0) + 1) * 0.5 * (H - PAD * 2) + PAD,
      vx: 0,
      vy: 0,
    }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const edges = (data.edges || [])
      .map((e) => ({ ...e, s: byId[e.source], t: byId[e.target] }))
      .filter((e) => e.s && e.t);

    const adj = {};
    edges.forEach((e) => {
      (adj[e.s.id] ||= new Set()).add(e.t.id);
      (adj[e.t.id] ||= new Set()).add(e.s.id);
    });

    let activeCluster = null;
    let selection = null; // {kind:'node'|'edge'|'cluster', ...}
    let raf = 0;
    let scale = 1;
    let tx = 0;
    let ty = 0;
    const MIN_Z = 0.35;
    const MAX_Z = 8;

    const svgNS = 'http://www.w3.org/2000/svg';
    containerEl.innerHTML = '';
    containerEl.classList.add('landscape-chart--interactive');

    const toolbar = document.createElement('div');
    toolbar.className = 'landscape-toolbar';
    toolbar.innerHTML = `
      <button type="button" class="landscape-toolbar__btn" data-act="in" title="Zoom in">+</button>
      <button type="button" class="landscape-toolbar__btn" data-act="out" title="Zoom out">−</button>
      <button type="button" class="landscape-toolbar__btn" data-act="reset" title="Reset">Reset</button>`;
    containerEl.appendChild(toolbar);

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('class', 'landscape-svg');
    svg.setAttribute('aria-label', 'Conversation cluster network');
    containerEl.appendChild(svg);

    const gRoot = document.createElementNS(svgNS, 'g');
    gRoot.setAttribute('class', 'landscape-viewport');
    svg.appendChild(gRoot);

    const gEdges = document.createElementNS(svgNS, 'g');
    gEdges.setAttribute('class', 'landscape-edges');
    const gNodes = document.createElementNS(svgNS, 'g');
    gNodes.setAttribute('class', 'landscape-nodes');
    gRoot.appendChild(gEdges);
    gRoot.appendChild(gNodes);

    function applyView() {
      gRoot.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);
    }

    function clientToSvg(clientX, clientY) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: W / 2, y: H / 2 };
      return pt.matrixTransform(ctm.inverse());
    }

    function zoomAt(svgX, svgY, nextScale) {
      const s2 = Math.min(MAX_Z, Math.max(MIN_Z, nextScale));
      const wx = (svgX - tx) / scale;
      const wy = (svgY - ty) / scale;
      scale = s2;
      tx = svgX - wx * scale;
      ty = svgY - wy * scale;
      applyView();
    }

    function measureContent() {
      const prev = gRoot.getAttribute('transform') || '';
      gRoot.setAttribute('transform', '');
      let bb;
      try {
        bb = gRoot.getBBox();
      } catch (_) {
        bb = { x: 0, y: 0, width: W, height: H };
      }
      gRoot.setAttribute('transform', prev);
      if (!bb || !isFinite(bb.width) || bb.width < 1 || bb.height < 1) {
        return { x: PAD, y: PAD, width: W - PAD * 2, height: H - PAD * 2 };
      }
      return bb;
    }

    function resetView() {
      const bb = measureContent();
      const pad = 48;
      const x = bb.x - pad;
      const y = bb.y - pad;
      const w = bb.width + pad * 2;
      const h = bb.height + pad * 2;
      scale = Math.min(MAX_Z, Math.max(MIN_Z, Math.min(W / w, H / h) * 0.86));
      tx = -x * scale + (W - w * scale) / 2;
      ty = -y * scale + (H - h * scale) / 2;
      applyView();
    }

    function setDetail(html) {
      if (!detailEl) return;
      detailEl.innerHTML = html;
    }

    function renderDetailDefault() {
      setDetail(
        `<p class="landscape-detail__empty">Klicke ein Thema oder eine Linie, um Details zu sehen.</p>
         <p class="landscape-detail__meta">${fmt(data.n_comments_with_topics || 0)} Kommentare mit Themen · ${nodes.length} Themen · ${edges.length} starke Paare · ${(data.clusters || []).length} Communities</p>`,
      );
    }

    function quoteListHtml(quotes) {
      if (!quotes || !quotes.length) return '<p class="landscape-detail__meta">Keine Beispielzitate hinterlegt.</p>';
      return `<ul class="landscape-detail__quotes">${quotes
        .map(
          (q) =>
            `<li><em>„${esc((q.text || '').slice(0, 160))}${(q.text || '').length > 160 ? '…' : ''}“</em>${
              q.source ? `<span>${esc(q.source)}</span>` : ''
            }</li>`,
        )
        .join('')}</ul>`;
    }

    function clearFocus() {
      nodeEls.forEach((n) => {
        n.el.classList.remove('is-dim', 'is-active', 'is-neighbor');
      });
      edgeEls.forEach((e) => {
        e.el.classList.remove('is-dim', 'is-active', 'is-bridge');
      });
      if (legendEl) {
        legendEl.querySelectorAll('.landscape-legend__item').forEach((el) => el.classList.remove('is-active'));
      }
    }

    function focusNode(nid) {
      const neighbors = adj[nid] || new Set();
      nodeEls.forEach((n) => {
        const on = n.id === nid || neighbors.has(n.id);
        n.el.classList.toggle('is-dim', !on);
        n.el.classList.toggle('is-active', n.id === nid);
        n.el.classList.toggle('is-neighbor', neighbors.has(n.id));
      });
      edgeEls.forEach((e) => {
        const on = e.s.id === nid || e.t.id === nid;
        e.el.classList.toggle('is-dim', !on);
        e.el.classList.toggle('is-active', on);
      });
    }

    function focusEdge(edge) {
      const a = edge.s.id;
      const b = edge.t.id;
      nodeEls.forEach((n) => {
        const on = n.id === a || n.id === b;
        n.el.classList.toggle('is-dim', !on);
        n.el.classList.toggle('is-active', on);
        n.el.classList.remove('is-neighbor');
      });
      edgeEls.forEach((e) => {
        const on = e === edge;
        e.el.classList.toggle('is-dim', !on);
        e.el.classList.toggle('is-active', on);
        e.el.classList.toggle('is-bridge', on && e.same_cluster === false);
      });
    }

    function focusCluster(cid) {
      nodeEls.forEach((n) => {
        const on = n.cluster === cid;
        n.el.classList.toggle('is-dim', !on);
        n.el.classList.toggle('is-active', on);
        n.el.classList.remove('is-neighbor');
      });
      edgeEls.forEach((e) => {
        const on = e.s.cluster === cid && e.t.cluster === cid;
        e.el.classList.toggle('is-dim', !on);
        e.el.classList.toggle('is-active', on);
      });
      if (legendEl) {
        legendEl.querySelectorAll('.landscape-legend__item').forEach((el) => {
          el.classList.toggle('is-active', el.dataset.cluster === cid);
        });
      }
    }

    function selectNode(n) {
      selection = { kind: 'node', id: n.id };
      activeCluster = null;
      clearFocus();
      focusNode(n.id);
      const links = [...(adj[n.id] || [])]
        .map((id) => byId[id])
        .filter(Boolean)
        .sort((a, b) => (b.weight || 0) - (a.weight || 0));
      setDetail(`
        <p class="landscape-detail__kicker">Thema</p>
        <h3 class="landscape-detail__title">${esc(n.label)}</h3>
        <p class="landscape-detail__stat"><strong>${fmt(n.weight)}</strong> Kommentare mit diesem Thema</p>
        <p class="landscape-detail__meta">Community: ${(data.clusters || []).find((c) => c.id === n.cluster)?.fruit || n.cluster}</p>
        ${
          links.length
            ? `<p class="landscape-detail__kicker">Oft zusammen mit</p><ul class="landscape-detail__links">${links
                .slice(0, 6)
                .map((x) => `<li>${esc(x.label)}</li>`)
                .join('')}</ul>`
            : ''
        }
        <p class="landscape-detail__kicker">Beispielzitate</p>
        ${quoteListHtml(n.quotes)}
      `);
      if (typeof onSelect === 'function') {
        onSelect({ type: 'topic', id: n.id, label: n.label, cluster: n.cluster });
      }
    }

    function selectEdge(e) {
      selection = { kind: 'edge', source: e.s.id, target: e.t.id };
      activeCluster = null;
      clearFocus();
      focusEdge(e);
      const bridge = e.same_cluster === false;
      setDetail(`
        <p class="landscape-detail__kicker">Themenpaar${bridge ? ' · Brücke zwischen Communities' : ''}</p>
        <h3 class="landscape-detail__title">${esc(e.s.label)} <span class="landscape-detail__plus">+</span> ${esc(e.t.label)}</h3>
        <p class="landscape-detail__stat"><strong>${fmt(e.weight)}</strong> gemeinsame Kommentare</p>
        <p class="landscape-detail__meta">Linie = beide Themen im selben Kommentar${
          bridge ? ' · verbindet zwei Farben/Communities' : ''
        }</p>
        <p class="landscape-detail__kicker">Beispielzitate</p>
        ${quoteListHtml(e.quotes)}
      `);
      if (typeof onSelect === 'function') {
        onSelect({
          type: 'topic-pair',
          a: e.s.id,
          b: e.t.id,
          labelA: e.s.label,
          labelB: e.t.label,
          weight: e.weight,
        });
      }
    }

    function selectCluster(cid) {
      if (activeCluster === cid) {
        activeCluster = null;
        selection = null;
        clearFocus();
        renderDetailDefault();
        return;
      }
      activeCluster = cid;
      selection = { kind: 'cluster', id: cid };
      clearFocus();
      focusCluster(cid);
      const cl = (data.clusters || []).find((c) => c.id === cid);
      const members = nodes.filter((n) => n.cluster === cid).sort((a, b) => b.weight - a.weight);
      setDetail(`
        <p class="landscape-detail__kicker">Community</p>
        <h3 class="landscape-detail__title">${esc(cl?.fruit || cid)}</h3>
        <p class="landscape-detail__stat"><strong>${cl?.share_pct ?? '–'}%</strong> der Themen-Masse · ${members.length} Themen</p>
        <p class="landscape-detail__meta">${esc(cl?.subtitle || '')}</p>
        <p class="landscape-detail__kicker">Themen in dieser Farbe</p>
        <ul class="landscape-detail__links">${members
          .map((m) => `<li>${esc(m.label)} <span>${fmt(m.weight)}</span></li>`)
          .join('')}</ul>
      `);
    }

    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      markUserView();
      const act = btn.dataset.act;
      if (act === 'reset') {
        userAdjustedView = false;
        resetView();
      } else if (act === 'in') zoomAt(W / 2, H / 2, scale * 1.25);
      else if (act === 'out') zoomAt(W / 2, H / 2, scale / 1.25);
    });

    svg.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        markUserView();
        const p = clientToSvg(e.clientX, e.clientY);
        zoomAt(p.x, p.y, scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      },
      { passive: false },
    );

    let panning = false;
    let panMoved = false;
    let userAdjustedView = false;
    let lastX = 0;
    let lastY = 0;

    function markUserView() {
      userAdjustedView = true;
    }

    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (
        e.target.closest('.landscape-node') ||
        e.target.closest('.landscape-edge') ||
        e.target.closest('.landscape-edge-hit')
      ) {
        return;
      }
      panning = true;
      panMoved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      svg.classList.add('is-panning');
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!panning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        panMoved = true;
        markUserView();
      }
      lastX = e.clientX;
      lastY = e.clientY;
      const rect = svg.getBoundingClientRect();
      tx += dx * (W / Math.max(1, rect.width));
      ty += dy * (H / Math.max(1, rect.height));
      applyView();
    });
    svg.addEventListener('pointerup', (e) => {
      if (!panning) return;
      panning = false;
      svg.classList.remove('is-panning');
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      const didPan = panMoved;
      panMoved = false;
      if (
        !didPan &&
        !e.target.closest('.landscape-node') &&
        !e.target.closest('.landscape-edge') &&
        !e.target.closest('.landscape-edge-hit')
      ) {
        selection = null;
        activeCluster = null;
        clearFocus();
        renderDetailDefault();
      }
      if (didPan) {
        // Swallow the click that browsers fire after a drag
        const swallow = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          svg.removeEventListener('click', swallow, true);
        };
        svg.addEventListener('click', swallow, true);
      }
    });
    svg.addEventListener('dblclick', (e) => {
      e.preventDefault();
      resetView();
    });

    const edgeEls = edges.map((e) => {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('stroke-width', String(Math.max(1.2, e.width || 1)));
      line.setAttribute('class', `landscape-edge${e.same_cluster === false ? ' landscape-edge--bridge' : ''}`);
      line.style.cursor = 'pointer';
      // invisible fat hit area
      const hit = document.createElementNS(svgNS, 'line');
      hit.setAttribute('stroke-width', '14');
      hit.setAttribute('class', 'landscape-edge-hit');
      hit.style.cursor = 'pointer';
      hit.style.pointerEvents = 'stroke';
      gEdges.appendChild(hit);
      gEdges.appendChild(line);
      e.el = line;
      e.hit = hit;

      const tip = () =>
        `<strong>${esc(e.s.label)} + ${esc(e.t.label)}</strong><br>${fmt(e.weight)} gemeinsame Kommentare` +
        (e.same_cluster === false ? '<br><em>Brücke zwischen Communities</em>' : '');

      const onEnter = (ev) => {
        if (panning || selection) return;
        focusEdge(e);
        if (typeof showTip === 'function') showTip(tip(), ev.clientX, ev.clientY);
      };
      const onLeave = () => {
        if (selection) return;
        clearFocus();
        if (typeof hideTip === 'function') hideTip();
      };
      const onClick = (ev) => {
        ev.stopPropagation();
        if (typeof hideTip === 'function') hideTip();
        selectEdge(e);
      };
      [hit, line].forEach((el) => {
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
        el.addEventListener('click', onClick);
      });
      return e;
    });

    const nodeEls = nodes.map((n) => {
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', 'landscape-node');
      g.dataset.id = n.id;
      g.dataset.cluster = n.cluster;
      g.style.cursor = 'pointer';
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('r', String(n.r || 8));
      circle.setAttribute('fill', n.color || '#7ecdb8');
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dy', String((n.r || 8) + 12));
      label.setAttribute('class', 'landscape-node__label');
      label.textContent = n.label.length > 22 ? `${n.label.slice(0, 20)}…` : n.label;
      g.appendChild(circle);
      g.appendChild(label);
      gNodes.appendChild(g);
      n.el = g;
      n.circle = circle;

      g.addEventListener('mouseenter', (ev) => {
        if (panning || selection) return;
        focusNode(n.id);
        if (typeof showTip === 'function') {
          showTip(
            `<strong>${esc(n.label)}</strong><br>${fmt(n.weight)} Kommentare` +
              `<br><em>Klicken für Details & Quotes</em>`,
            ev.clientX,
            ev.clientY,
          );
        }
      });
      g.addEventListener('mouseleave', () => {
        if (selection) return;
        clearFocus();
        if (typeof hideTip === 'function') hideTip();
      });
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (typeof hideTip === 'function') hideTip();
        selectNode(n);
      });
      return n;
    });

    if (legendEl) {
      legendEl.querySelectorAll('.landscape-legend__item').forEach((el) => {
        el.addEventListener('click', () => selectCluster(el.dataset.cluster));
      });
    }

    function tick() {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy) || 0.01;
          const minD = (a.r || 8) + (b.r || 8) + 22;
          if (dist < minD) {
            const f = ((minD - dist) / dist) * 0.1;
            dx *= f;
            dy *= f;
            a.vx -= dx;
            a.vy -= dy;
            b.vx += dx;
            b.vy += dy;
          } else {
            const f = 22 / (dist * dist);
            dx *= f;
            dy *= f;
            a.vx -= dx;
            a.vy -= dy;
            b.vx += dx;
            b.vy += dy;
          }
        }
      }
      edges.forEach((e) => {
        const a = e.s;
        const b = e.t;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const target = 100 + 50 / Math.sqrt(e.weight || 1);
        const f = ((dist - target) / dist) * 0.018 * Math.min(3, Math.log10((e.weight || 1) + 1) + 1);
        dx *= f;
        dy *= f;
        a.vx += dx;
        a.vy += dy;
        b.vx -= dx;
        b.vy -= dy;
      });

      const cx = W / 2;
      const cy = H / 2;
      nodes.forEach((n) => {
        n.vx += (cx - n.x) * 0.002;
        n.vy += (cy - n.y) * 0.002;
        n.vx *= 0.82;
        n.vy *= 0.82;
        const r = n.r || 8;
        n.x = Math.min(W - PAD - r, Math.max(PAD + r, n.x + n.vx));
        n.y = Math.min(H - PAD - r - 18, Math.max(PAD + r, n.y + n.vy));
        n.el.setAttribute('transform', `translate(${n.x},${n.y})`);
      });
      edgeEls.forEach((e) => {
        e.el.setAttribute('x1', e.s.x);
        e.el.setAttribute('y1', e.s.y);
        e.el.setAttribute('x2', e.t.x);
        e.el.setAttribute('y2', e.t.y);
        e.hit.setAttribute('x1', e.s.x);
        e.hit.setAttribute('y1', e.s.y);
        e.hit.setAttribute('x2', e.t.x);
        e.hit.setAttribute('y2', e.t.y);
      });
    }

    let frames = 0;
    function loop() {
      tick();
      frames += 1;
      if (!userAdjustedView && (frames === 1 || frames % 40 === 0)) resetView();
      if (frames < 220) raf = requestAnimationFrame(loop);
      else if (!userAdjustedView) resetView();
    }
    applyView();
    renderDetailDefault();
    requestAnimationFrame(() => {
      resetView();
      loop();
    });

    return () => cancelAnimationFrame(raf);
  },
};
