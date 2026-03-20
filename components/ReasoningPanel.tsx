'use client';

interface Props {
  reasoning: string;
  streaming: boolean;
}

export default function ReasoningPanel({ reasoning, streaming }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-4 h-64 overflow-y-auto font-mono text-sm text-gray-300 whitespace-pre-wrap">
      {reasoning || <span className="text-gray-600">LLM reasoning will appear here...</span>}
      {streaming && <span className="animate-pulse text-green-400">▌</span>}
    </div>
  );
}
