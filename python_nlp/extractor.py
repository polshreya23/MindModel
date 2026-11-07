#!/usr/bin/env python3
"""
ModelMind Free Local NLP Concept Extractor
Extracts technical concepts, co-occurrence relationships, and prerequisite dependencies.
No paid APIs or external network calls required.
"""

import sys
import json
import re
import math
from collections import Counter, defaultdict

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
    "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
    "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
    "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
    "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
    "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
    "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
    "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
    "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves", "also", "thus", "therefore", "example", "using", "uses", "used"
}

PREREQUISITE_INDICATORS = [
    r"prerequisite\s+(?:for|to)",
    r"depends\s+on",
    r"requires",
    r"built\s+upon",
    r"foundation\s+(?:for|of)",
    r"before\s+learning",
    r"must\s+(?:first\s+)?understand",
    r"prior\s+knowledge\s+of"
]

CONCEPTUAL_INDICATORS = [
    (r"is\s+a\s+type\s+of", "is a type of"),
    (r"is\s+a\s+variant\s+of", "variant of"),
    (r"is\s+an\s+implementation\s+of", "implements"),
    (r"implements", "implements"),
    (r"used\s+in", "used in"),
    (r"applied\s+to", "applied to"),
    (r"traverses", "traverses"),
    (r"composed\s+of", "composed of"),
    (r"consists\s+of", "consists of"),
    (r"similar\s+to", "similar to"),
    (r"alternative\s+to", "alternative to")
]


def split_sentences(text: str) -> list:
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9])', text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 10]


def tokenize(sentence: str) -> list:
    tokens = re.findall(r'\b[A-Za-z][A-Za-z0-9_-]*\b', sentence.lower())
    return [t for t in tokens if t not in STOP_WORDS and len(t) > 2]


def extract_candidate_concepts(text: str, sentences: list) -> list:
    """
    Extracts high-value multi-word phrases and salient single terms.
    """
    candidates = Counter()
    descriptions = {}
    categories = {}

    # 1. Multi-word Title-Case or technical compound phrases (e.g. "Binary Search Tree", "Adjacency List")
    phrase_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Za-z][a-z]+){1,3})\b'
    for match in re.finditer(phrase_pattern, text):
        phrase = match.group(1).strip()
        words = phrase.lower().split()
        if not any(w in STOP_WORDS for w in words):
            candidates[phrase] += 2

    # 2. Extract key terms from sentence patterns
    definition_pattern = r'([A-Z][a-zA-Z0-9_\s]{2,30}?)\s+(?:is|are|refers\s+to|defines|denotes)\s+(?:a|an|the)?\s*([^.]{10,120})'
    for match in re.finditer(definition_pattern, text):
        concept = match.group(1).strip()
        desc = match.group(2).strip()
        if len(concept.split()) <= 4 and not concept.lower().startswith(("this", "that", "these", "there", "it")):
            candidates[concept] += 3
            if concept not in descriptions:
                descriptions[concept] = desc

    # 3. Frequency-based token scoring
    all_tokens = []
    for s in sentences:
        tokens = tokenize(s)
        all_tokens.extend(tokens)
    token_counts = Counter(all_tokens)

    # Convert high-frequency single tokens into capitalized candidates
    for token, count in token_counts.items():
        if count >= 2 and len(token) > 3:
            cap = token.capitalize()
            candidates[cap] += count

    # Deduplicate and normalize
    normalized = {}
    for phrase, count in candidates.most_common(25):
        clean_name = phrase.strip()
        if len(clean_name) < 3 or clean_name.lower() in STOP_WORDS:
            continue
        concept_id = re.sub(r'[^a-zA-Z0-9]+', '_', clean_name.lower()).strip('_')
        if not concept_id:
            continue

        # Heuristic category tagging
        lower = clean_name.lower()
        if any(w in lower for w in ["tree", "graph", "heap", "trie", "list", "array", "stack", "queue", "hash"]):
            cat = "Data Structure"
        elif any(w in lower for w in ["sort", "search", "bfs", "dfs", "dijkstra", "traversal", "algorithm", "path"]):
            cat = "Algorithm"
        elif any(w in lower for w in ["time", "space", "complexity", "big-o", "asymptotic", "notation"]):
            cat = "Analysis"
        else:
            cat = "Fundamental Concept"

        normalized[concept_id] = {
            "id": concept_id,
            "name": clean_name,
            "description": descriptions.get(clean_name, f"Key concept in curriculum: {clean_name}"),
            "category": cat,
            "frequency": count
        }

    return list(normalized.values())


