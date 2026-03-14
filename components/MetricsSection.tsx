import React, { useMemo } from 'react';
import { Target, AlertTriangle, CheckCircle, Brain, RefreshCw, Download } from 'lucide-react';
import { Button } from './Button';
import { MistakeItem, QuizResult } from '../types';

interface Metric {
  id: number;
  label: string;
  score: number; // 1-5
  required: number; // Threshold for passing
  description: string;
  category: 'Core' | 'Advanced' | 'Performance';
}

interface MetricsSectionProps {
  mistakes: MistakeItem[];
  quizHistory: QuizResult[];
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ mistakes, quizHistory }) => {
    const normalizedScore = (q: QuizResult) => (q.totalQuestions > 0 ? q.score / q.totalQuestions : 0);

        const confidenceSummary = useMemo(() => {
                const confidenceValues = quizHistory.map(q => q.avgConfidence).filter((v): v is number => typeof v === 'number');
                const calibrationValues = quizHistory.map(q => q.confidenceCalibration).filter((v): v is number => typeof v === 'number');

                const avgConfidence = confidenceValues.length > 0
                    ? confidenceValues.reduce((acc, v) => acc + v, 0) / confidenceValues.length
                    : 0;
                const avgCalibration = calibrationValues.length > 0
                    ? calibrationValues.reduce((acc, v) => acc + v, 0) / calibrationValues.length
                    : 0;

                return {
                    hasData: confidenceValues.length > 0,
                    avgConfidence,
                    avgCalibration
                };
        }, [quizHistory]);

        const attemptTimeline = useMemo(() => {
                return [...quizHistory]
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .slice(-8)
                        .map((q) => ({
                            id: q.id,
                            phase: q.assessmentPhase || 'practice',
                            accuracy: normalizedScore(q),
                            confidence: q.avgConfidence ? (q.avgConfidence - 1) / 4 : null,
                            topic: q.topic
                        }));
        }, [quizHistory]);

        const exportJudgeReport = () => {
                const payload = {
                        generatedAt: new Date().toISOString(),
                        totalQuizzes: quizHistory.length,
                        totalMistakes: mistakes.length,
                        prePostSummary,
                        topicComparisons,
                        confidenceSummary,
                        attempts: quizHistory.map((q) => ({
                                id: q.id,
                                topic: q.topic,
                                phase: q.assessmentPhase || 'practice',
                                score: q.score,
                                totalQuestions: q.totalQuestions,
                                accuracy: normalizedScore(q),
                                avgConfidence: q.avgConfidence ?? null,
                                confidenceCalibration: q.confidenceCalibration ?? null,
                                timestamp: q.timestamp
                        })),
                        mistakes: mistakes.map((m) => ({
                                id: m.id,
                                questionId: m.questionId,
                                category: m.category,
                                topic: m.topic,
                                confidenceAtAttempt: m.confidenceAtAttempt ?? null,
                                timestamp: m.timestamp
                        }))
                };

                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `concepta-judge-report-${Date.now()}.json`;
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                URL.revokeObjectURL(url);
        };

            const exportAttemptsCsv = () => {
                const headers = [
                    'id',
                    'topic',
                    'phase',
                    'score',
                    'totalQuestions',
                    'accuracy',
                    'avgConfidence',
                    'confidenceCalibration',
                    'timestamp'
                ];

                const rows = quizHistory.map((q) => [
                    q.id,
                    q.topic,
                    q.assessmentPhase || 'practice',
                    q.score,
                    q.totalQuestions,
                    normalizedScore(q).toFixed(4),
                    q.avgConfidence?.toFixed(4) ?? '',
                    q.confidenceCalibration?.toFixed(4) ?? '',
                    new Date(q.timestamp).toISOString()
                ]);

                const csv = [headers, ...rows]
                    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                    .join('\n');

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `concepta-attempts-${Date.now()}.csv`;
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                URL.revokeObjectURL(url);
            };

    const prePostSummary = useMemo(() => {
        const pretests = quizHistory.filter(q => q.assessmentPhase === 'pretest');
        const posttests = quizHistory.filter(q => q.assessmentPhase === 'posttest');

        if (pretests.length === 0 || posttests.length === 0) {
            return { hasData: false, delta: 0, preAvg: 0, postAvg: 0 };
        }

        const preAvg = pretests.reduce((acc, q) => acc + normalizedScore(q), 0) / pretests.length;
        const postAvg = posttests.reduce((acc, q) => acc + normalizedScore(q), 0) / posttests.length;

        return {
            hasData: true,
            delta: postAvg - preAvg,
            preAvg,
            postAvg
        };
    }, [quizHistory]);

    const topicComparisons = useMemo(() => {
        const topics = Array.from(new Set(quizHistory.map((q) => q.topic)));

        return topics
            .map((topic) => {
                const pre = quizHistory.filter((q) => q.topic === topic && q.assessmentPhase === 'pretest');
                const post = quizHistory.filter((q) => q.topic === topic && q.assessmentPhase === 'posttest');

                if (pre.length === 0 || post.length === 0) return null;

                const preAvg = pre.reduce((acc, q) => acc + normalizedScore(q), 0) / pre.length;
                const postAvg = post.reduce((acc, q) => acc + normalizedScore(q), 0) / post.length;

                return {
                    topic,
                    preAvg,
                    postAvg,
                    delta: postAvg - preAvg
                };
            })
            .filter((item): item is { topic: string; preAvg: number; postAvg: number; delta: number } => Boolean(item))
            .sort((a, b) => b.delta - a.delta);
    }, [quizHistory]);
  
  // --- REAL-TIME CALCULATION LOGIC ---
  const metrics = useMemo<Metric[]>(() => {
    // Default Scores (start at 3)
    let recall = 3;
    let concept = 3;
    let procedural = 3;
    let application = 2;
    let critical = 2;
    let errorCorrection = 3;
    let speed = 4; // Assume reasonable speed by default

    const totalQuizzes = quizHistory.length;
    
    if (totalQuizzes > 0) {
        // Calculate average accuracy
        const totalCorrect = quizHistory.reduce((acc, q) => acc + q.score, 0);
        const totalQuestions = quizHistory.reduce((acc, q) => acc + q.totalQuestions, 0);
        const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;

        // Base scores on accuracy
        if (accuracy > 0.9) { recall = 5; procedural = 5; }
        else if (accuracy > 0.75) { recall = 4; procedural = 4; }
        else if (accuracy > 0.5) { recall = 3; procedural = 3; }
        else { recall = 2; procedural = 2; }

        // Adjust based on Difficulty
        const hardPasses = quizHistory.filter(q => q.difficulty === 'Hard' && (q.score / q.totalQuestions) > 0.6).length;
        if (hardPasses > 0) {
            application += 2;
            critical += 1;
        }
        
        // Adjust based on Recent Trend (Last 3)
        const recent = quizHistory.slice(0, 3);
        const recentAccuracy = recent.reduce((acc, q) => acc + q.score, 0) / recent.reduce((acc, q) => acc + q.totalQuestions, 0);
        if (recentAccuracy > accuracy) speed += 1; // Improving implies efficiency

        if (prePostSummary.hasData && prePostSummary.delta > 0.05) {
            concept = Math.min(5, concept + 1);
            application = Math.min(5, application + 1);
        }

        if (confidenceSummary.hasData) {
            if (confidenceSummary.avgCalibration > 0.7) critical = Math.min(5, critical + 1);
            if (confidenceSummary.avgCalibration < 0.45) critical = Math.max(1, critical - 1);
        }
    }

    // Adjust based on Mistake Categories
    const conceptErrors = mistakes.filter(m => m.category === 'Concept Error').length;
    if (conceptErrors > 2) concept = Math.max(1, concept - 1);
    if (conceptErrors === 0 && totalQuizzes > 0) concept = Math.min(5, concept + 1);

    const calcErrors = mistakes.filter(m => m.category === 'Calculation').length;
    if (calcErrors > 2) procedural = Math.max(1, procedural - 1);

    // Error Correction: Do we have note content?
    const detailedNotes = mistakes.filter(m => m.note.length > 10).length;
    if (detailedNotes > 2) errorCorrection = Math.min(5, errorCorrection + 1);

    return [
      { id: 1, label: 'Direct Recall', score: recall, required: 4, category: 'Core', description: 'Ability to retrieve specific facts without cues.' },
      { id: 2, label: 'Conceptual Understanding', score: concept, required: 4, category: 'Core', description: 'Grasping the underlying principles and relationships.' },
      { id: 3, label: 'Procedural Mastery', score: procedural, required: 4, category: 'Core', description: 'Executing steps or methods correctly.' },
      { id: 4, label: 'Application', score: Math.min(5, application), required: 4, category: 'Core', description: 'Using knowledge in new, unfamiliar situations.' },
      { id: 5, label: 'Creative Thinking', score: 3, required: 3, category: 'Advanced', description: 'Generating novel ideas or divergent solutions.' },
      { id: 6, label: 'Critical Thinking', score: Math.min(5, critical), required: 3, category: 'Advanced', description: 'Evaluating arguments and identifying biases.' },
      { id: 7, label: 'Synthesis', score: 2, required: 3, category: 'Advanced', description: 'Integrating separate elements into a coherent whole.' },
      { id: 8, label: 'Time Efficiency', score: Math.min(5, speed), required: 3, category: 'Performance', description: 'Speed plus accuracy in execution.' },
      { id: 9, label: 'Error Correction', score: errorCorrection, required: 4, category: 'Core', description: 'Ability to self-identify and fix mistakes.' },
      { id: 10, label: 'Depth of Explanation', score: 4, required: 3, category: 'Performance', description: 'Richness and detail in articulated answers.' },
    ];
    }, [mistakes, quizHistory, prePostSummary, confidenceSummary]);

  const blindSpots = useMemo(() => {
    return metrics.filter(m => m.score < m.required);
  }, [metrics]);

  const overallScore = useMemo(() => {
    return (metrics.reduce((acc, curr) => acc + curr.score, 0) / metrics.length).toFixed(1);
  }, [metrics]);

  // --- VISUALIZATION HELPERS ---

  const getColor = (score: number, required: number) => {
    if (score >= required) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    if (score === required - 1) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800';
  };

  const getBarColor = (score: number, required: number) => {
    if (score >= required) return 'bg-emerald-500';
    if (score === required - 1) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const renderRadarChart = () => {
    const size = 300;
    const center = size / 2;
    const radius = 100;
    const angleSlice = (Math.PI * 2) / metrics.length;

    const getCoords = (value: number, index: number, max: number = 5) => {
      const angle = index * angleSlice - Math.PI / 2; 
      const r = (value / max) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      };
    };

    const pathData = metrics.map((m, i) => {
      const { x, y } = getCoords(m.score, i);
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ') + ' Z';

    const thresholdPathData = metrics.map((m, i) => {
      const { x, y } = getCoords(m.required, i);
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ') + ' Z';

    return (
      <svg width={size} height={size} className="mx-auto overflow-visible">
        {[1, 2, 3, 4, 5].map(level => (
          <circle key={level} cx={center} cy={center} r={(level / 5) * radius} className="fill-none stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />
        ))}
        {metrics.map((_, i) => {
          const { x, y } = getCoords(5, i);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />;
        })}
        <path d={thresholdPathData} className="fill-none stroke-blue-400 dark:stroke-blue-500 stroke-dasharray-4 opacity-50" strokeWidth="2" />
        <path d={pathData} className="fill-indigo-500/20 stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="3" />
        {metrics.map((m, i) => {
            const { x, y } = getCoords(6, i); 
            const anchor = x < center ? 'end' : x > center ? 'start' : 'middle';
            const baseline = y < center ? 'auto' : 'hanging';
            return (
                <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline={baseline} className="text-[10px] fill-gray-500 dark:fill-gray-400 font-medium uppercase tracking-wider">
                    {m.label.split(' ')[0]} 
                </text>
            );
        })}
        {metrics.map((m, i) => {
            const { x, y } = getCoords(m.score, i);
            return (
                <circle key={i} cx={x} cy={y} r="4" className={`${m.score < m.required ? 'fill-red-500' : 'fill-indigo-600 dark:fill-indigo-400'} stroke-white dark:stroke-gray-900 stroke-2 hover:r-6 transition-all`}>
                    <title>{m.label}: {m.score}/5</title>
                </circle>
            );
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto custom-scrollbar p-4 sm:p-8 animate-fade-in">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto w-full mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Target className="w-8 h-8 text-indigo-600" />
                Learning Metrics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
                Real-time analysis of your cognitive performance based on {quizHistory.length} completed quizzes.
            </p>
                        {prePostSummary.hasData ? (
                            <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-2 font-semibold">
                                Measured gain: {(prePostSummary.delta * 100).toFixed(1)}% from pretest to posttest.
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Run at least one pretest and one posttest to unlock measured impact.
                            </p>
                        )}
        </div>
        <div className="flex items-center gap-4 bg-white/90 dark:bg-slate-950/90 p-3 rounded-xl border border-cyan-100 dark:border-cyan-900/30 shadow-sm backdrop-blur-sm">
            <div className="text-right">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Overall</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{overallScore} <span className="text-sm text-gray-400 font-normal">/ 5.0</span></div>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
            <Button variant="ghost" icon={<RefreshCw className="w-4 h-4" />}>
                Live Data
            </Button>
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportJudgeReport}>
                Export JSON
            </Button>
            <Button variant="secondary" onClick={exportAttemptsCsv}>
                Export CSV
            </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Visuals & Summary */}
        <div className="lg:col-span-5 space-y-8">
            <div className="bg-white/90 dark:bg-slate-950/90 rounded-2xl p-6 shadow-sm border border-cyan-100 dark:border-cyan-900/30 flex flex-col items-center justify-center relative backdrop-blur-sm">
                <h3 className="absolute top-6 left-6 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    Cognitive Profile
                </h3>
                <div className="mt-8 mb-4">
                    {renderRadarChart()}
                </div>
            </div>

            <div className="bg-white/90 dark:bg-slate-950/90 rounded-2xl p-6 shadow-sm border border-cyan-100 dark:border-cyan-900/30 backdrop-blur-sm">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Blind Spot Analysis
                </h3>
                
                {blindSpots.length === 0 ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <h4 className="font-bold text-green-800 dark:text-green-300">All Systems Go!</h4>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                            You are meeting or exceeding all required thresholds.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            The following areas are below the required threshold:
                        </p>
                        {blindSpots.map(metric => (
                            <div key={metric.id} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-3">
                                <div className="bg-white dark:bg-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-red-600 shrink-0 border border-red-100 dark:border-red-900">
                                    {metric.score}
                                </div>
                                <div>
                                    <div className="font-semibold text-red-800 dark:text-red-300 text-sm">{metric.label}</div>
                                    <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                        Req: {metric.required} • {metric.category}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT COLUMN: Detailed Metrics */}
        <div className="lg:col-span-7 space-y-6">
                        {prePostSummary.hasData && (
                            <div className="bg-cyan-50/70 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider">Impact Snapshot</h4>
                                    <p className="text-cyan-700 dark:text-cyan-200 text-sm mt-1">
                                        Pretest: {(prePostSummary.preAvg * 100).toFixed(1)}% | Posttest: {(prePostSummary.postAvg * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="text-xl font-bold text-cyan-700 dark:text-cyan-200">
                                    {(prePostSummary.delta >= 0 ? '+' : '') + (prePostSummary.delta * 100).toFixed(1)}%
                                </div>
                            </div>
                        )}

                        {topicComparisons.length > 0 && (
                            <div className="bg-white/90 dark:bg-slate-950/90 rounded-xl border border-cyan-100 dark:border-cyan-900/30 p-4 backdrop-blur-sm">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Topic-Level Gains</h4>
                                <div className="space-y-2">
                                    {topicComparisons.map((row) => (
                                        <div key={row.topic} className="grid grid-cols-12 items-center gap-2 text-sm border border-gray-100 dark:border-gray-800 rounded-lg p-2.5">
                                            <div className="col-span-5 font-semibold text-gray-700 dark:text-gray-200 truncate">{row.topic}</div>
                                            <div className="col-span-2 text-gray-500 dark:text-gray-400">{(row.preAvg * 100).toFixed(0)}%</div>
                                            <div className="col-span-2 text-gray-500 dark:text-gray-400">{(row.postAvg * 100).toFixed(0)}%</div>
                                            <div className={`col-span-3 text-right font-bold ${row.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {(row.delta >= 0 ? '+' : '') + (row.delta * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-12 text-[11px] uppercase tracking-wider text-gray-400 mt-2 px-1">
                                    <div className="col-span-5">Topic</div>
                                    <div className="col-span-2">Pre</div>
                                    <div className="col-span-2">Post</div>
                                    <div className="col-span-3 text-right">Delta</div>
                                </div>
                            </div>
                        )}

                                                {attemptTimeline.length > 0 && (
                                                        <div className="bg-white/90 dark:bg-slate-950/90 rounded-xl border border-cyan-100 dark:border-cyan-900/30 p-4 backdrop-blur-sm">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Attempt Timeline</h4>
                                                                <div className="grid grid-cols-8 gap-2 items-end h-28">
                                                                        {attemptTimeline.map((attempt) => (
                                                                                <div key={attempt.id} className="relative flex flex-col items-center justify-end h-full">
                                                                                        <div
                                                                                            className="w-full rounded-t-md bg-cyan-500/70 dark:bg-cyan-400/70"
                                                                                            style={{ height: `${Math.max(8, attempt.accuracy * 100)}%` }}
                                                                                            title={`${attempt.topic} ${Math.round(attempt.accuracy * 100)}%`}
                                                                                        />
                                                                                        {attempt.confidence !== null && (
                                                                                            <div
                                                                                                className="absolute left-0 right-0 border-t-2 border-orange-500"
                                                                                                style={{ bottom: `${Math.max(0, Math.min(100, attempt.confidence * 100))}%` }}
                                                                                                title={`Confidence ${Math.round(attempt.confidence * 100)}%`}
                                                                                            />
                                                                                        )}
                                                                                        <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{attempt.phase.slice(0, 3)}</span>
                                                                                </div>
                                                                        ))}
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-500">
                                                                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500/70" /> Accuracy</span>
                                                                        <span className="inline-flex items-center gap-1"><span className="w-3 border-t-2 border-orange-500" /> Confidence</span>
                                                                </div>
                                                                {confidenceSummary.hasData && (
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                                        Avg confidence: {confidenceSummary.avgConfidence.toFixed(2)}/5 | Avg calibration: {(confidenceSummary.avgCalibration * 100).toFixed(1)}%
                                                                    </p>
                                                                )}
                                                        </div>
                                                )}

            <div className="flex flex-wrap gap-2 justify-between items-center p-4 bg-white/90 dark:bg-slate-950/90 rounded-xl border border-cyan-100 dark:border-cyan-900/30 backdrop-blur-sm">
                {[1, 2, 3, 4, 5].map(score => (
                    <div key={score} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${score < 3 ? 'bg-red-500' : score === 3 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {score === 1 && "No Evidence"}
                            {score === 2 && "Partial"}
                            {score === 3 && "Passing"}
                            {score === 4 && "Strong"}
                            {score === 5 && "Fluent"}
                        </span>
                    </div>
                ))}
            </div>

            <div className="bg-white/90 dark:bg-slate-950/90 rounded-2xl border border-cyan-100 dark:border-cyan-900/30 overflow-hidden backdrop-blur-sm">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {metrics.map((metric) => (
                        <div key={metric.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {metric.label}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                            metric.category === 'Core' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' :
                                            metric.category === 'Advanced' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' :
                                            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                        }`}>
                                            {metric.category}
                                        </span>
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{metric.description}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-lg border font-mono font-bold text-sm ${getColor(metric.score, metric.required)}`}>
                                    {metric.score} / 5
                                </div>
                            </div>
                            <div className="relative h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-3 overflow-hidden">
                                <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(metric.score, metric.required)}`} style={{ width: `${(metric.score / 5) * 100}%` }}></div>
                                <div className="absolute top-0 bottom-0 w-0.5 bg-black/20 dark:bg-white/30 z-10" style={{ left: `${(metric.required / 5) * 100}%` }} title={`Required: ${metric.required}`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};