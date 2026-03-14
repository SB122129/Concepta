import React, { useState, useEffect } from 'react';
import { QuizData, QuestionType, MistakeItem, QuizResult } from '../types';
import { generateQuiz } from '../services/geminiService';
import { retrieveLearningEvidence } from '../services/learningRetrievalService';
import { MisconceptionEntry } from '../data/misconceptionDataset';
import { Button } from './Button';
import { CheckCircle, AlertCircle, RefreshCcw, Sparkles, BookOpen } from 'lucide-react';
import { AdaptiveQuizSetup } from './AdaptiveQuizSetup';
import { MistakeNotebook } from './MistakeNotebook';

interface TestSectionProps {
  contextText: string;
  mistakes: MistakeItem[];
  onAddMistake: (mistake: MistakeItem) => void;
  onUpdateMistake: (id: string, note: string) => void;
  onDeleteMistake: (id: string) => void;
  onQuizComplete: (result: QuizResult) => void;
}

type ViewState = 'setup' | 'quiz' | 'mistake_review';

interface AssessmentReport {
  accuracy: number;
  missedQuestions: number;
  misconceptionCoverage: string[];
  strengths: string[];
  recommendation: string;
  resources: { uri: string; title: string }[];
  avgConfidence: number;
  confidenceCalibration: number;
  confidenceGap: number;
}

interface QuestionOutcome {
  questionId: string;
  tag: string;
  correct: boolean;
  confidence: number;
}

