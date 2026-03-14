import React, { useRef, useState } from 'react';
import { extractTextFromPdf } from '../services/pdfUtils';

interface InputSectionProps {
  onSendMessage: (text: string) => void;
  onCreateFlashcards: (seedText?: string) => void;
  isProcessing: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ 
  onSendMessage,
  onCreateFlashcards,
  isProcessing,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{name: string, content: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      if (file.type === 'application/pdf') {
        const text = await extractTextFromPdf(file);
        setAttachedFile({ name: file.name, content: text });
      } else if (file.type.startsWith('text/')) {
        const text = await file.text();
        setAttachedFile({ name: file.name, content: text });
      } else {
        alert("Please upload a PDF or text file.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to read file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if ((!text && !attachedFile) || isProcessing) return;

    let fullContent = text;
    if (attachedFile) {
      fullContent = `${attachedFile.content}\n\nUser Context/File: ${attachedFile.name}\n${text}`;
    }
    
    onSendMessage(fullContent);
    setInputText('');
    setAttachedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateFlashcards = () => {
    const seed = attachedFile
      ? `${attachedFile.content}\n\nContext file: ${attachedFile.name}\n${inputText.trim()}`.trim()
      : inputText.trim();
    onCreateFlashcards(seed || undefined);
  };

  return (
    <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-white/85 via-white/45 dark:from-slate-950/80 dark:via-slate-950/30 to-transparent pointer-events-none z-20">
        <div className="max-w-3xl mx-auto pointer-events-auto">
            
            {/* Quick Action Chips */}
            <div className="flex justify-center gap-3 mb-4 animate-fade-in opacity-90">
                <button
                  onClick={handleCreateFlashcards}
                  disabled={isProcessing}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-pink-300 hover:text-pink-600 dark:hover:text-pink-400 transition-all flex items-center gap-1.5 shadow-sm group disabled:opacity-60"
                >
                    <i className="ph ph-cards text-pink-400 group-hover:text-pink-600 text-lg"></i> 
                    <span>Create Flashcards ✨</span>
                </button>
                {attachedFile && (
                     <button 
                        onClick={() => setAttachedFile(null)}
                        className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-full text-xs font-medium text-blue-600 dark:text-blue-300 flex items-center gap-1.5 shadow-sm"
                     >
                        <i className="ph ph-file-text text-lg"></i>
                        {attachedFile.name}
                        <i className="ph ph-x ml-1 hover:text-red-500"></i>
                    </button>
                )}
            </div>

            {/* Input Container */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-2 border-gray-200 dark:border-slate-700 shadow-xl dark:shadow-black/40 rounded-[2rem] flex items-center px-4 py-2 transition-all hover:shadow-2xl hover:border-gray-300 dark:hover:border-slate-500 focus-within:border-gray-400 dark:focus-within:border-cyan-500">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <i className="ph ph-paperclip text-xl"></i>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.md"
                    className="hidden"
                />
                
                <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={attachedFile ? "Ask questions about this file..." : "Ask anything, paste a link, or upload a doc..."}
                    className="flex-1 mx-2 sm:mx-4 bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 font-medium h-12"
                    disabled={isProcessing}
                />
                
                {/* <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors mr-1">
                    <i className="ph ph-microphone text-xl"></i>
                </button> */}
                
                <button 
                    onClick={handleSend}
                    disabled={(!inputText.trim() && !attachedFile) || isProcessing}
                    className={`p-3 rounded-full transition-all duration-200 ${
                        (!inputText.trim() && !attachedFile) || isProcessing
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                        : 'bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95'
                    }`}
                >
                    {isProcessing ? (
                         <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <i className="ph ph-arrow-right text-xl font-bold"></i>
                    )}
                </button>
            </div>
            
            <div className="text-center mt-4">
                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-400">Gemini can make mistakes. Please review generated results.</p>
            </div>
        </div>
    </div>
  );
};