# ModelMind: AI-Powered Knowledge Graph & Mind Map Generator

ModelMind is an educational and conceptual knowledge modeling platform driven by core Data Structures and Algorithms implemented natively in C++. It parses learning materials and uploaded PDF documents, extracts interrelated concepts using a free local Python NLP service, constructs a dual-edge knowledge graph, and provides interactive algorithm visualizations including BFS/DFS traversals, Dijkstra shortest learning paths, Trie autocomplete, and Max-Heap importance rankings.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following revisions have been incorporated directly into the system architecture:

- **Confirmed Decision 1 (Cross-Platform Windows & Linux Binary)**: The C++ engine supports both Windows (`modelmind_engine.exe` via MinGW/G++) and Linux (`modelmind_engine` via standard G++). Node.js dynamically detects `process.platform` to execute the appropriate binary with identical JSON communication over `stdin`/`stdout`.
- **Confirmed Decision 2 (Industry-Standard C++ JSON)**: The C++ engine integrates `nlohmann/json` (modern C++ single-header library) for robust, type-safe serialization of graph models, algorithm trace events, and queries.
- **Confirmed Decision 3 (PDF Upload & Free Python Extraction)**: The frontend supports drag-and-drop PDF and text uploads. Uploaded PDFs are parsed server-side using PyMuPDF (`fitz`), a high-performance free library, and the extracted text streams directly into the local NLP pipeline.
- **Confirmed Decision 4 (Dual-Edge Graph Architecture)**:
  - *Conceptual Relationships*: Undirected or associative semantic edges with non-negative weights representing cognitive distance, used for exploratory traversal and Dijkstra's algorithm.
  - *Prerequisite Relationships*: Strictly directed dependency edges ($A \to B$ means $A$ is required to learn $B$), isolated for DAG validation and Kahn's Topological Sorting.
- **Confirmed Decision 5 (Strict DSA Boundary & Testing)**: Zero DSA logic is offloaded to Python or JavaScript. Individual unit tests verify every C++ data structure (Hash Table, Trie, Max-Heap, Adjacency List Graph, BFS, DFS, Dijkstra, Topological Sort), alongside end-to-end integration tests connecting Python, Express, and C++.

---

## 1. Overview & Core Concept

- **What It Does**: ModelMind transforms unstructured educational text or uploaded PDF textbooks/notes into a structured Knowledge Graph and Mind Map. Users can inspect the underlying C++ data structures, trace algorithmic steps, search concepts via Trie autocomplete, compute optimal prerequisite curricula using Kahn's topological sort, and rank concepts using a binary Max-Heap.
- **Target Audience & Persona**: Computer science students, instructors, and evaluators who require an authentic, inspectable demonstration of foundational data structures (Graphs, Tries, Heaps, Hash Tables, Queues, Stacks) coupled with modern interactive visualization.
- **Key Value**: Every algorithm is explicit, educational, and modular. Evaluators can review the raw C++ code, execute terminal test suites, run standalone Windows/Linux binaries, and observe step-by-step state changes directly in the browser.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Document Ingestion**:
   - User types/pastes text, loads pre-configured CS curricula (e.g., *Operating Systems*, *Data Structures*, *DBMS*), or uploads a PDF textbook chapter.
   - A free PyMuPDF script extracts page text, cleans whitespace, and forwards the corpus to the NLP service.
2. **Concept Extraction & Graph Construction**:
   - The Python NLP pipeline identifies key domain concepts, frequencies, sentence co-occurrences, and prerequisite candidate pairs.
   - The C++ engine populates the custom Hash Table, builds the Trie index, inserts concepts into the Max-Heap, and constructs the dual-edge Adjacency List.
3. **Dual Visualization**:
   - **Interactive Force-Directed Graph**: Displays conceptual clusters, hub concepts, and associative bridges with interactive physics.
   - **Hierarchical Mind Map / DAG**: Renders prerequisite learning paths with clear directional arrows indicating study sequences.
4. **Interactive DSA Controls**:
   - **BFS / DFS Traversal**: Stepper controls (Play, Pause, Step Next, Reset) showing queue/stack frontiers and visited sets.
   - **Dijkstra Shortest Path**: Source and destination picker computing the minimum-weight cognitive path with verified non-negative weights.
   - **Trie Search & Autocomplete**: Search bar offering real-time prefix suggestions queried from the C++ Trie.
   - **Max-Heap Leaderboard**: Priority queue inspector displaying top-K concepts ranked by structural centrality and occurrence frequency.
   - **Prerequisite Curriculum**: Topological sort generator detailing prerequisite requirements and flagging any circular dependency cycles.
