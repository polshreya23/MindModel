#pragma once

#include <string>
#include <vector>
#include <stdexcept>
#include <cstdint>
#include "ConceptNode.hpp"

namespace modelmind {

// Hash Table implemented with Separate Chaining and dynamic rehashing (C++14 compatible)
class HashTable {
public:
    struct Entry {
        std::string key;
        ConceptNode value;
        Entry* next = nullptr;

        Entry(std::string k, ConceptNode v) : key(std::move(k)), value(std::move(v)), next(nullptr) {}
    };

    explicit HashTable(size_t initialCapacity = 64);
    ~HashTable();

    // Prevent inadvertent copying, allow moving
    HashTable(const HashTable&) = delete;
    HashTable& operator=(const HashTable&) = delete;
    HashTable(HashTable&& other) noexcept;
    HashTable& operator=(HashTable&& other) noexcept;

    // Core DSA Operations
    void insert(const std::string& key, const ConceptNode& value);
    const ConceptNode* get(const std::string& key) const;
    ConceptNode* getMutable(const std::string& key);
    bool contains(const std::string& key) const;
    bool remove(const std::string& key);

    void clear();
    size_t size() const { return itemCount; }
    size_t capacity() const { return bucketCount; }
    double loadFactor() const { return static_cast<double>(itemCount) / bucketCount; }

    std::vector<ConceptNode> getAll() const;

private:
    std::vector<Entry*> buckets;
    size_t bucketCount;
    size_t itemCount;
    static constexpr double MAX_LOAD_FACTOR = 0.75;

    // Polynomial rolling hash function (djb2 variant)
    [[nodiscard]] size_t hashFunction(const std::string& str) const;
    void rehash(size_t newCapacity);
};

} // namespace modelmind
