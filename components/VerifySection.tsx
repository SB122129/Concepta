import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { GroundingSource } from '../types';

interface VerifySectionProps {
  data: { explanation: string; sources: GroundingSource[] } | null;
  isLoading: boolean;
  onVerify: () => void;
  hasInput: boolean;
}

export const VerifySection: React.FC<VerifySectionProps> = ({ data, isLoading, onVerify, hasInput }) => {
  const classifySource = (uri: string) => {
    const lower = uri.toLowerCase();
    if (lower.includes('openstax.org') || lower.includes('libretexts') || lower.includes('phet.colorado.edu')) return 'Open Education';
    if (lower.includes('nist.gov') || lower.includes('.edu')) return 'Institutional';
    return 'Web Evidence';
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse bg-transparent h-full transition-colors">
         <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
         </div>
         <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
         <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
         <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-transparent transition-colors">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-full mb-4 text-green-600 dark:text-green-400">
           <ShieldCheck className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-medium text-gray-800 dark:text-gray-100 mb-2">Verify Facts</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          Use Gemini with Google Search to verify the claims in your document and find the latest information.
        </p>
        <button
          onClick={onVerify}
          disabled={!hasInput}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Check with Google Search
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/90 dark:bg-slate-950/90 transition-colors border border-cyan-100 dark:border-cyan-900/30 rounded-2xl backdrop-blur-sm">
    <div className="p-6 border-b border-cyan-100 dark:border-cyan-900/30 bg-cyan-50/30 dark:bg-cyan-900/10">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Verification Report
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-green dark:prose-invert max-w-none mb-8 text-gray-700 dark:text-gray-300">
          <ReactMarkdown>{data.explanation}</ReactMarkdown>
        </div>

        {data.sources.length > 0 && (
          <div className="bg-white/70 dark:bg-slate-900/60 rounded-xl p-4 border border-cyan-100 dark:border-cyan-900/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Evidence Panel</h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">{data.sources.length} linked sources</span>
            </div>
            <div className="grid gap-2">
              {data.sources.map((source, idx) => (
                <a 
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white/80 dark:bg-slate-900/70 rounded-lg border border-cyan-100 dark:border-cyan-900/30 hover:border-cyan-300 dark:hover:border-cyan-500 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 mr-4 min-w-0">
                    <span className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate block">{source.title}</span>
                    <span className="text-[10px] mt-1 inline-flex px-2 py-0.5 rounded-full border border-cyan-100 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">
                      {classifySource(source.uri)}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};