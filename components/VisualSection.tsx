import React from 'react';
import { Sparkles, RefreshCcw, MessageSquare } from 'lucide-react';
import { Button } from './Button';

interface VisualSectionProps {
  imageBase64: string | null;
  isLoading: boolean;
  regenerate: () => void;
}

export const VisualSection: React.FC<VisualSectionProps> = ({ 
  imageBase64, 
  isLoading,
  regenerate
}) => {
  const isFallbackVisual = !!imageBase64 && imageBase64.startsWith('data:image/svg+xml');

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse bg-white dark:bg-gray-800 transition-colors">
        <Sparkles className="w-12 h-12 mb-4 text-purple-500 animate-bounce" />
        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200">Generating Visuals...</h3>
        <p className="max-w-md mt-2">
          Gemini is creating a custom infographic to explain your content. This uses the <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">flash-image</span> model.
        </p>
      </div>
    );
  }

  if (!imageBase64) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500">
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4 transition-colors">
           <Sparkles className="w-8 h-8" />
        </div>
        <p>Analyze text to generate a visual explanation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-800 transition-colors">
      <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center relative group">
        {isFallbackVisual && (
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
            Fallback visual: image quota exceeded
          </div>
        )}
        <img 
          src={imageBase64} 
          alt="Generated Explanation" 
          className="max-w-full max-h-full object-contain rounded-lg shadow-md transition-transform duration-300"
        />
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="secondary" onClick={regenerate} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur" icon={<RefreshCcw className="w-4 h-4"/>}>
                Regenerate
            </Button>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-purple-50/50 dark:bg-purple-900/10 transition-colors text-center">
        <div className="flex items-center justify-center gap-2 text-purple-700 dark:text-purple-300 text-sm font-medium animate-pulse">
            <MessageSquare className="w-4 h-4" />
            <span>Use the main chat to edit this image</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Example: "Add a robot", "Make the background blue", "Remove the text"
        </p>
      </div>
    </div>
  );
};