#include <iostream>
#include <cassert>
#include <cmath>
#include <vector>
#include <string>
#include "../include/HashTable.hpp"
#include "../include/Trie.hpp"
#include "../include/MaxHeap.hpp"
#include "../include/Graph.hpp"
#include "../include/Algorithms.hpp"

using namespace modelmind;

void testHashTable() {
    std::cout << "[TEST] Running HashTable tests..." << std::endl;
    HashTable table(4); // Force small initial capacity to test rehashing

    // 1. Insertion & Retrieval
    ConceptNode n1("c1", "Graph", "Vertices and edges", "DSA", 5);
    ConceptNode n2("c2", "Tree", "Connected acyclic graph", "DSA", 3);
    table.insert("c1", n1);
    table.insert("c2", n2);

    assert(table.size() == 2);
    assert(table.contains("c1"));
    assert(table.contains("c2"));
    assert(!table.contains("c3"));

    const ConceptNode* ptr1 = table.get("c1");
    assert(ptr1 != nullptr);
    assert(ptr1->name == "Graph");
    assert(ptr1->frequency == 5);

    // 2. Value Update
    ConceptNode n1_updated("c1", "Graph Updated", "Updated desc", "DSA", 10);
    table.insert("c1", n1_updated);
    assert(table.size() == 2); // size should not increase on update
    const ConceptNode* ptr1_up = table.get("c1");
    assert(ptr1_up != nullptr);
    assert(ptr1_up->name == "Graph Updated");
    assert(ptr1_up->frequency == 10);

    // 3. Collision Handling & Dynamic Rehashing
    for (int i = 0; i < 20; ++i) {
        std::string id = "node_" + toStr(i);
        table.insert(id, ConceptNode(id, "Concept " + toStr(i)));
    }
    assert(table.size() == 22);
    assert(table.contains("node_15"));

    // 4. Deletion
    bool removed = table.remove("node_15");
    assert(removed == true);
    assert(!table.contains("node_15"));
    assert(table.size() == 21);
    assert(!table.remove("non_existent"));

    std::cout << "  ✓ HashTable tests PASSED" << std::endl;
}

void testTrie() {
    std::cout << "[TEST] Running Trie tests..." << std::endl;
    Trie trie;

    trie.insert("Algorithm", "id_algo");
    trie.insert("Adjacency List", "id_adj");
    trie.insert("Adjacency Matrix", "id_adj_mat");
    trie.insert("AVL Tree", "id_avl");
    trie.insert("Binary Search Tree", "id_bst");

    assert(trie.size() == 5);

    // Exact search (case-insensitive)
    assert(trie.search("Algorithm"));
    assert(trie.search("algorithm"));
    assert(trie.search("ALGORITHM"));
    assert(!trie.search("Algo")); // Prefix only, not exact word

    // Prefix test
    assert(trie.startsWith("Adj"));
    assert(trie.startsWith("adj"));
    assert(!trie.startsWith("Z"));

    // Autocomplete test
    auto results = trie.autocomplete("Adj", 10);
    assert(results.size() == 2);
    assert(results[0].word == "Adjacency List" || results[0].word == "Adjacency Matrix");

    auto aResults = trie.autocomplete("A", 10);
    assert(aResults.size() == 4); // Algorithm, Adjacency List, Adjacency Matrix, AVL Tree

    std::cout << "  ✓ Trie tests PASSED" << std::endl;
}

void testMaxHeap() {
    std::cout << "[TEST] Running MaxHeap tests..." << std::endl;
    MaxHeap heap;

    heap.insert(RankedConcept("1", "Low Priority", 1.5, 1, 1));
    heap.insert(RankedConcept("2", "High Priority", 9.8, 5, 4));
    heap.insert(RankedConcept("3", "Medium Priority", 5.0, 3, 2));
    heap.insert(RankedConcept("4", "Highest Priority", 12.0, 8, 6));

    assert(heap.size() == 4);
    assert(heap.peekMax().name == "Highest Priority");

    // Extraction in descending priority order
    RankedConcept max1 = heap.extractMax();
    assert(max1.name == "Highest Priority");

    RankedConcept max2 = heap.extractMax();
    assert(max2.name == "High Priority");

    RankedConcept max3 = heap.extractMax();
    assert(max3.name == "Medium Priority");

    RankedConcept max4 = heap.extractMax();
    assert(max4.name == "Low Priority");

    assert(heap.empty());

    // Top-K non-destructive test
    std::vector<RankedConcept> items = {
        {"a", "A", 2.0}, {"b", "B", 10.0}, {"c", "C", 7.0}, {"d", "D", 1.0}
    };
    MaxHeap heap2(items);
    auto top2 = heap2.getTopK(2);
    assert(top2.size() == 2);
    assert(top2[0].name == "B");
    assert(top2[1].name == "C");
    assert(heap2.size() == 4); // Not destroyed

    std::cout << "  ✓ MaxHeap tests PASSED" << std::endl;
}

