import json
from pathlib import Path

import networkx as nx
from networkx.readwrite import json_graph

graph_path = Path(r"C:\Users\khamis\Documents\fleetifyapp\graphify-out\graph.json")
data = json.loads(graph_path.read_text(encoding="utf-8"))
graph = json_graph.node_link_graph(data, edges="links")
terms = ["contract", "status", "contractstatus"]

scored = []
for node_id, node_data in graph.nodes(data=True):
    label = str(node_data.get("label", "")).lower()
    score = sum(1 for term in terms if term in label)
    source = str(node_data.get("source_file", ""))
    if score and ".archive/" not in source.replace("\\", "/"):
        scored.append((score, graph.degree(node_id), node_id))
scored.sort(reverse=True)
start_nodes = [node_id for _, _, node_id in scored[:3]]

subgraph_nodes = set(start_nodes)
frontier = set(start_nodes)
edges = []
for _ in range(2):
    next_frontier = set()
    for node_id in frontier:
        for neighbor in graph.neighbors(node_id):
            neighbor_source = str(graph.nodes[neighbor].get("source_file", ""))
            if ".archive/" in neighbor_source.replace("\\", "/"):
                continue
            if neighbor not in subgraph_nodes:
                next_frontier.add(neighbor)
                edges.append((node_id, neighbor))
    subgraph_nodes.update(next_frontier)
    frontier = next_frontier

print("START")
for node_id in start_nodes:
    node = graph.nodes[node_id]
    print(node.get("label"), node.get("source_file"), node.get("source_location"))
print("NODES")
ranked = sorted(
    subgraph_nodes,
    key=lambda node_id: (
        sum(term in str(graph.nodes[node_id].get("label", "")).lower() for term in terms),
        graph.degree(node_id),
    ),
    reverse=True,
)
for node_id in ranked[:80]:
    node = graph.nodes[node_id]
    print(
        f"{node.get('label')} | src={node.get('source_file', '')} | "
        f"loc={node.get('source_location', '')}"
    )
print("EDGES")
for source, target in edges[:120]:
    raw = graph[source][target]
    edge = next(iter(raw.values()), {}) if isinstance(graph, nx.MultiGraph) else raw
    print(
        f"{graph.nodes[source].get('label', source)} --{edge.get('relation', '')}--> "
        f"{graph.nodes[target].get('label', target)}"
    )
