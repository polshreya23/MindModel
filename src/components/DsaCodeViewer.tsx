import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, FileCode, Clock, Terminal } from 'lucide-react';
import { apiUrl } from '../lib/api.ts';

interface FileSourceData {
  fileName: string;
  path: string;
  content: string;
  lineCount: number;
}

const DSA_FILES = [
  { name: 'HashTable.hpp', label: 'Hash Table (Chaining)', complexity: 'O(1) avg / O(V) space' },
  { name: 'Trie.hpp', label: 'Trie (Prefix Tree)', complexity: 'O(L) / O(N·Σ) space' },
  { name: 'MaxHeap.hpp', label: 'Max-Heap (Priority Queue)', complexity: 'O(log V) push/pop / O(V)' },
  { name: 'Graph.hpp', label: 'Adjacency List Graph', complexity: 'O(V + E) space' },
  { name: 'Algorithms.hpp', label: 'BFS, DFS, Dijkstra & Kahn', complexity: 'BFS O(V+E), Dijkstra O(E log V)' },
  { name: 'ConceptNode.hpp', label: 'Concept & Edge Structs', complexity: 'C++14 Models' },
  { name: 'test_dsa.cpp', label: 'Unit Test Suite', complexity: '100% C++ Assertions' },
  { name: 'main.cpp', label: 'CLI & IPC Dispatcher', complexity: 'stdin/stdout JSON Bridge' },
];

export const DsaCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('HashTable.hpp');
  const [fileData, setFileData] = useState<FileSourceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const fetchSource = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/dsa/source/${selectedFile}`));
        if (res.ok) {
          const data = await res.json();
          setFileData(data);
        }
      } catch (err) {
        console.error('Failed to load C++ source file:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSource();
  }, [selectedFile]);

  const handleCopy = () => {
    if (fileData?.content) {
      navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl p-6 flex flex-col gap-5 shadow-sm text-[#252D2B]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D8C8A8]/60 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#174A45]/10 flex items-center justify-center text-[#174A45]">
            <Code2 className="w-5 h-5 text-[#174A45]" />
          </div>
          <div>
            <h3 className="font-editorial text-base font-bold text-[#174A45]">C++ Data Structures & Algorithms</h3>
            <p className="text-xs text-[#636E6B]">Verified C++14 native source files powering the ModelMind engine</p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#EFE8DC] hover:bg-[#E5DDCB] text-xs font-semibold text-[#174A45] transition cursor-pointer self-start sm:self-auto border border-[#D8C8A8]"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#5B8A6B]" /> : <Copy className="w-3.5 h-3.5 text-[#E88968]" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy C++ Source'}</span>
        </button>
      </div>

      {/* File Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {DSA_FILES.map((f) => (
          <button
            key={f.name}
            onClick={() => setSelectedFile(f.name)}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer font-mono flex items-center gap-2 ${
              selectedFile === f.name
                ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
                : 'bg-[#F5F1E8] border border-[#D8C8A8] text-[#636E6B] hover:text-[#174A45] hover:bg-[#EFE8DC]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#E88968]" />
            <span>{f.name}</span>
          </button>
        ))}
      </div>

      {/* Complexity Reference Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#EFE8DC] border border-[#D8C8A8] text-xs font-mono">
        <div className="flex items-center gap-2 text-[#252D2B]">
          <Clock className="w-3.5 h-3.5 text-[#174A45]" />
          <span className="text-[#636E6B]">Complexity:</span>
          <span className="text-[#174A45] font-semibold">{DSA_FILES.find((f) => f.name === selectedFile)?.complexity}</span>
        </div>
        <div className="flex items-center gap-2 text-[#636E6B]">
          <Terminal className="w-3.5 h-3.5 text-[#8C7A5E]" />
          <span>{fileData?.path || selectedFile}</span>
          <span>·</span>
          <span>{fileData?.lineCount || 0} lines</span>
        </div>
      </div>

      {/* Code Viewer Box */}
      <div className="relative rounded-xl border border-[#D8C8A8] bg-[#182320] overflow-hidden shadow-inner">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#FAF7F2]/60 font-mono">
            Loading C++ source file...
          </div>
        ) : (
          <pre className="p-5 text-xs font-mono text-[#E8E2D5] overflow-x-auto leading-relaxed max-h-[500px]">
            <code>{fileData?.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
