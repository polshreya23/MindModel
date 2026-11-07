#include "../include/MaxHeap.hpp"
#include <utility>
#include <algorithm>

namespace modelmind {

MaxHeap::MaxHeap(const std::vector<RankedConcept>& items) {
    heap = items;
    // Floyd's O(N) build heap algorithm: start from last non-leaf node down to root
    if (heap.size() > 1) {
        for (int i = static_cast<int>(heap.size() / 2) - 1; i >= 0; --i) {
            heapifyDown(static_cast<size_t>(i));
        }
    }
}

void MaxHeap::insert(const RankedConcept& item) {
    heap.push_back(item);
    heapifyUp(heap.size() - 1);
}

RankedConcept MaxHeap::extractMax() {
    if (heap.empty()) {
        throw std::runtime_error("Cannot extract from empty MaxHeap");
    }
    RankedConcept maxItem = heap[0];
    heap[0] = heap.back();
    heap.pop_back();

    if (!heap.empty()) {
        heapifyDown(0);
    }
    return maxItem;
}

const RankedConcept& MaxHeap::peekMax() const {
    if (heap.empty()) {
        throw std::runtime_error("MaxHeap is empty");
    }
    return heap[0];
}

void MaxHeap::heapifyUp(size_t index) {
    while (index > 0) {
        size_t p = parent(index);
        if (heap[index] > heap[p]) {
            std::swap(heap[index], heap[p]);
            index = p;
        } else {
            break;
        }
    }
}

void MaxHeap::heapifyDown(size_t index) {
    size_t size = heap.size();
    while (true) {
        size_t largest = index;
        size_t left = leftChild(index);
        size_t right = rightChild(index);

        if (left < size && heap[left] > heap[largest]) {
            largest = left;
        }
        if (right < size && heap[right] > heap[largest]) {
            largest = right;
        }

        if (largest != index) {
            std::swap(heap[index], heap[largest]);
            index = largest;
        } else {
            break;
        }
    }
}

std::vector<RankedConcept> MaxHeap::getTopK(size_t k) const {
    std::vector<RankedConcept> result;
    if (heap.empty() || k == 0) return result;

    // Create a copy of the heap to extract top K without modifying current instance
    MaxHeap temp = *this;
    size_t count = std::min(k, temp.size());
    result.reserve(count);

    for (size_t i = 0; i < count; ++i) {
        result.push_back(temp.extractMax());
    }
    return result;
}

} // namespace modelmind
