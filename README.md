# 🧠 ModelMind – AI-Powered Knowledge Graph & Mind Map Generator

**Transform your study materials into interactive knowledge graphs, visual mind maps, and structured learning paths.**

ModelMind is an AI-powered educational platform that converts unstructured learning materials into meaningful visual representations. It extracts important concepts, identifies relationships, generates interactive knowledge graphs and mind maps, and helps students understand complex topics through visual learning.

The project combines **Artificial Intelligence, Natural Language Processing (NLP), Data Structures, and Algorithms** to make learning more organized, interactive, and efficient.

---

## ✨ Key Features

### 📄 1. Multi-Format Document Processing
- Upload PDF documents.
- Upload PowerPoint presentations (.pptx).
- Extract text from uploaded learning materials.
- Accept manually entered text and topics.
- Automatically process extracted content using NLP.

### 🧩 2. AI-Powered Knowledge Graph
- Automatically identify important concepts.
- Generate nodes and relationships between concepts.
- Visualize connections using an interactive graph.
- Explore relationships between different topics.
- Highlight important concepts and shortest paths.

### 🌳 3. Interactive Mind Map Generation
- Generate visual mind maps from uploaded documents.
- Display a central topic with connected main branches.
- Organize concepts into sub-branches and multiple levels.
- Use different colours to distinguish branches.
- Support interactive exploration of concepts.

### 🔍 4. Smart Concept Search
- Search extracted concepts quickly.
- Trie-based prefix searching and autocomplete.
- Hash Table-based concept lookup.
- Explore related concepts efficiently.

### ⚡ 5. Data Structures & Algorithms Visualization

ModelMind demonstrates the practical implementation of important Data Structures and Algorithms:

| Data Structure / Algorithm | Application |
|---|---|
| Hash Table | Fast concept lookup |
| Trie | Prefix-based autocomplete |
| Max-Heap | Concept importance ranking |
| Graph | Knowledge representation |
| BFS | Breadth-first graph traversal |
| DFS | Depth-first graph traversal |
| Dijkstra's Algorithm | Shortest path analysis |
| Topological Sort | Prerequisite learning order |

### 📚 6. Intelligent Learning Assistance
- Generate AI-based summaries.
- Identify prerequisite relationships.
- Generate structured learning paths.
- Rank important concepts.
- Explore topics through visual representations.

### 🕘 7. Search History
- Save previously generated analyses.
- Reopen old knowledge graphs and mind maps.
- Access previous learning materials.
- Manage saved history and favourites.

History is designed to work without mandatory user login.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Backend | Node.js, Express.js |
| Core DSA Engine | C++14 |
| NLP Service | Python |
| PDF Processing | PyMuPDF |
| PowerPoint Processing | python-pptx |
| Concept Extraction | TF-IDF, TextRank |
| Visualization | Interactive Graph and Mind Map |
| Data Storage | Local Persistent Browser Storage |

*Note: Actual dependency versions and optional services depend on the project configuration.*

---

## 🏗️ System Architecture

ModelMind follows a multi-layer architecture where each technology performs a specific responsibility.

```text
              USER
                |
                v
       React + TypeScript
          FRONTEND
                |
                v
        Node.js + Express
          BACKEND
                |
        +-------+-------+
        |               |
        v               v
   Python NLP       C++ DSA Engine
     Service          (C++14)
        |               |
        v               v
  Text Extraction   Hash Table
  Concept Analysis  Trie
  TF-IDF            Max-Heap
  TextRank          Graph
                    BFS / DFS
                    Dijkstra
                    Topological Sort
        |               |
        +-------+-------+
                |
                v
       Processed Results
                |
                v
       Interactive Knowledge
         Graph & Mind Map
                |
                v
          Search History
```

---

## 📁 Project Structure

The project is organized into separate frontend, backend, NLP, and C++ engine modules.

```text
ModelMind/
│
├── cxx/
│   ├── include/
│   ├── src/
│   ├── tests/
│   ├── Makefile
│   └── build.bat
│
├── python_nlp/
│   ├── pdf_extractor.py
│   ├── extractor.py
│   ├── summarizer.py
│   └── requirements.txt
│
├── server/
│   ├── index.ts
│   ├── cppBridge.ts
│   ├── nlpBridge.ts
│   └── pdfBridge.ts
│
├── src/
│   ├── components/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
└── tsconfig.json
```

*The structure above represents the intended module organization. Refer to the actual repository for the complete current file structure.*

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following tools:

- Node.js and npm
- Python 3
- GCC / G++ compiler supporting C++14
- Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

```bash
cd ModelMind
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Set Up Python Environment

```bash
cd python_nlp
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 4. Build the C++ Engine

On Windows, open the terminal inside the `cxx` directory:

```powershell
cd cxx
.\build.bat
```

The engine should be compiled using the C++14 standard.

### 5. Start the Application

Return to the project root:

```bash
cd ..
```

Start the application using the development command configured in `package.json`:

```bash
npm run dev
```

*If the project uses separate frontend and backend scripts, start them according to the repository configuration.*

---

## 🎯 Project Objectives

1. To simplify the understanding of complex educational content.
2. To convert unstructured documents into structured visual knowledge.
3. To demonstrate real-world applications of Data Structures and Algorithms.
4. To integrate NLP techniques with interactive graph generation.
5. To provide students with an intelligent and visual learning environment.
6. To improve knowledge discovery and concept exploration.

---

## 🚀 Future Enhancements

- Support for additional document formats.
- Improved semantic concept extraction.
- Multilingual document processing.
- AI-powered question generation.
- Personalized learning recommendations.
- Collaborative knowledge maps.
- Export mind maps and knowledge graphs as images or PDFs.
- Advanced learning analytics.

---

## 🎓 Academic Project

**Project Name:** ModelMind – AI-Powered Knowledge Graph & Mind Map Generator

**Domain:** Artificial Intelligence, Natural Language Processing, Data Structures and Algorithms.

**Project Type:** Academic / Educational Technology Project.

The project demonstrates how traditional Data Structures and Algorithms can be integrated with modern AI and NLP techniques to solve practical problems in education.

---

## 👩‍💻 Developed With

Built with curiosity, creativity, and a passion for Artificial Intelligence, software development, and visual learning.

**ModelMind – Learn Better. Understand Deeper. Visualize Everything.**
