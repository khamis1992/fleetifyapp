import json
from pathlib import Path

data = json.loads(Path("graphify-out/graph.json").read_text(encoding="utf-8"))
node_list = data.get("nodes", [])
nodes_by_id = {node.get("id"): node for node in node_list}
links = data.get("links", data.get("edges", []))
adjacency = {node_id: [] for node_id in nodes_by_id}
degree = {node_id: 0 for node_id in nodes_by_id}
for link in links:
    left = link.get("source")
    right = link.get("target")
    if isinstance(left, dict):
        left = left.get("id")
    if isinstance(right, dict):
        right = right.get("id")
    if left in adjacency and right in adjacency:
        adjacency[left].append((right, link))
        adjacency[right].append((left, link))
        degree[left] += 1
        degree[right] += 1
terms = "lawsuit legal memo document generator taqadi narrative requests claims facts evidence preparation".split()


def relevance(node_id):
    label = str(nodes_by_id[node_id].get("label", "")).lower()
    return sum(1 for term in terms if term in label)


scored = sorted(
    ((relevance(node_id), node_id) for node_id in nodes_by_id),
    reverse=True,
)
starts = [node_id for score, node_id in scored if score > 0][:5]
nodes = set(starts)
edges = []
frontier = set(starts)
for _ in range(2):
    next_frontier = set()
    for node_id in frontier:
        for neighbor, link in adjacency[node_id]:
            if neighbor not in nodes:
                next_frontier.add(neighbor)
                edges.append((node_id, neighbor, link))
    nodes.update(next_frontier)
    frontier = next_frontier

ranked = sorted(nodes, key=lambda node_id: (relevance(node_id), degree[node_id]), reverse=True)
print("STARTS")
for node_id in starts:
    item = nodes_by_id[node_id]
    print(item.get("label"), "|", item.get("source_file", ""), "|", item.get("source_location", ""))

print("\nRELEVANT NODES")
for node_id in ranked[:80]:
    item = nodes_by_id[node_id]
    print(
        relevance(node_id),
        item.get("label", node_id),
        "|",
        item.get("source_file", ""),
        "|",
        item.get("source_location", ""),
    )

print("\nRELEVANT EDGES")
for left, right, edge in edges[:120]:
    print(
        nodes_by_id[left].get("label", left),
        "--",
        edge.get("relation", ""),
        "-->",
        nodes_by_id[right].get("label", right),
    )
