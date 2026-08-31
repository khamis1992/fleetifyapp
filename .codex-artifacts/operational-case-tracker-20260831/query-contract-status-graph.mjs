import fs from 'node:fs/promises';

const graphPath = 'C:/Users/khamis/Documents/fleetifyapp/graphify-out/graph.json';
const data = JSON.parse(await fs.readFile(graphPath, 'utf8'));
const terms = ['contract', 'status', 'contractstatus'];
const nodesById = new Map(data.nodes.map((node) => [String(node.id), node]));
const adjacency = new Map([...nodesById.keys()].map((id) => [id, new Set()]));
const edgeByPair = new Map();

for (const edge of data.links ?? []) {
  const source = String(typeof edge.source === 'object' ? edge.source.id : edge.source);
  const target = String(typeof edge.target === 'object' ? edge.target.id : edge.target);
  if (!adjacency.has(source) || !adjacency.has(target)) continue;
  adjacency.get(source).add(target);
  adjacency.get(target).add(source);
  edgeByPair.set(`${source}\u0000${target}`, edge);
  edgeByPair.set(`${target}\u0000${source}`, edge);
}

const isActiveSource = (node) => !String(node.source_file ?? '').replaceAll('\\', '/').includes('.archive/');
const scoreNode = (node) => {
  const label = String(node.label ?? '').toLowerCase();
  return terms.reduce((score, term) => score + Number(label.includes(term)), 0);
};

const starts = data.nodes
  .filter(isActiveSource)
  .map((node) => ({ node, score: scoreNode(node), degree: adjacency.get(String(node.id))?.size ?? 0 }))
  .filter(({ score }) => score > 0)
  .sort((a, b) => b.score - a.score || b.degree - a.degree)
  .slice(0, 3)
  .map(({ node }) => String(node.id));

const visited = new Set(starts);
let frontier = [...starts];
const traversedEdges = [];
for (let depth = 0; depth < 2; depth += 1) {
  const next = [];
  for (const id of frontier) {
    for (const neighbor of adjacency.get(id) ?? []) {
      const neighborNode = nodesById.get(neighbor);
      if (!neighborNode || !isActiveSource(neighborNode) || visited.has(neighbor)) continue;
      visited.add(neighbor);
      next.push(neighbor);
      traversedEdges.push([id, neighbor]);
    }
  }
  frontier = next;
}

const ranked = [...visited].sort((a, b) => {
  const left = nodesById.get(a);
  const right = nodesById.get(b);
  return scoreNode(right) - scoreNode(left)
    || (adjacency.get(b)?.size ?? 0) - (adjacency.get(a)?.size ?? 0);
});

console.log('START');
for (const id of starts) {
  const node = nodesById.get(id);
  console.log(`${node.label} | src=${node.source_file ?? ''} | loc=${node.source_location ?? ''}`);
}
console.log('NODES');
for (const id of ranked.slice(0, 80)) {
  const node = nodesById.get(id);
  console.log(`${node.label} | src=${node.source_file ?? ''} | loc=${node.source_location ?? ''}`);
}
console.log('EDGES');
for (const [source, target] of traversedEdges.slice(0, 120)) {
  const edge = edgeByPair.get(`${source}\u0000${target}`) ?? {};
  console.log(`${nodesById.get(source).label} --${edge.relation ?? ''}--> ${nodesById.get(target).label}`);
}
