import React from 'react';
import { Gamepad2, RotateCcw, MessageSquare } from 'lucide-react';
import { Button } from './Button';

interface SimulationSectionProps {
  simulationCode: string | null;
  isLoading: boolean;
  regenerate: () => void;
}

export const SimulationSection: React.FC<SimulationSectionProps> = ({ 
  simulationCode, 
  isLoading,
  regenerate
}) => {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse bg-white dark:bg-gray-800 transition-colors">
        <Gamepad2 className="w-12 h-12 mb-4 text-indigo-500 animate-bounce" />
        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200">Building Simulation...</h3>
        <p className="max-w-md mt-2">
          Gemini 3.0 Pro is writing code for an interactive visualization of your content.
        </p>
      </div>
    );
  }

  if (!simulationCode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500">
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4 transition-colors">
           <Gamepad2 className="w-8 h-8" />
        </div>
        <p>Analyze text to generate an interactive simulation.</p>
        <Button onClick={regenerate} className="mt-4" variant="secondary">
            Generate Simulation
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-800 transition-colors">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Interactive Simulation</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={regenerate} 
            className="text-xs h-8" 
            icon={<RotateCcw className="w-3 h-3"/>}
          >
            Reset
          </Button>
      </div>
      <div className="flex-1 bg-white relative">
        <iframe
            srcDoc={simulationCode}
            title="Generated Simulation"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-popups allow-forms"
        />
      </div>
      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-900/30 text-center transition-colors">
          <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
            <MessageSquare className="w-4 h-4" />
            <span>Use the main chat to update this simulation</span>
          </div>
          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">Example: "Make the animation faster", "Add a counter", "Change color to red"</p>
      </div>
    </div>
  );
};