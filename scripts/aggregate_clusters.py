#!/usr/bin/env python3
"""
Chart 2 — Conversation Cluster (theme co-occurrence network + communities).

Matches comments to curated Conversation Cluster themes (keyword signals),
builds an undirected co-occurrence graph, runs greedy modularity communities,
and patches dashboard_generated.js.

Usage:
  python3 scripts/aggregate_clusters.py
  python3 scripts/aggregate_clusters.py --input data/classified_v10.jsonl
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities

ROOT = Path(__file__).resolve().parents[1]
CLASSIFIED = ROOT / "data" / "classified_v10.jsonl"
THEMES_PATH = ROOT / "data" / "conversation_themes.json"
OUT_JS = ROOT / "data" / "dashboard_generated.js"

CLUSTER_FRUITS = [
    "Pomegranate",
    "Orange",
    "Coconut",
    "Blueberry",
    "Kiwi",
    "Apples",
    "Fig",
    "Plum",
    "Cherry",
    "Pear",
]

CLUSTER_COLORS = [
    "#e07098",
    "#e08a4a",
    "#7eb8d4",
    "#5b7fbf",
    "#7ecdb8",
    "#b4a7d6",
    "#c4a882",
    "#8ecae6",
    "#e8c98a",
    "#c9a0b8",
]

MIN_NODE = 25
MIN_EDGE = 8
TOP_EDGES = 42
TOP_EDGES_PER_NODE = 3
EDGE_QUOTE_CAP = 5


def fold(s: str) -> str:
    """Lowercase + strip accents for robust German matching."""
    s = (s or "").lower().replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def load_themes(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    themes = []
    for t in data["themes"]:
        signals = sorted({fold(x) for x in t.get("signals") or [] if x.strip()}, key=len, reverse=True)
        themes.append(
            {
                "id": t["id"],
                "label": t["label"],
                "signals": signals,
                "meta_title": data.get("title") or "Conversation Cluster",
                "meta_eyebrow": data.get("eyebrow") or "2. Conversation Cluster",
            }
        )
    return themes


def match_themes(text: str, themes: list[dict]) -> list[str]:
    folded = fold(text)
    if not folded:
        return []
    hits = []
    for t in themes:
        if any(sig in folded for sig in t["signals"]):
            hits.append(t["id"])
    return hits


def build_payload(rows: list[dict], themes: list[dict]) -> dict:
    labels = {t["id"]: t["label"] for t in themes}
    eyebrow = themes[0]["meta_eyebrow"] if themes else "2. Conversation Cluster"
    title = themes[0]["meta_title"] if themes else "Conversation Cluster"

    node_w = Counter()
    edge_w: Counter = Counter()
    node_quotes: dict[str, list[dict]] = defaultdict(list)
    edge_quotes: dict[tuple[str, str], list[dict]] = defaultdict(list)
    n_with_theme = 0

    for r in rows:
        text = r.get("text") or ""
        hits = match_themes(text, themes)
        if not hits:
            continue
        n_with_theme += 1
        for tid in hits:
            node_w[tid] += 1
            if len(node_quotes[tid]) < 6 and text:
                node_quotes[tid].append(
                    {
                        "id": r.get("id"),
                        "text": text[:280],
                        "source": r.get("source"),
                    }
                )
        uniq = sorted(set(hits))
        for i, a in enumerate(uniq):
            for b in uniq[i + 1 :]:
                edge_w[(a, b)] += 1
                if len(edge_quotes[(a, b)]) < EDGE_QUOTE_CAP and text:
                    edge_quotes[(a, b)].append(
                        {
                            "id": r.get("id"),
                            "text": text[:280],
                            "source": r.get("source"),
                        }
                    )

    keep = {t for t, c in node_w.items() if c >= MIN_NODE}
    if len(keep) < 6:
        keep = {t for t, _ in node_w.most_common(min(15, len(node_w)))}

    G = nx.Graph()
    for t in keep:
        G.add_node(t, weight=node_w[t])
    for (a, b), w in edge_w.items():
        if a in keep and b in keep and w >= MIN_EDGE:
            G.add_edge(a, b, weight=w)

    isolates = [n for n in list(G.nodes) if G.degree(n) == 0]
    # Keep isolates as nodes (themes can stand alone); no edge needed
    # but spring_layout still works with isolates

    if G.number_of_nodes() == 0:
        return {
            "eyebrow": eyebrow,
            "title": title,
            "note": "Insufficient theme matches",
            "clusters": [],
            "nodes": [],
            "edges": [],
            "n_comments_with_topics": 0,
        }

    # Communities only on non-isolate subgraph if possible
    core = G.subgraph([n for n in G.nodes if G.degree(n) > 0]).copy()
    if core.number_of_nodes() >= 2 and core.number_of_edges() >= 1:
        communities = list(greedy_modularity_communities(core, weight="weight"))
        communities.sort(key=lambda c: -sum(core.nodes[n]["weight"] for n in c))
    else:
        communities = [set(G.nodes)]

    node_cluster: dict[str, int] = {}
    clusters = []
    total_w = sum(G.nodes[n]["weight"] for n in G.nodes) or 1

    for i, comm in enumerate(communities[: len(CLUSTER_FRUITS)]):
        members = sorted(comm, key=lambda n: -G.nodes[n]["weight"])
        for n in members:
            node_cluster[n] = i
        cw = sum(G.nodes[n]["weight"] for n in members)
        top_labels = [labels.get(m, m) for m in members[:3]]
        clusters.append(
            {
                "id": f"c{i}",
                "fruit": CLUSTER_FRUITS[i],
                "label": CLUSTER_FRUITS[i],
                "subtitle": " · ".join(top_labels),
                "color": CLUSTER_COLORS[i % len(CLUSTER_COLORS)],
                "share_pct": round(100.0 * cw / total_w, 1),
                "n_nodes": len(members),
                "weight": cw,
                "top_topics": members[:5],
            }
        )

    for n in G.nodes:
        if n not in node_cluster:
            # attach leftover / isolates to smallest cluster or new bucket
            if clusters:
                node_cluster[n] = max(range(len(clusters)), key=lambda i: -clusters[i]["n_nodes"])
            else:
                node_cluster[n] = 0

    pos = nx.spring_layout(G, weight="weight", seed=42, k=1.8 / (G.number_of_nodes() ** 0.5 + 0.1))

    max_w = max(G.nodes[n]["weight"] for n in G.nodes) or 1
    nodes = []
    for n in G.nodes:
        x, y = pos[n]
        cid = node_cluster[n]
        cl = clusters[cid] if cid < len(clusters) else clusters[0]
        nodes.append(
            {
                "id": n,
                "label": labels.get(n, n),
                "weight": G.nodes[n]["weight"],
                "r": round(6 + 18 * (G.nodes[n]["weight"] / max_w) ** 0.5, 2),
                "x": round(float(x), 4),
                "y": round(float(y), 4),
                "cluster": cl["id"],
                "color": cl["color"],
                "quotes": node_quotes.get(n, [])[:3],
            }
        )

    all_edged = sorted(
        ((u, v, d["weight"]) for u, v, d in G.edges(data=True)),
        key=lambda x: -x[2],
    )
    weights = [w for _, _, w in all_edged]
    floor = weights[max(0, len(weights) // 3)] if weights else MIN_EDGE

    per_node: dict[str, int] = defaultdict(int)
    picked: list[tuple[str, str, int]] = []
    for u, v, w in all_edged:
        if w < floor and len(picked) >= 12:
            continue
        if per_node[u] >= TOP_EDGES_PER_NODE and per_node[v] >= TOP_EDGES_PER_NODE:
            continue
        if per_node[u] >= TOP_EDGES_PER_NODE + 1 or per_node[v] >= TOP_EDGES_PER_NODE + 1:
            if w < floor:
                continue
        picked.append((u, v, w))
        per_node[u] += 1
        per_node[v] += 1
        if len(picked) >= TOP_EDGES:
            break

    shown_nodes = {n for trip in picked for n in trip[:2]}
    for n in G.nodes:
        if n in shown_nodes or G.degree(n) == 0:
            continue
        neigh = sorted(G[n].items(), key=lambda x: -x[1]["weight"])
        if not neigh:
            continue
        m, dat = neigh[0]
        a, b = (n, m) if n < m else (m, n)
        if not any(u == a and v == b for u, v, _ in picked):
            picked.append((a, b, dat["weight"]))

    picked = sorted(picked, key=lambda x: -x[2])[:TOP_EDGES]
    max_e = picked[0][2] if picked else 1
    edges = []
    for u, v, w in picked:
        key = (u, v) if u < v else (v, u)
        edges.append(
            {
                "source": u,
                "target": v,
                "weight": w,
                "width": round(0.7 + 3.2 * (w / max_e), 2),
                "same_cluster": node_cluster.get(u) == node_cluster.get(v),
                "quotes": edge_quotes.get(key, [])[:3],
            }
        )

    theme_signals = {t["id"]: t["signals"] for t in themes}
    theme_labels = {t["id"]: t["label"] for t in themes}

    return {
        "eyebrow": eyebrow,
        "title": title,
        "axis_note": (
            "Knoten = Conversation-Thema · Größe = Treffer · Linie = gemeinsame Erwähnung "
            "im selben Kommentar (nur stärkste Paare) · Farbe = Community"
        ),
        "note": (
            "Themen = vorgegebene Conversation Cluster (Signalwörter) · "
            "Klick Thema/Linie → Quotes · Hover → Nachbarn"
        ),
        "how_to": [
            "Kreis = Conversation-Thema (größer = öfter erkannt)",
            "Linie = Themen fallen oft im selben Kommentar zusammen",
            "Farbe = Community (stärker vernetzte Themen)",
            "Klick auf Kreis oder Linie öffnet passende Kommentare im Quotes-Panel",
        ],
        "n_total": len(rows),
        "n_comments_with_topics": n_with_theme,
        "method": "conversation-theme keywords + co-occurrence + greedy_modularity",
        "themeSignals": theme_signals,
        "themeLabels": theme_labels,
        "clusters": clusters,
        "nodes": nodes,
        "edges": edges,
    }


def patch_dashboard(payload: dict) -> None:
    text = OUT_JS.read_text(encoding="utf-8")
    m = re.match(r"/\*\*.*?\*/\s*window\.DashboardData\s*=\s*", text, re.S)
    if not m:
        raise SystemExit("Could not parse dashboard_generated.js")
    prefix = m.group(0)
    raw = text[m.end() :]
    if raw.rstrip().endswith(";"):
        raw = raw.rstrip()[:-1]
    data = json.loads(raw)
    data["conversationLandscape"] = payload
    data.setdefault("meta", {})["conversationLandscape"] = "v2 conversation themes"
    # Drop obsolete topic bar chart block from runtime payload (UI removed)
    if "topicLandscape" in data:
        data["topicLandscape"] = {
            **{k: v for k, v in data["topicLandscape"].items() if k not in ("candidates", "blocks")},
            "candidates": [],
            "hidden": True,
            "note": "Replaced by Conversation Cluster network",
        }
    js = prefix.rstrip() + "\n" + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    OUT_JS.write_text(js, encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(CLASSIFIED))
    ap.add_argument("--themes", default=str(THEMES_PATH))
    args = ap.parse_args()

    themes = load_themes(Path(args.themes))
    rows = load_jsonl(Path(args.input))
    print(f"Loaded {len(rows)} · themes={len(themes)}")
    payload = build_payload(rows, themes)
    patch_dashboard(payload)
    print(
        f"Clusters: {len(payload['clusters'])}  nodes={len(payload['nodes'])}  "
        f"edges={len(payload['edges'])}  themed_comments={payload['n_comments_with_topics']}"
    )
    for c in payload["clusters"]:
        print(f"  {c['fruit']} {c['share_pct']}% — {c['subtitle']}")
    print(f"Wrote into {OUT_JS}")


if __name__ == "__main__":
    main()
