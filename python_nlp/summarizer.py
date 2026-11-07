#!/usr/bin/env python3
"""
ModelMind Free Local Extractive Summarizer
Uses Sentence Graph Centrality (TextRank) to generate executive summaries.
100% free and local - zero paid APIs required.
"""

import sys
import json
import re
from collections import Counter

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "did", "do", "does", "each", "few", "for", "from", "further", "had", "has", "have", "he", "her",
    "here", "him", "his", "how", "i", "if", "in", "into", "is", "it", "its", "me", "more", "most",
    "my", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "our", "out", "over",
    "own", "same", "she", "should", "so", "some", "such", "than", "that", "the", "their", "them",
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "with", "would", "you", "your"
}


def split_sentences(text: str) -> list:
    raw = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9])', text.strip())
    sentences = [s.strip() for s in raw if len(s.strip()) > 15]
    return sentences


def sentence_tokens(sentence: str) -> set:
    words = re.findall(r'\b[A-Za-z][A-Za-z0-9_-]*\b', sentence.lower())
    return {w for w in words if w not in STOP_WORDS and len(w) > 2}


def jaccard_similarity(set_a: set, set_b: set) -> float:
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union if union > 0 else 0.0


def textrank_summarize(text: str, max_sentences: int = 4) -> dict:
    sentences = split_sentences(text)
    if not sentences:
        return {"success": False, "error": "No sentences detected in input text."}

    if len(sentences) <= max_sentences:
        return {
            "success": True,
            "summary": " ".join(sentences),
            "sentenceCount": len(sentences),
            "keyPoints": sentences
        }

    # 1. Build token sets for each sentence
    sentence_sets = [sentence_tokens(s) for s in sentences]
    n = len(sentences)

    # 2. Build adjacency matrix / similarity graph
    sim_matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            sim = jaccard_similarity(sentence_sets[i], sentence_sets[j])
            if sim > 0.05:
                sim_matrix[i][j] = sim
                sim_matrix[j][i] = sim

    # 3. Power iteration PageRank
    scores = [1.0 / n] * n
    damping = 0.85
    iterations = 25

    for _ in range(iterations):
        new_scores = [ (1.0 - damping) / n ] * n
        for i in range(n):
            for j in range(n):
                if i != j and sim_matrix[j][i] > 0:
                    weight_sum = sum(sim_matrix[j])
                    if weight_sum > 0:
                        new_scores[i] += damping * (sim_matrix[j][i] / weight_sum) * scores[j]
        scores = new_scores

    # 4. Pick top scoring sentence indices and sort by original narrative flow
    ranked_indices = sorted(range(n), key=lambda i: scores[i], reverse=True)[:max_sentences]
    ordered_indices = sorted(ranked_indices)

    summary_sentences = [sentences[idx] for idx in ordered_indices]

    return {
        "success": True,
        "summary": " ".join(summary_sentences),
        "sentenceCount": len(summary_sentences),
        "keyPoints": summary_sentences
    }


if __name__ == "__main__":
    input_str = sys.stdin.read().strip()
    try:
        data = json.loads(input_str)
        text = data.get("text", input_str)
        count = data.get("maxSentences", 4)
    except Exception:
        text = input_str
        count = 4

    result = textrank_summarize(text, count)
    print(json.dumps(result))
