import {
  ConceptNode,
  GraphEdge,
  RankedConcept,
  SlideContent,
  SlideReference,
  TopologicalSortResult,
} from '../types/dsa.ts';

export interface MindMapNode {
  id: string;
  conceptId: string;
  label: string;
  description: string;
  category: string;
  depth: number; // 0 = central topic, 1 = main branch, 2 = sub-branch, 3 = detail node
  branchIndex: number; // -1 for central topic, 0..N-1 for main branches & their descendants
  relationToParent?: string;
  edgeTypeToParent?: 'PREREQUISITE' | 'CONCEPTUAL' | 'HIERARCHY';
  importanceScore: number;
  frequency: number;
  slideRefs?: SlideReference[];
  children: MindMapNode[];
}

export interface PositionedMindMapNode {
  node: MindMapNode;
  x: number;
  y: number;
  radius: number;
  angle: number;
  parentId: string | null;
  hiddenDescendantCount: number;
  totalDescendantCount: number;
}

export interface PositionedMindMapEdge {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  branchIndex: number;
  depth: number; // depth of target node
  relation: string;
  edgeType: 'PREREQUISITE' | 'CONCEPTUAL' | 'HIERARCHY';
}

export interface MindMapBuildInput {
  nodes: ConceptNode[];
  edges: GraphEdge[];
  topologicalSort?: TopologicalSortResult | null;
  heapTopK?: RankedConcept[];
  documentTitle?: string | null;
  summaryText?: string | null;
  slides?: SlideContent[];
}

export interface BranchPalette {
  name: string;
  primaryFill: string;
  primaryStroke: string;
  primaryText: string;
  subFill: string;
  subStroke: string;
  subText: string;
  detailFill: string;
  detailStroke: string;
  detailText: string;
  edgeColor: string;
}

// Coordinated Editorial Academic Theme Palettes
// Primary background: #F5F1E8 | Deep Teal: #174A45 | Muted Coral: #E88968 | Sage Green: #A9BCA8 | Charcoal: #252D2B
export const BRANCH_PALETTES: BranchPalette[] = [
  {
    name: 'Deep Teal',
    primaryFill: '#174A45',
    primaryStroke: '#0E312D',
    primaryText: '#FAF7F2',
    subFill: '#2A665F',
    subStroke: '#174A45',
    subText: '#FAF7F2',
    detailFill: '#EAF2F1',
    detailStroke: '#174A45',
    detailText: '#174A45',
    edgeColor: '#174A45',
  },
  {
    name: 'Muted Coral',
    primaryFill: '#E88968',
    primaryStroke: '#C26140',
    primaryText: '#252D2B',
    subFill: '#F2AE95',
    subStroke: '#C26140',
    subText: '#252D2B',
    detailFill: '#FDF1EC',
    detailStroke: '#C26140',
    detailText: '#252D2B',
    edgeColor: '#D67250',
  },
  {
    name: 'Sage Green',
    primaryFill: '#A9BCA8',
    primaryStroke: '#5F7A5E',
    primaryText: '#252D2B',
    subFill: '#C5D4C4',
    subStroke: '#5F7A5E',
    subText: '#252D2B',
    detailFill: '#F1F6F1',
    detailStroke: '#5F7A5E',
    detailText: '#252D2B',
    edgeColor: '#698568',
  },
  {
    name: 'Charcoal Ink',
    primaryFill: '#252D2B',
    primaryStroke: '#121716',
    primaryText: '#FAF7F2',
    subFill: '#45504D',
    subStroke: '#252D2B',
    subText: '#FAF7F2',
    detailFill: '#ECE9E2',
    detailStroke: '#252D2B',
    detailText: '#252D2B',
    edgeColor: '#3E4845',
  },
  {
    name: 'Warm Sand',
    primaryFill: '#C8A978',
    primaryStroke: '#8C6D3B',
    primaryText: '#252D2B',
    subFill: '#DFC9A3',
    subStroke: '#8C6D3B',
    subText: '#252D2B',
    detailFill: '#FAF3E6',
    detailStroke: '#8C6D3B',
    detailText: '#252D2B',
    edgeColor: '#9E7D48',
  },
  {
    name: 'Forest Slate',
    primaryFill: '#3B6E62',
    primaryStroke: '#234940',
    primaryText: '#FAF7F2',
    subFill: '#5B8E82',
    subStroke: '#234940',
    subText: '#FAF7F2',
    detailFill: '#ECF4F2',
    detailStroke: '#3B6E62',
    detailText: '#234940',
    edgeColor: '#3B6E62',
  },
];

