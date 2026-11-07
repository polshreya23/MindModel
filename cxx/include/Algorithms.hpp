#pragma once

#include <string>
#include <vector>
#include <sstream>
#include <unordered_map>
#include "Graph.hpp"
#include "external/json.hpp"

namespace modelmind {

template <typename T>
inline std::string toStr(const T& val) {
    std::ostringstream oss;
    oss << val;
    return oss.str();
}

struct TraversalStep {
    int stepNumber;
    std::string action;          // "visit", "enqueue", "dequeue", "push", "pop", "relax", "settle", "cycle_detected"
    std::string currentNode;
    std::vector<std::string> containerState; // Current contents of Queue/Stack/PriorityQueue
    std::vector<std::string> visitedOrder;
    std::string explanation;
};

inline void to_json(nlohmann::json& j, const TraversalStep& step) {
    j = nlohmann::json{
        {"stepNumber", step.stepNumber},
        {"action", step.action},
        {"currentNode", step.currentNode},
        {"containerState", step.containerState},
        {"visitedOrder", step.visitedOrder},
        {"explanation", step.explanation}
    };
}

struct TraversalResult {
    std::string algorithm;       // "BFS" or "DFS"
    std::string startNode;
    std::vector<std::string> order;
    std::vector<TraversalStep> steps;
};

inline void to_json(nlohmann::json& j, const TraversalResult& res) {
    j = nlohmann::json{
        {"algorithm", res.algorithm},
        {"startNode", res.startNode},
        {"order", res.order},
        {"steps", res.steps}
    };
}

struct DijkstraResult {
    std::string startNode;
    std::string targetNode;
    bool pathFound = false;
    double totalDistance = 0.0;
    std::vector<std::string> path;
    std::vector<TraversalStep> steps;
    std::unordered_map<std::string, double> distances;
};

inline void to_json(nlohmann::json& j, const DijkstraResult& res) {
    j = nlohmann::json{
        {"startNode", res.startNode},
        {"targetNode", res.targetNode},
        {"pathFound", res.pathFound},
        {"totalDistance", res.totalDistance},
        {"path", res.path},
        {"steps", res.steps},
        {"distances", res.distances}
    };
}

struct TopologicalSortResult {
    bool isDAG = true;
    std::vector<std::string> curriculumOrder;
    std::vector<std::string> cycleNodes;
    std::vector<TraversalStep> steps;
};

inline void to_json(nlohmann::json& j, const TopologicalSortResult& res) {
    j = nlohmann::json{
        {"isDAG", res.isDAG},
        {"curriculumOrder", res.curriculumOrder},
        {"cycleNodes", res.cycleNodes},
        {"steps", res.steps}
    };
}

class Algorithms {
public:
    // Breadth-First Search traversal with FIFO queue simulation & step trace
    static TraversalResult bfs(const Graph& graph, const std::string& startId);

    // Depth-First Search traversal with explicit call stack & step trace
    static TraversalResult dfs(const Graph& graph, const std::string& startId);

    // Dijkstra's Shortest Path Algorithm on non-negative weighted conceptual edges
    static DijkstraResult dijkstra(const Graph& graph, const std::string& startId, const std::string& targetId);

    // Kahn's Algorithm for Topological Sort on prerequisite directed edges
    static TopologicalSortResult topologicalSort(const Graph& graph);
};

} // namespace modelmind
