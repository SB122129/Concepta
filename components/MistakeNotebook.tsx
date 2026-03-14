import React, { useState } from 'react';
import { MistakeItem } from '../types';
import { Button } from './Button';
import { ArrowLeft, Filter, Play, Sparkles, Trash2, Edit2 } from 'lucide-react';

interface MistakeNotebookProps {
  mistakes: MistakeItem[];
  onBack: () => void;
  onUpdateNote: (id: string, note: string) => void;
  onDeleteMistake: (id: string) => void;
}

export const MistakeNotebook: React.FC<MistakeNotebookProps> = ({ mistakes, onBack, onUpdateNote, onDeleteMistake }) => {
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEditStart = (item: MistakeItem) => {
    setEditingId(item.id);
    setEditValue(item.note);
  };

  const handleSave = (id: string) => {
    onUpdateNote(id, editValue);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in bg-gray-50/50 dark:bg-black/50 overflow-hidden">
      
      {/* Header */}
      <div className="p-6 sm:px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mistake Notebook</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Review and edit your error cards.</p>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" icon={<Filter className="w-4 h-4"/>}>Filter</Button>
            <Button className="bg-black dark:bg-white text-white dark:text-black" icon={<Play className="w-4 h-4 fill-current"/>}>Review All</Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
        {mistakes.length === 0 ? (
            <div className="text-center mt-20 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 opacity-50" />
                </div>
                <p>Great job! No mistakes recorded yet.</p>
            </div>
        ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
                {mistakes.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        
                        {/* Card Header */}
                        <div className="bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 px-6 py-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                                {item.topic} • {item.category}
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditStart(item)} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4"/></button>
                                <button onClick={() => onDeleteMistake(item.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>

                        <div className="p-6">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-4">{item.questionText}</h3>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6 text-sm">
                                <div className="mb-2 text-red-600 dark:text-red-400 font-medium">Your Answer: <span className="text-gray-700 dark:text-gray-300 font-normal">{item.userAnswer}</span></div>
                                <div className="text-green-600 dark:text-green-400 font-medium">Correct Answer: <span className="text-gray-700 dark:text-gray-300 font-normal">{item.correctAnswer}</span></div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Your Mistake Note</label>
                                {editingId === item.id ? (
                                    <div className="flex flex-col gap-2">
                                        <textarea 
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-indigo-500"
                                            rows={2}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-xs">Cancel</Button>
                                            <Button onClick={() => handleSave(item.id)} className="h-8 text-xs">Save</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-lg text-gray-700 dark:text-gray-300 italic text-sm">
                                        "{item.note}"
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-pink-300 hover:text-pink-500 transition-colors shadow-sm">
                                    Create Flashcards <Sparkles className="w-3 h-3 text-yellow-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};