5. **Code & Complexity Inspector**:
   - Live side-panel displaying C++ source files (`Graph.hpp`, `HashTable.hpp`, `Trie.hpp`, `MaxHeap.hpp`, `Algorithms.hpp`), along with theoretical time and space complexities.

### Visual Identity & Theme
- **Aesthetic Direction**: Academic and scientific laboratory environment adhering to the *Education & Interactive Simulations* design guidelines.
- **Color Palette**:
  - Dominant Canvas (60%): Clean dark slate (`#0b0f17` background with `#131b2e` surface cards).
  - Structural Panels & Dividers (30%): Hairline borders (`#1e293b`), crisp monospace typography (`#94a3b8`).
  - Semantic Focal Accents (10%):
    - *Conceptual Edge*: Indigo (`#6366f1`)
    - *Prerequisite Edge*: Amber/Gold (`#f59e0b`)
    - *Traversed Node*: Cyan (`#06b6d4`)
    - *Shortest Path*: Emerald (`#10b981`)
    - *Heap Priority*: Violet (`#8b5cf6`)
- **Typography**: `Plus Jakarta Sans` for UI prose and display headings; `JetBrains Mono` for tabular complexity metrics, step traces, and C++ code.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Cross-Platform Windows & Linux Binary Architecture**
  - *Chosen Approach*: The C++ codebase is standard C++17 without OS-specific headers. Build scripts support native GCC and MinGW (`x86_64-w64-mingw32-g++`), producing `bin/modelmind_engine.exe` (Windows) or `bin/modelmind_engine` (Linux).
  - *Why*: Enables seamless execution on Windows development machines as well as Linux web containers. The Node.js bridge tests `process.platform === 'win32'` to launch the appropriate executable.
- **Decision 2: Integration of `nlohmann/json`**
  - *Chosen Approach*: Vendor the single-header `nlohmann/json.hpp` under `cxx/include/external/`.
  - *Why*: Eliminates complex custom parsing bugs and provides modern C++ JSON serialization with compile-time safety and intuitive `NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE` macros.
- **Decision 3: Dual-Edge Knowledge Graph Semantics**
  - *Chosen Approach*: Graph edges are classified into `EdgeType::CONCEPTUAL` and `EdgeType::PREREQUISITE`.
  - *Why*: Mixing associative relationships (e.g., "Queue is related to Stack") with hard prerequisites (e.g., "Arrays $\to$ Heaps") creates false cycles in topological sorting. Separating them allows Dijkstra to find associative connections while Kahn's algorithm validates prerequisite DAGs.
- **Decision 4: Free Local PyMuPDF PDF Extraction**
  - *Chosen Approach*: PyMuPDF (`fitz`) handles client PDF uploads locally in Python without external cloud conversion services or OCR fees.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE (React 19)                    │
│                                                                        │
│   ┌────────────────────────┐  ┌────────────────────────────────────┐   │
│   │   PDF Upload & Text    │  │  Dual Graph / Mind Map Canvas      │   │
│   │   Corpus Input Panel   │  │  - Force-Directed Graph            │   │
│   └───────────┬────────────┘  │  - Hierarchical Tree DAG           │   │
│               │               └─────────────────▲──────────────────┘   │
│               │                                 │                      │
│   ┌───────────▼────────────┐  ┌─────────────────┴──────────────────┐   │
│   │  Trie Autocomplete     │  │  Algorithm Playback & Controls     │   │
│   │  & Search Input        │  │  - BFS / DFS Wavefront             │   │
│   └───────────┬────────────┘  │  - Dijkstra Shortest Path          │   │
│               │               │  - Max-Heap Importance Inspection  │   │
│               │               │  - Prerequisite DAG Order          │   │
│               │               └─────────────────▲──────────────────┘   │
└───────────────┼─────────────────────────────────┼──────────────────────┘
                │ Multipart Form (PDF) / JSON API
                ▼                                 │
