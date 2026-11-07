#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  ModelMind Integration Test Suite                        "
echo "  Testing Python NLP -> C++ Engine -> JSON Communication  "
echo "=========================================================="

# Test 1: Python Concept Extractor
echo "[TEST 1] Testing Python Concept Extractor..."
SAMPLE_TEXT="A Binary Search Tree is an organized tree structure where left nodes are smaller. Graphs consist of vertices connected by edges. Breadth First Search traverses graphs using a FIFO queue. Depth First Search traverses graphs using a LIFO stack. Dijkstra's Algorithm finds the shortest path on weighted graphs with non-negative weights."

EXTRACT_OUTPUT=$(echo "{\"text\": \"$SAMPLE_TEXT\"}" | python3 python_nlp/extractor.py)
if echo "$EXTRACT_OUTPUT" | grep -q '"success": true'; then
    echo "  ✓ Python Concept Extractor passed"
else
    echo "  ✗ Python Concept Extractor failed: $EXTRACT_OUTPUT"
    exit 1
fi

# Test 2: Python TextRank Summarizer
echo "[TEST 2] Testing Python Extractive Summarizer..."
SUMMARY_OUTPUT=$(echo "{\"text\": \"$SAMPLE_TEXT\", \"maxSentences\": 2}" | python3 python_nlp/summarizer.py)
if echo "$SUMMARY_OUTPUT" | grep -q '"success": true'; then
    echo "  ✓ Python Extractive Summarizer passed"
else
    echo "  ✗ Python Extractive Summarizer failed: $SUMMARY_OUTPUT"
    exit 1
fi

# Test 3: Python -> C++ Engine Pipeline (Graph Build)
echo "[TEST 3] Testing Python -> C++ Engine Pipeline..."
NODES=$(echo "$EXTRACT_OUTPUT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data['nodes']))")
EDGES=$(echo "$EXTRACT_OUTPUT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data['edges']))")

BUILD_PAYLOAD=$(python3 -c "import json; print(json.dumps({'action': 'build_graph', 'nodes': $NODES, 'edges': $EDGES}))")
CPP_BUILD_RESP=$(echo "$BUILD_PAYLOAD" | ./cxx/bin/modelmind_engine)

if echo "$CPP_BUILD_RESP" | grep -q '"success":true'; then
    echo "  ✓ C++ Graph Construction passed"
else
    echo "  ✗ C++ Graph Construction failed: $CPP_BUILD_RESP"
    exit 1
fi

# Test 4: C++ BFS Traversal Action
echo "[TEST 4] Testing C++ BFS Traversal Action..."
FIRST_NODE=$(echo "$NODES" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")
BFS_PAYLOAD=$(python3 -c "import json; print(json.dumps({'action': 'bfs', 'startId': '$FIRST_NODE', 'nodes': $NODES, 'edges': $EDGES}))")
BFS_RESP=$(echo "$BFS_PAYLOAD" | ./cxx/bin/modelmind_engine)

if echo "$BFS_RESP" | grep -q '"algorithm":"BFS"'; then
    echo "  ✓ C++ BFS Traversal passed"
else
    echo "  ✗ C++ BFS Traversal failed: $BFS_RESP"
    exit 1
fi

# Test 5: C++ Dijkstra Shortest Path Action
echo "[TEST 5] Testing C++ Dijkstra Shortest Path Action..."
SECOND_NODE=$(echo "$NODES" | python3 -c "import sys, json; print(json.load(sys.stdin)[1]['id'])")
DIJKSTRA_PAYLOAD=$(python3 -c "import json; print(json.dumps({'action': 'dijkstra', 'startId': '$FIRST_NODE', 'targetId': '$SECOND_NODE', 'nodes': $NODES, 'edges': $EDGES}))")
DIJKSTRA_RESP=$(echo "$DIJKSTRA_PAYLOAD" | ./cxx/bin/modelmind_engine)

if echo "$DIJKSTRA_RESP" | grep -q '"action":"dijkstra"'; then
    echo "  ✓ C++ Dijkstra Shortest Path passed"
else
    echo "  ✗ C++ Dijkstra failed: $DIJKSTRA_RESP"
    exit 1
fi

# Test 6: C++ Trie Prefix Autocomplete
echo "[TEST 6] Testing C++ Trie Autocomplete..."
AUTO_PAYLOAD=$(python3 -c "import json; print(json.dumps({'action': 'autocomplete', 'prefix': 'graph', 'maxResults': 5, 'nodes': $NODES, 'edges': $EDGES}))")
AUTO_RESP=$(echo "$AUTO_PAYLOAD" | ./cxx/bin/modelmind_engine)

if echo "$AUTO_RESP" | grep -q '"action":"autocomplete"'; then
    echo "  ✓ C++ Trie Autocomplete passed"
else
    echo "  ✗ C++ Trie Autocomplete failed: $AUTO_RESP"
    exit 1
fi

# Test 7: Error Handling for Malformed Payload
echo "[TEST 7] Testing C++ Engine Error Handling on Malformed Input..."
ERR_RESP=$(echo "THIS_IS_NOT_VALID_JSON" | ./cxx/bin/modelmind_engine)

if echo "$ERR_RESP" | grep -q '"success":false'; then
    echo "  ✓ C++ Engine handled malformed input gracefully"
else
    echo "  ✗ C++ Error handling failed: $ERR_RESP"
    exit 1
fi

echo "=========================================================="
echo "  ALL INTEGRATION TESTS PASSED SUCCESSFULLY!              "
echo "=========================================================="
