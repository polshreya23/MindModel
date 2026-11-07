#include "../include/Graph.hpp"
#include <algorithm>

namespace modelmind {

static const std::vector<Graph::AdjacencyEntry> EMPTY_ADJ;

Graph::Graph() : nodeTable(64) {}

bool Graph::addNode(const ConceptNode& node) {
    if (node.id.empty()) return false;
    if (nodeTable.contains(node.id)) {
        // Update existing node
        nodeTable.insert(node.id, node);
        return false;
    }

    nodeTable.insert(node.id, node);
    adjList[node.id] = std::vector<AdjacencyEntry>();
    orderedNodeIds.push_back(node.id);
    return true;
}

bool Graph::addEdge(const std::string& fromId, const std::string& toId, const std::string& relation, EdgeType type, double weight) {
    if (fromId.empty() || toId.empty() || fromId == toId) return false;
    if (!nodeTable.contains(fromId) || !nodeTable.contains(toId)) return false;

    double validWeight = (weight >= 0.0) ? weight : 1.0;

    // Check for duplicate edge
    auto& list = adjList[fromId];
    for (const auto& entry : list) {
        if (entry.targetId == toId && entry.type == type) {
            return false; // Already exists
        }
    }

    // Add forward edge
    list.emplace_back(toId, relation, type, validWeight);
    edgesList.emplace_back(fromId, toId, relation, type, validWeight);

    if (type == EdgeType::PREREQUISITE) {
        // Update in-degree of target node for Kahn's topological sort
        ConceptNode* targetNode = nodeTable.getMutable(toId);
        if (targetNode) {
            targetNode->inDegreePrereq++;
        }
    } else {
        // Conceptual relationships are bidirectional / associative
        // Add reciprocal edge in adjacency list so BFS/DFS/Dijkstra can traverse in both directions
        auto& reverseList = adjList[toId];
        bool reverseExists = false;
        for (const auto& entry : reverseList) {
            if (entry.targetId == fromId && entry.type == EdgeType::CONCEPTUAL) {
                reverseExists = true;
                break;
            }
        }
        if (!reverseExists) {
            reverseList.emplace_back(fromId, relation, type, validWeight);
        }
    }

    return true;
}

bool Graph::hasNode(const std::string& id) const {
    return nodeTable.contains(id);
}

const ConceptNode* Graph::getNode(const std::string& id) const {
    return nodeTable.get(id);
}

ConceptNode* Graph::getNodeMutable(const std::string& id) {
    return nodeTable.getMutable(id);
}

const std::vector<Graph::AdjacencyEntry>& Graph::getEdges(const std::string& id) const {
    auto it = adjList.find(id);
    if (it != adjList.end()) {
        return it->second;
    }
    return EMPTY_ADJ;
}

std::vector<Graph::AdjacencyEntry> Graph::getConceptualEdges(const std::string& id) const {
    std::vector<AdjacencyEntry> result;
    auto it = adjList.find(id);
    if (it != adjList.end()) {
        for (const auto& entry : it->second) {
            if (entry.type == EdgeType::CONCEPTUAL) {
                result.push_back(entry);
            }
        }
    }
    return result;
}

std::vector<Graph::AdjacencyEntry> Graph::getPrerequisiteEdges(const std::string& id) const {
    std::vector<AdjacencyEntry> result;
    auto it = adjList.find(id);
    if (it != adjList.end()) {
        for (const auto& entry : it->second) {
            if (entry.type == EdgeType::PREREQUISITE) {
                result.push_back(entry);
            }
        }
    }
    return result;
}

std::vector<ConceptNode> Graph::getAllNodes() const {
    std::vector<ConceptNode> nodes;
    nodes.reserve(orderedNodeIds.size());
    for (const auto& id : orderedNodeIds) {
        const ConceptNode* ptr = nodeTable.get(id);
        if (ptr != nullptr) {
            nodes.push_back(*ptr);
        }
    }
    return nodes;
}

std::vector<Edge> Graph::getAllEdges() const {
    return edgesList;
}

int Graph::getDegree(const std::string& id) const {
    auto it = adjList.find(id);
    if (it != adjList.end()) {
        return static_cast<int>(it->second.size());
    }
    return 0;
}

void Graph::computeImportanceScores() {
    for (const auto& id : orderedNodeIds) {
        ConceptNode* node = nodeTable.getMutable(id);
        if (node) {
            int degree = getDegree(id);
            // Score formula: (frequency * 1.5) + (degree * 2.0) + (inDegreePrereq * 1.2)
            double score = (node->frequency * 1.5) + (degree * 2.0) + (node->inDegreePrereq * 1.2);
            node->importanceScore = score;
        }
    }
}

void Graph::clear() {
    nodeTable.clear();
    adjList.clear();
    edgesList.clear();
    orderedNodeIds.clear();
}

} // namespace modelmind