┌─────────────────────────────────────────────────┴──────────────────────┐
│                    NODE.JS / EXPRESS BACKEND SERVER                    │
│                                                                        │
│  - POST /api/upload-pdf        --> PyMuPDF Text Extraction Script      │
│  - POST /api/extract           --> Python NLP & Keyword Extractor      │
│  - POST /api/graph/build       --> Pipes extracted JSON to C++ Engine  │
│  - POST /api/graph/action      --> Executes BFS, DFS, Dijkstra, etc.   │
│  - GET  /api/dsa/source/:file  --> Serves raw C++ source files         │
└───────────────────────┬─────────────────────────▲──────────────────────┘
                        │ Cross-Platform IPC (stdin / stdout JSON)
                        ▼                         │
┌─────────────────────────────────────────────────┴──────────────────────┐
│        CORE C++ DSA ENGINE (modelmind_engine / .exe)                   │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐   │
│  │ Custom Hash Table     │  │ Dual-Edge Graph (Adjacency List)     │   │
│  │ (Separate Chaining)   │  │ - Conceptual Edges (Undirected, W≥0) │   │
│  │                       │  │ - Prerequisite Edges (Directed DAG)  │   │
│  └───────────────────────┘  └──────────────────┬───────────────────┘   │
│  ┌───────────────────────┐                     │                       │
│  │ Trie Prefix Tree      │  ┌──────────────────▼───────────────────┐   │
│  │ (O(L) Autocomplete)  │  │ Graph Algorithms:                    │   │
│  └───────────────────────┘  │ - BFS & DFS (Step Trace)             │   │
│  ┌───────────────────────┐  │ - Dijkstra (Non-Negative Weights)    │   │
│  │ Max-Heap / Priority Q │  │ - Kahn's Topological Sort (Prereq)   │   │
│  │ (Rank Importance)     │  │ - Cycle Detection & Culprit Nodes    │   │
│  └───────────────────────┘  └──────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ nlohmann/json Serialization & Structured CLI Dispatcher         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Detailed Folder Structure

```
modelmind/
├── cxx/                               # Core C++ DSA Implementations (C++17)
│   ├── include/
│   │   ├── external/
│   │   │   └── json.hpp               # nlohmann/json single-header library
│   │   ├── ConceptNode.hpp            # Concept metadata, EdgeType enum, Edge struct
│   │   ├── HashTable.hpp              # Custom Hash Table with collision handling
│   │   ├── Trie.hpp                   # Prefix Tree for search and autocomplete
│   │   ├── MaxHeap.hpp                # Binary Max-Heap / Priority Queue
│   │   ├── Graph.hpp                  # Adjacency list with Conceptual & Prerequisite edges
│   │   └── Algorithms.hpp             # BFS, DFS, Dijkstra, Kahn's Topological Sort
│   ├── src/
│   │   ├── HashTable.cpp
│   │   ├── Trie.cpp
│   │   ├── MaxHeap.cpp
│   │   ├── Graph.cpp
│   │   ├── Algorithms.cpp
│   │   └── main.cpp                   # stdin/stdout JSON dispatcher for Express
│   ├── tests/
│   │   └── test_dsa.cpp               # C++ unit test runner for all 6 DSA components
│   ├── Makefile                       # Supports 'make' (Linux) and 'make windows' (MinGW)
│   ├── build.bat                      # Windows build script using MinGW g++
│   └── build.sh                       # Linux/macOS build script
│
├── python_nlp/                        # Free Local Python NLP Service
│   ├── requirements.txt               # pymupdf (free PDF extractor)
│   ├── pdf_extractor.py               # PDF document text parsing via PyMuPDF
│   ├── extractor.py                   # Concept extraction, TF-IDF & co-occurrence
│   └── summarizer.py                  # Extractive graph-based text summarization
│
├── server/
│   ├── index.ts                       # Express server running on port 3000
│   ├── cppBridge.ts                   # Cross-platform child-process runner (.exe / elf)
│   ├── nlpBridge.ts                   # Python process runner for extraction & summarization
│   └── pdfBridge.ts                   # Multipart upload & PDF parsing coordinator
│
├── src/                               # Frontend Web Interface (React 19 + Tailwind)
│   ├── components/
│   │   ├── Header.tsx                 # Top bar contract (brand, stats, controls)
│   │   ├── TextInputPanel.tsx         # Text input, PDF file dropzone & preset datasets
│   │   ├── GraphCanvas.tsx            # Force-directed SVG/Canvas knowledge graph
│   │   ├── MindMapCanvas.tsx          # Hierarchical mind map & prerequisite tree
│   │   ├── TraversalControls.tsx      # Step-by-step playback slider & action triggers
│   │   ├── AutocompleteBar.tsx        # Real-time Trie search input
│   │   ├── HeapLeaderboard.tsx        # Max-Heap ranked concept priority list
│   │   ├── PrerequisitePath.tsx       # DAG topological study roadmap
│   │   └── DsaCodeViewer.tsx          # Educational code inspector with time/space complexities
│   ├── types/
│   │   └── dsa.ts                     # TypeScript schemas matching C++ JSON output
│   ├── App.tsx                        # Master layout & state management
│   └── main.tsx
│
├── package.json
└── tsconfig.json
```

