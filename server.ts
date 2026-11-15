import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { CppBridge } from './server/cppBridge.ts';
import { NlpBridge } from './server/nlpBridge.ts';
import { PdfBridge } from './server/pdfBridge.ts';
import { PptxBridge } from './server/pptxBridge.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup upload directory for temporary PDF parsing
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'ModelMind',
    platform: process.platform,
    timestamp: new Date().toISOString(),
  });
});

// PDF Upload & Text Extraction
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded.' });
    }

    const pdfResult = await PdfBridge.extractTextFromPdf(req.file.path);
    if (!pdfResult.success) {
      return res.status(400).json(pdfResult);
    }

    // Auto-extract concepts & summary from extracted PDF text
    const text = pdfResult.text || '';
    const [nlpResult, summaryResult] = await Promise.all([
      NlpBridge.extractConcepts(text).catch((err) => ({
        success: false,
        error: err.message,
      })),
      NlpBridge.summarizeText(text, 4).catch((err) => ({
        success: false,
        error: err.message,
      })),
    ]);

    res.json({
      success: true,
      text,
      metadata: pdfResult.metadata,
      nlp: nlpResult,
      summary: summaryResult,
    });
  } catch (error: any) {
    if (req.file?.path) {
      PptxBridge.cleanupFile(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// PowerPoint (.pptx / .ppt) Upload, Slide Extraction, NLP & C++ DSA Pipeline
app.post('/api/upload-pptx', upload.any(), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
  const uploadedFile = files[0];

  try {
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No PowerPoint presentation file uploaded.',
      });
    }

    // Clean up any extra files if multiple were sent
    for (let i = 1; i < files.length; i++) {
      PptxBridge.cleanupFile(files[i].path);
    }

    const originalName = uploadedFile.originalname || 'presentation.pptx';
    const ext = path.extname(originalName).toLowerCase();

    if (ext !== '.pptx' && ext !== '.ppt') {
      PptxBridge.cleanupFile(uploadedFile.path);
      return res.status(400).json({
        success: false,
        error: `Unsupported file type '${ext || 'unknown'}'. Please upload a .pptx or .ppt PowerPoint presentation.`,
      });
    }

    if (uploadedFile.size === 0) {
      PptxBridge.cleanupFile(uploadedFile.path);
      return res.status(400).json({
        success: false,
        error: 'The uploaded PowerPoint file is empty (0 bytes).',
      });
    }

    // 1. Extract slides, titles, bullets, tables & unified text via python-pptx
    const pptxResult = await PptxBridge.extractFromPresentation(
      uploadedFile.path,
      originalName
    );

    if (!pptxResult.success) {
      return res.status(400).json(pptxResult);
    }

    const text = pptxResult.text || '';
    const slides = pptxResult.slides || [];

    // 2. Run holistic NLP concept extraction & TextRank summarization
    const [nlpResult, summaryResult] = await Promise.all([
      NlpBridge.extractConcepts(text).catch((err) => ({
        success: false,
        error: err.message,
      })),
      NlpBridge.summarizeText(text, 4).catch((err) => ({
        success: false,
        error: err.message,
      })),
    ]);

    if (!nlpResult.success) {
      return res.status(400).json({
        success: false,
        error: nlpResult.error || 'Could not extract concepts from presentation slides.',
        metadata: pptxResult.metadata,
      });
    }

    // 3. Build Knowledge Graph, Max-Heap, Trie & Topological Sort in C++14 Engine
    const rawNodes = nlpResult.nodes || [];
    const rawEdges = nlpResult.edges || [];
    const graphBuild = await CppBridge.execute({
      action: 'build_graph',
      nodes: rawNodes,
      edges: rawEdges,
    });

    if (!graphBuild.success) {
      return res.status(500).json({
        success: false,
        error: graphBuild.error || 'C++ DSA Engine failed to build presentation graph.',
      });
    }

    // 4. Map extracted concepts back to source slide numbers & titles
    const slideReferences = PptxBridge.mapConceptSlideReferences(
      graphBuild.graph?.nodes || rawNodes,
      slides
    );

    res.json({
      success: true,
      text,
      slides,
      metadata: pptxResult.metadata,
      nlp: nlpResult,
      summary: summaryResult,
      graphBuild,
      slideReferences,
    });
  } catch (error: any) {
    if (uploadedFile?.path) {
      PptxBridge.cleanupFile(uploadedFile.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle Multer upload errors (e.g., file exceeding 25MB limit) as structured JSON
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'Uploaded file exceeds the 25MB maximum size limit.',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload validation error: ${err.message}`,
    });
  }
  if (err) {
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
  next();
});

// NLP Concept Extraction & Summarization from text
app.post('/api/extract', async (req, res) => {
  try {
    const { text, maxSentences } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text string is required.' });
    }

    const [nlpResult, summaryResult] = await Promise.all([
      NlpBridge.extractConcepts(text),
      NlpBridge.summarizeText(text, maxSentences || 4),
    ]);

    res.json({
      success: true,
      nlp: nlpResult,
      summary: summaryResult,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// C++ Graph Construction & Building
app.post('/api/graph/build', async (req, res) => {
  try {
    const { nodes, edges } = req.body;
    const result = await CppBridge.execute({
      action: 'build_graph',
      nodes: nodes || [],
      edges: edges || [],
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// C++ Graph Actions: BFS, DFS, Dijkstra, Topological Sort, Autocomplete, Max-Heap
app.post('/api/graph/action', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.action) {
      return res.status(400).json({ success: false, error: 'Missing action field.' });
    }
    const result = await CppBridge.execute(payload);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// C++ Source Code Delivery for educational inspection
app.get('/api/dsa/source/:file', (req, res) => {
  const allowedFiles: Record<string, string> = {
    'HashTable.hpp': 'cxx/include/HashTable.hpp',
    'HashTable.cpp': 'cxx/src/HashTable.cpp',
    'Trie.hpp': 'cxx/include/Trie.hpp',
    'Trie.cpp': 'cxx/src/Trie.cpp',
    'MaxHeap.hpp': 'cxx/include/MaxHeap.hpp',
    'MaxHeap.cpp': 'cxx/src/MaxHeap.cpp',
    'Graph.hpp': 'cxx/include/Graph.hpp',
    'Graph.cpp': 'cxx/src/Graph.cpp',
    'Algorithms.hpp': 'cxx/include/Algorithms.hpp',
    'Algorithms.cpp': 'cxx/src/Algorithms.cpp',
    'ConceptNode.hpp': 'cxx/include/ConceptNode.hpp',
    'main.cpp': 'cxx/src/main.cpp',
    'test_dsa.cpp': 'cxx/tests/test_dsa.cpp',
  };

  const requested = req.params.file;
  const relPath = allowedFiles[requested];

  if (!relPath) {
    return res.status(404).json({ error: 'File not permitted or not found.' });
  }

  const absPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(absPath)) {
    return res.status(404).json({ error: 'File does not exist.' });
  }

  const content = fs.readFileSync(absPath, 'utf-8');
  res.json({
    fileName: requested,
    path: relPath,
    content,
    lineCount: content.split('\n').length,
  });
});

// Setup Vite development server or static file serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ModelMind] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ModelMind] Failed to start server:', err);
  process.exit(1);
});
