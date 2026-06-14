export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  chapter: string;
  subject: string;
  diagram?: string;           // Mermaid.js code or detailed text description for diagrams
  diagramType?: 'mermaid' | 'text' | 'svg';
}

export interface SavedTest {
  id: string;
  name: string;
  date: string;
  subjects: string[];
  numQuestionsPerSubject: number;
  questionMode: 'conceptual' | 'pyq-style' | 'pure-pyq' | 'advanced';
  timeLimit: number | null;           // minutes or null
  questions: Question[];
  userId: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  geminiApiKey?: string;
}
