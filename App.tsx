import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { InputSection } from './components/InputSection';
import { ExplanationSection } from './components/ExplanationSection';
import { VisualSection } from './components/VisualSection';
import { SimulationSection } from './components/SimulationSection';
import { VerifySection } from './components/VerifySection';
import { TestSection } from './components/TestSection';
import { TeachSection } from './components/TeachSection';
import { PasteLinkSection } from './components/PasteLinkSection';
import { MetricsSection } from './components/MetricsSection';
import { AppTab, MainView, ChatSession, ChatMessage, GroundingSource, SourceItem, MistakeItem, QuizResult } from './types';
import { generateExplanation, generateVisual, verifyText, generateSimulation, editVisual, editSimulation } from './services/geminiService';
import { retrieveLearningEvidence } from './services/learningRetrievalService';

const SAMPLE_SOURCES: SourceItem[] = [
        {
            id: 'sample-thermo-youtube',
            type: 'youtube',
            title: 'Introduction to Thermodynamics',
            metadata: 'Sample Source • YouTube',
            isSelected: false,
            content: 'Video Transcript Placeholder'
        },
        {
            id: 'sample-thermo-pdf',
            type: 'pdf',
            title: 'Chapter 4: Entropy & Heat.pdf',
            metadata: 'Sample Source • Local PDF',
            isSelected: false,
            content: 'PDF Text Placeholder'
        },
];

const mergeWithSampleSources = (sources: SourceItem[]): SourceItem[] => {
    const map = new Map(sources.map((source) => [source.id, source]));
    for (const sample of SAMPLE_SOURCES) {
        if (!map.has(sample.id)) {
            map.set(sample.id, { ...sample });
        }
    }
    return Array.from(map.values());
};

