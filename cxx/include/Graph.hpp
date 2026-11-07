#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include "ConceptNode.hpp"
#include "HashTable.hpp"
#include "external/json.hpp"

namespace modelmind {

class Graph {
public:
    struct AdjacencyEntry {
        std::string targetId;
        std::string relation;
        EdgeType type;
        double weight;

        AdjacencyEntry(std::string target, std::string rel, EdgeType t, double w)
            : targetId(std::move(target)), relation(std::move(rel)), type(t), weight(w >= 0.0 ? w : 1.0) {}
    };

    Graph();
    ~Graph() = default;

    // Core DSA Operations
    bool addNode(const ConceptNode& node);
    bool addEdge(const std::string& fromId, const std::string& toId, const std::string& relation, EdgeType type, double weight = 1.0);

    bool hasNode(const std::string& id) const;
    const ConceptNode* getNode(const std::string& id) const;
    ConceptNode* getNodeMutable(const std::string& id);

    const std::vector<AdjacencyEntry>& getEdges(const std::string& id) const;
    std::vector<AdjacencyEntry> getConceptualEdges(const std::string& id) const;
    std::vector<AdjacencyEntry> getPrerequisiteEdges(const std::string& id) const;

    std::vector<ConceptNode> getAllNodes() const;
    std::vector<Edge> getAllEdges() const;

    size_t vertexCount() const { return nodeTable.size(); }
    size_t edgeCount() const { return edgesList.size(); }
    int getDegree(const std::string& id) const;

    void clear();

    // Recompute importance score based on degree centrality + frequency
    void computeImportanceScores();

private:
    HashTable nodeTable; // Custom Hash Table for O(1) vertex retrieval
    std::unordered_map<std::string, std::vector<AdjacencyEntry>> adjList;
    std::vector<Edge> edgesList;
    std::vector<std::string> orderedNodeIds; // insertion order
};

inline void to_json(nlohmann::json& j, const Graph& g) {
    j = nlohmann::json{
        {"nodes", g.getAllNodes()},
        {"edges", g.getAllEdges()}
    };
}

} // namespace modelmind