void testGraphAndAlgorithms() {
    std::cout << "[TEST] Running Graph, BFS, DFS, Dijkstra & Topological Sort tests..." << std::endl;
    Graph g;

    // Nodes
    g.addNode(ConceptNode("arrays", "Arrays", "Contiguous memory", "Basic", 5));
    g.addNode(ConceptNode("linked_list", "Linked Lists", "Node chains", "Basic", 4));
    g.addNode(ConceptNode("stack", "Stacks", "LIFO container", "Linear", 3));
    g.addNode(ConceptNode("queue", "Queues", "FIFO container", "Linear", 3));
    g.addNode(ConceptNode("tree", "Trees", "Hierarchical data", "Non-linear", 6));
    g.addNode(ConceptNode("graph", "Graphs", "Networks of vertices and edges", "Non-linear", 8));

    // Conceptual edges (bidirectional associative, non-negative weights)
    g.addEdge("arrays", "linked_list", "alternative to", EdgeType::CONCEPTUAL, 2.0);
    g.addEdge("linked_list", "stack", "implements", EdgeType::CONCEPTUAL, 1.5);
    g.addEdge("stack", "queue", "dual of", EdgeType::CONCEPTUAL, 1.0);
    g.addEdge("tree", "graph", "special case of", EdgeType::CONCEPTUAL, 2.5);
    g.addEdge("linked_list", "tree", "pointer basis for", EdgeType::CONCEPTUAL, 3.0);

    // Prerequisite edges (directed DAG dependencies)
    g.addEdge("arrays", "stack", "prerequisite for", EdgeType::PREREQUISITE, 1.0);
    g.addEdge("linked_list", "stack", "prerequisite for", EdgeType::PREREQUISITE, 1.0);
    g.addEdge("stack", "tree", "prerequisite for", EdgeType::PREREQUISITE, 1.0);
    g.addEdge("tree", "graph", "prerequisite for", EdgeType::PREREQUISITE, 1.0);

    assert(g.vertexCount() == 6);
    assert(g.edgeCount() == 9);

    // BFS test
    auto bfsRes = Algorithms::bfs(g, "arrays");
    assert(bfsRes.algorithm == "BFS");
    assert(!bfsRes.order.empty());
    assert(bfsRes.order[0] == "arrays");
    assert(bfsRes.order.size() >= 3);
    assert(!bfsRes.steps.empty());

    // DFS test
    auto dfsRes = Algorithms::dfs(g, "arrays");
    assert(dfsRes.algorithm == "DFS");
    assert(!dfsRes.order.empty());
    assert(dfsRes.order[0] == "arrays");
    assert(!dfsRes.steps.empty());

    // Dijkstra test (shortest path from arrays to queue)
    auto dijkstraRes = Algorithms::dijkstra(g, "arrays", "queue");
    assert(dijkstraRes.pathFound == true);
    // Path: arrays (0) -> linked_list (2.0) -> stack (3.5) -> queue (4.5)
    assert(std::abs(dijkstraRes.totalDistance - 4.5) < 1e-4);
    assert(dijkstraRes.path.size() == 4);
    assert(dijkstraRes.path.front() == "arrays");
    assert(dijkstraRes.path.back() == "queue");

    // Topological Sort (DAG test)
    auto topoRes = Algorithms::topologicalSort(g);
    assert(topoRes.isDAG == true);
    assert(topoRes.cycleNodes.empty());
    assert(topoRes.curriculumOrder.size() == 6);

    // Verify ordering constraints: arrays & linked_list before stack, stack before tree, tree before graph
    auto indexOf = [&](const std::string& id) {
        for (size_t i = 0; i < topoRes.curriculumOrder.size(); ++i) {
            if (topoRes.curriculumOrder[i] == id) return static_cast<int>(i);
        }
        return -1;
    };
    assert(indexOf("arrays") < indexOf("stack"));
    assert(indexOf("linked_list") < indexOf("stack"));
    assert(indexOf("stack") < indexOf("tree"));
    assert(indexOf("tree") < indexOf("graph"));

    // Cycle Detection Test on Prerequisite Graph
    Graph cyclicGraph;
    cyclicGraph.addNode(ConceptNode("A", "Concept A"));
    cyclicGraph.addNode(ConceptNode("B", "Concept B"));
    cyclicGraph.addEdge("A", "B", "requires", EdgeType::PREREQUISITE);
    cyclicGraph.addEdge("B", "A", "requires", EdgeType::PREREQUISITE); // Circular!
    auto cyclicTopo = Algorithms::topologicalSort(cyclicGraph);
    assert(cyclicTopo.isDAG == false);
    assert(!cyclicTopo.cycleNodes.empty());

    std::cout << "  ✓ Graph, BFS, DFS, Dijkstra & Topological Sort tests PASSED" << std::endl;
}

int main() {
    std::cout << "==========================================" << std::endl;
    std::cout << "  ModelMind C++ DSA Unit Test Suite       " << std::endl;
    std::cout << "==========================================" << std::endl;

    try {
        testHashTable();
        testTrie();
        testMaxHeap();
        testGraphAndAlgorithms();
        std::cout << "==========================================" << std::endl;
        std::cout << "  ALL C++ DSA TESTS PASSED SUCCESSFULLY!  " << std::endl;
        std::cout << "==========================================" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        return 1;
    }
}