const App: React.FC = () => {
    const brandName = 'Concepta';
  // --- STATE ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  
  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<MainView>('learning');
  const [activeSubTab, setActiveSubTab] = useState<AppTab>(AppTab.EXPLANATION);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // AI Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [visualBase64, setVisualBase64] = useState<string | null>(null);
  const [simulationCode, setSimulationCode] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<{ explanation: string; sources: GroundingSource[] } | null>(null);

  // Context & Sources
  const [lastContext, setLastContext] = useState<string>('');
    const [sources, setSources] = useState<SourceItem[]>(SAMPLE_SOURCES.map(source => ({ ...source })));

  // Mistakes & Quiz History
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
        try {
            const storedMistakes = localStorage.getItem('concepta.mistakes');
            const storedQuizHistory = localStorage.getItem('concepta.quizHistory');
            if (storedMistakes) setMistakes(JSON.parse(storedMistakes));
            if (storedQuizHistory) setQuizHistory(JSON.parse(storedQuizHistory));
        } catch (error) {
            console.error('Failed to restore saved progress', error);
        }

    const initialSession: ChatSession = {
      id: Date.now().toString(),
            title: 'New Session',
      messages: [],
      createdAt: Date.now()
    };
    setSessions([initialSession]);
    setCurrentSessionId(initialSession.id);
        setLastContext(""); 
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

    useEffect(() => {
        try {
            localStorage.setItem('concepta.mistakes', JSON.stringify(mistakes));
        } catch (error) {
            console.error('Failed to persist mistakes', error);
        }
    }, [mistakes]);

    useEffect(() => {
        try {
            localStorage.setItem('concepta.quizHistory', JSON.stringify(quizHistory));
        } catch (error) {
            console.error('Failed to persist quiz history', error);
        }
    }, [quizHistory]);

  // --- HANDLERS ---
  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);
  
  const updateCurrentSessionMessages = (newMessages: ChatMessage[]) => {
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: newMessages } : s));
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Session',
        messages: [],
        createdAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
        setSources(prev => mergeWithSampleSources(prev).map(s => ({ ...s, isSelected: false })));
    resetOutputs();
    setActiveView('learning');
    setLastContext('');
  };

  const resetOutputs = () => {
    setExplanation('');
    setVisualBase64(null);
    setSimulationCode(null);
    setVerificationData(null);
  };

    const buildGroundedContext = (text: string) => {
        const activeSources = sources.filter((s) => s.isSelected);
        let fullContext = text;
        if (activeSources.length > 0) {
            const sourceText = activeSources.map((s) => `[Source: ${s.title}]\n${s.content || s.url}`).join('\n\n');
            fullContext = `Reference Material:\n${sourceText}\n\nUser Query/Topic:\n${text}`;
        }

        const retrieval = retrieveLearningEvidence(fullContext);
        const groundedContext = `Public Learning Evidence:\n${retrieval.contextBlock}\n\n${fullContext}`;
        return { retrieval, groundedContext };
    };

    const handleRegenerateVisual = async () => {
        if (!lastContext.trim()) return;
        setIsProcessing(true);
        try {
            const { groundedContext } = buildGroundedContext(lastContext);
            const image = await generateVisual(groundedContext);
            setVisualBase64(image);
            setActiveView('learning');
            setActiveSubTab(AppTab.VISUALS);
        } catch (error) {
            console.error('Visual regenerate error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRegenerateSimulation = async () => {
        if (!lastContext.trim()) return;
        setIsProcessing(true);
        try {
            const { groundedContext } = buildGroundedContext(lastContext);
            const code = await generateSimulation(groundedContext);
            setSimulationCode(code);
            setActiveView('learning');
            setActiveSubTab(AppTab.SIMULATION);
        } catch (error) {
            console.error('Simulation regenerate error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyNow = async () => {
        if (!lastContext.trim()) return;
        setIsProcessing(true);
        try {
            const { retrieval, groundedContext } = buildGroundedContext(lastContext);
            const verified = await verifyText(groundedContext);
            const mergedSources = Array.from(new Map([...retrieval.sources, ...verified.sources].map((s) => [s.uri, s])).values());
            setVerificationData({ explanation: verified.explanation, sources: mergedSources });
            setActiveView('learning');
            setActiveSubTab(AppTab.VERIFY);
        } catch (error) {
            console.error('Verify error:', error);
            const { retrieval } = buildGroundedContext(lastContext);
            setVerificationData({
                explanation: '## Verification Temporarily Unavailable\n\nLive verification failed right now. Please retry shortly. In the meantime, use these evidence links.',
                sources: retrieval.sources
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateFlashcards = (seedText?: string) => {
        const mergedSeed = (seedText || lastContext || '').trim();
        if (mergedSeed) setLastContext(mergedSeed);
        setActiveView('test');
    };

  const handleSendMessage = async (text: string) => {
    const session = getCurrentSession();
    if (!session) return;

    setLastContext(text); 

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    let updatedMessages = [...session.messages, userMsg];
    updateCurrentSessionMessages(updatedMessages);

    if (session.messages.length === 0) {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: text.slice(0, 30) } : s));
    }

    setIsProcessing(true);
    try {
        const { retrieval, groundedContext } = buildGroundedContext(text);

        if (activeView === 'learning' && activeSubTab === AppTab.VISUALS && visualBase64) {
            const newImage = await editVisual(visualBase64, text);
            setVisualBase64(newImage);
        }
        else if (activeView === 'learning' && activeSubTab === AppTab.SIMULATION && simulationCode) {
            const newCode = await editSimulation(simulationCode, text);
            setSimulationCode(newCode);
        }
        else {
            setActiveView('learning');
            setActiveSubTab(AppTab.EXPLANATION);
            
            const [exp, vis, sim, ver] = await Promise.allSettled([
                generateExplanation(groundedContext),
                generateVisual(groundedContext),
                generateSimulation(groundedContext),
                verifyText(groundedContext)
            ]);

            if (exp.status === 'fulfilled' && exp.value.trim()) {
                setExplanation(exp.value);
            } else {
                const fallbackExplanation = [
                    '# Executive Summary',
                    'Explanation generation is temporarily unavailable. You can still use Verification, Quiz, and Simulation modes.',
                    '## Key Concepts',
                    ...retrieval.matchedEntries.map((entry) => `- ${entry.topic}: ${entry.misconception}`),
                    '## Detailed Analysis',
                    'Try again in a few seconds, or reduce the input size for faster completion.',
                    '## Conclusion',
                    'Concepta preserved your context and evidence links so you can continue studying.'
                ].join('\n');
                setExplanation(fallbackExplanation);
            }
            if (vis.status === 'fulfilled') setVisualBase64(vis.value);
            if (sim.status === 'fulfilled') setSimulationCode(sim.value);
            if (ver.status === 'fulfilled') {
                const mergedSources = Array.from(new Map([...retrieval.sources, ...ver.value.sources].map(s => [s.uri, s])).values());
                setVerificationData({ explanation: ver.value.explanation, sources: mergedSources });
            } else {
                setVerificationData({
                    explanation: `## Evidence-First Guidance\n\nNo live verification returned, but ${brandName} found relevant public learning evidence from trusted open resources for this topic.`,
                    sources: retrieval.sources
                });
            }
        }
    } catch (e) {
        console.error("AI Error:", e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAddSource = (item: SourceItem) => {
      setSources(prev => [item, ...prev]);
  };
  const handleToggleSource = (id: string) => {
      setSources(prev => prev.map(s => s.id === id ? { ...s, isSelected: !s.isSelected } : s));
  };
  const handleDeleteSource = (id: string) => {
      setSources(prev => prev.filter(s => s.id !== id));
  };
  const handleDeleteSelected = () => {
      setSources(prev => prev.filter(s => !s.isSelected));
  };

  const handleAddMistake = (mistake: MistakeItem) => {
      setMistakes(prev => [mistake, ...prev]);
  };
  const handleUpdateMistake = (id: string, note: string) => {
      setMistakes(prev => prev.map(m => m.id === id ? { ...m, note } : m));
  };
  const handleDeleteMistake = (id: string) => {
      setMistakes(prev => prev.filter(m => m.id !== id));
  };
  
  const handleQuizComplete = (result: QuizResult) => {
      setQuizHistory(prev => [result, ...prev]);
      setActiveView('metrics'); // Redirect to metrics to see updated data
  };


  const renderSubNav = () => (
        <div className="bg-white/85 dark:bg-slate-950/85 border-b border-cyan-100 dark:border-cyan-900/40 px-4 sm:px-8 py-0 flex items-center justify-center gap-4 sm:gap-8 shadow-[inset_0_-1px_0_#cffafe] dark:shadow-[inset_0_-1px_0_#0c4a6e] transition-all overflow-x-auto backdrop-blur-md">
        {[
            { id: AppTab.EXPLANATION, icon: 'ph-article', label: 'Explanation' },
            { id: AppTab.VISUALS, icon: 'ph-eye', label: 'Visualizing' },
            { id: AppTab.SIMULATION, icon: 'ph-flask', label: 'Simulation' },
            { id: AppTab.VERIFY, icon: 'ph-shield-check', label: 'Verification' }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`
                    text-sm font-medium py-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap
                    ${activeSubTab === tab.id 
                        ? 'text-cyan-700 dark:text-cyan-300 border-cyan-600 dark:border-cyan-400 font-semibold' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent hover:border-cyan-200 dark:hover:border-cyan-700'}
                `}
            >
                <i className={`ph ${tab.icon} text-lg`}></i>
                {tab.label}
            </button>
        ))}
    </div>
  );

  return (
        <div className={`${isDarkMode ? 'dark' : ''} h-screen flex text-slate-800 dark:text-slate-100 overflow-hidden font-sans concepta-surface`}>
        <Sidebar 
            isOpen={isSidebarOpen}
            activeView={activeView}
            onViewChange={setActiveView}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={(id) => {
                setCurrentSessionId(id);
                setSources(prev => mergeWithSampleSources(prev).map(s => ({ ...s, isSelected: false })));
                resetOutputs();
            }}
            onNewSession={createNewSession}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 flex flex-col relative bg-transparent transition-colors duration-200 min-w-0">
            <header className="h-16 border-b border-cyan-100/80 dark:border-cyan-900/40 flex items-center justify-between px-4 sm:px-8 bg-white/85 dark:bg-slate-950/85 z-10 shrink-0 backdrop-blur-md">
                <div className="font-bold text-xl tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                    <img src="/concepta-mark.svg" alt="Concepta" className="w-6 h-6 rounded-md" />
                    <span>{brandName}</span>
                </div>

                <div className="flex space-x-1 bg-white/90 dark:bg-slate-900/90 p-1 rounded-xl overflow-x-auto max-w-[220px] sm:max-w-none border border-cyan-100 dark:border-cyan-900/40 shadow-sm">
                    {[
                        { id: 'learning', icon: 'ph-book-open-text', label: 'Learning' },
                        { id: 'test', icon: 'ph-check-circle', label: 'Test' },
                        { id: 'teach', icon: 'ph-chalkboard-teacher', label: 'Teach' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as MainView)}
                            className={`
                                px-3 sm:px-4 py-1.5 font-medium rounded-md text-sm flex items-center gap-2 transition-all whitespace-nowrap
                                ${activeView === tab.id 
                                    ? 'bg-gradient-to-r from-cyan-500 to-orange-500 text-white shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}
                            `}
                        >
                            <i className={`ph ${tab.icon}`}></i>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-cyan-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400"
                >
                    {isDarkMode ? <i className="ph ph-sun text-xl"></i> : <i className="ph ph-moon text-xl"></i>}
                </button>
            </header>

            {activeView === 'learning' && renderSubNav()}

            <div className="flex-1 overflow-y-auto relative pb-32 scroll-smooth bg-transparent">
                
                {activeView === 'learning' && (
                    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-6 px-4 sm:px-8">
                        {!explanation && !isProcessing && (
                            <div className="w-full mb-8 animate-fade-in">
                                <div className="bg-gradient-to-r from-cyan-50 to-orange-50 dark:from-cyan-900/10 dark:to-orange-900/10 border border-cyan-100 dark:border-cyan-900 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 text-cyan-100 dark:text-cyan-900/20"><i className="ph ph-sparkle-fill text-9xl transform rotate-12"></i></div>
                                    <div className="flex items-center gap-4 relative z-10 mb-4 sm:mb-0">
                                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-sm text-cyan-600 dark:text-cyan-400 border border-cyan-50 dark:border-cyan-900"><i className="ph ph-sparkle-fill text-2xl"></i></div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">{brandName} Insight <span className="bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">New</span></h3>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Ask a question, add sources, and get evidence-backed support.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 bg-white/90 dark:bg-slate-950/90 rounded-2xl shadow-sm border border-cyan-100 dark:border-cyan-900/30 overflow-hidden min-h-[400px] backdrop-blur-sm">
                            {activeSubTab === AppTab.EXPLANATION && (
                                <ExplanationSection
                                    explanation={explanation}
                                    isLoading={isProcessing && !explanation}
                                    sources={verificationData?.sources || []}
                                />
                            )}
                            {activeSubTab === AppTab.VISUALS && (
                                <VisualSection 
                                    imageBase64={visualBase64} 
                                    isLoading={isProcessing && !visualBase64} 
                                    regenerate={handleRegenerateVisual}
                                />
                            )}
                            {activeSubTab === AppTab.SIMULATION && (
                                <SimulationSection 
                                    simulationCode={simulationCode}
                                    isLoading={isProcessing && !simulationCode}
                                    regenerate={handleRegenerateSimulation}
                                />
                            )}
                            {activeSubTab === AppTab.VERIFY && (
                                <VerifySection 
                                    data={verificationData}
                                    isLoading={isProcessing && !verificationData}
                                    onVerify={handleVerifyNow}
                                    hasInput={!!lastContext.trim()}
                                />
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'test' && (
                   <TestSection 
                        contextText={lastContext} 
                        mistakes={mistakes}
                        onAddMistake={handleAddMistake}
                        onUpdateMistake={handleUpdateMistake}
                        onDeleteMistake={handleDeleteMistake}
                        onQuizComplete={handleQuizComplete}
                   />
                )}

                {activeView === 'teach' && (
                    <TeachSection initialTopic={lastContext.slice(0, 50)} />
                )}

                {activeView === 'paste-link' && (
                    <PasteLinkSection 
                        sources={sources}
                        onAddSource={handleAddSource}
                        onToggleSource={handleToggleSource}
                        onDeleteSource={handleDeleteSource}
                        onDeleteSelected={handleDeleteSelected}
                    />
                )}
                
                {activeView === 'metrics' && (
                     <MetricsSection 
                        mistakes={mistakes}
                        quizHistory={quizHistory}
                     />
                )}
            </div>
            
            {(activeView !== 'teach' && activeView !== 'paste-link') && (
                <InputSection 
                    onSendMessage={handleSendMessage}
                    isProcessing={isProcessing}
                    onCreateFlashcards={handleCreateFlashcards}
                />
            )}

        </main>
    </div>
  );
};

export default App;