export const TestSection: React.FC<TestSectionProps> = ({ 
  contextText, 
  mistakes, 
  onAddMistake,
  onUpdateMistake,
  onDeleteMistake,
  onQuizComplete
}) => {
  const [viewState, setViewState] = useState<ViewState | 'report'>('setup');
  
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizConfig, setQuizConfig] = useState<{difficulty: string; phase: 'pretest' | 'posttest' | 'practice'}>({difficulty: 'Medium', phase: 'practice'});
  const [isLoading, setIsLoading] = useState(false);
  const [activeType, setActiveType] = useState<QuestionType>('choose');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [diagnosticTags, setDiagnosticTags] = useState<string[]>([]);
  const [diagnosticEntries, setDiagnosticEntries] = useState<MisconceptionEntry[]>([]);
  const [currentAttemptMistakes, setCurrentAttemptMistakes] = useState<MistakeItem[]>([]);
  const [pendingResult, setPendingResult] = useState<QuizResult | null>(null);
  const [assessmentReport, setAssessmentReport] = useState<AssessmentReport | null>(null);

  // State for user answers
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [matchSelections, setMatchSelections] = useState<Record<string, string>>({}); 
  const [showResult, setShowResult] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [questionOutcomes, setQuestionOutcomes] = useState<QuestionOutcome[]>([]);

  // Score tracking for current session
  const [correctCount, setCorrectCount] = useState(0);

  // Mistake Capture State
  const [mistakeCategory, setMistakeCategory] = useState('Concept Error');
  const [mistakeNote, setMistakeNote] = useState('');
  const [showMistakeForm, setShowMistakeForm] = useState(false);

  useEffect(() => {
    // Reset if context significantly changes? (optional)
  }, [contextText]);

  // --- Handlers ---

  const getQuestionsForType = (data: QuizData | null, type: QuestionType) => {
    if (!data) return [];
    if (type === 'choose') return data.choose;
    if (type === 'fill-blank') return data.fillBlank;
    if (type === 'match') return data.match;
    return data.answer;
  };

  const handleStartQuiz = async (config: { topics: string[], difficulty: string, count: number, phase: 'pretest' | 'posttest' | 'practice' }) => {
    setIsLoading(true);
    setQuizConfig({ difficulty: config.difficulty, phase: config.phase });
    setCurrentAttemptMistakes([]);
    setQuestionOutcomes([]);
    setPendingResult(null);
    setAssessmentReport(null);
    try {
      // Create a focused prompt based on config
      const focusText = config.topics.length > 0 
        ? `Focus topics: ${config.topics.join(', ')}. \nContext: ${contextText}` 
        : contextText;

      const retrieval = retrieveLearningEvidence(`${focusText}\nAssessment phase: ${config.phase}`);
      setDiagnosticTags(retrieval.matchedEntries.map(entry => entry.topic));
      setDiagnosticEntries(retrieval.matchedEntries);
      const misconceptionContext = retrieval.matchedEntries
        .map(entry => `Misconception to probe: ${entry.misconception}\nDiagnostic: ${entry.diagnosticQuestion}`)
        .join('\n\n');
        
      const data = await generateQuiz(`${focusText || "General Knowledge"}\n\n${misconceptionContext}\n\nGenerate questions that specifically diagnose these learner misconceptions.`, config.difficulty, config.count);
      setQuizData(data);
      setCurrentQuestionIndex(0);
      setActiveType('choose');
      setCorrectCount(0);
      resetInteraction();
      setViewState('quiz');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const resetInteraction = () => {
    setSelectedOption('');
    setTextInput('');
    setMatchSelections({});
    setShowResult(false);
    setShowMistakeForm(false);
    setMistakeNote('');
    setMistakeCategory('Concept Error');
    setConfidenceLevel(3);
  };

  const handleTypeChange = (type: QuestionType) => {
    setActiveType(type);
    setCurrentQuestionIndex(0);
    resetInteraction();
  };

  const finishQuiz = () => {
    if (quizData) {
      const activeTotal = getQuestionsForType(quizData, activeType).length || 1;
        // Calculate final result
        const result: QuizResult = {
            id: Date.now().toString(),
            topic: quizData.topic,
            difficulty: quizConfig.difficulty,
            score: correctCount,
            totalQuestions: activeTotal,
            assessmentPhase: quizConfig.phase,
            avgConfidence: questionOutcomes.length > 0
              ? questionOutcomes.reduce((acc, item) => acc + item.confidence, 0) / questionOutcomes.length
              : confidenceLevel,
            confidenceCalibration: questionOutcomes.length > 0
              ? 1 - (questionOutcomes.reduce((acc, item) => {
                  const confidenceNorm = (item.confidence - 1) / 4;
                  const outcome = item.correct ? 1 : 0;
                  return acc + Math.abs(confidenceNorm - outcome);
                }, 0) / questionOutcomes.length)
              : 0.5,
            timestamp: Date.now()
        };

        const accuracy = activeTotal > 0 ? correctCount / activeTotal : 0;
        const misconceptionCoverage = Array.from(
          new Set(
            currentAttemptMistakes
              .map(m => m.category)
              .filter(category => diagnosticTags.includes(category))
          )
        );
        const strengths = diagnosticTags.filter(tag => !misconceptionCoverage.includes(tag)).slice(0, 3);
        const recommendationEntry = diagnosticEntries.find(entry => misconceptionCoverage.includes(entry.topic)) || diagnosticEntries[0];
        const report: AssessmentReport = {
          accuracy,
          missedQuestions: Math.max(0, activeTotal - correctCount),
          misconceptionCoverage,
          strengths,
          recommendation: recommendationEntry
            ? recommendationEntry.remediation
            : 'Continue with one focused practice set and a posttest to validate improvement.',
          resources: recommendationEntry ? recommendationEntry.sources : [],
          avgConfidence: result.avgConfidence || 3,
          confidenceCalibration: result.confidenceCalibration || 0.5,
          confidenceGap: ((result.avgConfidence || 3) - 1) / 4 - accuracy
        };

        setPendingResult(result);
        setAssessmentReport(report);
        setViewState('report');
    }
  };

  const handleNext = () => {
    const questionCount = getQuestionsForType(quizData, activeType).length;
    if (showMistakeForm) {
        handleSaveMistake();
    }
    
    if (currentQuestionIndex < questionCount - 1) { 
      setCurrentQuestionIndex(prev => prev + 1);
      resetInteraction();
    } else {
      // End of section
      finishQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      resetInteraction();
    }
  };

  const handleCheckAnswer = () => {
      setShowResult(true);
      const suggestedTag = getCurrentQuestionTag();
      
      let isCorrect = false;
      if (activeType === 'choose') {
          const q = quizData?.choose[currentQuestionIndex];
          if (q) isCorrect = selectedOption === q.correctAnswer;
      } else if (activeType === 'fill-blank') {
          const q = quizData?.fillBlank[currentQuestionIndex];
          if (q) isCorrect = textInput.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
      } else if (activeType === 'match') {
          const q = quizData?.match[currentQuestionIndex];
          if (q) {
             isCorrect = q.pairs.every(p => matchSelections[p.left] === p.right);
          }
      } else if (activeType === 'answer') {
          isCorrect = textInput.trim().length > 10;
      }

      if (isCorrect) {
          setCorrectCount(prev => prev + 1);
      } else {
          if (suggestedTag) setMistakeCategory(suggestedTag);
          setShowMistakeForm(true);
      }

      setQuestionOutcomes(prev => [
        ...prev,
        {
          questionId: `${activeType}-${currentQuestionIndex}`,
          tag: suggestedTag || 'Core Concept',
          correct: isCorrect,
          confidence: confidenceLevel
        }
      ]);
  };

  const handleSaveMistake = () => {
      if (!quizData) return;
      
      let qText = "";
      let cAnswer = "";
      let uAnswer = "";

      if (activeType === 'choose') {
          const q = quizData.choose[currentQuestionIndex];
          qText = q.question;
          cAnswer = q.correctAnswer;
          uAnswer = selectedOption;
      } else if (activeType === 'fill-blank') {
          const q = quizData.fillBlank[currentQuestionIndex];
          qText = q.question;
          cAnswer = q.correctAnswer;
          uAnswer = textInput;
      }

      const suggestedTag = getCurrentQuestionTag();
      const savedCategory = mistakeCategory === 'Concept Error' && suggestedTag ? suggestedTag : mistakeCategory;
      const savedMistake: MistakeItem = {
        id: Date.now().toString(),
        questionId: `${activeType}-${currentQuestionIndex}`,
        questionText: qText || "Question",
        userAnswer: uAnswer || "No Answer",
        correctAnswer: cAnswer || "Answer",
        category: savedCategory || 'Concept Error',
        note: mistakeNote || "No note provided",
        topic: quizData.topic,
        confidenceAtAttempt: confidenceLevel,
        timestamp: Date.now()
      };

      onAddMistake(savedMistake);
      setCurrentAttemptMistakes(prev => [savedMistake, ...prev]);
      setShowMistakeForm(false);
  };

  // --- RENDERERS ---

  const inferDiagnosticTag = (questionText: string, index: number): string => {
    if (diagnosticEntries.length === 0) return 'Core Concept';

    const text = questionText.toLowerCase();
    const keywordMatch = diagnosticEntries.find(entry =>
      entry.keywords.some(keyword => text.includes(keyword.toLowerCase()))
    );

    if (keywordMatch) return keywordMatch.topic;
    return diagnosticEntries[index % diagnosticEntries.length].topic;
  };

  const getCurrentQuestionText = () => {
    if (!quizData) return '';
    if (activeType === 'choose') return quizData.choose[currentQuestionIndex]?.question || '';
    if (activeType === 'fill-blank') return quizData.fillBlank[currentQuestionIndex]?.question || '';
    if (activeType === 'match') return quizData.match[currentQuestionIndex]?.question || '';
    return quizData.answer[currentQuestionIndex]?.question || '';
  };

  const getCurrentQuestionTag = () => inferDiagnosticTag(getCurrentQuestionText(), currentQuestionIndex);

  if (viewState === 'setup') {
      return (
          <div className="h-full relative">
              {mistakes.length > 0 && (
                  <div className="absolute top-4 right-4 z-10">
                      <Button variant="secondary" onClick={() => setViewState('mistake_review')} icon={<BookOpen className="w-4 h-4"/>}>
                          Mistake Notebook
                      </Button>
                  </div>
              )}
              {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full animate-pulse">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full mb-4"></div>
                        <h2 className="text-xl font-bold text-gray-400">Generating Assessment...</h2>
                        <p className="text-gray-400 mt-2">Crafting questions based on your config.</p>
                  </div>
              ) : (
                  <AdaptiveQuizSetup 
                    topics={['Entropy', 'Heat Transfer', 'Spontaneity', 'Equilibrium']} 
                    initialTopic={quizData?.topic || ""}
                    onStart={handleStartQuiz}
                  />
              )}
          </div>
      );
  }

  if (viewState === 'mistake_review') {
      return (
          <MistakeNotebook 
            mistakes={mistakes} 
            onBack={() => setViewState('setup')} 
            onUpdateNote={onUpdateMistake}
            onDeleteMistake={onDeleteMistake}
          />
      );
  }

  if (viewState === 'report' && pendingResult && assessmentReport) {
    return (
      <div className="h-full flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl border border-cyan-100 dark:border-cyan-900/40 shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Assessment Report</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {quizConfig.phase.toUpperCase()} complete. Accuracy: <span className="font-bold text-cyan-700 dark:text-cyan-300">{(assessmentReport.accuracy * 100).toFixed(1)}%</span>
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-xs uppercase tracking-wider text-gray-500">Score</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{pendingResult.score}/{pendingResult.totalQuestions}</div>
            </div>
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-xs uppercase tracking-wider text-gray-500">Missed</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{assessmentReport.missedQuestions}</div>
            </div>
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-xs uppercase tracking-wider text-gray-500">Topic</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{pendingResult.topic}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-xs uppercase tracking-wider text-gray-500">Avg Confidence</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{assessmentReport.avgConfidence.toFixed(2)} / 5</div>
            </div>
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-xs uppercase tracking-wider text-gray-500">Calibration</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{(assessmentReport.confidenceCalibration * 100).toFixed(1)}%</div>
            </div>
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-xs uppercase tracking-wider text-gray-500">Confidence Gap</div>
              <div className={`text-lg font-bold ${assessmentReport.confidenceGap > 0.1 ? 'text-amber-600' : assessmentReport.confidenceGap < -0.1 ? 'text-blue-600' : 'text-emerald-600'}`}>
                {(assessmentReport.confidenceGap >= 0 ? '+' : '') + (assessmentReport.confidenceGap * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-cyan-700 dark:text-cyan-300 mb-2">Misconceptions Encountered</h3>
            <div className="flex flex-wrap gap-2">
              {assessmentReport.misconceptionCoverage.length > 0 ? assessmentReport.misconceptionCoverage.map(item => (
                <span key={item} className="px-2.5 py-1 rounded-full text-xs font-semibold border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20">{item}</span>
              )) : <span className="text-sm text-emerald-700 dark:text-emerald-300">No major misconception flags in this run.</span>}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-cyan-700 dark:text-cyan-300 mb-2">Strength Areas</h3>
            <div className="flex flex-wrap gap-2">
              {assessmentReport.strengths.length > 0 ? assessmentReport.strengths.map(item => (
                <span key={item} className="px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20">{item}</span>
              )) : <span className="text-sm text-gray-500">Keep practicing to establish strong areas.</span>}
            </div>
          </div>

          <div className="mb-6 p-4 rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50 dark:bg-cyan-900/15">
            <h3 className="text-xs uppercase tracking-wider font-bold text-cyan-700 dark:text-cyan-300 mb-2">Recommended Next Step</h3>
            <p className="text-sm text-cyan-900 dark:text-cyan-100 mb-3">{assessmentReport.recommendation}</p>
            {assessmentReport.resources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {assessmentReport.resources.map((source) => (
                  <a key={source.uri} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/30">
                    {source.title}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setPendingResult(null);
                setAssessmentReport(null);
                setViewState('setup');
              }}
            >
              Start New Quiz
            </Button>
            <Button
              onClick={() => {
                onQuizComplete(pendingResult);
                setPendingResult(null);
                setAssessmentReport(null);
                setViewState('setup');
              }}
            >
              Save and View Metrics
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // QUIZ VIEW LOGIC

  const renderChoose = () => {
    if (!quizData) return null;
    const q = quizData.choose[currentQuestionIndex];
    if (!q) return <div>No question data</div>;

    const isCorrect = selectedOption === q.correctAnswer;

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{q.question}</h3>
        <div className="space-y-3">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => { if(!showResult) setSelectedOption(opt); }}
              disabled={showResult}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between
                ${selectedOption === opt 
                  ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                ${showResult && opt === q.correctAnswer ? '!bg-green-100 !border-green-500 text-green-800' : ''}
                ${showResult && selectedOption === opt && opt !== q.correctAnswer ? '!bg-red-50 !border-red-500 text-red-800' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                 <span className="font-bold text-gray-400 text-lg">{String.fromCharCode(65 + idx)}:</span>
                 <span className="font-medium">{opt}</span>
              </div>
              {showResult && opt === q.correctAnswer && <CheckCircle className="text-green-600 w-5 h-5"/>}
              {showResult && selectedOption === opt && opt !== q.correctAnswer && <AlertCircle className="text-red-500 w-5 h-5"/>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderFillBlank = () => {
    if (!quizData) return null;
    const q = quizData.fillBlank[currentQuestionIndex];
    if (!q) return null;

    const parts = q.sentence.split('___');

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">{q.question}</h3>
        <div className="text-2xl font-serif leading-relaxed text-gray-800 dark:text-gray-100">
           {parts[0]}
           <span className="relative inline-block mx-2 min-w-[120px]">
              <input 
                type="text" 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={showResult}
                className={`w-full bg-transparent border-b-2 outline-none text-center font-bold px-2
                   ${showResult 
                      ? (textInput.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim() ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')
                      : 'border-gray-400 focus:border-black dark:focus:border-white'
                   }
                `}
                placeholder="type answer..."
              />
              {showResult && textInput.toLowerCase().trim() !== q.correctAnswer.toLowerCase().trim() && (
                 <div className="absolute top-full left-0 w-full text-xs text-green-600 font-sans mt-1 text-center bg-green-50 px-1 py-0.5 rounded">
                    Ans: {q.correctAnswer}
                 </div>
              )}
           </span>
           {parts[1]}
        </div>
      </div>
    );
  };

  const renderMatch = () => {
    if (!quizData) return null;
    const q = quizData.match[currentQuestionIndex];
    if (!q) return null;

    const rightOptions = q.pairs.map(p => p.right).sort(); 

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">{q.question}</h3>
            <div className="grid gap-4">
                {q.pairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex-1 font-medium text-gray-700 dark:text-gray-200">{pair.left}</div>
                        <div className="text-gray-400"><i className="ph ph-arrows-left-right"></i></div>
                        <div className="flex-1">
                            <select 
                                className={`w-full p-2 rounded-lg border bg-white dark:bg-black outline-none
                                    ${showResult 
                                        ? (matchSelections[pair.left] === pair.right ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700')
                                        : 'border-gray-300 dark:border-gray-600'
                                    }
                                `}
                                value={matchSelections[pair.left] || ''}
                                onChange={(e) => setMatchSelections({...matchSelections, [pair.left]: e.target.value})}
                                disabled={showResult}
                            >
                                <option value="">Select match...</option>
                                {rightOptions.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                ))}
                            </select>
                            {showResult && matchSelections[pair.left] !== pair.right && (
                                <div className="text-xs text-green-600 mt-1">Correct: {pair.right}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderAnswer = () => {
     if (!quizData) return null;
     const q = quizData.answer[currentQuestionIndex];
     if (!q) return null;

     return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{q.question}</h3>
            <textarea 
                className="w-full h-32 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-transparent resize-none"
                placeholder="Type your answer here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={showResult}
            />
            {showResult && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4"/> AI Sample Answer
                    </h4>
                    <p className="text-blue-900 dark:text-blue-100 text-sm">{q.sampleAnswer}</p>
                </div>
            )}
        </div>
     );
  };

  if (!quizData) return null; 

  const questionCount = getQuestionsForType(quizData, activeType).length || 1;
  const scoreBase = Math.max(currentQuestionIndex + (showResult ? 1 : 0), 1);
  const remediationEntry = diagnosticEntries.find((entry) => mistakeCategory === entry.topic) || diagnosticEntries[0];
  const currentQuestionTag = getCurrentQuestionTag();

  return (
    <div className="flex flex-col items-center pt-8 px-4 w-full h-full animate-fade-in">
        <div className="max-w-5xl w-full h-full flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-end mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Active Assessment</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Topic: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{quizData.topic}</span></p>
                    <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-2 uppercase tracking-wider font-bold">{quizConfig.phase} mode</p>
                    {diagnosticTags.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Diagnostic focus: {diagnosticTags.join(' • ')}</p>
                    )}
                </div>
                <div className="flex gap-2">
                     <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono">
                        Score: {correctCount}/{scoreBase}
                     </div>
                     <Button variant="secondary" onClick={() => setViewState('setup')} icon={<RefreshCcw className="w-4 h-4"/>}>
                        End Quiz
                    </Button>
                </div>
            </div>
            
            {/* Main Card Layout */}
            <div className="flex-1 flex gap-6 min-h-0 mb-20"> 
                
                {/* Left: Question Area */}
                <div className="flex-1 bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
                    <div className="flex-1 p-8 overflow-y-auto relative z-10 custom-scrollbar">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Question {currentQuestionIndex + 1}
                                  <span className="text-gray-400 font-medium text-lg ml-1">/ {questionCount}</span>
                                </h2>
                                <div className="h-1 w-12 bg-black dark:bg-white mt-2"></div>
                                <div className="mt-3 inline-flex px-2.5 py-1 rounded-full text-xs font-bold border border-cyan-200 dark:border-cyan-900/40 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20">
                                  Targets: {currentQuestionTag}
                                </div>
                            </div>
                        </div>

                        <div className="animate-fade-in">
                            {activeType === 'choose' && renderChoose()}
                            {activeType === 'fill-blank' && renderFillBlank()}
                            {activeType === 'match' && renderMatch()}
                            {activeType === 'answer' && renderAnswer()}
                        </div>

                        {showMistakeForm && (
                             <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 rounded-xl animate-fade-in">
                                 <h4 className="text-red-800 dark:text-red-300 font-bold mb-4 flex items-center gap-2">
                                     <AlertCircle className="w-5 h-5" /> Incorrect Answer. Analyze your mistake:
                                 </h4>
                                 <div className="grid sm:grid-cols-2 gap-4 mb-4">
                                     <div>
                                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                         <select 
                                            value={mistakeCategory}
                                            onChange={(e) => setMistakeCategory(e.target.value)}
                                            className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none"
                                         >
                                             <option>Concept Error</option>
                                             <option>Calculation</option>
                                             <option>Misread Question</option>
                                             <option>Guessing</option>
                                            {diagnosticTags.map(tag => (
                                             <option key={tag}>{tag}</option>
                                            ))}
                                         </select>
                                     </div>
                                 </div>
                                 <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Why did you miss this?</label>
                                      <textarea 
                                        value={mistakeNote}
                                        onChange={(e) => setMistakeNote(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none"
                                        rows={2}
                                        placeholder="I thought that..."
                                      />
                                 </div>

                                 {remediationEntry && (
                                   <div className="mt-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-900/40 rounded-lg">
                                     <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 mb-2">Targeted Remediation</h5>
                                     <p className="text-sm text-cyan-900 dark:text-cyan-100 mb-2">{remediationEntry.remediation}</p>
                                     <p className="text-xs text-cyan-700 dark:text-cyan-300 mb-2">Try this diagnostic check: {remediationEntry.diagnosticQuestion}</p>
                                     <div className="flex flex-wrap gap-2">
                                       {remediationEntry.sources.map((source) => (
                                         <a
                                           key={source.uri}
                                           href={source.uri}
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           className="text-[11px] px-2 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/30"
                                         >
                                           {source.title}
                                         </a>
                                       ))}
                                     </div>
                                   </div>
                                 )}

                                 <div className="flex justify-end mt-4">
                                     <Button onClick={handleSaveMistake} className="text-xs">Save Analysis & Continue</Button>
                                 </div>
                             </div>
                        )}

                    </div>

                    {/* Bottom Controls */}
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center relative z-10">
                        <div className="flex gap-2">
                             <button 
                                onClick={handlePrevious} 
                                disabled={currentQuestionIndex === 0 || showMistakeForm}
                                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors"
                             >
                                Previous
                             </button>
                             <button 
                                onClick={handleNext}
                                disabled={showMistakeForm}
                                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors"
                             >
                                {currentQuestionIndex === questionCount - 1 ? "Finish Quiz" : "Next"}
                             </button>
                        </div>

                        <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/70 dark:bg-cyan-900/20">
                            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Confidence</span>
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="1"
                              value={confidenceLevel}
                              onChange={(e) => setConfidenceLevel(parseInt(e.target.value, 10))}
                              disabled={showResult}
                              className="accent-cyan-600"
                            />
                            <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">{confidenceLevel}/5</span>
                        </div>
                        
                        {!showResult ? (
                            <button 
                                onClick={handleCheckAnswer}
                                className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-bold shadow-lg hover:transform hover:scale-105 transition-all"
                            >
                                Check Answer
                            </button>
                        ) : (
                             !showMistakeForm && (
                                <div className="flex items-center gap-2 text-green-600 font-bold px-4">
                                    <CheckCircle className="w-5 h-5"/> Correct
                                </div>
                             )
                        )}
                    </div>
                </div>

                {/* Right: Type Sidebar */}
                <div className="w-64 bg-gray-50 dark:bg-gray-900/30 border-l border-gray-200 dark:border-gray-800 p-6 flex flex-col rounded-r-2xl hidden md:flex shrink-0">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-6 text-xs uppercase tracking-wider">Question Type</h3>
                    
                    <div className="space-y-2 relative">
                         <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700 -z-10"></div>
                         {[
                             { id: 'choose', label: 'Choose' },
                             { id: 'fill-blank', label: 'Fill the Blank' },
                             { id: 'match', label: 'Match' },
                             { id: 'answer', label: 'Answer Question' }
                         ].map((type) => (
                             <div 
                                key={type.id}
                                onClick={() => handleTypeChange(type.id as QuestionType)}
                                className="flex items-center gap-3 relative cursor-pointer group py-2"
                             >
                                <div className={`w-4 h-4 rounded-full border-2 transition-colors z-10
                                    ${activeType === type.id 
                                        ? 'bg-black dark:bg-white border-black dark:border-white' 
                                        : 'bg-white dark:bg-black border-gray-300 dark:border-gray-600 group-hover:border-gray-500'}
                                `}></div>
                                <span className={`text-sm font-medium transition-colors
                                     ${activeType === type.id ? 'text-black dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700'}
                                `}>
                                    {type.label}
                                </span>
                             </div>
                         ))}
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};