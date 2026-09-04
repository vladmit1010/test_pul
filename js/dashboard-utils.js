/**
 * Shared helpers for dashboard data prep and rendering.
 * Pipeline: aggregate raw counts → write dashboard-data.js → UI reads via these utils.
 */
window.DashboardUtils = {
  /** Sort by numeric field desc, return first `limit` items. */
  topN(items, limit, sortKey = 'count') {
    const pool = Array.isArray(items) ? items : [];
    const n = typeof limit === 'number' && limit > 0 ? limit : pool.length;
    return [...pool]
      .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0))
      .slice(0, n);
  },

  /** All topic rows (candidates pool or legacy `topics`). */
  getTopicPool(landscape) {
    if (!landscape) return [];
    return landscape.candidates || landscape.topics || [];
  },

  /** Chart 2 display list: top N by count from the candidate pool.
   *  If blocks A/B exist, return block-grouped lists (ranked within each block). */
  getTopicLandscapeTopics(landscape) {
    const pool = this.getTopicPool(landscape);
    const blocks = landscape?.blocks;
    if (blocks && (blocks.A || blocks.B)) {
      const byBlock = { A: [], B: [] };
      pool.forEach((t) => {
        const b = t.block === 'B' ? 'B' : 'A';
        byBlock[b].push(t);
      });
      return {
        grouped: true,
        A: this.topN(byBlock.A, byBlock.A.length, 'count'),
        B: this.topN(byBlock.B, byBlock.B.length, 'count'),
        flat: this.topN(pool, landscape?.topN ?? pool.length, 'count'),
      };
    }
    const limit = landscape?.topN ?? landscape?.top_n ?? 10;
    return this.topN(pool, limit, 'count');
  },

  findTopic(landscape, id) {
    return this.getTopicPool(landscape).find((t) => t.id === id);
  },

  /** Flatten level-1 taxonomy categories → { [id]: { label, categoryId, categoryLabel } } */
  flattenLevel1Catalog(level1) {
    const map = {};
    (level1?.categories || []).forEach((cat) => {
      (cat.items || []).forEach((item) => {
        map[item.id] = {
          label: item.label,
          categoryId: cat.id,
          categoryLabel: cat.label,
          synonyms: item.synonyms || [],
        };
      });
    });
    return map;
  },

  /** Build flat sentiments[] for bubble renderer from chart4/chart5 taxonomy. */
  flattenTaxonomySentiments(tax) {
    const out = [];
    if (!tax) return out;

    const pushItem = (item, meta) => {
      out.push({
        id: item.id,
        label: item.label,
        synonyms: item.synonyms || [],
        polarity: meta.polarity,
        color: meta.color,
        groupId: meta.groupId || null,
        groupLabel: meta.groupLabel || null,
      });
    };

    (tax.level2a?.items || []).forEach((item) => {
      pushItem(item, {
        polarity: tax.level2a.polarity,
        color: tax.level2a.color,
        groupId: 'level2a',
        groupLabel: tax.level2a.label,
      });
    });

    if (tax.level2b?.items) {
      (tax.level2b.items || []).forEach((item) => {
        pushItem(item, {
          polarity: tax.level2b.polarity,
          color: tax.level2b.color,
          groupId: 'level2b',
          groupLabel: tax.level2b.label,
        });
      });
    } else if (tax.level2b?.categories) {
      const base = tax.level2b.color || '#e8a0bf';
      const shades = ['#e8a0bf', '#d4a0b8', '#c9a0b8', '#e0a890'];
      tax.level2b.categories.forEach((cat, idx) => {
        (cat.items || []).forEach((item) => {
          pushItem(item, {
            polarity: tax.level2b.polarity,
            color: shades[idx % shades.length] || base,
            groupId: cat.id,
            groupLabel: cat.label,
          });
        });
      });
    }

    return out;
  },

  findSentiment(sentiments, id) {
    return (sentiments || []).find((s) => s.id === id);
  },

  /**
   * Merge taxonomy (fixed DE labels) + aggregates (dynamic counts) for charts 4 & 5.
   * chartKey: 'chart4' | 'chart5'
   */
  resolveBubbleChart(block, chartKey) {
    const tax = window.DashboardTaxonomyDE?.[chartKey];
    const sentiments = this.flattenTaxonomySentiments(tax);
    const catalog = this.flattenLevel1Catalog(tax?.level1);
    const rows = block.aggregates?.procedures || block.procedures || [];
    const procedures = rows.map((row, idx) => ({
      id: row.id,
      label: row.label || catalog[row.id]?.label || row.id,
      categoryId: catalog[row.id]?.categoryId,
      categoryLabel: catalog[row.id]?.categoryLabel,
      shell: row.shell,
      tones: row.tones || [],
    }));

    const usedToneIds = new Set();
    procedures.forEach((p) => (p.tones || []).forEach((t) => usedToneIds.add(t.tone)));

    return {
      eyebrow: block.eyebrow,
      title: block.title,
      hint: block.hint,
      taxonomy: tax,
      sentiments,
      legendSentiments: sentiments.filter((s) => usedToneIds.has(s.id)),
      procedures,
    };
  },
};