const LEADING_ARTICLE_RE = /^(?:a|an|the)\s+/i;

function normalizeTitle(raw?: string | null): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Remove auto-generated prefixes
  cleaned = cleaned
    .replace(/^(?:PDF|PPTX|PPT|Sample):\s*/i, '')
    .replace(/\.(?:pdf|pptx|ppt|txt)$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Treat auto-derived fallback titles as absent so we pick the top NLP concept
  if (
    !cleaned ||
    cleaned.startsWith('Curriculum:') ||
    cleaned === 'DSA Knowledge Graph Analysis' ||
    cleaned === 'Untitled Presentation'
  ) {
    return '';
  }

  return cleaned;
}

function stripArticle(name: string): string {
  return name.replace(LEADING_ARTICLE_RE, '').trim().toLowerCase();
}

function tokenizeConcept(name: string): string[] {
  return stripArticle(name)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Checks if `parentName` is a natural lexical generalization of `childName`
 * (e.g. "Binary Tree" -> "Binary Search Tree", "Queue" -> "Priority Queue").
 */
function isLexicalParent(parentName: string, childName: string): boolean {
  const pNorm = stripArticle(parentName);
  const cNorm = stripArticle(childName);
  if (!pNorm || !cNorm || pNorm === cNorm) return false;

  const pTokens = tokenizeConcept(parentName);
  const cTokens = tokenizeConcept(childName);
  if (pTokens.length === 0 || pTokens.length >= cTokens.length) return false;

  // Check if all parent tokens appear in child tokens (singular/plural tolerant)
  return pTokens.every((pt) =>
    cTokens.some(
      (ct) => ct === pt || (pt.length > 3 && (ct === `${pt}s` || pt === `${ct}s`))
    )
  );
}

/**
 * Builds a clean multi-level radial Mind Map tree from extracted concepts, edges,
 * and optional document metadata without altering the underlying DSA graph.
 */
export function buildMindMapHierarchy(input: MindMapBuildInput): MindMapNode | null {
  const { nodes, edges, heapTopK, documentTitle, summaryText, slides } = input;
  if (!nodes || nodes.length === 0) return null;

  const nodeMap = new Map<string, ConceptNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build adjacency lookups and degree counts
  const prereqOut = new Map<string, Set<string>>();
  const prereqIn = new Map<string, Set<string>>();
  const conceptualNeighbors = new Map<string, Map<string, number>>();
  const totalDegree = new Map<string, number>();

  nodes.forEach((n) => {
    prereqOut.set(n.id, new Set());
    prereqIn.set(n.id, new Set());
    conceptualNeighbors.set(n.id, new Map());
    totalDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (!nodeMap.has(e.fromId) || !nodeMap.has(e.toId) || e.fromId === e.toId) return;
    totalDegree.set(e.fromId, (totalDegree.get(e.fromId) || 0) + 1);
    totalDegree.set(e.toId, (totalDegree.get(e.toId) || 0) + 1);

    if (e.type === 'PREREQUISITE') {
      prereqOut.get(e.fromId)?.add(e.toId);
      prereqIn.get(e.toId)?.add(e.fromId);
    } else {
      const weight = Math.max(0.1, e.weight || 1.0);
      const existingFwd = conceptualNeighbors.get(e.fromId)?.get(e.toId) ?? Infinity;
      conceptualNeighbors.get(e.fromId)?.set(e.toId, Math.min(existingFwd, weight));
      const existingRev = conceptualNeighbors.get(e.toId)?.get(e.fromId) ?? Infinity;
      conceptualNeighbors.get(e.toId)?.set(e.fromId, Math.min(existingRev, weight));
    }
  });

  // Compute unified importance score per concept
  const heapScoreMap = new Map<string, number>();
  (heapTopK || []).forEach((h, idx) => {
    heapScoreMap.set(h.id, h.score + Math.max(0, 10 - idx));
  });

  const rankScore = new Map<string, number>();
  nodes.forEach((n) => {
    const base =
      (heapScoreMap.get(n.id) ?? n.importanceScore ?? 0) * 1.8 +
      (n.frequency || 1) * 1.6 +
      (totalDegree.get(n.id) || 0) * 1.1;
    rankScore.set(n.id, base);
  });

  const rankedNodes = [...nodes].sort(
    (a, b) => (rankScore.get(b.id) || 0) - (rankScore.get(a.id) || 0)
  );

  // Step 1: Determine Central Topic
  const cleanedDocTitle = normalizeTitle(documentTitle);
  let promotedRootConcept: ConceptNode | null = null;

  if (cleanedDocTitle) {
    // Check if cleanedDocTitle directly matches an extracted concept
    const titleNorm = stripArticle(cleanedDocTitle);
    promotedRootConcept =
      rankedNodes.find((n) => stripArticle(n.name) === titleNorm) || null;
  } else {
    // No document title -> promote the #1 highest-importance central concept
    promotedRootConcept = rankedNodes[0];
  }

  const centralLabel = cleanedDocTitle || promotedRootConcept?.name || rankedNodes[0].name;
  const primaryConcept = promotedRootConcept || rankedNodes[0];

  const rootNode: MindMapNode = {
    id: promotedRootConcept ? promotedRootConcept.id : '__central_topic__',
    conceptId: primaryConcept.id,
    label: centralLabel,
    description:
      summaryText ||
      primaryConcept.description ||
      `Central topic synthesizing ${nodes.length} extracted concepts.`,
    category: 'Central Topic',
    depth: 0,
    branchIndex: -1,
    importanceScore: primaryConcept.importanceScore || 10,
    frequency: primaryConcept.frequency || nodes.length,
    slideRefs: primaryConcept.slideRefs,
    children: [],
  };

  // Remaining concepts to organize into Main Branches -> Sub-Branches -> Details
  const remaining = rankedNodes.filter(
    (n) => !promotedRootConcept || n.id !== promotedRootConcept.id
  );

  if (remaining.length === 0) {
    return rootNode;
  }

  // Helper to get relationship metadata between parent and child
  const getEdgeMeta = (
    parentId: string,
    childId: string
  ): { relation: string; edgeType: 'PREREQUISITE' | 'CONCEPTUAL' | 'HIERARCHY' } => {
    if (prereqOut.get(parentId)?.has(childId)) {
      return { relation: 'prerequisite for', edgeType: 'PREREQUISITE' };
    }
    if (prereqIn.get(parentId)?.has(childId)) {
      return { relation: 'depends on', edgeType: 'PREREQUISITE' };
    }
    if (conceptualNeighbors.get(parentId)?.has(childId)) {
      return { relation: 'associated with', edgeType: 'CONCEPTUAL' };
    }
    return { relation: 'sub-concept', edgeType: 'HIERARCHY' };
  };

  // Helper: score affinity between a candidate parent and child
  const affinityScore = (parent: ConceptNode, child: ConceptNode): number => {
    let score = 0;
    if (isLexicalParent(parent.name, child.name)) score += 90;
    else if (isLexicalParent(child.name, parent.name)) score += 35;

    if (prereqOut.get(parent.id)?.has(child.id)) score += 55;
    if (prereqIn.get(parent.id)?.has(child.id)) score += 18;

    const concWeight = conceptualNeighbors.get(parent.id)?.get(child.id);
    if (concWeight !== undefined) {
      score += 32 / Math.max(0.4, concWeight);
    }

    if (parent.category === child.category) score += 14;

    // Shared slide bonus for PPTX
    if (parent.slideRefs?.length && child.slideRefs?.length) {
      const parentSlides = new Set(parent.slideRefs.map((s) => s.slideNumber));
      if (child.slideRefs.some((s) => parentSlides.has(s.slideNumber))) {
        score += 22;
      }
    }

    return score;
  };

  // Helper: build Level 2 & Level 3 sub-tree inside a Main Branch cluster
  const populateSubtree = (
    branchRoot: MindMapNode,
    branchConcept: ConceptNode,
    members: ConceptNode[],
    branchIndex: number
  ) => {
    if (members.length === 0) return;

    // Sort members by rankScore descending
    const sortedMembers = [...members].sort(
      (a, b) => (rankScore.get(b.id) || 0) - (rankScore.get(a.id) || 0)
    );

    // If small cluster (<= 3), attach directly or nest obvious lexical/prereq child
    if (sortedMembers.length <= 3) {
      const placed = new Map<string, MindMapNode>();
      for (const m of sortedMembers) {
        // Check if one of the already-placed Depth 2 siblings is a natural parent
        let bestDepth2Parent: MindMapNode | null = null;
        let bestScore = 0;
        for (const pNode of placed.values()) {
          if (pNode.depth !== 2) continue;
          const pConcept = nodeMap.get(pNode.conceptId)!;
          const isLex = isLexicalParent(pConcept.name, m.name);
          const isPrereq = prereqOut.get(pConcept.id)?.has(m.id);
          if (isLex || isPrereq) {
            const sc = (isLex ? 90 : 0) + (isPrereq ? 55 : 0);
            if (sc > bestScore) {
              bestScore = sc;
              bestDepth2Parent = pNode;
            }
          }
        }

        const parentObj = bestDepth2Parent || branchRoot;
        const parentConcept = nodeMap.get(parentObj.conceptId) || branchConcept;
        const meta = getEdgeMeta(parentConcept.id, m.id);
        const childNode: MindMapNode = {
          id: m.id,
          conceptId: m.id,
          label: m.name,
          description: m.description,
          category: m.category,
          depth: parentObj.depth + 1,
          branchIndex,
          relationToParent: meta.relation,
          edgeTypeToParent: meta.edgeType,
          importanceScore: m.importanceScore || 0,
          frequency: m.frequency || 1,
          slideRefs: m.slideRefs,
          children: [],
        };
        parentObj.children.push(childNode);
        placed.set(m.id, childNode);
      }
      return;
    }

    // Medium/large cluster (>= 4 members):
    // Pick up to 3–4 Depth-2 Sub-Branch heads, then nest remaining members as Depth 3!
    const maxDirectSubBranches = Math.min(4, Math.max(2, Math.ceil(sortedMembers.length / 2.5)));
    const subBranchHeads: ConceptNode[] = [];
    const unassigned = [...sortedMembers];

    // Pick diverse high-ranking sub-branch heads
    while (subBranchHeads.length < maxDirectSubBranches && unassigned.length > 0) {
      let bestIdx = 0;
      let bestCandidateScore = -Infinity;

      for (let i = 0; i < unassigned.length; i++) {
        const cand = unassigned[i];
        // Penalize candidates that are strict lexical children of an already chosen head
        const isSubOfChosen = subBranchHeads.some(
          (h) => isLexicalParent(h.name, cand.name) || prereqOut.get(h.id)?.has(cand.id)
        );
        const score = (rankScore.get(cand.id) || 1) * (isSubOfChosen ? 0.25 : 1.0);
        if (score > bestCandidateScore) {
          bestCandidateScore = score;
          bestIdx = i;
        }
      }

      subBranchHeads.push(unassigned.splice(bestIdx, 1)[0]);
    }

    const subBranchNodes: MindMapNode[] = subBranchHeads.map((sub) => {
      const meta = getEdgeMeta(branchConcept.id, sub.id);
      const node: MindMapNode = {
        id: sub.id,
        conceptId: sub.id,
        label: sub.name,
        description: sub.description,
        category: sub.category,
        depth: 2,
        branchIndex,
        relationToParent: meta.relation,
        edgeTypeToParent: meta.edgeType,
        importanceScore: sub.importanceScore || 0,
        frequency: sub.frequency || 1,
        slideRefs: sub.slideRefs,
        children: [],
      };
      branchRoot.children.push(node);
      return node;
    });

    // Attach remaining members either to branchRoot (if direct strong link & room) or best Depth-2 sub-branch (Depth 3)
    for (const leaf of unassigned) {
      let bestParentNode: MindMapNode = subBranchNodes[0];
      let bestScore = -Infinity;

      for (const subNode of subBranchNodes) {
        const subConcept = nodeMap.get(subNode.conceptId)!;
        const loadPenalty = subNode.children.length * 10;
        const sc = affinityScore(subConcept, leaf) - loadPenalty;
        if (sc > bestScore) {
          bestScore = sc;
          bestParentNode = subNode;
        }
      }

      // If branchRoot is a much stronger direct lexical/prereq parent and branchRoot has < 5 direct children, allow Depth 2
      const directToBranchScore = affinityScore(branchConcept, leaf);
      if (
        branchRoot.children.length < 5 &&
        directToBranchScore > bestScore + 25 &&
        isLexicalParent(branchConcept.name, leaf.name)
      ) {
        bestParentNode = branchRoot;
      }

      const parentConcept = nodeMap.get(bestParentNode.conceptId) || branchConcept;
      const meta = getEdgeMeta(parentConcept.id, leaf.id);

      bestParentNode.children.push({
        id: leaf.id,
        conceptId: leaf.id,
        label: leaf.name,
        description: leaf.description,
        category: leaf.category,
        depth: bestParentNode.depth + 1,
        branchIndex,
        relationToParent: meta.relation,
        edgeTypeToParent: meta.edgeType,
        importanceScore: leaf.importanceScore || 0,
        frequency: leaf.frequency || 1,
        slideRefs: leaf.slideRefs,
        children: [],
      });
    }
  };

  // Step 2A: Small documents (<= 5 remaining concepts)
  if (remaining.length <= 5) {
    // Nest only clear lexical or explicit prerequisite children; rest become Depth 1 Main Branches
    const childrenMap = new Map<string, ConceptNode[]>();
    const mainSeeds: ConceptNode[] = [];

    for (const cand of remaining) {
      const naturalParent = mainSeeds.find(
        (p) => isLexicalParent(p.name, cand.name) || prereqOut.get(p.id)?.has(cand.id)
      );
      if (naturalParent && remaining.length >= 4) {
        const list = childrenMap.get(naturalParent.id) || [];
        list.push(cand);
        childrenMap.set(naturalParent.id, list);
      } else {
        mainSeeds.push(cand);
      }
    }

    mainSeeds.forEach((seed, idx) => {
      const meta = promotedRootConcept
        ? getEdgeMeta(promotedRootConcept.id, seed.id)
        : { relation: 'main branch', edgeType: 'HIERARCHY' as const };
      const branchNode: MindMapNode = {
        id: seed.id,
        conceptId: seed.id,
        label: seed.name,
        description: seed.description,
        category: seed.category,
        depth: 1,
        branchIndex: idx % BRANCH_PALETTES.length,
        relationToParent: meta.relation,
        edgeTypeToParent: meta.edgeType,
        importanceScore: seed.importanceScore || 0,
        frequency: seed.frequency || 1,
        slideRefs: seed.slideRefs,
        children: [],
      };
      populateSubtree(branchNode, seed, childrenMap.get(seed.id) || [], branchNode.branchIndex);
      rootNode.children.push(branchNode);
    });

    return rootNode;
  }

  // Step 2B: Check if PowerPoint slides provide natural Main Branch sections
  const slideTitles = new Map<number, string>();
  (slides || []).forEach((s) => {
    const t = s.title?.trim();
    if (
      t &&
      t.length > 2 &&
      t.toLowerCase() !== centralLabel.toLowerCase() &&
      !/^(?:overview|agenda|contents|thank you|references)$/i.test(t)
    ) {
      slideTitles.set(s.slideNumber, t);
    }
  });

  if (slideTitles.size >= 3) {
    const slideGroups = new Map<number, ConceptNode[]>();
    const unassignedToSlides: ConceptNode[] = [];

    for (const c of remaining) {
      const matchingSlide = c.slideRefs?.find((sr) => slideTitles.has(sr.slideNumber));
      if (matchingSlide) {
        const list = slideGroups.get(matchingSlide.slideNumber) || [];
        list.push(c);
        slideGroups.set(matchingSlide.slideNumber, list);
      } else {
        unassignedToSlides.push(c);
      }
    }

    const activeSlideEntries = Array.from(slideGroups.entries())
      .filter(([, members]) => members.length >= 1)
      .sort((a, b) => a[0] - b[0]);

    if (activeSlideEntries.length >= 3 && activeSlideEntries.length <= 7) {
      // Distribute any unassigned concepts to best-matching slide group
      for (const extra of unassignedToSlides) {
        let bestSlideNum = activeSlideEntries[0][0];
        let bestAff = -Infinity;
        for (const [sNum, members] of activeSlideEntries) {
          const avgAff =
            members.reduce((sum, m) => sum + affinityScore(m, extra), 0) / members.length;
          if (avgAff > bestAff) {
            bestAff = avgAff;
            bestSlideNum = sNum;
          }
        }
        slideGroups.get(bestSlideNum)!.push(extra);
      }

      activeSlideEntries.forEach(([slideNum, members], idx) => {
        const sorted = [...members].sort(
          (a, b) => (rankScore.get(b.id) || 0) - (rankScore.get(a.id) || 0)
        );
        const leadConcept = sorted[0];
        const slideTitle = slideTitles.get(slideNum)!;
        const branchNode: MindMapNode = {
          id: `slide_branch_${slideNum}`,
          conceptId: leadConcept.id,
          label: slideTitle,
          description: `Slide ${slideNum}: ${slideTitle} (${sorted.length} related concepts)`,
          category: leadConcept.category,
          depth: 1,
          branchIndex: idx % BRANCH_PALETTES.length,
          relationToParent: `slide ${slideNum}`,
          edgeTypeToParent: 'HIERARCHY',
          importanceScore: leadConcept.importanceScore || 0,
          frequency: sorted.length,
          slideRefs: [{ slideNumber: slideNum, title: slideTitle }],
          children: [],
        };

        // Include leadConcept and all members inside the slide branch
        populateSubtree(branchNode, leadConcept, sorted, branchNode.branchIndex);
        rootNode.children.push(branchNode);
      });

      return rootNode;
    }
  }

  // Step 2C: Graph-driven Diverse Hub Clustering (for PDF, Text, & general PPTX)
  const targetBranchCount = Math.min(
    6,
    Math.max(3, Math.round(Math.sqrt(remaining.length) * 1.15))
  );

  const selectedSeeds: ConceptNode[] = [];
  const pool = [...remaining];

  // Pick diverse Main Branch hub concepts
  while (selectedSeeds.length < targetBranchCount && pool.length > 0) {
    let bestIdx = 0;
    let bestSeedScore = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i];
      let score = rankScore.get(cand.id) || 1;

      if (selectedSeeds.length > 0) {
        // Reward different categories and penalize near-duplicates / direct lexical overlap
        const sameCategoryCount = selectedSeeds.filter(
          (s) => s.category === cand.category
        ).length;
        score *= Math.max(0.45, 1 - sameCategoryCount * 0.2);

        const overlapsSeed = selectedSeeds.some(
          (s) =>
            isLexicalParent(s.name, cand.name) ||
            isLexicalParent(cand.name, s.name) ||
            stripArticle(s.name) === stripArticle(cand.name)
        );
        if (overlapsSeed) score *= 0.15;

        // Slightly prefer nodes that are not already tightly coupled to an existing seed
        // so branches partition distinct topics
        const maxAffinityToChosen = Math.max(
          ...selectedSeeds.map((s) => affinityScore(s, cand))
        );
        if (maxAffinityToChosen > 45) score *= 0.55;
      }

      if (score > bestSeedScore) {
        bestSeedScore = score;
        bestIdx = i;
      }
    }

    selectedSeeds.push(pool.splice(bestIdx, 1)[0]);
  }

  // Partition remaining pool nodes to their strongest Main Branch seed (with load balancing)
  const branchClusters = new Map<string, ConceptNode[]>();
  selectedSeeds.forEach((s) => branchClusters.set(s.id, []));

  const idealMaxClusterSize = Math.ceil(pool.length / selectedSeeds.length) + 1;

  for (const node of pool) {
    let bestSeed = selectedSeeds[0];
    let bestAffinity = -Infinity;

    for (const seed of selectedSeeds) {
      const cluster = branchClusters.get(seed.id)!;
      const overloadPenalty = Math.max(0, cluster.length - idealMaxClusterSize + 1) * 14;
      const sc = affinityScore(seed, node) - overloadPenalty;
      if (sc > bestAffinity) {
        bestAffinity = sc;
        bestSeed = seed;
      }
    }

    branchClusters.get(bestSeed.id)!.push(node);
  }

  // Construct Depth 1 Main Branches and recursively populate Depth 2 & 3
  selectedSeeds.forEach((seed, idx) => {
    const meta = promotedRootConcept
      ? getEdgeMeta(promotedRootConcept.id, seed.id)
      : { relation: 'main branch', edgeType: 'HIERARCHY' as const };

    const branchNode: MindMapNode = {
      id: seed.id,
      conceptId: seed.id,
      label: seed.name,
      description: seed.description,
      category: seed.category,
      depth: 1,
      branchIndex: idx % BRANCH_PALETTES.length,
      relationToParent: meta.relation,
      edgeTypeToParent: meta.edgeType,
      importanceScore: seed.importanceScore || 0,
      frequency: seed.frequency || 1,
      slideRefs: seed.slideRefs,
      children: [],
    };

    populateSubtree(branchNode, seed, branchClusters.get(seed.id) || [], branchNode.branchIndex);
    rootNode.children.push(branchNode);
  });

  return rootNode;
}

