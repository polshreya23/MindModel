#include "../include/Trie.hpp"
#include <cctype>
#include <algorithm>

namespace modelmind {

Trie::TrieNode::~TrieNode() {
    for (auto& pair : children) {
        delete pair.second;
    }
    children.clear();
}

Trie::Trie() : root(new TrieNode()), wordCount(0) {}

Trie::~Trie() {
    delete root;
}

Trie::Trie(Trie&& other) noexcept : root(other.root), wordCount(other.wordCount) {
    other.root = new TrieNode();
    other.wordCount = 0;
}

Trie& Trie::operator=(Trie&& other) noexcept {
    if (this != &other) {
        delete root;
        root = other.root;
        wordCount = other.wordCount;
        other.root = new TrieNode();
        other.wordCount = 0;
    }
    return *this;
}

std::string Trie::normalize(const std::string& str) {
    std::string norm;
    norm.reserve(str.size());
    for (char c : str) {
        norm.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
    }
    return norm;
}

void Trie::insert(const std::string& word, const std::string& conceptId) {
    if (word.empty()) return;
    std::string norm = normalize(word);

    TrieNode* current = root;
    for (char c : norm) {
        if (current->children.find(c) == current->children.end()) {
            current->children[c] = new TrieNode();
        }
        current = current->children[c];
    }

    if (!current->isEndOfWord) {
        wordCount++;
    }
    current->isEndOfWord = true;
    current->conceptId = conceptId;
    current->originalWord = word;
}

bool Trie::search(const std::string& word) const {
    if (word.empty()) return false;
    std::string norm = normalize(word);

    const TrieNode* current = root;
    for (char c : norm) {
        auto it = current->children.find(c);
        if (it == current->children.end()) {
            return false;
        }
        current = it->second;
    }
    return current != nullptr && current->isEndOfWord;
}

bool Trie::startsWith(const std::string& prefix) const {
    if (prefix.empty()) return true;
    std::string norm = normalize(prefix);

    const TrieNode* current = root;
    for (char c : norm) {
        auto it = current->children.find(c);
        if (it == current->children.end()) {
            return false;
        }
        current = it->second;
    }
    return true;
}

void Trie::collectAllWords(const TrieNode* node, std::vector<AutoCompleteResult>& results, size_t maxResults) const {
    if (node == nullptr || results.size() >= maxResults) return;

    if (node->isEndOfWord) {
        results.push_back({node->originalWord, node->conceptId});
    }

    // Sort keys for deterministic, alphabetical order
    std::vector<char> keys;
    keys.reserve(node->children.size());
    for (const auto& pair : node->children) {
        keys.push_back(pair.first);
    }
    std::sort(keys.begin(), keys.end());

    for (char k : keys) {
        if (results.size() >= maxResults) break;
        collectAllWords(node->children.at(k), results, maxResults);
    }
}

std::vector<Trie::AutoCompleteResult> Trie::autocomplete(const std::string& prefix, size_t maxResults) const {
    std::vector<AutoCompleteResult> results;
    if (maxResults == 0) return results;

    const TrieNode* current = root;
    if (!prefix.empty()) {
        std::string norm = normalize(prefix);
        for (char c : norm) {
            auto it = current->children.find(c);
            if (it == current->children.end()) {
                return results; // No words match this prefix
            }
            current = it->second;
        }
    }

    collectAllWords(current, results, maxResults);
    return results;
}

void Trie::clear() {
    delete root;
    root = new TrieNode();
    wordCount = 0;
}

} // namespace modelmind
