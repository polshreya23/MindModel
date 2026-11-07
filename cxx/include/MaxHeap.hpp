#pragma once

#include <string>
#include <vector>
#include <stdexcept>
#include "external/json.hpp"

namespace modelmind {

struct RankedConcept {
    std::string id;
    std::string name;
    double score = 0.0;
    int frequency = 1;
    int degree = 0;

    RankedConcept() = default;
    RankedConcept(std::string id_, std::string name_, double score_, int freq_ = 1, int deg_ = 0)
        : id(std::move(id_)), name(std::move(name_)), score(score_), frequency(freq_), degree(deg_) {}

    // Comparison for Max-Heap (highest score has highest priority)
    bool operator<(const RankedConcept& other) const {
        if (score != other.score) {
            return score < other.score;
        }
        if (degree != other.degree) {
            return degree < other.degree;
        }
        return frequency < other.frequency;
    }

    bool operator>(const RankedConcept& other) const {
        return other < *this;
    }
};

inline void to_json(nlohmann::json& j, const RankedConcept& rc) {
    j = nlohmann::json{
        {"id", rc.id},
        {"name", rc.name},
        {"score", rc.score},
        {"frequency", rc.frequency},
        {"degree", rc.degree}
    };
}

inline void from_json(const nlohmann::json& j, RankedConcept& rc) {
    rc.id = j.value("id", "");
    rc.name = j.value("name", "");
    rc.score = j.value("score", 0.0);
    rc.frequency = j.value("frequency", 1);
    rc.degree = j.value("degree", 0);
}

class MaxHeap {
public:
    MaxHeap() = default;
    explicit MaxHeap(const std::vector<RankedConcept>& items);

    // Core DSA Operations
    void insert(const RankedConcept& item);
    RankedConcept extractMax();
    const RankedConcept& peekMax() const;
    bool empty() const { return heap.empty(); }
    size_t size() const { return heap.size(); }
    void clear() { heap.clear(); }

    // Returns top-K elements in descending order of priority
    std::vector<RankedConcept> getTopK(size_t k) const;

    // Direct access to underlying array for heap tree visualization
    const std::vector<RankedConcept>& getHeapArray() const { return heap; }

private:
    std::vector<RankedConcept> heap;

    void heapifyUp(size_t index);
    void heapifyDown(size_t index);
    static size_t parent(size_t i) { return (i - 1) / 2; }
    static size_t leftChild(size_t i) { return 2 * i + 1; }
    static size_t rightChild(size_t i) { return 2 * i + 2; }
};

} // namespace modelmind
