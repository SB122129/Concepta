import React from 'react';
import { ChatSession, MainView } from '../types';

interface SidebarProps {
  isOpen: boolean;
  activeView: MainView;
  onViewChange: (view: MainView) => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeView,
  onViewChange,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  toggleSidebar
}) => {
  
  const renderButton = (view: MainView, iconClass: string, label: string) => (
    <button 
      onClick={() => onViewChange(view)}
      className={`w-full sidebar-btn flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group text-left overflow-hidden ${
        activeView === view 
          ? 'bg-gradient-to-r from-cyan-500 to-orange-500 text-white' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-cyan-50/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
      }`}
      title={label}
    >
      <i className={`ph ${iconClass} text-xl flex-shrink-0 ${activeView === view ? 'text-white' : 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400'}`}></i>
      <span className={`sidebar-label transition-opacity duration-200 whitespace-nowrap ${!isOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
      />

      <aside 
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          bg-white/85 dark:bg-slate-950/85 border-r border-cyan-100 dark:border-cyan-900/40 backdrop-blur-md
          flex flex-col justify-between p-4 flex-shrink-0 
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0 lg:w-20'}
        `}
      >
        <div className="space-y-6">
            {/* Toggle Button */}
            <div className={`px-2 flex ${isOpen ? 'justify-start' : 'justify-center'}`}>
              <button onClick={toggleSidebar} className="p-1.5 hover:bg-cyan-50 dark:hover:bg-slate-900 rounded-md transition-colors text-slate-500 dark:text-slate-400">
                    <i className="ph ph-sidebar-simple text-2xl"></i>
                </button>
            </div>

            {/* New Session Button */}
            <button 
                onClick={onNewSession} 
                className={`
                   w-full flex items-center bg-gradient-to-r from-cyan-500 to-orange-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-cyan-200/60 dark:shadow-none overflow-hidden
                   ${isOpen ? 'px-4 py-3 gap-3' : 'p-3 justify-center'}
                `}
                title="New Session"
            >
                <i className="ph ph-plus text-lg flex-shrink-0"></i>
                {isOpen && (
                   <>
                    <span className="sidebar-label transition-opacity duration-200">New Session</span>
                    <i className="ph ph-sparkle ml-auto text-yellow-300"></i>
                   </>
                )}
            </button>

            {/* Sidebar Navigation */}
            <nav className="space-y-1">
                {renderButton('paste-link', 'ph-link', 'Paste Link')}
                {renderButton('metrics', 'ph-chart-bar', 'Metrics')}
                
                {/* History Section - Adapted for Sessions */}
                <div className="pt-4">
                  {isOpen && <div className="px-4 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Recent</div>}
                  {sessions.slice(0, 5).map(session => (
                      <button
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors overflow-hidden ${
                          currentSessionId === session.id 
                            ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-cyan-50/60 dark:hover:bg-slate-900'
                        }`}
                        title={session.title}
                      >
                         <i className="ph ph-clock-counter-clockwise text-lg flex-shrink-0"></i>
                         <span className={`truncate transition-opacity duration-200 ${!isOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                           {session.title}
                         </span>
                      </button>
                  ))}
                </div>
            </nav>
        </div>

        <div className="border-t border-cyan-100 dark:border-cyan-900/40 pt-4"></div>
      </aside>
    </>
  );
};