import React, { useState, useRef } from 'react';
import { FileText, Upload, Sparkles, BookOpen, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { SAMPLE_CURRICULA, SampleCurriculum } from '../data/sampleCurricula.ts';
import { SummaryResult } from '../types/dsa.ts';

interface TextInputPanelProps {
  onProcessText: (text: string) => Promise<void>;
  onUploadPdf: (file: File) => Promise<void>;
  isLoading: boolean;
  summary: SummaryResult | null;
  onClose?: () => void;
}

export const TextInputPanel: React.FC<TextInputPanelProps> = ({
  onProcessText,
  onUploadPdf,
  isLoading,
  summary,
  onClose,
}) => {
  const [inputText, setInputText] = useState(SAMPLE_CURRICULA[0].text);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(SAMPLE_CURRICULA[0].id);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCurriculumSelect = (curr: SampleCurriculum) => {
    setSelectedCurriculum(curr.id);
    setInputText(curr.text);
    setUploadError(null);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.name.toLowerCase().endsWith('.txt') || file.type.includes('text');

    if (!isPdf && !isTxt) {
      setUploadError('Please select a valid PDF (.pdf) or text (.txt) document.');
      return;
    }

    if (isPdf) {
      try {
        await onUploadPdf(file);
        if (onClose) onClose();
      } catch (err: any) {
        setUploadError(err.message || 'Failed to extract PDF text.');
      }
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (content) {
          setInputText(content);
          setSelectedCurriculum('');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setUploadError('Please enter some text or upload a document.');
      return;
    }
    setUploadError(null);
    await onProcessText(inputText);
    if (onClose) onClose();
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl p-6 shadow-xl flex flex-col gap-5 max-w-2xl mx-auto text-[#252D2B]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#D8C8A8]/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#174A45]/10 flex items-center justify-center text-[#174A45]">
            <BookOpen className="w-5 h-5 text-[#174A45]" />
          </div>
          <div>
            <h2 className="font-editorial text-lg font-bold text-[#174A45]">Corpus & Document Ingestion</h2>
            <p className="text-xs text-[#636E6B]">Extract concepts via local Python NLP into the C++ Knowledge Graph</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-[#636E6B] hover:text-[#252D2B] px-2.5 py-1 rounded-md bg-[#EFE8DC] hover:bg-[#E5DDCB] transition cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {/* Preset Curricula selection */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-[#174A45]">Curated Computer Science Curricula</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_CURRICULA.map((curr) => (
            <button
              key={curr.id}
              onClick={() => handleCurriculumSelect(curr)}
              className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col gap-1 cursor-pointer ${
                selectedCurriculum === curr.id
                  ? 'border-[#174A45] bg-[#EFE8DC] text-[#174A45] font-semibold shadow-xs ring-1 ring-[#174A45]'
                  : 'border-[#D8C8A8] bg-[#FAF7F2] text-[#252D2B] hover:border-[#B8A888] hover:bg-[#F5F1E8]'
              }`}
            >
              <span className="leading-snug">{curr.title}</span>
              <span className="text-[10px] text-[#8C7A5E] font-normal">{curr.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PDF Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
          dragActive
            ? 'border-[#174A45] bg-[#EAE2D2] text-[#174A45]'
            : 'border-[#D8C8A8] bg-[#F5F1E8]/70 hover:border-[#174A45] hover:bg-[#EFE8DC]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-10 h-10 rounded-full bg-[#174A45]/10 flex items-center justify-center mb-0.5">
          <Upload className="w-5 h-5 text-[#174A45]" />
        </div>
        <div className="text-xs font-semibold text-[#252D2B]">
          Upload PDF or Text Notes
        </div>
        <div className="text-[11px] text-[#636E6B]">
          PyMuPDF parses lecture slides and chapters locally without paid APIs
        </div>
      </div>

      {/* Text Area */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-[#636E6B]">
          <span className="font-medium text-[#252D2B]">Lecture Notes / Plain Text Input</span>
          <span className="font-mono text-[11px]">{inputText.length} chars · {inputText.split(/\s+/).filter(Boolean).length} words</span>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setSelectedCurriculum('');
          }}
          rows={6}
          placeholder="Paste lecture notes, syllabus, or chapter text..."
          className="w-full rounded-xl bg-[#FAF7F2] border border-[#D8C8A8] p-3 text-xs text-[#252D2B] placeholder-[#8C7A5E] focus:outline-none focus:border-[#174A45] focus:ring-1 focus:ring-[#174A45] font-mono leading-relaxed resize-y shadow-xs"
        />
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FBEBE7] border border-[#E88968]/50 text-[#8C2A14] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#E88968]" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Summary preview if present */}
      {summary && summary.success && (
        <div className="p-3.5 rounded-xl bg-[#EFE8DC] border border-[#D8C8A8] flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#174A45]">
            <Sparkles className="w-3.5 h-3.5 text-[#E88968]" />
            <span>Extractive TextRank Summary</span>
          </div>
          <p className="text-xs text-[#252D2B] leading-relaxed italic">
            "{summary.summary}"
          </p>
        </div>
      )}

      {/* Action CTA */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D8C8A8]/60">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !inputText.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#174A45] hover:bg-[#123834] active:scale-95 text-[#FAF7F2] font-semibold text-xs transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#E88968]" />
              <span>Building C++ Graph...</span>
            </>
          ) : (
            <>
              <span>Generate Knowledge Graph</span>
              <ArrowRight className="w-4 h-4 text-[#E88968]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
