#include "../include/Algorithms.hpp"
#include <queue>
#include <stack>
#include <unordered_set>
#include <limits>
#include <algorithm>

namespace modelmind {

TraversalResult Algorithms::bfs(const Graph& graph, const std::string& startId) {
    TraversalResult result;
    result.algorithm = "BFS";
    result.startNode = startId;

    if (!graph.hasNode(startId)) {
        return result;
    }

    std::queue<std::string> q;
    std::unordered_set<std::string> visited;
    int stepCount = 0;

    auto snapshotQueue = [](std::queue<std::string> tempQ) {
        std::vector<std::string> contents;
        while (!tempQ.empty()) {
            contents.push_back(tempQ.front());
            tempQ.pop();
        }
        return contents;
    };

    // 1. Initial State
    q.push(startId);
    visited.insert(startId);
    stepCount++;
    result.steps.push_back({
        stepCount,
        "enqueue",
        startId,
        snapshotQueue(q),
        result.order,
        "Enqueued start node '" + startId + "' into BFS FIFO queue and marked as visited."
    });

    while (!q.empty()) {
        std::string current = q.front();
        q.pop();
        result.order.push_back(current);

        stepCount++;
        result.steps.push_back({
            stepCount,
            "dequeue",
            current,
            snapshotQueue(q),
            result.order,
            "Dequeued '" + current + "' to explore immediate neighbors."
        });

        // Traverse conceptual neighbors
        auto conceptualEdges = graph.getConceptualEdges(current);
        for (const auto& edge : conceptualEdges) {
            const std::string& neighbor = edge.targetId;
            if (visited.find(neighbor) == visited.end()) {
                visited.insert(neighbor);
                q.push(neighbor);

                stepCount++;
                result.steps.push_back({
                    stepCount,
                    "enqueue",
                    neighbor,
                    snapshotQueue(q),
                    result.order,
                    "Discovered neighbor '" + neighbor + "' via relation '" + edge.relation + "'. Added to queue."
                });
            }
        }
    }

    return result;
}

TraversalResult Algorithms::dfs(const Graph& graph, const std::string& startId) {
    TraversalResult result;
    result.algorithm = "DFS";
    result.startNode = startId;

    if (!graph.hasNode(startId)) {
        return result;
    }

    std::stack<std::string> s;
    std::unordered_set<std::string> visited;
    int stepCount = 0;

    auto snapshotStack = [](std::stack<std::string> tempS) {
        std::vector<std::string> contents;
        while (!tempS.empty()) {
            contents.push_back(tempS.top());
            tempS.pop();
        }
        std::reverse(contents.begin(), contents.end());
        return contents;
    };

    s.push(startId);
    stepCount++;
    result.steps.push_back({
        stepCount,
        "push",
        startId,
        snapshotStack(s),
        result.order,
        "Pushed start node '" + startId + "' onto DFS LIFO execution stack."
    });

    while (!s.empty()) {
        std::string current = s.top();
        s.pop();

        if (visited.find(current) != visited.end()) {
            continue;
        }

        visited.insert(current);
        result.order.push_back(current);

        stepCount++;
        result.steps.push_back({
            stepCount,
            "visit",
            current,
            snapshotStack(s),
            result.order,
            "Visited '" + current + "'. Deepening search into its branch."
        });

        // Traverse conceptual neighbors (iterate in reverse to push onto stack for natural order)
        auto conceptualEdges = graph.getConceptualEdges(current);
        for (auto it = conceptualEdges.rbegin(); it != conceptualEdges.rend(); ++it) {
            const std::string& neighbor = it->targetId;
            if (visited.find(neighbor) == visited.end()) {
                s.push(neighbor);

                stepCount++;
                result.steps.push_back({
                    stepCount,
                    "push",
                    neighbor,
                    snapshotStack(s),
                    result.order,
                    "Discovered unvisited neighbor '" + neighbor + "'. Pushed onto stack."
                });
            }
        }
    }

    return result;
}

DijkstraResult Algorithms::dijkstra(const Graph& graph, const std::string& startId, const std::string& targetId) {
    DijkstraResult result;
    result.startNode = startId;
    result.targetNode = targetId;

    if (!graph.hasNode(startId) || !graph.hasNode(targetId)) {
        return result;
    }

    // Min-heap entry: pair<distance, nodeId>
    using MinHeapEntry = std::pair<double, std::string>;
    std::priority_queue<MinHeapEntry, std::vector<MinHeapEntry>, std::greater<MinHeapEntry>> pq;

    std::unordered_map<std::string, double> dist;
    std::unordered_map<std::string, std::string> prev;
    std::unordered_set<std::string> settled;

    for (const auto& node : graph.getAllNodes()) {
        dist[node.id] = std::numeric_limits<double>::infinity();
    }

    dist[startId] = 0.0;
    pq.push({0.0, startId});

    int stepCount = 0;
    stepCount++;
    result.steps.push_back({
        stepCount,
        "relax",
        startId,
        {startId + ":0.0"},
        {},
        "Initialized start node '" + startId + "' distance to 0.0; all others to infinity."
    });

    while (!pq.empty()) {
        const MinHeapEntry topPair = pq.top();
        pq.pop();
        double currentDist = topPair.first;
        std::string current = topPair.second;

        if (settled.find(current) != settled.end()) {
            continue;
        }
        settled.insert(current);

        stepCount++;
        result.steps.push_back({
            stepCount,
            "settle",
            current,
            {},
            {},
            "Settled node '" + current + "' with confirmed shortest distance: " + toStr(currentDist)
        });

        if (current == targetId) {
            result.pathFound = true;
            result.totalDistance = currentDist;
            break;
        }

        auto conceptualEdges = graph.getConceptualEdges(current);
        for (const auto& edge : conceptualEdges) {
            const std::string& neighbor = edge.targetId;
            if (settled.find(neighbor) != settled.end()) {
                continue;
            }

            // Ensure non-negative edge weight
            double weight = std::max(0.0, edge.weight);
            double newDist = currentDist + weight;

            if (newDist < dist[neighbor]) {
                dist[neighbor] = newDist;
                prev[neighbor] = current;
                pq.push({newDist, neighbor});

                stepCount++;
                result.steps.push_back({
                    stepCount,
                    "relax",
                    neighbor,
                    {},
                    {},
                    "Relaxed edge (" + current + " -> " + neighbor + ", weight " + toStr(weight) +
                    "). Updated distance to " + toStr(newDist)
                });
            }
        }
    }

    result.distances = dist;

    // Path reconstruction
    if (result.pathFound) {
        std::vector<std::string> reconstructed;
        std::string curr = targetId;
        while (!curr.empty()) {
            reconstructed.push_back(curr);
            if (curr == startId) break;
            auto it = prev.find(curr);
            if (it != prev.end()) {
                curr = it->second;
            } else {
                break;
            }
        }
        std::reverse(reconstructed.begin(), reconstructed.end());
        result.path = reconstructed;
    }

    return result;
}

TopologicalSortResult Algorithms::topologicalSort(const Graph& graph) {
    TopologicalSortResult result;
    auto allNodes = graph.getAllNodes();

    // Map of in-degrees for prerequisite edges only
    std::unordered_map<std::string, int> inDegree;
    for (const auto& node : allNodes) {
        inDegree[node.id] = 0;
    }

    // Tally prerequisite edges
    for (const auto& node : allNodes) {
        auto prereqEdges = graph.getPrerequisiteEdges(node.id);
        for (const auto& edge : prereqEdges) {
            inDegree[edge.targetId]++;
        }
    }

    std::queue<std::string> zeroInDegreeQueue;
    for (const auto& node : allNodes) {
        if (inDegree[node.id] == 0) {
            zeroInDegreeQueue.push(node.id);
        }
    }

    int stepCount = 0;
    stepCount++;
    result.steps.push_back({
        stepCount,
        "enqueue",
        zeroInDegreeQueue.empty() ? "None" : zeroInDegreeQueue.front(),
        {},
        result.curriculumOrder,
        "Identified initial prerequisite foundation concepts (in-degree == 0)."
    });

    while (!zeroInDegreeQueue.empty()) {
        std::string current = zeroInDegreeQueue.front();
        zeroInDegreeQueue.pop();
        result.curriculumOrder.push_back(current);

        stepCount++;
        result.steps.push_back({
            stepCount,
            "visit",
            current,
            {},
            result.curriculumOrder,
            "Concept '" + current + "' mastered. Fulfilling downstream prerequisite dependencies."
        });

        auto prereqEdges = graph.getPrerequisiteEdges(current);
        for (const auto& edge : prereqEdges) {
            const std::string& neighbor = edge.targetId;
            inDegree[neighbor]--;

            if (inDegree[neighbor] == 0) {
                zeroInDegreeQueue.push(neighbor);
                stepCount++;
                result.steps.push_back({
                    stepCount,
                    "enqueue",
                    neighbor,
                    {},
                    result.curriculumOrder,
                    "All prerequisites for '" + neighbor + "' now fulfilled (in-degree == 0). Enqueued for learning."
                });
            }
        }
    }

    // Cycle detection: If total ordered nodes is less than all nodes, circular dependencies exist
    if (result.curriculumOrder.size() < allNodes.size()) {
        result.isDAG = false;
        for (const auto& node : allNodes) {
            if (inDegree[node.id] > 0) {
                result.cycleNodes.push_back(node.id);
            }
        }

        stepCount++;
        result.steps.push_back({
            stepCount,
            "cycle_detected",
            result.cycleNodes.empty() ? "" : result.cycleNodes[0],
            result.cycleNodes,
            result.curriculumOrder,
            "Circular prerequisite dependency detected among remaining concepts! Graph is not a DAG."
        });
    }

    return result;
}

} // namespace modelmind
