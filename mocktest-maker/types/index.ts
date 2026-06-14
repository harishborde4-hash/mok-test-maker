export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  chapter: string;
  subject: string;
}

export interface SavedTest {
  id: string;
  name: string;
  date: string;
  subjects: string[];
  numQuestionsPerSubject: number;
  includePYQ: boolean;
  questions: Question[];
  userId: string;
}