def extract_relationships(concepts: list, sentences: list) -> list:
    """
    Extracts conceptual edges and prerequisite DAG edges.
    """
    edges = []
    concept_map = {c["id"]: c for c in concepts}
    concept_names = {c["id"]: c["name"].lower() for c in concepts}
    co_occurrences = Counter()
    prereq_pairs = set()

    # Search sentences for co-occurring concepts
    for s in sentences:
        s_lower = s.lower()
        found_in_s = []

        for cid, name in concept_names.items():
            if re.search(r'\b' + re.escape(name) + r'\b', s_lower):
                found_in_s.append(cid)

        # Check for explicit prerequisite sentence patterns
        is_prereq_sentence = any(re.search(pat, s_lower) for pat in PREREQUISITE_INDICATORS)

        if len(found_in_s) >= 2:
            for i in range(len(found_in_s)):
                for j in range(i + 1, len(found_in_s)):
                    c1, c2 = found_in_s[i], found_in_s[j]
                    pair = tuple(sorted([c1, c2]))
                    co_occurrences[pair] += 1

                    if is_prereq_sentence:
                        # Direction heuristic: earlier term is prerequisite
                        prereq_pairs.add((c1, c2))

    # Convert co-occurrences into conceptual edges
    for (c1, c2), count in co_occurrences.items():
        weight = max(0.5, round(5.0 / (count + 1), 2)) # Closer co-occurrence = smaller cognitive weight
        edges.append({
            "fromId": c1,
            "toId": c2,
            "relation": "associated with",
            "type": "CONCEPTUAL",
            "weight": weight
        })

    # Educational prerequisite hierarchy fallback if too few explicit prerequisite sentences
    if len(prereq_pairs) < 3:
        # Sort concepts by pedagogical complexity
        categories_order = {
            "Fundamental Concept": 0,
            "Analysis": 1,
            "Data Structure": 2,
            "Algorithm": 3
        }
        sorted_by_cat = sorted(concepts, key=lambda c: categories_order.get(c["category"], 1))
        for i in range(len(sorted_by_cat) - 1):
            c_curr = sorted_by_cat[i]
            c_next = sorted_by_cat[i + 1]
            if c_curr["category"] != c_next["category"] or (c_curr["frequency"] >= c_next["frequency"]):
                prereq_pairs.add((c_curr["id"], c_next["id"]))

    for from_id, to_id in prereq_pairs:
        if from_id != to_id:
            edges.append({
                "fromId": from_id,
                "toId": to_id,
                "relation": "prerequisite for",
                "type": "PREREQUISITE",
                "weight": 1.0
            })

    return edges


def extract_all(text: str) -> dict:
    if not text or len(text.strip()) < 15:
        return {"success": False, "error": "Input text too brief for concept extraction."}

    sentences = split_sentences(text)
    nodes = extract_candidate_concepts(text, sentences)

    if not nodes:
        return {"success": False, "error": "No meaningful technical concepts could be extracted."}

    edges = extract_relationships(nodes, sentences)

    return {
        "success": True,
        "nodes": nodes,
        "edges": edges,
        "sentenceCount": len(sentences),
        "conceptCount": len(nodes),
        "edgeCount": len(edges)
    }


if __name__ == "__main__":
    input_str = sys.stdin.read().strip()
    if not input_str and len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            input_str = f.read()

    try:
        # Check if input is JSON with "text" field
        data = json.loads(input_str)
        text = data.get("text", input_str)
    except Exception:
        text = input_str

    result = extract_all(text)
    print(json.dumps(result))
