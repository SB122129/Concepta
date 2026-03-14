export enum AppTab {
  EXPLANATION = 'explanation',
  VISUALS = 'visuals',
  SIMULATION = 'simulation',
  VERIFY = 'verify'
}

export type MainView = 'learning' | 'test' | 'teach' | 'metrics' | 'projects' | 'history' | 'settings' | 'paste-link';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachments?: { name: string; type: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface GroundingMetadata {
  webSources: GroundingSource[];
}

export interface SourceItem {
  id: string;
  type: 'youtube' | 'pdf' | 'website' | 'image';
  title: string;
  url?: string;
  metadata: string; // e.g. "youtube.com • 15 mins"
  isSelected: boolean;
  file?: File; // Store actual file if it's a local upload
  content?: string; // Extracted text content for AI context
}

export interface MistakeItem {
  id: string;
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  category: string; // e.g. "Conceptual", "Calculation"
  note: string;
  topic: string;
  confidenceAtAttempt?: number; // 1-5 scale
  timestamp: number;
}

export interface QuizResult {
  id: string;
  topic: string;
  difficulty: string; // 'Easy' | 'Medium' | 'Hard'
  score: number;
  totalQuestions: number;
  assessmentPhase?: 'pretest' | 'posttest' | 'practice';
  avgConfidence?: number; // 1-5 scale
  confidenceCalibration?: number; // 0-1, higher is better calibration
  timestamp: number;
}

// --- QUIZ TYPES ---

export type QuestionType = 'choose' | 'fill-blank' | 'match' | 'answer';

export interface QuestionBase {
  id: string;
  question: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  options: string[];
  correctAnswer: string;
}

export interface FillBlankQuestion extends QuestionBase {
  sentence: string; // Contains "___" for the blank
  correctAnswer: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface MatchQuestion extends QuestionBase {
  pairs: MatchPair[]; // usually 4-5 pairs per question set, or this represents one set
}

export interface ShortAnswerQuestion extends QuestionBase {
  sampleAnswer: string; // Key points or ideal answer
}

export interface QuizData {
  topic: string;
  choose: MultipleChoiceQuestion[];
  fillBlank: FillBlankQuestion[];
  match: MatchQuestion[]; // For matching, we might just have one big set or multiple small sets. We'll do 5 sets.
  answer: ShortAnswerQuestion[];
}