---

## 6. DSA Concept Breakdown & Algorithmic Rigor

| Module / Requirement | Primary Data Structure & Algorithm | Time Complexity | Space Complexity | Implementation Details & Pedagogical Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Concept Storage & Lookup** | Custom **Hash Table** with Separate Chaining | $O(1)$ average, $O(V)$ worst | $O(V)$ | Implemented from scratch using a custom hash function (`djb2`), dynamic bucket vector, and linked node chains. Avoids STL `std::unordered_map` for core concept lookup. |
| **Knowledge Graph Representation** | **Graph with Adjacency List** supporting Dual-Edge Types | $O(V + E)$ storage | $O(V + E)$ | Distinct adjacency lists for `EdgeType::CONCEPTUAL` (undirected semantic relations) and `EdgeType::PREREQUISITE` (directed dependency relations). |
| **Breadth-First Exploration** | **BFS** using FIFO Queue | $O(V + E)$ | $O(V)$ | Level-by-level concept expansion across conceptual edges. Emits step traces recording `{ step, action, currentNode, queueState, visitedSet }`. |
| **Depth-First Exploration** | **DFS** using LIFO Stack | $O(V + E)$ | $O(V)$ | Deep thematic exploration tracking discovery and finish times. Emits step traces recording `{ step, action, currentNode, stackState, visitedSet }`. |
| **Shortest Learning Path** | **Dijkstra's Algorithm** with Min-Heap | $O(E \log V)$ | $O(V)$ | Computes lowest cognitive weight between two concepts over non-negative conceptual edge weights ($w \ge 0$). Verifies non-negativity before execution. |
| **Fast Search & Autocomplete**| **Trie (Prefix Tree)** | $O(L)$ where $L$ is word length | $O(N \cdot \Sigma)$ | Multi-way character tree. Prefix search queries subtrees to return all matching concept strings instantaneously. |
| **Concept Importance Ranking**| **Binary Max-Heap / Priority Queue** | $O(\log V)$ push/pop, $O(V)$ build | $O(V)$ | Implemented using an array-based binary tree. Concept priority is calculated from node degree and TF-IDF centrality. Top-K items extracted via `extractMax()`. |
| **Prerequisite Learning Path**| **Topological Sort (Kahn's Algorithm)** | $O(V + E_{\text{prereq}})$ | $O(V)$ | Evaluates only `EdgeType::PREREQUISITE` edges. Computes in-degrees, uses a queue for zero in-degree nodes, and identifies circular prerequisite deadlocks. |
| **PDF Extraction & Summarization** | **PyMuPDF + Sentence Centrality Graph** | $O(P)$ pages / $O(S^2)$ sentences | $O(S)$ | Pure local Python pipeline extracting raw text from PDFs and ranking sentences using an extractive graph centrality metric without paid LLM APIs. |

---

## 7. Multi-Tier Testing Strategy

### A. C++ Unit Test Suite (`cxx/tests/test_dsa.cpp`)
1. **Hash Table Tests**:
   - Verify insertion, retrieval, update, and deletion.
   - Verify collision handling when two keys hash to the same bucket index.
   - Verify lookup behavior for non-existent keys.
2. **Trie Tests**:
   - Verify exact word lookup (`search("Algorithm") == true`, `search("Algo") == false`).
   - Verify prefix lookup (`startsWith("Alg") == true`).
   - Verify autocomplete returns all words with a given prefix in alphabetical order.
3. **Max-Heap Tests**:
   - Verify max-heap property after inserting elements in arbitrary order.
   - Verify `extractMax()` returns concepts in strictly descending priority order.
   - Verify priority updates via `increaseKey` / re-heapification.
4. **Graph & Dual-Edge Tests**:
   - Verify bidirectional conceptual edge creation.
   - Verify unidirectional prerequisite edge creation.
   - Verify edge weight validation (rejecting negative weights for Dijkstra).
5. **Algorithm Traversal Tests**:
   - Verify BFS traversal order against a known test graph.
   - Verify DFS traversal order and backtrack points.
   - Verify Dijkstra produces the exact shortest path and distance on a weighted graph.
   - Verify Topological Sort produces a valid topological order on a directed acyclic graph (DAG).
   - Verify Topological Sort detects cycles and outputs the cycle-forming nodes when circular dependencies are introduced.

### B. Integration Tests (`server/tests/`)
1. **Express $\leftrightarrow$ C++ JSON Bridge**:
   - Send mock JSON payloads via `stdin` to the compiled binary (`modelmind_engine` or `modelmind_engine.exe`).
   - Verify output matches schema and error cases return appropriate JSON error payloads (`{ "error": "Node not found" }`).
2. **PDF Ingestion Bridge**:
   - Upload a test multi-page PDF document.
   - Verify PyMuPDF extracts text correctly without character corruption.
   - Verify extracted text is passed to the NLP extractor and builds a valid graph in C++.

---

## 8. Step-by-Step Module Implementation Roadmap

1. **Module 1: Environment Setup & Tooling**
   - Install `g++` and MinGW toolchain in the environment.
   - Vendor `nlohmann/json.hpp`.
   - Create `Makefile`, `build.sh`, and `build.bat` supporting both Linux and Windows binary builds.
2. **Module 2: Core C++ Data Structures**
   - Implement `ConceptNode.hpp` with `EdgeType` (`CONCEPTUAL`, `PREREQUISITE`).
   - Implement `HashTable.hpp` / `HashTable.cpp` from scratch.
   - Implement `Trie.hpp` / `Trie.cpp`.
   - Implement `MaxHeap.hpp` / `MaxHeap.cpp`.
   - Implement `Graph.hpp` / `Graph.cpp` with dual-edge adjacency lists.
   - Compile and execute `cxx/tests/test_dsa.cpp` to verify data structures before proceeding.
3. **Module 3: Core C++ Graph Algorithms**
   - Implement BFS with queue step trace generator.
   - Implement DFS with stack step trace generator.
   - Implement Dijkstra's algorithm with non-negative weight validation.
   - Implement Kahn's Topological Sort with cycle detection on prerequisite edges.
   - Extend `test_dsa.cpp` with algorithm test cases and verify all tests pass.
4. **Module 4: C++ JSON Dispatcher (`main.cpp`)**
   - Wire `nlohmann/json` to parse actions (`build_graph`, `bfs`, `dfs`, `dijkstra`, `topological_sort`, `autocomplete`, `get_heap`).
   - Format responses and step-by-step traces as clean JSON to `stdout`.
5. **Module 5: Free Local Python NLP & PyMuPDF Service**
   - Install `pymupdf` using `pip install pymupdf`.
   - Implement `pdf_extractor.py` for parsing PDF documents.
   - Implement `extractor.py` for keyword extraction, TF-IDF scoring, and relationship pairing.
   - Implement `summarizer.py` for extractive summarization.
6. **Module 6: Express Backend Bridge**
   - Implement `cppBridge.ts` with cross-platform OS binary detection (`.exe` on Windows).
   - Implement `pdfBridge.ts` with file upload handling for `.pdf` and `.txt`.
   - Implement REST endpoints for graph operations and C++ source code delivery.
7. **Module 7: Interactive React Frontend**
   - Build dual-view visualizer (Force Graph + Hierarchical Mind Map).
   - Build animated traversal stepper (BFS/DFS/Dijkstra) with queue/stack state inspector.
   - Build Trie autocomplete search bar and Max-Heap priority leaderboard.
   - Build prerequisite study path roadmap with cycle alert banner.
   - Build educational C++ code inspector displaying real source code and complexity analysis.
8. **Module 8: End-to-End Verification**
   - Test PDF upload flow with a sample document.
   - Run full unit and integration test suite.
   - Verify layout integrity and responsive design.
