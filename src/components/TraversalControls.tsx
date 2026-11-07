import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ArrowRight, Layers } from 'lucide-react';
import { ConceptNode, TraversalStep } from '../types/dsa.ts';

interface TraversalControlsProps {
  nodes: ConceptNode[];
  onRunBfs: (startId: string) => Promise<void>;
  onRunDfs: (startId: string) => Promise<void>;
  onRunDijkstra: (startId: string, targetId: string) => Promise<void>;
  steps: TraversalStep[];
  currentStepIndex: number;
  onSetStepIndex: (index: number) => void;
  isRunningAlgorithm: boolean;
  activeAlgorithm: 'BFS' | 'DFS' | 'DIJKSTRA' | null;
  dijkstraDistance?: number | null;
}

export const TraversalControls: React.FC<TraversalControlsProps> = ({
  nodes,
  onRunBfs,
  onRunDfs,
  onRunDijkstra,
  steps,
  currentStepIndex,
  onSetStepIndex,
  isRunningAlgorithm,
  activeAlgorithm,
  dijkstraDistance,
}) => {
  const [selectedAlgo, setSelectedAlgo] = useState<'BFS' | 'DFS' | 'DIJKSTRA'>('BFS');
  const [startNode, setStartNode] = useState<string>(nodes[0]?.id || '');
  const [targetNode, setTargetNode] = useState<string>(nodes[1]?.id || '');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1200);

  useEffect(() => {
    if (!startNode && nodes.length > 0) {
      setStartNode(nodes[0].id);
    }
    if (!targetNode && nodes.length > 1) {
      setTargetNode(nodes[1].id);
    }
  }, [nodes, startNode, targetNode]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && steps.length > 0) {
      if (currentStepIndex < steps.length - 1) {
        timer = setTimeout(() => {
          onSetStepIndex(currentStepIndex + 1);
        }, playbackSpeed);
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed, onSetStepIndex]);

  const handleRun = async () => {
    setIsPlaying(false);
    if (selectedAlgo === 'BFS') {
      await onRunBfs(startNode);
    } else if (selectedAlgo === 'DFS') {
      await onRunDfs(startNode);
    } else if (selectedAlgo === 'DIJKSTRA') {
      await onRunDijkstra(startNode, targetNode);
    }
  };

  const currentStep = steps[currentStepIndex];

  return (
    <div className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl p-5 flex flex-col gap-4 shadow-sm text-[#252D2B]">
      {/* Top Bar: Algorithm Mode Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D8C8A8]/60">
        <div className="flex items-center gap-1.5 p-1 bg-[#F0EAE0] rounded-xl border border-[#D8C8A8]">
          <button
            onClick={() => setSelectedAlgo('BFS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedAlgo === 'BFS'
                ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
                : 'text-[#636E6B] hover:text-[#174A45]'
            }`}
          >
            BFS (FIFO Queue)
          </button>
          <button
            onClick={() => setSelectedAlgo('DFS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedAlgo === 'DFS'
                ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
                : 'text-[#636E6B] hover:text-[#174A45]'
            }`}
          >
            DFS (LIFO Stack)
          </button>
          <button
            onClick={() => setSelectedAlgo('DIJKSTRA')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedAlgo === 'DIJKSTRA'
                ? 'bg-[#174A45] text-[#FAF7F2] shadow-xs'
                : 'text-[#636E6B] hover:text-[#174A45]'
            }`}
          >
            Dijkstra Shortest Path
          </button>
        </div>

        {/* Node Pickers & Run Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-[#252D2B]">
            <span className="text-[#636E6B] font-medium">Start:</span>
            <select
              value={startNode}
              onChange={(e) => setStartNode(e.target.value)}
              className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-lg px-2.5 py-1.5 text-xs text-[#174A45] font-semibold focus:outline-none focus:border-[#174A45] font-mono shadow-2xs"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {selectedAlgo === 'DIJKSTRA' && (
            <div className="flex items-center gap-1.5 text-xs text-[#252D2B]">
              <span className="text-[#636E6B] font-medium">Target:</span>
              <select
                value={targetNode}
                onChange={(e) => setTargetNode(e.target.value)}
                className="bg-[#FAF7F2] border border-[#D8C8A8] rounded-lg px-2.5 py-1.5 text-xs text-[#174A45] font-semibold focus:outline-none focus:border-[#174A45] font-mono shadow-2xs"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleRun}
            disabled={isRunningAlgorithm || nodes.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174A45] hover:bg-[#123834] active:scale-95 text-[#FAF7F2] font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <span>{isRunningAlgorithm ? 'Running C++...' : 'Execute Traversal'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#E88968]" />
          </button>
        </div>
      </div>

      {/* Stepper Controls & Container State View */}
      {steps.length > 0 ? (
        <div className="flex flex-col gap-3.5">
          {/* Playback Controls & Progress */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  onSetStepIndex(0);
                }}
                disabled={currentStepIndex === 0}
                className="p-1.5 rounded-lg bg-[#EFE8DC] hover:bg-[#E5DDCB] disabled:opacity-40 text-[#174A45] transition cursor-pointer"
                title="First Step"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  onSetStepIndex(Math.max(0, currentStepIndex - 1));
                }}
                disabled={currentStepIndex === 0}
                className="p-1.5 rounded-lg bg-[#EFE8DC] hover:bg-[#E5DDCB] disabled:opacity-40 text-[#174A45] transition cursor-pointer"
                title="Previous Step"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-lg bg-[#E88968] hover:bg-[#DB7957] text-[#FAF7F2] transition shadow-xs cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  onSetStepIndex(Math.min(steps.length - 1, currentStepIndex + 1));
                }}
                disabled={currentStepIndex === steps.length - 1}
                className="p-1.5 rounded-lg bg-[#EFE8DC] hover:bg-[#E5DDCB] disabled:opacity-40 text-[#174A45] transition cursor-pointer"
                title="Next Step"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  onSetStepIndex(steps.length - 1);
                }}
                disabled={currentStepIndex === steps.length - 1}
                className="p-1.5 rounded-lg bg-[#EFE8DC] hover:bg-[#E5DDCB] disabled:opacity-40 text-[#174A45] transition cursor-pointer"
                title="Last Step"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Slider */}
            <div className="flex-1 flex items-center gap-2.5">
              <input
                type="range"
                min="0"
                max={steps.length - 1}
                value={currentStepIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  onSetStepIndex(parseInt(e.target.value, 10));
                }}
                className="w-full accent-[#174A45] h-1.5 bg-[#D8C8A8] rounded-lg cursor-pointer"
              />
              <span className="text-xs font-mono text-[#636E6B] whitespace-nowrap">
                Step {currentStepIndex + 1} / {steps.length}
              </span>
            </div>

            {/* Dijkstra total distance badge */}
            {dijkstraDistance !== undefined && dijkstraDistance !== null && (
              <div className="text-xs px-3 py-1 rounded-lg bg-[#E88968]/15 border border-[#E88968] text-[#8C2A14] font-mono font-semibold">
                Path Distance: {dijkstraDistance.toFixed(2)}
              </div>
            )}
          </div>

          {/* Active Step Details */}
          {currentStep && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 rounded-xl bg-[#F5F1E8] border border-[#D8C8A8]">
              {/* Action and explanation */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#174A45] text-[#FAF7F2] font-mono font-semibold uppercase text-[10px]">
                    {currentStep.action}
                  </span>
                  <span className="font-semibold text-[#174A45]">
                    Current Node: <span className="font-mono text-[#E88968]">{currentStep.currentNode}</span>
                  </span>
                </div>
                <p className="text-xs text-[#252D2B] leading-relaxed">
                  {currentStep.explanation}
                </p>
              </div>

              {/* Data Structure Container State (Queue / Stack) */}
              <div className="flex flex-col gap-1.5 pl-0 md:pl-3.5 border-t md:border-t-0 md:border-l border-[#D8C8A8]/60">
                <span className="text-[11px] font-semibold text-[#174A45] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#E88968]" />
                  <span>
                    {activeAlgorithm === 'BFS'
                      ? 'FIFO Queue State'
                      : activeAlgorithm === 'DFS'
                      ? 'LIFO Stack State'
                      : 'Priority Queue Frontier'}
                  </span>
                </span>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {currentStep.containerState.length > 0 ? (
                    currentStep.containerState.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#D8C8A8] text-[10px] font-mono text-[#174A45] font-medium"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#8C7A5E] italic">Empty container</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center p-4 text-xs text-[#636E6B] italic bg-[#F5F1E8]/60 rounded-xl border border-[#D8C8A8]/60">
          Select an algorithm above and click "Execute Traversal" to observe step-by-step C++ queue and stack transitions.
        </div>
      )}
    </div>
  );
};
