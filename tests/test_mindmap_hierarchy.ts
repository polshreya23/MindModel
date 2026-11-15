import assert from 'node:assert/strict';
import {
  buildMindMapHierarchy,
  computeRadialMindMapLayout,
  MindMapNode,
} from '../src/lib/mindMapBuilder.ts';
import { ConceptNode, GraphEdge, SlideContent } from '../src/types/dsa.ts';

function flattenTree(node: MindMapNode): MindMapNode[] {
  return [node, ...node.children.flatMap(flattenTree)];
}

console.log('==========================================================');
console.log('  ModelMind Radial Mind Map Hierarchy & Layout Test Suite ');
console.log('==========================================================');

// [TEST 1] Small document with explicit title
console.log('[TEST 1] Testing small document with document title...');
const smallNodes: ConceptNode[] = [
  { id: 'tree', name: 'Binary Tree', description: 'Hierarchical tree', category: 'Data Structure', frequency: 4, importanceScore: 8, inDegreePrereq: 0 },
  { id: 'bst', name: 'Binary Search Tree', description: 'Ordered binary tree', category: 'Data Structure', frequency: 3, importanceScore: 7, inDegreePrereq: 1 },
  { id: 'heap', name: 'Heap', description: 'Complete binary tree', category: 'Data Structure', frequency: 3, importanceScore: 6, inDegreePrereq: 1 },
  { id: 'graph', name: 'Graph', description: 'Vertices and edges', category: 'Data Structure', frequency: 5, importanceScore: 9, inDegreePrereq: 0 },
];
const smallEdges: GraphEdge[] = [
  { fromId: 'tree', toId: 'bst', relation: 'prerequisite for', type: 'PREREQUISITE', weight: 1 },
  { fromId: 'tree', toId: 'heap', relation: 'associated with', type: 'CONCEPTUAL', weight: 1.5 },
];
const smallTree = buildMindMapHierarchy({
  nodes: smallNodes,
  edges: smallEdges,
  documentTitle: 'PDF: Nonlinear Structures.pdf',
});
assert(smallTree !== null);
assert.equal(smallTree.depth, 0);
assert.equal(smallTree.label, 'Nonlinear Structures');
assert(smallTree.children.length >= 2, 'Expected main branches attached to central topic');
const smallFlat = flattenTree(smallTree);
assert(smallFlat.some((n) => n.conceptId === 'bst' && n.depth >= 2), 'Expected Binary Search Tree nested under Binary Tree');
console.log(`  ✓ Small doc tree verified (${smallTree.children.length} main branches, ${smallFlat.length} total nodes)`);

// [TEST 2] Fallback Central Topic from NLP importance when no document title exists
console.log('[TEST 2] Testing automatic central concept fallback without title...');
const untitledTree = buildMindMapHierarchy({
  nodes: smallNodes,
  edges: smallEdges,
  heapTopK: [{ id: 'graph', name: 'Graph', score: 9.5, frequency: 5, degree: 3 }],
  documentTitle: null,
});
assert(untitledTree !== null);
assert.equal(untitledTree.label, 'Graph');
assert.equal(untitledTree.depth, 0);
console.log(`  ✓ Central topic automatically selected top concept: "${untitledTree.label}"`);

// [TEST 3] Large document (22 concepts) -> Multi-level hierarchy + Zero circle overlap
console.log('[TEST 3] Testing large document radial layout & zero overlap...');
const largeNodes: ConceptNode[] = Array.from({ length: 22 }, (_, i) => ({
  id: `concept_${i}`,
  name: i === 0 ? 'Operating Systems' : i % 3 === 0 ? `Scheduling Method ${i}` : i % 3 === 1 ? `Memory Unit ${i}` : `Sync Primitive ${i}`,
  description: `Detailed description for concept ${i}`,
  category: i % 3 === 0 ? 'Algorithm' : i % 3 === 1 ? 'Data Structure' : 'Fundamental Concept',
  frequency: Math.max(1, 8 - (i % 5)),
  importanceScore: Math.max(2, 12 - i * 0.4),
  inDegreePrereq: i % 4,
}));
const largeEdges: GraphEdge[] = [];
for (let i = 1; i < largeNodes.length; i++) {
  largeEdges.push({
    fromId: `concept_${i % 5}`,
    toId: `concept_${i}`,
    relation: i % 2 === 0 ? 'prerequisite for' : 'associated with',
    type: i % 2 === 0 ? 'PREREQUISITE' : 'CONCEPTUAL',
    weight: i % 2 === 0 ? 1.0 : 1.5,
  });
}

const largeTree = buildMindMapHierarchy({
  nodes: largeNodes,
  edges: largeEdges,
  documentTitle: 'Operating Systems & Concurrency',
});
assert(largeTree !== null);
const largeFlat = flattenTree(largeTree);
const maxDepth = Math.max(...largeFlat.map((n) => n.depth));
assert(largeTree.children.length >= 3 && largeTree.children.length <= 6, `Expected 3-6 main branches, got ${largeTree.children.length}`);
assert(maxDepth >= 2, `Expected multi-level depth >= 2, got ${maxDepth}`);

