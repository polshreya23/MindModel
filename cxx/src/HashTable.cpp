#include "../include/HashTable.hpp"
#include <algorithm>

namespace modelmind {

HashTable::HashTable(size_t initialCapacity)
    : bucketCount(std::max(initialCapacity, size_t(8))), itemCount(0) {
    buckets.resize(bucketCount, nullptr);
}

HashTable::~HashTable() {
    clear();
}

HashTable::HashTable(HashTable&& other) noexcept
    : buckets(std::move(other.buckets)),
      bucketCount(other.bucketCount),
      itemCount(other.itemCount) {
    other.bucketCount = 0;
    other.itemCount = 0;
}

HashTable& HashTable::operator=(HashTable&& other) noexcept {
    if (this != &other) {
        clear();
        buckets = std::move(other.buckets);
        bucketCount = other.bucketCount;
        itemCount = other.itemCount;
        other.bucketCount = 0;
        other.itemCount = 0;
    }
    return *this;
}

size_t HashTable::hashFunction(const std::string& str) const {
    // djb2 hash algorithm
    uint64_t hash = 5381;
    for (unsigned char c : str) {
        hash = ((hash << 5) + hash) + c; // hash * 33 + c
    }
    return static_cast<size_t>(hash % bucketCount);
}

void HashTable::insert(const std::string& key, const ConceptNode& value) {
    if (loadFactor() >= MAX_LOAD_FACTOR) {
        rehash(bucketCount * 2);
    }

    size_t index = hashFunction(key);
    Entry* current = buckets[index];

    // Check if key already exists, if so update
    while (current != nullptr) {
        if (current->key == key) {
            current->value = value;
            return;
        }
        current = current->next;
    }

    // Key does not exist, insert new entry at head of linked chain (Separate Chaining)
    Entry* newEntry = new Entry(key, value);
    newEntry->next = buckets[index];
    buckets[index] = newEntry;
    itemCount++;
}

const ConceptNode* HashTable::get(const std::string& key) const {
    size_t index = hashFunction(key);
    Entry* current = buckets[index];
    while (current != nullptr) {
        if (current->key == key) {
            return &(current->value);
        }
        current = current->next;
    }
    return nullptr;
}

ConceptNode* HashTable::getMutable(const std::string& key) {
    size_t index = hashFunction(key);
    Entry* current = buckets[index];
    while (current != nullptr) {
        if (current->key == key) {
            return &(current->value);
        }
        current = current->next;
    }
    return nullptr;
}

bool HashTable::contains(const std::string& key) const {
    size_t index = hashFunction(key);
    Entry* current = buckets[index];
    while (current != nullptr) {
        if (current->key == key) {
            return true;
        }
        current = current->next;
    }
    return false;
}

bool HashTable::remove(const std::string& key) {
    size_t index = hashFunction(key);
    Entry* current = buckets[index];
    Entry* prev = nullptr;

    while (current != nullptr) {
        if (current->key == key) {
            if (prev == nullptr) {
                buckets[index] = current->next;
            } else {
                prev->next = current->next;
            }
            delete current;
            itemCount--;
            return true;
        }
        prev = current;
        current = current->next;
    }
    return false;
}

void HashTable::clear() {
    for (size_t i = 0; i < bucketCount; ++i) {
        Entry* current = buckets[i];
        while (current != nullptr) {
            Entry* next = current->next;
            delete current;
            current = next;
        }
        buckets[i] = nullptr;
    }
    itemCount = 0;
}

std::vector<ConceptNode> HashTable::getAll() const {
    std::vector<ConceptNode> nodes;
    nodes.reserve(itemCount);
    for (size_t i = 0; i < bucketCount; ++i) {
        Entry* current = buckets[i];
        while (current != nullptr) {
            nodes.push_back(current->value);
            current = current->next;
        }
    }
    return nodes;
}

void HashTable::rehash(size_t newCapacity) {
    std::vector<Entry*> oldBuckets = std::move(buckets);
    size_t oldBucketCount = bucketCount;

    bucketCount = newCapacity;
    buckets.resize(bucketCount, nullptr);
    itemCount = 0; // Will be re-incremented on re-insert

    for (size_t i = 0; i < oldBucketCount; ++i) {
        Entry* current = oldBuckets[i];
        while (current != nullptr) {
            Entry* next = current->next;
            insert(current->key, current->value);
            delete current;
            current = next;
        }
    }
}

} // namespace modelmind
