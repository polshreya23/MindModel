import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  BookOpen,
  AlertCircle,
  Loader2,
  ArrowRight,
  Presentation,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { SAMPLE_CURRICULA, SampleCurriculum } from '../data/sampleCurricula.ts';
import { SummaryResult, PptxMetadata } from '../types/dsa.ts';

interface TextInputPanelProps {
  onProcessText: (text: string, customTitle?: string) => Promise<void>;
  onUploadPdf: (file: File) => Promise<void>;
  onUploadPptx: (file: File) => Promise<{ metadata?: PptxMetadata; slideCount?: number; title?: string } | void>;
  isLoading: boolean;
  summary: SummaryResult | null;
  onClose?: () => void;
}

interface SelectedFileInfo {
  name: string;
  extension: string;
  sizeFormatted: string;
  typeLabel: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const TextInputPanel: React.FC<TextInputPanelProps> = ({
  onProcessText,
  onUploadPdf,
  onUploadPptx,
  isLoading,
  summary,
  onClose,
}) => {
  const [inputText, setInputText] = useState(SAMPLE_CURRICULA[0].text);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(SAMPLE_CURRICULA[0].id);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFileInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [parsedDeckInfo, setParsedDeckInfo] = useState<{
    title: string;
    slideCount: number;
    tableCount?: number;
    bulletCount?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smooth progress ticker during file processing
  useEffect(() => {
    if (!isLoading || !selectedFile) return;

    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev < 35) {
          setProgressStage(`Uploading ${selectedFile.typeLabel} presentation...`);
          return prev + 12;
        }
        if (prev < 70) {
          setProgressStage(
            selectedFile.extension === 'pdf'
              ? 'Extracting document pages with PyMuPDF...'
              : 'Extracting slide titles, tables & bullet points...'
          );
          return prev + 8;
        }
        if (prev < 90) {
          setProgressStage('Running Python NLP & C++14 Knowledge Graph Engine...');
          return prev + 4;
        }
        return prev;
      });
    }, 250);

    return () => clearInterval(timer);
  }, [isLoading, selectedFile]);

  const handleCurriculumSelect = (curr: SampleCurriculum) => {
    setSelectedCurriculum(curr.id);
    setInputText(curr.text);
    setUploadError(null);
    setSelectedFile(null);
    setParsedDeckInfo(null);
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
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFile(file);
      // Reset input so re-uploading the same file triggers onChange
      e.target.value = '';
    }
  };

  const handleFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const ext = lowerName.includes('.') ? lowerName.split('.').pop() || '' : '';
    const isPptx = ext === 'pptx';
    const isPpt = ext === 'ppt';
    const isPdf = ext === 'pdf';
    const isTxt = ext === 'txt' || file.type.includes('text/plain');

    if (!isPptx && !isPpt && !isPdf && !isTxt) {
      setSelectedFile({
        name: file.name,
        extension: ext || 'unknown',
        sizeFormatted: formatFileSize(file.size),
        typeLabel: ext ? ext.toUpperCase() : 'Unsupported',
      });
      setParsedDeckInfo(null);
      setUploadError(
        `Unsupported file format '.${ext || 'unknown'}'. Please upload a PowerPoint (.pptx, .ppt), PDF (.pdf), or plain text (.txt) file.`
      );
      return;
    }

    if (file.size === 0) {
      setSelectedFile({
        name: file.name,
        extension: ext,
        sizeFormatted: '0 B',
        typeLabel: ext.toUpperCase(),
      });
      setParsedDeckInfo(null);
      setUploadError(`The selected file "${file.name}" is empty (0 bytes).`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError(`File "${file.name}" exceeds the 25 MB upload limit.`);
      return;
    }

    const typeLabel = isPptx
      ? 'PowerPoint (.pptx)'
      : isPpt
      ? 'PowerPoint Legacy (.ppt)'
      : isPdf
      ? 'PDF Document'
      : 'Plain Text';

    setSelectedFile({
      name: file.name,
      extension: ext,
      sizeFormatted: formatFileSize(file.size),
      typeLabel,
    });
    setParsedDeckInfo(null);
    setUploadError(null);

    if (isPptx || isPpt) {
      setUploadProgress(15);
      setProgressStage(`Uploading ${file.name}...`);
      try {
        const res = await onUploadPptx(file);
        setUploadProgress(100);
        setProgressStage('Presentation processed and saved to workspace!');
        if (res && (res.metadata || res.slideCount !== undefined)) {
          setParsedDeckInfo({
            title: res.metadata?.title || res.title || file.name,
            slideCount: res.metadata?.slideCount ?? res.slideCount ?? 0,
            tableCount: res.metadata?.tableCount,
            bulletCount: res.metadata?.bulletCount,
          });
        }
      } catch (err: any) {
        setUploadProgress(0);
        setProgressStage('');
        setUploadError(err.message || 'Failed to extract PowerPoint presentation.');
      }
    } else if (isPdf) {
      setUploadProgress(15);
      setProgressStage(`Uploading ${file.name}...`);
      try {
        await onUploadPdf(file);
        setUploadProgress(100);
        setProgressStage('PDF processed successfully!');
        if (onClose) onClose();
      } catch (err: any) {
        setUploadProgress(0);
        setProgressStage('');
        setUploadError(err.message || 'Failed to extract PDF text.');
      }
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (content) {
          setInputText(content);
          setSelectedCurriculum('');
        } else {
          setUploadError('The uploaded text file appears to be empty.');
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
    const chosenCurriculum = SAMPLE_CURRICULA.find((c) => c.id === selectedCurriculum);
    await onProcessText(inputText, chosenCurriculum?.title);
    if (onClose) onClose();
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl p-6 shadow-xl flex flex-col gap-5 max-w-2xl w-full mx-auto text-[#252D2B] max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#D8C8A8]/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#174A45]/10 flex items-center justify-center text-[#174A45]">
            <BookOpen className="w-5 h-5 text-[#174A45]" />
          </div>
          <div>
            <h2 className="font-editorial text-lg font-bold text-[#174A45]">
              Corpus &amp; Document Ingestion
            </h2>
            <p className="text-xs text-[#636E6B]">
              Upload PowerPoint (.pptx / .ppt), PDF chapters, or paste notes for C++ Graph synthesis
            </p>
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
        <label className="text-xs font-semibold text-[#174A45]">
          Curated Computer Science Curricula
        </label>
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

      {/* PowerPoint / PDF / Text Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          dragActive
            ? 'border-[#174A45] bg-[#EAE2D2] text-[#174A45]'
            : 'border-[#D8C8A8] bg-[#F5F1E8]/70 hover:border-[#174A45] hover:bg-[#EFE8DC]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.pptx,.ppt"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-9 h-9 rounded-full bg-[#174A45]/10 flex items-center justify-center">
            <Presentation className="w-4.5 h-4.5 text-[#E88968]" />
          </div>
          <div className="w-9 h-9 rounded-full bg-[#174A45]/10 flex items-center justify-center">
            <Upload className="w-4.5 h-4.5 text-[#174A45]" />
          </div>
          <div className="w-9 h-9 rounded-full bg-[#174A45]/10 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-[#5B8A6B]" />
          </div>
        </div>

        <div className="text-xs font-semibold text-[#174A45]">
          Drop or Browse PowerPoint (.pptx, .ppt), PDF (.pdf), or Notes (.txt)
        </div>
        <div className="text-[11px] text-[#636E6B]">
          Extracts slide titles, bullet points, tables &amp; PDF text locally via python-pptx &amp; PyMuPDF
        </div>

        {/* Format quick-select buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#D8C8A8] text-[10px] font-mono text-[#174A45] font-medium">
            .PPTX / .PPT Slides
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#D8C8A8] text-[10px] font-mono text-[#174A45] font-medium">
            .PDF Textbook
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#D8C8A8] text-[10px] font-mono text-[#174A45] font-medium">
            .TXT Syllabus
          </span>
        </div>
      </div>

      {/* Selected File Info & Upload Progress */}
      {selectedFile && (
        <div className="p-3.5 rounded-xl bg-white border border-[#D8C8A8] flex flex-col gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#EFE8DC] flex items-center justify-center shrink-0">
                {selectedFile.extension === 'pptx' || selectedFile.extension === 'ppt' ? (
                  <Presentation className="w-4 h-4 text-[#E88968]" />
                ) : (
                  <FileText className="w-4 h-4 text-[#174A45]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#174A45] truncate">
                  {selectedFile.name}
                </div>
                <div className="text-[11px] text-[#636E6B] font-mono flex items-center gap-2">
                  <span>{selectedFile.typeLabel}</span>
                  <span>&bull;</span>
                  <span>{selectedFile.sizeFormatted}</span>
                </div>
              </div>
            </div>

            {isLoading && (
              <span className="text-[11px] font-mono font-semibold text-[#174A45] shrink-0">
                {uploadProgress}%
              </span>
            )}
          </div>

          {isLoading && (
            <div className="flex flex-col gap-1">
              <div className="w-full h-1.5 bg-[#EFE8DC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#174A45] transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-[#636E6B] flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-[#E88968]" />
                {progressStage || 'Processing file...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Parsed PowerPoint Slide Summary Card */}
      {parsedDeckInfo && !uploadError && (
        <div className="p-4 rounded-xl bg-[#EAF3EA] border border-[#A9BCA8] flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A45] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#174A45]">
                  Presentation Analyzed: {parsedDeckInfo.title}
                </div>
                <div className="text-[11px] text-[#252D2B] mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#174A45]">
                    <Layers className="w-3 h-3 text-[#E88968]" />
                    {parsedDeckInfo.slideCount} {parsedDeckInfo.slideCount === 1 ? 'Slide' : 'Slides'} Detected
                  </span>
                  {typeof parsedDeckInfo.bulletCount === 'number' && (
                    <span>&bull; {parsedDeckInfo.bulletCount} Bullet Points</span>
                  )}
                  {typeof parsedDeckInfo.tableCount === 'number' && parsedDeckInfo.tableCount > 0 && (
                    <span>&bull; {parsedDeckInfo.tableCount} Tables Extracted</span>
                  )}
                </div>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-[#174A45] hover:bg-[#123834] text-[#FAF7F2] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
              >
                <span>View Graph</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#E88968]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Text Area */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-[#636E6B]">
          <span className="font-medium text-[#252D2B]">Lecture Notes / Plain Text Input</span>
          <span className="font-mono text-[11px]">
            {inputText.length} chars · {inputText.split(/\s+/).filter(Boolean).length} words
          </span>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setSelectedCurriculum('');
          }}
          rows={5}
          placeholder="Paste lecture notes, syllabus, or chapter text..."
          className="w-full rounded-xl bg-[#FAF7F2] border border-[#D8C8A8] p-3 text-xs text-[#252D2B] placeholder-[#8C7A5E] focus:outline-none focus:border-[#174A45] focus:ring-1 focus:ring-[#174A45] font-mono leading-relaxed resize-y shadow-xs"
        />
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FBEBE7] border border-[#E88968]/60 text-[#8C2A14] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#E88968] mt-0.5" />
          <span className="leading-relaxed">{uploadError}</span>
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
