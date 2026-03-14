import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, List, AlignLeft, Info, CheckCircle, Lightbulb, Zap, Anchor } from 'lucide-react';
import { GroundingSource } from '../types';

interface ExplanationSectionProps {
  explanation: string;
  isLoading: boolean;
  sources?: GroundingSource[];
}

export const ExplanationSection: React.FC<ExplanationSectionProps> = ({ explanation, isLoading, sources = [] }) => {
  
  const sections = useMemo(() => {
    if (!explanation) return [];
    // Split by lookahead for #, ##, or ### at start of line
    const chunks = explanation.split(/(?=^#{1,3} )/gm).filter(s => s.trim().length > 0);
    
    if (chunks.length === 0 && explanation.trim().length > 0) {
        return [explanation];
    }
    return chunks;
  }, [explanation]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse h-full bg-white dark:bg-gray-800 transition-colors">
        <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-xl w-full border border-gray-200 dark:border-gray-600"></div>
        <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-xl w-full border border-gray-200 dark:border-gray-600"></div>
        <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-xl w-full border border-gray-200 dark:border-gray-600"></div>
      </div>
    );
  }

  if (!explanation) {
     return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500">
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4 transition-colors">
           <BookOpen className="w-8 h-8" />
        </div>
        <p>No explanation generated yet.</p>
      </div>
    );
  }

  const renderSection = (sectionText: string, index: number) => {
    const textLower = sectionText.toLowerCase();
    
    // Default Style
    let icon = <AlignLeft className="w-5 h-5" />;
    let headerClass = "text-gray-800 dark:text-gray-100";
    let borderClass = "border-gray-200 dark:border-gray-700";
    let bgClass = "bg-white dark:bg-gray-800";
    let iconBgClass = "bg-gray-100 dark:bg-gray-700 text-gray-500";

    // "Lumen" Color (Amber/Gold/Yellow) - Typically for Summary/Intro
    if (textLower.includes('summary') || textLower.includes('introduction')) {
        icon = <Zap className="w-5 h-5" />;
        headerClass = "text-amber-700 dark:text-amber-300";
        borderClass = "border-amber-200 dark:border-amber-800";
        bgClass = "bg-amber-50/50 dark:bg-amber-900/10";
        iconBgClass = "bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300";
    } 
    // "Blue" Color - Typically for Key Concepts
    else if (textLower.includes('concept') || textLower.includes('key point')) {
        icon = <Lightbulb className="w-5 h-5" />;
        headerClass = "text-blue-700 dark:text-blue-300";
        borderClass = "border-blue-200 dark:border-blue-800";
        bgClass = "bg-blue-50/50 dark:bg-blue-900/10";
        iconBgClass = "bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300";
    } 
    // "Brown" Color (Stone/Sepia) - Typically for Detailed Analysis
    else if (textLower.includes('analysis') || textLower.includes('detail')) {
        icon = <List className="w-5 h-5" />;
        headerClass = "text-stone-700 dark:text-stone-300";
        borderClass = "border-stone-200 dark:border-stone-700";
        bgClass = "bg-stone-50/50 dark:bg-stone-900/20";
        iconBgClass = "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300";
    } 
    // Green/Conclusion
    else if (textLower.includes('conclusion')) {
        icon = <CheckCircle className="w-5 h-5" />;
        headerClass = "text-emerald-700 dark:text-emerald-300";
        borderClass = "border-emerald-200 dark:border-emerald-800";
        bgClass = "bg-emerald-50/50 dark:bg-emerald-900/10";
        iconBgClass = "bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300";
    }

    return (
      <div key={index} className={`rounded-xl border-l-4 shadow-sm mb-6 last:mb-0 overflow-hidden transition-all duration-300 hover:shadow-md ${borderClass} ${bgClass} border-r border-t border-b`}>
        <div className="p-6">
            <ReactMarkdown
            components={{
                h1: ({node, ...props}) => (
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
                        <span className={`p-2 rounded-lg flex-shrink-0 ${iconBgClass}`}>
                            {icon}
                        </span>
                        <h1 className={`text-xl font-bold tracking-tight ${headerClass}`} {...props} />
                    </div>
                ),
                h2: ({node, ...props}) => (
                    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
                        <h2 className={`text-lg font-bold uppercase tracking-wide opacity-90 ${headerClass}`} {...props} />
                    </div>
                ),
                h3: ({node, ...props}) => <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2" {...props} />,
                p: ({node, ...props}) => <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 last:mb-0 font-light text-[15px]" {...props} />,
                ul: ({node, ...props}) => <ul className="space-y-2 mb-4 pl-1" {...props} />,
                li: ({node, ...props}) => (
                    <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-[15px]">
                        <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${headerClass.replace('text-', 'bg-').replace('700', '400')}`} />
                        <span className="flex-1">{props.children}</span>
                    </li>
                ),
                strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-4 bg-white/50 dark:bg-black/20 p-2 rounded-r" {...props} />
            }}
            >
            {sectionText}
            </ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 transition-colors duration-200 custom-scrollbar">
      <div className="max-w-4xl mx-auto pb-8">
         {sources.length > 0 && (
            <div className="mb-6 p-4 rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-white/80 dark:bg-slate-900/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 mb-3 flex items-center gap-2">
                    <Anchor className="w-3 h-3" />
                    Evidence Anchors
                </h4>
                <div className="flex flex-wrap gap-2">
                    {sources.slice(0, 5).map((source) => (
                        <a
                          key={source.uri}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                          title={source.title}
                        >
                          {source.title.length > 42 ? `${source.title.slice(0, 42)}...` : source.title}
                        </a>
                    ))}
                </div>
            </div>
         )}
         {sections.map((section, idx) => renderSection(section, idx))}
      </div>
    </div>
  );
};