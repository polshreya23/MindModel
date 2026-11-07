#pragma once

#include <string>
#include <vector>
#include "external/json.hpp"

namespace modelmind {

enum class EdgeType {
    CONCEPTUAL,   // Associative/semantic relationship (undirected or symmetric, w >= 0)
    PREREQUISITE  // Directed dependency: fromId -> toId means fromId must be learned before toId
};

inline std::string edgeTypeToString(EdgeType type) {
    return (type == EdgeType::PREREQUISITE) ? "PREREQUISITE" : "CONCEPTUAL";
}

inline EdgeType stringToEdgeType(const std::string& str) {
    if (str == "PREREQUISITE" || str == "prerequisite") {
        return EdgeType::PREREQUISITE;
    }
    return EdgeType::CONCEPTUAL;
}

struct Edge {
    std::string fromId;
    std::string toId;
    std::string relation;     // e.g., "is a", "depends on", "implements", "part of"
    EdgeType type;
    double weight = 1.0;      // Non-negative cognitive/traversal distance (>= 0.0)

    Edge() : fromId(""), toId(""), relation("related to"), type(EdgeType::CONCEPTUAL), weight(1.0) {}
    Edge(std::string from, std::string to, std::string rel, EdgeType t, double w = 1.0)
        : fromId(std::move(from)), toId(std::move(to)), relation(std::move(rel)), type(t), weight(w >= 0.0 ? w : 1.0) {}
};

struct ConceptNode {
    std::string id;
    std::string name;
    std::string description;
    std::string category;
    int frequency = 1;
    double importanceScore = 0.0;
    int inDegreePrereq = 0;

    ConceptNode() = default;
    ConceptNode(std::string id_, std::string name_, std::string desc_ = "", std::string cat_ = "General", int freq_ = 1)
        : id(std::move(id_)), name(std::move(name_)), description(std::move(desc_)), category(std::move(cat_)), frequency(freq_) {}
};

inline void to_json(nlohmann::json& j, const ConceptNode& node) {
    j = nlohmann::json{
        {"id", node.id},
        {"name", node.name},
        {"description", node.description},
        {"category", node.category},
        {"frequency", node.frequency},
        {"importanceScore", node.importanceScore},
        {"inDegreePrereq", node.inDegreePrereq}
    };
}

inline void from_json(const nlohmann::json& j, ConceptNode& node) {
    node.id = j.value("id", "");
    node.name = j.value("name", "");
    node.description = j.value("description", "");
    node.category = j.value("category", "General");
    node.frequency = j.value("frequency", 1);
    node.importanceScore = j.value("importanceScore", 0.0);
    node.inDegreePrereq = j.value("inDegreePrereq", 0);
}

inline void to_json(nlohmann::json& j, const Edge& edge) {
    j = nlohmann::json{
        {"fromId", edge.fromId},
        {"toId", edge.toId},
        {"relation", edge.relation},
        {"type", edgeTypeToString(edge.type)},
        {"weight", edge.weight}
    };
}

inline void from_json(const nlohmann::json& j, Edge& edge) {
    edge.fromId = j.value("fromId", "");
    edge.toId = j.value("toId", "");
    edge.relation = j.value("relation", "related to");
    edge.type = stringToEdgeType(j.value("type", "CONCEPTUAL"));
    double w = j.value("weight", 1.0);
    edge.weight = (w >= 0.0) ? w : 1.0;
}

} // namespace modelmind