/**
 * Computes an overlap-free radial/organic layout centered at (0, 0).
 * Respects `collapsedIds` and optional user-dragged `customPositions`.
 */
export function computeRadialMindMapLayout(
  root: MindMapNode | null,
  collapsedIds: Set<string>,
  customPositions: Map<string, { x: number; y: number }>
): {
  nodes: PositionedMindMapNode[];
  edges: PositionedMindMapEdge[];
} {
  if (!root) return { nodes: [], edges: [] };

  const getRadiusForDepth = (depth: number, labelLen: number): number => {
    if (depth === 0) return labelLen > 24 ? 66 : 58;
    if (depth === 1) return labelLen > 18 ? 46 : 41;
    if (depth === 2) return labelLen > 18 ? 35 : 31;
    return 25;
  };

  // Count total descendants (for "+N" collapsed badge) and visible leaf weight (for angular wedges)
  const totalDescCache = new Map<string, number>();
  const visibleWeightCache = new Map<string, number>();

  const countTotalDescendants = (node: MindMapNode): number => {
    const sum = node.children.reduce((acc, c) => acc + 1 + countTotalDescendants(c), 0);
    totalDescCache.set(node.id, sum);
    return sum;
  };

  const countVisibleWeight = (node: MindMapNode): number => {
    if (collapsedIds.has(node.id) || node.children.length === 0) {
      visibleWeightCache.set(node.id, 1);
      return 1;
    }
    const w = node.children.reduce((acc, c) => acc + countVisibleWeight(c), 0);
    const val = Math.max(1.2, w);
    visibleWeightCache.set(node.id, val);
    return val;
  };

  countTotalDescendants(root);
  countVisibleWeight(root);

  const positionedNodes: PositionedMindMapNode[] = [];
  const positionedMap = new Map<string, PositionedMindMapNode>();
  const rawEdges: Array<{
    fromId: string;
    toId: string;
    branchIndex: number;
    depth: number;
    relation: string;
    edgeType: 'PREREQUISITE' | 'CONCEPTUAL' | 'HIERARCHY';
  }> = [];

  const branchCount = Math.max(1, root.children.length);
  const ring1Radius = Math.max(205, branchCount * 36);
  const ring2Radius = ring1Radius + 160;
  const ring3Radius = ring2Radius + 125;

  const rootPos: PositionedMindMapNode = {
    node: root,
    x: customPositions.get(root.id)?.x ?? 0,
    y: customPositions.get(root.id)?.y ?? 0,
    radius: getRadiusForDepth(0, root.label.length),
    angle: 0,
    parentId: null,
    hiddenDescendantCount: collapsedIds.has(root.id) ? totalDescCache.get(root.id) || 0 : 0,
    totalDescendantCount: totalDescCache.get(root.id) || 0,
  };

  positionedNodes.push(rootPos);
  positionedMap.set(root.id, rootPos);

  const placeChildren = (
    parent: MindMapNode,
    parentPos: PositionedMindMapNode,
    sectorStart: number,
    sectorEnd: number
  ) => {
    if (collapsedIds.has(parent.id) || parent.children.length === 0) return;

    const children = parent.children;
    const totalW = children.reduce(
      (sum, c) => sum + (visibleWeightCache.get(c.id) || 1),
      0
    );

    let cursor = sectorStart;
    const totalSpan = sectorEnd - sectorStart;

    children.forEach((child, idx) => {
      const w = visibleWeightCache.get(child.id) || 1;
      const slice = (w / Math.max(0.01, totalW)) * totalSpan;
      const midAngle = cursor + slice / 2;

      const baseRing =
        child.depth === 1
          ? ring1Radius
          : child.depth === 2
          ? ring2Radius
          : ring3Radius;

      // Slight radial stagger for dense sibling fans so circles never crowd
      const stagger =
        children.length >= 4 && child.depth >= 2 ? (idx % 2 === 0 ? -16 : 22) : 0;
      const dist = baseRing + stagger;

      const custom = customPositions.get(child.id);
      const x = custom ? custom.x : dist * Math.cos(midAngle);
      const y = custom ? custom.y : dist * Math.sin(midAngle);

      const childPos: PositionedMindMapNode = {
        node: child,
        x,
        y,
        radius: getRadiusForDepth(child.depth, child.label.length),
        angle: midAngle,
        parentId: parent.id,
        hiddenDescendantCount: collapsedIds.has(child.id)
          ? totalDescCache.get(child.id) || 0
          : 0,
        totalDescendantCount: totalDescCache.get(child.id) || 0,
      };

      positionedNodes.push(childPos);
      positionedMap.set(child.id, childPos);

      rawEdges.push({
        fromId: parent.id,
        toId: child.id,
        branchIndex: child.branchIndex,
        depth: child.depth,
        relation: child.relationToParent || 'sub-concept',
        edgeType: child.edgeTypeToParent || 'HIERARCHY',
      });

      // Expand wedge slightly for grandchildren while staying separated from neighbors
      const pad = Math.min(slice * 0.08, 0.12);
      placeChildren(child, childPos, cursor + pad, cursor + slice - pad);
      cursor += slice;
    });
  };

  // Start at -90 deg (12 o'clock) so first main branch sits gracefully at top
  const startAngle = -Math.PI / 2 - Math.PI / branchCount;
  placeChildren(root, rootPos, startAngle, startAngle + Math.PI * 2);

  // Iterative collision resolution pass (guaranteeing zero overlap for non-pinned nodes)
  const paddingGap = 24;
  for (let iter = 0; iter < 75; iter++) {
    let moved = false;

    for (let i = 0; i < positionedNodes.length; i++) {
      for (let j = i + 1; j < positionedNodes.length; j++) {
        const a = positionedNodes[i];
        const b = positionedNodes[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const minDist = a.radius + b.radius + paddingGap;

        if (dist < minDist) {
          const overlap = (minDist - dist) * 0.55;
          const ux = dx / dist;
          const uy = dy / dist;

          const aPinned = a.node.depth === 0 || customPositions.has(a.node.id);
          const bPinned = b.node.depth === 0 || customPositions.has(b.node.id);

          if (!aPinned && !bPinned) {
            a.x -= ux * overlap;
            a.y -= uy * overlap;
            b.x += ux * overlap;
            b.y += uy * overlap;
            moved = true;
          } else if (aPinned && !bPinned) {
            b.x += ux * overlap * 2;
            b.y += uy * overlap * 2;
            moved = true;
          } else if (!aPinned && bPinned) {
            a.x -= ux * overlap * 2;
            a.y -= uy * overlap * 2;
            moved = true;
          }
        }
      }
    }

    // Gentle outward radial pull so nodes keep clean hierarchical rings
    for (const item of positionedNodes) {
      if (item.node.depth === 0 || customPositions.has(item.node.id)) continue;
      if (item.parentId) {
        const parent = positionedMap.get(item.parentId);
        if (parent) {
          const pdx = item.x - parent.x;
          const pdy = item.y - parent.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
          const minParentGap = parent.radius + item.radius + 54;
          if (pdist < minParentGap) {
            const push = (minParentGap - pdist) * 0.35;
            item.x += (pdx / pdist) * push;
            item.y += (pdy / pdist) * push;
          }
        }
      }
    }

    if (!moved && iter > 10) break;
  }

  const edges: PositionedMindMapEdge[] = rawEdges
    .map((e) => {
      const from = positionedMap.get(e.fromId);
      const to = positionedMap.get(e.toId);
      if (!from || !to) return null;
      return {
        id: `${e.fromId}->${e.toId}`,
        fromId: e.fromId,
        toId: e.toId,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        branchIndex: e.branchIndex,
        depth: e.depth,
        relation: e.relation,
        edgeType: e.edgeType,
      };
    })
    .filter((e): e is PositionedMindMapEdge => e !== null);

  return { nodes: positionedNodes, edges };
}

/**
 * Wraps node label into 1–3 balanced lines that fit neatly inside a circular node.
 */
export function wrapCircleLabel(
  label: string,
  depth: number
): { lines: string[]; fontSize: number } {
  const maxCharsPerLine = depth === 0 ? 14 : depth === 1 ? 12 : depth === 2 ? 11 : 10;
  const maxLines = depth === 0 ? 3 : 2;
  const words = label.trim().split(/\s+/);

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxCharsPerLine) {
      current = test;
    } else {
      if (current) lines.push(current);
      if (word.length > maxCharsPerLine + 2) {
        current = word.slice(0, maxCharsPerLine - 1) + '…';
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);

  const clamped = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    const last = clamped[maxLines - 1];
    clamped[maxLines - 1] =
      last.length > maxCharsPerLine - 1
        ? last.slice(0, maxCharsPerLine - 1) + '…'
        : `${last}…`;
  }

  const baseFont = depth === 0 ? 13 : depth === 1 ? 11.5 : depth === 2 ? 10 : 9;
  const fontSize = clamped.length >= 3 ? baseFont - 1 : baseFont;

  return { lines: clamped, fontSize };
}
