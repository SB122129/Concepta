import React, { useState, useRef } from 'react';
import { SourceItem } from '../types';
import { Button } from './Button';
import { extractTextFromPdf } from '../services/pdfUtils';
import { Youtube, FileText, Globe, Image as ImageIcon, Trash2, Upload, Link as LinkIcon, CheckSquare, Square } from 'lucide-react';

interface PasteLinkSectionProps {
  sources: SourceItem[];
  onAddSource: (item: SourceItem) => void;
  onToggleSource: (id: string) => void;
  onDeleteSource: (id: string) => void;
  onDeleteSelected: () => void;
}

export const PasteLinkSection: React.FC<PasteLinkSectionProps> = ({
  sources,
  onAddSource,
  onToggleSource,
  onDeleteSource,
  onDeleteSelected
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HELPERS ---

  const handleImport = () => {
    if (!inputValue.trim()) return;
    
    // Simple heuristics to determine type (Mocking metadata extraction)
    let type: SourceItem['type'] = 'website';
    let title = inputValue;
    let metadata = 'website.com';

    if (inputValue.includes('youtube.com') || inputValue.includes('youtu.be')) {
        type = 'youtube';
        title = 'New YouTube Video';
        metadata = 'youtube.com • Just Added';
    } else if (inputValue.endsWith('.pdf')) {
        type = 'pdf';
        title = inputValue.split('/').pop() || 'Document.pdf';
        metadata = 'Remote File';
    } else if (inputValue.match(/\.(jpeg|jpg|png|gif)$/)) {
        type = 'image';
        title = inputValue.split('/').pop() || 'Image';
        metadata = 'Remote Image';
    }

    const newItem: SourceItem = {
        id: Date.now().toString(),
        type,
        title,
        url: inputValue,
        metadata,
        isSelected: true,
        content: `Source URL: ${inputValue}` // Basic placeholder content for URLs
    };

    onAddSource(newItem);
    setInputValue('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);

      try {
        let type: SourceItem['type'] = 'website';
        let extractedContent = '';

        if (file.type === 'application/pdf') {
            type = 'pdf';
            extractedContent = await extractTextFromPdf(file);
        } else if (file.type.startsWith('image/')) {
            type = 'image';
            // In a real app, we might OCR here. For now:
            extractedContent = `[Image File: ${file.name}]`;
        } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
            type = 'website'; // Generic text doc
            extractedContent = await file.text();
        }
        
        const newItem: SourceItem = {
            id: Date.now().toString(),
            type,
            title: file.name,
            metadata: `Local File • ${(file.size / 1024 / 1024).toFixed(1)} MB`,
            isSelected: true,
            file: file,
            content: extractedContent
        };

        onAddSource(newItem);
      } catch (error) {
        console.error("File processing failed", error);
        alert("Failed to process file. Please try again.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleImport();
  };

  const getIcon = (type: SourceItem['type']) => {
      switch(type) {
          case 'youtube': return <Youtube className="w-5 h-5" />;
          case 'pdf': return <FileText className="w-5 h-5" />;
          case 'image': return <ImageIcon className="w-5 h-5" />;
          default: return <Globe className="w-5 h-5" />;
      }
  };

  const getColors = (type: SourceItem['type']) => {
      switch(type) {
          case 'youtube': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
          case 'pdf': return 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400';
          case 'image': return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400';
          default: return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
      }
  };

  const selectedCount = sources.filter(s => s.isSelected).length;

  return (
    <div className="flex flex-col items-center pt-8 px-4 w-full h-full animate-fade-in max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white self-start w-full">Manage Sources</h1>
        
        {/* Input Area */}
        <div className="w-full flex gap-2 mb-8">
             <div className="flex-1 relative">
                <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste YouTube URL, Article Link, or drop PDF..." 
                    className="w-full p-4 pr-12 border border-cyan-100 dark:border-cyan-900/30 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors shadow-sm bg-white/90 dark:bg-slate-950/90 text-gray-900 dark:text-gray-100 backdrop-blur-sm"
                    disabled={isUploading}
                />
                {/* File Upload Trigger Icon */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="Upload File"
                    disabled={isUploading}
                >
                    {isUploading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload className="w-5 h-5" />}
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept=".pdf,.txt,.md,image/*"
                />
             </div>
                 <button 
                onClick={handleImport}
                disabled={isUploading}
                     className="bg-gradient-to-r from-cyan-500 to-orange-500 text-white px-8 rounded-xl font-bold hover:opacity-95 transition-colors disabled:opacity-50"
             >
                Import
             </button>
        </div>

        {/* Sources List */}
        <div className="w-full">
            <div className="flex justify-between items-end mb-3">
                <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Available Sources</h3>
                <span className="text-xs text-gray-400">Select sources to include in context</span>
            </div>

            <div className="bg-white/90 dark:bg-slate-950/90 border border-cyan-100 dark:border-cyan-900/30 rounded-xl shadow-sm overflow-hidden backdrop-blur-sm">
                {sources.length === 0 && (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                        <LinkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No sources added yet.</p>
                    </div>
                )}

                {sources.map((source) => (
                    <div 
                        key={source.id} 
                        className={`flex items-center gap-4 p-4 border-b border-cyan-100/70 dark:border-cyan-900/20 last:border-0 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10 transition-colors group cursor-pointer ${!source.isSelected ? 'opacity-60 bg-gray-50/50 dark:bg-slate-900/50' : ''}`}
                        onClick={() => onToggleSource(source.id)}
                    >
                        <div onClick={(e) => { e.stopPropagation(); onToggleSource(source.id); }}>
                             {source.isSelected 
                                ? <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 cursor-pointer" />
                                : <Square className="w-5 h-5 text-gray-300 dark:text-gray-600 cursor-pointer" />
                             }
                        </div>
                        
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getColors(source.type)}`}>
                            {getIcon(source.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{source.title}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{source.metadata}</p>
                        </div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteSource(source.id); }}
                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" 
                            title="Delete Source"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Delete Selected Button */}
            {selectedCount > 0 && (
                <div className="mt-4 flex justify-end">
                    <button 
                        onClick={onDeleteSelected}
                        className="bg-white/90 dark:bg-slate-950/90 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 px-5 py-2.5 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 shadow-sm text-sm backdrop-blur-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected ({selectedCount})
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};