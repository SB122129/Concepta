import React, { useState } from 'react';
import { Button } from './Button';
import { Play, Sparkles, X } from 'lucide-react';

interface AdaptiveQuizSetupProps {
  topics: string[];
  onStart: (config: { topics: string[], difficulty: string, count: number, phase: 'pretest' | 'posttest' | 'practice' }) => void;
  initialTopic: string;
}

export const AdaptiveQuizSetup: React.FC<AdaptiveQuizSetupProps> = ({ topics, onStart, initialTopic }) => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>(initialTopic ? [initialTopic] : []);
  const [difficulty, setDifficulty] = useState<string>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [newTopic, setNewTopic] = useState('');
  const [phase, setPhase] = useState<'pretest' | 'posttest' | 'practice'>('practice');

  const handleAddTopic = () => {
    if (newTopic.trim() && !selectedTopics.includes(newTopic.trim())) {
      setSelectedTopics([...selectedTopics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (t: string) => {
    setSelectedTopics(selectedTopics.filter(topic => topic !== t));
  };

  return (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-8 sm:p-12 relative overflow-hidden">
        
        {/* Background Decoration */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
             <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configure Adaptive Quiz</h1>
             <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                 <Sparkles className="w-3 h-3" /> AI Generated
             </div>
          </div>

          {/* Topics */}
          <div className="mb-10">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Focus Topics</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedTopics.map(topic => (
                <span key={topic} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium border border-indigo-100 dark:border-indigo-800">
                  {topic}
                  <button onClick={() => handleRemoveTopic(topic)} className="hover:text-indigo-900 dark:hover:text-white"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <div className="flex items-center gap-2">
                 <input 
                    type="text" 
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                    placeholder="+ Add Topic"
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm outline-none focus:border-indigo-500 w-32"
                 />
              </div>
            </div>
          </div>

          {/* Difficulty Slider */}
          <div className="mb-10">
            <div className="flex justify-between mb-3">
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Difficulty Level: <span className="text-indigo-600 dark:text-indigo-400">{difficulty}</span></label>
            </div>
            <input 
              type="range" 
              min="1" 
              max="3" 
              step="1" 
              value={difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3}
              onChange={(e) => {
                 const val = parseInt(e.target.value);
                 setDifficulty(val === 1 ? 'Easy' : val === 2 ? 'Medium' : 'Hard');
              }}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Recall</span>
              <span>Application</span>
              <span>Synthesis</span>
            </div>
          </div>

          {/* Assessment Phase */}
          <div className="mb-10">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Assessment Phase</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'pretest', label: 'Pretest' },
                { id: 'practice', label: 'Practice' },
                { id: 'posttest', label: 'Posttest' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPhase(item.id as 'pretest' | 'posttest' | 'practice')}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    phase === item.id
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-cyan-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="mb-12">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Number of Questions</label>
            <div className="grid grid-cols-3 gap-4">
              {[5, 10, 20].map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`py-3 rounded-xl border-2 font-medium transition-all
                    ${questionCount === count 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'}
                  `}
                >
                  {count} {count === 5 ? '(Quick)' : count === 10 ? '(Standard)' : '(Deep)'}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <Button 
            onClick={() => onStart({ topics: selectedTopics, difficulty, count: questionCount, phase })}
            className="w-full py-4 text-lg font-bold bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98] transition-transform rounded-xl shadow-lg"
          >
            Start Quiz <Play className="w-5 h-5 ml-2 fill-current" />
          </Button>

        </div>
      </div>
    </div>
  );
};