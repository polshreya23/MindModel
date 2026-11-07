#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>

namespace modelmind {

class Trie {
public:
    struct AutoCompleteResult {
        std::string word;
        std::string conceptId;
    };

    struct TrieNode {
        std::unordered_map<char, TrieNode*> children;
        bool isEndOfWord = false;
        std::string conceptId;
        std::string originalWord;

        TrieNode() = default;
        ~TrieNode();
    };

    Trie();
    ~Trie();

    // Prevent copying, allow moving
    Trie(const Trie&) = delete;
    Trie& operator=(const Trie&) = delete;
    Trie(Trie&& other) noexcept;
    Trie& operator=(Trie&& other) noexcept;

    // Core DSA Operations
    void insert(const std::string& word, const std::string& conceptId);
    bool search(const std::string& word) const;
    bool startsWith(const std::string& prefix) const;
    std::vector<AutoCompleteResult> autocomplete(const std::string& prefix, size_t maxResults = 10) const;
    void clear();
    size_t size() const { return wordCount; }

private:
    TrieNode* root;
    size_t wordCount;

    static std::string normalize(const std::string& str);
    void collectAllWords(const TrieNode* node, std::vector<AutoCompleteResult>& results, size_t maxResults) const;
};

} // namespace modelmind
