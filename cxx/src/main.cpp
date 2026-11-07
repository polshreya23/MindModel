#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include "Graph.hpp"
#include "HashTable.hpp"
#include "Trie.hpp"
#include "MaxHeap.hpp"
#include "Algorithms.hpp"
#include "external/json.hpp"

using json = nlohmann::json;
using namespace modelmind;

int main(int argc, char* argv[]) {
    // Fast I/O
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    // Read full JSON payload from standard input
    std::string inputStr;
    std::string line;
    while (std::getline(std::cin, line)) {
        inputStr += line + "\n";
    }

    if (inputStr.empty()) {
        json err = {
            {"success", false},
            {"error", "No JSON payload received on stdin"}
        };
        std::cout << err.dump() << std::endl;
        return 0;
    }

    json request;
    try {
        request = json::parse(inputStr);
    } catch (const std::exception& e) {
        json err = {
            {"success", false},
            {"error", std::string("JSON parse error: ") + e.what()}
        };
        std::cout << err.dump() << std::endl;
        return 0;
    }

    std::string action = request.value("action", "build_graph");

    try {
        // Construct graph and auxiliary data structures from input
        Graph graph;
        Trie trie;

        if (request.contains("nodes") && request["nodes"].is_array()) {
            for (const auto& jNode : request["nodes"]) {
                ConceptNode node;
                from_json(jNode, node);
                graph.addNode(node);
                trie.insert(node.name, node.id);
            }
        }

        if (request.contains("edges") && request["edges"].is_array()) {
            for (const auto& jEdge : request["edges"]) {
                Edge edge;
                from_json(jEdge, edge);
                graph.addEdge(edge.fromId, edge.toId, edge.relation, edge.type, edge.weight);
            }
        }

        graph.computeImportanceScores();

        // Build Max-Heap from graph nodes
        std::vector<RankedConcept> rankedItems;
        for (const auto& node : graph.getAllNodes()) {
            rankedItems.emplace_back(node.id, node.name, node.importanceScore, node.frequency, graph.getDegree(node.id));
        }
        MaxHeap maxHeap(rankedItems);

        json response;
        response["success"] = true;
        response["action"] = action;

        if (action == "build_graph") {
            response["graph"] = graph;
            response["heapTopK"] = maxHeap.getTopK(10);
            response["heapArray"] = maxHeap.getHeapArray();
            response["topologicalSort"] = Algorithms::topologicalSort(graph);
            response["stats"] = {
                {"nodeCount", graph.vertexCount()},
                {"edgeCount", graph.edgeCount()},
                {"trieWordCount", trie.size()},
                {"heapSize", maxHeap.size()}
            };
        } else if (action == "bfs") {
            std::string startId = request.value("startId", "");
            if (startId.empty() && !graph.getAllNodes().empty()) {
                startId = graph.getAllNodes()[0].id;
            }
            response["result"] = Algorithms::bfs(graph, startId);
        } else if (action == "dfs") {
            std::string startId = request.value("startId", "");
            if (startId.empty() && !graph.getAllNodes().empty()) {
                startId = graph.getAllNodes()[0].id;
            }
            response["result"] = Algorithms::dfs(graph, startId);
        } else if (action == "dijkstra") {
            std::string startId = request.value("startId", "");
            std::string targetId = request.value("targetId", "");
            response["result"] = Algorithms::dijkstra(graph, startId, targetId);
        } else if (action == "topological_sort") {
            response["result"] = Algorithms::topologicalSort(graph);
        } else if (action == "autocomplete") {
            std::string prefix = request.value("prefix", "");
            size_t maxResults = request.value("maxResults", 10);
            auto matches = trie.autocomplete(prefix, maxResults);
            json jMatches = json::array();
            for (const auto& m : matches) {
                jMatches.push_back({
                    {"word", m.word},
                    {"conceptId", m.conceptId}
                });
            }
            response["matches"] = jMatches;
        } else if (action == "get_heap") {
            size_t topK = request.value("topK", 10);
            response["topK"] = maxHeap.getTopK(topK);
            response["heapArray"] = maxHeap.getHeapArray();
        } else {
            response["success"] = false;
            response["error"] = "Unknown action: " + action;
        }

        std::cout << response.dump() << std::endl;
    } catch (const std::exception& e) {
        json err = {
            {"success", false},
            {"error", std::string("Runtime error: ") + e.what()}
        };
        std::cout << err.dump() << std::endl;
    }

    return 0;
}