const branchIndices = new Set(largeFlat.filter((n) => n.depth >= 1).map((n) => n.branchIndex));
assert(branchIndices.size >= 3, `Expected >= 3 coordinated branch colors, got ${branchIndices.size}`);

const layout = computeRadialMindMapLayout(largeTree, new Set(), new Map());
assert.equal(layout.nodes.length, largeFlat.length);
assert.equal(layout.edges.length, largeFlat.length - 1);

// Verify zero circle-to-circle overlap
for (let i = 0; i < layout.nodes.length; i++) {
  for (let j = i + 1; j < layout.nodes.length; j++) {
    const a = layout.nodes[i];
    const b = layout.nodes[j];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    assert(
      dist >= a.radius + b.radius + 10,
      `Nodes ${a.node.label} and ${b.node.label} overlap (dist=${dist.toFixed(1)}, min=${a.radius + b.radius + 10})`
    );
  }
}
console.log(`  ✓ Large doc verified (${largeTree.children.length} branches, max depth ${maxDepth}, 0 overlaps across ${layout.nodes.length} circular nodes)`);

// [TEST 4] Expand / Collapse and custom node dragging
console.log('[TEST 4] Testing expand/collapse & custom dragged node positions...');
const firstBranchId = largeTree.children[0].id;
const collapsedLayout = computeRadialMindMapLayout(
  largeTree,
  new Set([firstBranchId]),
  new Map([[firstBranchId, { x: 310, y: -120 }]])
);
assert(collapsedLayout.nodes.length < layout.nodes.length, 'Collapsed branch should hide its sub-branches');
const movedBranch = collapsedLayout.nodes.find((n) => n.node.id === firstBranchId)!;
assert.equal(movedBranch.x, 310);
assert.equal(movedBranch.y, -120);
assert(movedBranch.hiddenDescendantCount > 0, 'Collapsed branch should report hidden descendant count');
console.log(`  ✓ Collapse hid ${movedBranch.hiddenDescendantCount} descendants & preserved dragged coordinates`);

// [TEST 5] PowerPoint slide hierarchy support
console.log('[TEST 5] Testing PowerPoint slide-structured Mind Map generation...');
const slides: SlideContent[] = [
  { slideNumber: 1, title: 'Linear Data Structures', text: 'Arrays and Stacks', bulletPoints: [], tables: [], charCount: 40 },
  { slideNumber: 2, title: 'Hierarchical Trees', text: 'Binary Tree and Heap', bulletPoints: [], tables: [], charCount: 40 },
  { slideNumber: 3, title: 'Graph Algorithms', text: 'BFS and Dijkstra', bulletPoints: [], tables: [], charCount: 40 },
];
const pptxNodes: ConceptNode[] = [
  { id: 'arr', name: 'Array', description: 'Contiguous memory', category: 'Data Structure', frequency: 3, importanceScore: 6, inDegreePrereq: 0, slideRefs: [{ slideNumber: 1, title: 'Linear Data Structures' }] },
  { id: 'stk', name: 'Stack', description: 'LIFO structure', category: 'Data Structure', frequency: 3, importanceScore: 6, inDegreePrereq: 1, slideRefs: [{ slideNumber: 1, title: 'Linear Data Structures' }] },
  { id: 'bt', name: 'Binary Tree', description: 'Tree nodes', category: 'Data Structure', frequency: 4, importanceScore: 7, inDegreePrereq: 0, slideRefs: [{ slideNumber: 2, title: 'Hierarchical Trees' }] },
  { id: 'hp', name: 'Heap', description: 'Priority heap', category: 'Data Structure', frequency: 3, importanceScore: 6, inDegreePrereq: 1, slideRefs: [{ slideNumber: 2, title: 'Hierarchical Trees' }] },
  { id: 'bfs', name: 'Breadth First Search', description: 'Level traversal', category: 'Algorithm', frequency: 4, importanceScore: 8, inDegreePrereq: 0, slideRefs: [{ slideNumber: 3, title: 'Graph Algorithms' }] },
  { id: 'dijk', name: 'Dijkstra', description: 'Shortest path', category: 'Algorithm', frequency: 4, importanceScore: 8, inDegreePrereq: 1, slideRefs: [{ slideNumber: 3, title: 'Graph Algorithms' }] },
];
const pptxTree = buildMindMapHierarchy({
  nodes: pptxNodes,
  edges: [],
  documentTitle: 'CS201 Lecture Deck',
  slides,
});
assert(pptxTree !== null);
assert.equal(pptxTree.label, 'CS201 Lecture Deck');
assert.equal(pptxTree.children.length, 3);
assert.deepEqual(
  pptxTree.children.map((c) => c.label),
  ['Linear Data Structures', 'Hierarchical Trees', 'Graph Algorithms']
);
console.log('  ✓ PPTX slide topics mapped to radial Main Branches with sub-concepts');

console.log('==========================================================');
console.log('  ALL MIND MAP HIERARCHY & LAYOUT TESTS PASSED!           ');
console.log('==========================================================');
