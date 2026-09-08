#!/usr/bin/env python3
"""
Chart 9 — Conversation Landscape (topic co-occurrence network + communities).

Builds an undirected graph from co-occurring classifier topics within the same
comment, runs greedy modularity community detection (Louvain-style), and patches
dashboard_generated.js with nodes/edges/clusters for a force-directed view.

Usage:
  python3 scripts/aggregate_clusters.py
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities

ROOT = Path(__file__).resolve().parents[1]
CLASSIFIED = ROOT / "data" / "classified_v10.jsonl"
REF = ROOT / "data" / "dashboard-reference.json"
OUT_JS = ROOT / "data" / "dashboard_generated.js"

# Soft fruit-style labels (Pulsar aesthetic) + thematic subtitle from top nodes
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

MIN_NODE = 40  # drop rare topics
MIN_EDGE = 12  # for community detection graph
MAX_NODES = 56
TOP_EDGES = 42  # display cap (sparse readable network)
TOP_EDGES_PER_NODE = 3
EDGE_QUOTE_CAP = 5


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def topic_labels(ref: dict) -> dict[str, str]:
    out = {}
    for c in ref.get("chart2_topicLandscape", {}).get("candidates", []):
        out[c["id"]] = c.get("label") or c["id"]
    return out


def build_payload(rows: list[dict], labels: dict[str, str]) -> dict:
    node_w = Counter()
    edge_w: Counter = Counter()
    node_quotes: dict[str, list[dict]] = defaultdict(list)
    edge_quotes: dict[tuple[str, str], list[dict]] = defaultdict(list)

    for r in rows:
        topics = [t for t in (r.get("topics") or []) if t]
        if not topics:
            continue
        for t in topics:
            node_w[t] += 1
            if len(node_quotes[t]) < 6 and r.get("text"):
                node_quotes[t].append(
                    {
                        "id": r.get("id"),
                        "text": (r.get("text") or "")[:280],
                        "source": r.get("source"),
                    }
                )
        uniq = sorted(set(topics))
        for i, a in enumerate(uniq):
            for b in uniq[i + 1 :]:
                edge_w[(a, b)] += 1
                if len(edge_quotes[(a, b)]) < EDGE_QUOTE_CAP and r.get("text"):
                    edge_quotes[(a, b)].append(
                        {
                            "id": r.get("id"),
                            "text": (r.get("text") or "")[:280],
                            "source": r.get("source"),
                        }
                    )

    # Keep strongest nodes
    keep = {t for t, c in node_w.most_common(MAX_NODES) if c >= MIN_NODE}
    if len(keep) < 8:
        keep = {t for t, _ in node_w.most_common(min(24, len(node_w)))}

    G = nx.Graph()
    for t in keep:
        G.add_node(t, weight=node_w[t])
    for (a, b), w in edge_w.items():
        if a in keep and b in keep and w >= MIN_EDGE:
            G.add_edge(a, b, weight=w)

    # Drop isolates for a readable landscape
    isolates = [n for n in list(G.nodes) if G.degree(n) == 0]
    G.remove_nodes_from(isolates)

    if G.number_of_nodes() == 0:
        return {
            "eyebrow": "9. Conversation Landscape",
            "title": "How conversations cluster in the corpus",
            "note": "Insufficient co-occurrence structure",
            "clusters": [],
            "nodes": [],
            "edges": [],
            "n_comments_with_topics": sum(1 for r in rows if r.get("topics")),
        }

    communities = list(greedy_modularity_communities(G, weight="weight"))
    communities.sort(key=lambda c: -sum(G.nodes[n]["weight"] for n in c))

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

    # leftover nodes → last cluster bucket
    for n in G.nodes:
        if n not in node_cluster:
            node_cluster[n] = max(0, len(clusters) - 1)

    # Layout seed via spring (deterministic-ish)
    pos = nx.spring_layout(G, weight="weight", seed=42, k=1.6 / (G.number_of_nodes() ** 0.5 + 0.1))

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

    # Sparse display edges: top-k per node + global weight floor (not near-complete graph)
    all_edged = sorted(
        ((u, v, d["weight"]) for u, v, d in G.edges(data=True)),
        key=lambda x: -x[2],
    )
    weights = [w for _, _, w in all_edged]
    floor = weights[max(0, len(weights) // 3)] if weights else MIN_EDGE  # ~top tertile

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

    # Ensure weak isolates still connected by their strongest edge
    shown_nodes = {n for trip in picked for n in trip[:2]}
    for n in G.nodes:
        if n in shown_nodes:
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

    n_topic = sum(1 for r in rows if r.get("topics"))
    return {
        "eyebrow": "9. Conversation Landscape",
        "title": "How anti-aging conversations cluster together",
        "axis_note": (
            "Knoten = Thema · Größe = Häufigkeit · Linie = gemeinsame Erwähnung im selben Kommentar "
            "(nur stärkste Paare) · Farbe = Community"
        ),
        "note": (
            "Klick Thema oder Linie → Quotes · Hover → Nachbarn · "
            "Cluster unüberwacht (greedy modularity) · Fruchtnamen = Lesbarkeit"
        ),
        "how_to": [
            "Kreis = Thema (größer = öfter genannt)",
            "Linie = Themen fallen oft im selben Kommentar zusammen",
            "Farbe = Community (Themen, die untereinander stärker vernetzt sind)",
            "Klick auf Kreis oder Linie öffnet passende Kommentare rechts",
        ],
        "n_total": len(rows),
        "n_comments_with_topics": n_topic,
        "method": "topic co-occurrence + greedy_modularity_communities · sparse top edges",
        "clusters": clusters,
        "nodes": nodes,
        "edges": edges,
    }


def patch_dashboard(payload: dict) -> None:
    text = OUT_JS.read_text(encoding="utf-8")
    m = re.match(r"/\*\*.*?\*/\s*window\.DashboardData\s*=\s*", text, re.S)
    if not m:
        raise SystemExit("Could not parse dashboard_generated.js")
    body = text[m.end() :].rstrip().rstrip(";")
    data = json.loads(body)
    data["conversationLandscape"] = payload
    data.setdefault("meta", {})["conversationLandscape"] = "v1 topic co-occurrence"
    js = (
        "/** AUTO-GENERATED — do not edit by hand */\n"
        f"window.DashboardData = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    )
    OUT_JS.write_text(js, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(CLASSIFIED))
    args = parser.parse_args()
    rows = load_jsonl(Path(args.input))
    ref = json.loads(REF.read_text(encoding="utf-8"))
    labels = topic_labels(ref)
    print(f"Loaded {len(rows)}")
    payload = build_payload(rows, labels)
    patch_dashboard(payload)
    print(f"Clusters: {len(payload['clusters'])}  nodes={len(payload['nodes'])}  edges={len(payload['edges'])}")
    for c in payload["clusters"]:
        print(f"  {c['fruit']} {c['share_pct']}% — {c['subtitle']}")
    print(f"Wrote into {OUT_JS}")


if __name__ == "__main__":
    main()
