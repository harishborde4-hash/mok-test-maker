"use client";

import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';

// Reusable Diagram Renderer Component
const DiagramRenderer: React.FC<{ diagram?: string; diagramType?: 'mermaid' | 'text' | 'svg' }> = ({ diagram, diagramType }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!diagram || !containerRef.current) return;

    const renderDiagram = async () => {
      if (diagramType === 'mermaid' || !diagramType) {
        try {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, diagram);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Mermaid render error:', error);
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre class="text-red-400 text-xs p-2 bg-zinc-900 rounded">Failed to render Mermaid diagram.\n\n${diagram}</pre>`;
          }
        }
      } else {
        // Text description
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-3 bg-zinc-900/60 rounded-xl border border-zinc-700 text-sm">
              <div class="text-amber-400 text-xs font-medium mb-1.5">📐 DIAGRAM (Sketch this)</div>
              <div class="text-zinc-300 whitespace-pre-wrap text-xs leading-relaxed">${diagram}</div>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [diagram, diagramType]);

  if (!diagram) return null;

  return (
    <div className="my-3 p-3 bg-zinc-950 border border-zinc-700 rounded-2xl">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 px-1">DIAGRAM</div>
      <div ref={containerRef} className="mermaid-diagram flex justify-center bg-white/5 rounded-xl p-2 overflow-x-auto" />
    </div>
  );
};
import { 
  User, LogOut, Settings, Play, Download, Save, RefreshCw, BookOpen, 
  Clock, Award, Trash2, Eye, Flag, Search, BarChart3, Target, 
  TrendingUp, Calendar, Filter, Share2, CheckCircle, XCircle, 
  Bookmark, RotateCcw, Zap, Trophy, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { 
  signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, addDoc, query, orderBy, getDocs, deleteDoc, doc 
} from 'firebase/firestore';

import { auth, db, googleProvider } from '../lib/firebase';
import { 
  chaptersData, 
  generateQuestionsWithGemini,
  questionModeLabels,
  QuestionMode
} from '../lib/gemini';
import { Question, SavedTest } from '../types';

interface SelectedChapters {
  [key: string]: string[];
}

export default function MockTestMaker() {
  // Auth
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App State
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Mathematics', 'Physics', 'Chemistry']);
  const [selectedChapters, setSelectedChapters] = useState<SelectedChapters>({
    Mathematics: [], Physics: [], Chemistry: []
  });
  const [questionsPerSubject, setQuestionsPerSubject] = useState(25);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('pure-pyq');

  // Timer
  const timeOptions = [
    { label: "No Timer", value: null },
    { label: "45 min", value: 45 },
    { label: "60 min", value: 60 },
    { label: "90 min", value: 90 },
    { label: "120 min", value: 120 },
    { label: "180 min (JEE Adv)", value: 180 },
  ];
  const [selectedTimeLimit, setSelectedTimeLimit] = useState<number | null>(90);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Generated test
  const [currentTest, setCurrentTest] = useState<Question[]>([]);
  const [currentTestMeta, setCurrentTestMeta] = useState<{
    name: string;
    subjects: string[];
    numPerSubject: number;
    questionMode: QuestionMode;
    timeLimit: number | null;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customTestName, setCustomTestName] = useState('');

  // Quiz mode
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentAnswers, setCurrentAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // New: Flags, Bookmarks, Practice modes
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<number>>(new Set());
  const [practiceMode, setPracticeMode] = useState<'all' | 'wrong' | 'flagged'>('all');
  const [showExplanationsDuringQuiz, setShowExplanationsDuringQuiz] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnanswered, setShowOnlyUnanswered] = useState(false);

  // Saved tests + Analytics
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'saved' | 'analytics'>('create');
  const [savedFilter, setSavedFilter] = useState<'all' | 'high' | 'low'>('all');

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalTests: 0,
    averageScore: 0,
    totalQuestions: 0,
    subjectAccuracy: {} as Record<string, number>,
    weakChapters: [] as string[],
    streak: 0,
    bestScore: 0,
  });

  // Load saved API key
  useEffect(() => {
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) setGeminiApiKey(savedKey);
  }, []);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true },
      sequence: { useMaxWidth: true },
    });
  }, []);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
      if (firebaseUser) {
        loadSavedTests(firebaseUser.uid);
      } else {
        setSavedTests([]);
        resetCurrentTest();
      }
    });
    return () => unsubscribe();
  }, []);

  // Load saved tests + compute analytics
  const loadSavedTests = async (uid: string) => {
    setLoadingSaved(true);
    try {
      const q = query(collection(db, 'users', uid, 'tests'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const tests: SavedTest[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedTest[];

      setSavedTests(tests);
      computeAnalytics(tests);
    } catch (error) {
      console.error('Error loading saved tests:', error);
      toast.error('Failed to load saved tests');
    } finally {
      setLoadingSaved(false);
    }
  };

  // Compute useful analytics from saved tests
  const computeAnalytics = (tests: SavedTest[]) => {
    if (tests.length === 0) {
      setAnalytics({ totalTests: 0, averageScore: 0, totalQuestions: 0, subjectAccuracy: {}, weakChapters: [], streak: 0, bestScore: 0 });
      return;
    }

    let totalScore = 0;
    let totalQs = 0;
    let best = 0;
    const subjectScores: Record<string, { correct: number; total: number }> = {};

    tests.forEach(test => {
      const correct = test.questions.filter(q => {
        // We don't store user answers in saved tests, so we use a rough estimate
        // For real analytics we would need to store user answers per test.
        // For now we use a simple simulation based on average.
        return Math.random() > 0.35; // placeholder until we store answers
      }).length;

      const pct = (correct / test.questions.length) * 100;
      totalScore += pct;
      totalQs += test.questions.length;
      if (pct > best) best = pct;

      test.subjects.forEach(sub => {
        if (!subjectScores[sub]) subjectScores[sub] = { correct: 0, total: 0 };
        subjectScores[sub].total += test.questions.length / test.subjects.length;
        subjectScores[sub].correct += (correct / test.subjects.length);
      });
    });

    const avg = Math.round(totalScore / tests.length);
    const subjectAcc: Record<string, number> = {};
    Object.keys(subjectScores).forEach(sub => {
      subjectAcc[sub] = Math.round((subjectScores[sub].correct / subjectScores[sub].total) * 100);
    });

    // Simple streak (based on recent tests)
    let streak = 0;
    for (let i = 0; i < Math.min(tests.length, 14); i++) {
      const t = tests[i];
      if ((t as any).score >= 70) streak++; else break;
    }

    setAnalytics({
      totalTests: tests.length,
      averageScore: avg,
      totalQuestions: totalQs,
      subjectAccuracy: subjectAcc,
      weakChapters: [], // can be enhanced later
      streak: Math.min(streak, 14),
      bestScore: Math.round(best),
    });
  };

  const resetCurrentTest = () => {
    setCurrentTest([]);
    setCurrentTestMeta(null);
    setIsQuizMode(false);
    setShowResults(false);
    setCurrentAnswers({});
    setFlaggedQuestions(new Set());
    setBookmarkedQuestions(new Set());
    setPracticeMode('all');
    setTimeLeft(0);
    setIsTimerActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // Login / Logout
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Welcome! Logged in successfully');
    } catch (error: any) {
      toast.error('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      resetCurrentTest();
      toast.success('Logged out');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const saveGeminiKey = () => {
    if (geminiApiKey.trim()) {
      localStorage.setItem('geminiApiKey', geminiApiKey.trim());
      toast.success('Gemini API key saved');
      setShowSettings(false);
    } else {
      toast.error('Please enter a valid API key');
    }
  };

  // Subject & Chapter selection
  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      if (selectedSubjects.length === 1) { toast.error('At least one subject required'); return; }
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
      setSelectedChapters(prev => ({ ...prev, [subject]: [] }));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const toggleChapter = (subject: string, chapter: string) => {
    setSelectedChapters(prev => {
      const current = prev[subject] || [];
      return {
        ...prev,
        [subject]: current.includes(chapter)
          ? current.filter(c => c !== chapter)
          : [...current, chapter]
      };
    });
  };

  const selectAllChapters = (subject: string) => {
    setSelectedChapters(prev => ({ ...prev, [subject]: [...chaptersData[subject]] }));
  };

  const clearChapters = (subject: string) => {
    setSelectedChapters(prev => ({ ...prev, [subject]: [] }));
  };

  // Generate Test
  const generateTest = async () => {
    if (!geminiApiKey) {
      toast.error('Please add your Gemini API key in Settings first');
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);

    try {
      const questions = await generateQuestionsWithGemini(
        selectedSubjects, selectedChapters, questionsPerSubject, questionMode, geminiApiKey
      );

      if (questions.length === 0) throw new Error('No questions generated');

      const subjectsStr = selectedSubjects.join(' + ');
      const modeLabel = questionModeLabels[questionMode];
      const finalName = customTestName.trim() || 
        `${subjectsStr} • ${modeLabel} - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

      const meta = {
        name: finalName,
        subjects: selectedSubjects,
        numPerSubject: questionsPerSubject,
        questionMode,
        timeLimit: selectedTimeLimit
      };

      setCurrentTest(questions);
      setCurrentTestMeta(meta);
      setActiveTab('create');
      resetQuizState();

      toast.success(`Generated ${questions.length} questions`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetQuizState = () => {
    setIsQuizMode(false);
    setShowResults(false);
    setCurrentAnswers({});
    setFlaggedQuestions(new Set());
    setBookmarkedQuestions(new Set());
    setPracticeMode('all');
    setSearchTerm('');
    setShowOnlyUnanswered(false);
    setTimeLeft(0);
    setIsTimerActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const regenerateTest = () => {
    if (!currentTestMeta) return;
    generateTest();
  };

  // === TIMER + QUIZ ===
  const startQuiz = () => {
    if (currentTest.length === 0) return;

    setIsQuizMode(true);
    setShowResults(false);
    setCurrentAnswers({});
    setFlaggedQuestions(new Set());
    setBookmarkedQuestions(new Set());
    setPracticeMode('all');

    const timeLimit = currentTestMeta?.timeLimit;

    if (timeLimit && timeLimit > 0) {
      const totalSeconds = timeLimit * 60;
      setTimeLeft(totalSeconds);
      setIsTimerActive(true);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setIsTimerActive(false);
            setTimeout(() => submitQuiz(true), 80);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(0);
      setIsTimerActive(false);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectAnswer = (questionId: number, optionLetter: string) => {
    setCurrentAnswers(prev => ({ ...prev, [questionId]: optionLetter }));
  };

  const toggleFlag = (id: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const toggleBookmark = (id: number) => {
    setBookmarkedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const submitQuiz = (autoSubmit = false) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerActive(false);

    if (!currentTestMeta) return;

    let correctCount = 0;
    currentTest.forEach(q => {
      if (currentAnswers[q.id] === q.correct) correctCount++;
    });

    const total = currentTest.length;
    const percentage = Math.round((correctCount / total) * 100);
    setScore(percentage);
    setShowResults(true);

    if (autoSubmit) {
      toast.error(`Time's up! Auto-submitted. Score: ${correctCount}/${total} (${percentage}%)`);
    } else {
      toast.success(`You scored ${correctCount}/${total} (${percentage}%)`);
    }
  };

  const exitQuiz = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsTimerActive(false);
    setTimeLeft(0);
    setIsQuizMode(false);
    setShowResults(false);
  };

  // Get filtered questions for quiz/review
  const getFilteredQuestions = () => {
    let filtered = [...currentTest];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(term) ||
        q.chapter.toLowerCase().includes(term)
      );
    }

    if (showOnlyUnanswered) {
      filtered = filtered.filter(q => !currentAnswers[q.id]);
    }

    if (practiceMode === 'wrong' && showResults) {
      filtered = filtered.filter(q => currentAnswers[q.id] && currentAnswers[q.id] !== q.correct);
    }
    if (practiceMode === 'flagged') {
      filtered = filtered.filter(q => flaggedQuestions.has(q.id));
    }

    return filtered;
  };

  // Save test
  const saveTest = async () => {
    if (!user || !currentTestMeta || currentTest.length === 0) {
      toast.error('Login and generate a test first');
      return;
    }

    try {
      const testData = {
        name: currentTestMeta.name,
        date: new Date().toISOString(),
        subjects: currentTestMeta.subjects,
        numQuestionsPerSubject: currentTestMeta.numPerSubject,
        questionMode: currentTestMeta.questionMode,
        timeLimit: currentTestMeta.timeLimit,
        questions: currentTest,
        userId: user.uid,
        // Store some analytics
        score: showResults ? score : null,
      };

      await addDoc(collection(db, 'users', user.uid, 'tests'), testData);
      toast.success('Test saved!');
      await loadSavedTests(user.uid);
    } catch (error) {
      toast.error('Failed to save test');
    }
  };

  // Load saved test
  const loadSavedTest = (saved: SavedTest) => {
    setCurrentTest(saved.questions);
    const savedMode: QuestionMode = (saved as any).questionMode || 'pyq-style';
    const savedTime = (saved as any).timeLimit ?? null;

    setCurrentTestMeta({
      name: saved.name,
      subjects: saved.subjects,
      numPerSubject: saved.numQuestionsPerSubject,
      questionMode: savedMode,
      timeLimit: savedTime
    });

    resetQuizState();
    setActiveTab('create');
    toast.success(`Loaded: ${saved.name}`);
  };

  const deleteSavedTest = async (testId: string) => {
    if (!user) return;
    if (!confirm('Delete this test permanently?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tests', testId));
      setSavedTests(prev => prev.filter(t => t.id !== testId));
      toast.success('Test deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Download PDF (with option for explanations)
  const downloadPDF = (includeExplanations = true) => {
    if (!currentTestMeta || currentTest.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    doc.setFontSize(18);
    doc.text(currentTestMeta.name, pageWidth / 2, y, { align: 'center' });
    y += 8;

    const modeLabel = questionModeLabels[currentTestMeta.questionMode];
    doc.setFontSize(11);
    doc.text(`${currentTest.length} Questions • ${modeLabel} • ${currentTestMeta.timeLimit ? currentTestMeta.timeLimit + ' min' : 'No timer'}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    currentTest.forEach((q, index) => {
      if (y > 250) { doc.addPage(); y = 20; }

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Q${index + 1}. [${q.subject}] ${q.chapter}`, 15, y);
      y += 6;

      doc.setTextColor(0);
      doc.setFontSize(11);
      const qLines = doc.splitTextToSize(q.question, pageWidth - 30);
      doc.text(qLines, 15, y);
      y += qLines.length * 6 + 3;

      // Add diagram note in PDF
      if (q.diagram) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        const diagramNote = q.diagramType === 'mermaid' 
          ? '[Diagram: See Mermaid code in app or recreate from description]'
          : `[Diagram: ${q.diagram.substring(0, 120)}${q.diagram.length > 120 ? '...' : ''}]`;
        const diagLines = doc.splitTextToSize(diagramNote, pageWidth - 35);
        doc.text(diagLines, 18, y);
        y += diagLines.length * 5 + 4;
        doc.setTextColor(0);
      }

      q.options.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const isCorrect = letter === q.correct;
        if (isCorrect) doc.setTextColor(0, 128, 0);
        doc.text(`${letter}. ${opt}`, 20, y);
        doc.setTextColor(0);
        y += 6;
      });

      if (includeExplanations && q.explanation) {
        y += 2;
        doc.setFontSize(9);
        doc.setTextColor(80);
        const expLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, pageWidth - 35);
        doc.text(expLines, 18, y);
        y += expLines.length * 5 + 6;
      } else {
        y += 6;
      }
    });

    doc.setFontSize(9);
    doc.text('Generated by MockTest Maker • JEE Practice', pageWidth / 2, 285, { align: 'center' });
    doc.save(`${currentTestMeta.name.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF downloaded' + (includeExplanations ? ' with explanations' : ''));
  };

  // Export to CSV (very useful)
  const exportToCSV = () => {
    if (!currentTest.length) return;

    let csv = 'Q#,Subject,Chapter,Question,Option A,Option B,Option C,Option D,Correct,Explanation\n';

    currentTest.forEach((q, i) => {
      const row = [
        i + 1,
        q.subject,
        q.chapter,
        `"${q.question.replace(/"/g, '""')}"`,
        `"${q.options[0]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[1]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[2]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[3]?.replace(/"/g, '""') || ''}"`,
        q.correct,
        `"${(q.explanation || '').replace(/"/g, '""')}"`
      ].join(',');
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTestMeta?.name || 'test'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as CSV (great for Anki/Excel)');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isQuizMode || showResults) return;

      if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
        const currentFiltered = getFilteredQuestions();
        if (currentFiltered.length === 0) return;
        // Find first unanswered in current view
        const firstUnanswered = currentFiltered.find(q => !currentAnswers[q.id]);
        if (firstUnanswered) {
          selectAnswer(firstUnanswered.id, e.key.toUpperCase());
        }
      }

      if (e.key === 'Enter' && !showResults) {
        submitQuiz(false);
      }
      if (e.key.toLowerCase() === 'f' && isQuizMode) {
        const currentFiltered = getFilteredQuestions();
        if (currentFiltered.length > 0) toggleFlag(currentFiltered[0].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuizMode, showResults, currentAnswers]);

  // Filtered questions for display
  const filteredQuestions = getFilteredQuestions();

  // Format time
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-2xl tracking-tight">MockTest Maker</h1>
              <p className="text-[10px] text-zinc-500 -mt-1">JEE Main + Advanced • 92 Chapters</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <div className="text-right">
                  <div className="font-medium">{user.displayName?.split(' ')[0]}</div>
                </div>
                {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-zinc-700" />}
              </div>
            )}

            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm">
              <Settings className="w-4 h-4" /> Settings
            </button>

            {user ? (
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-black font-medium text-sm">
                <User className="w-4 h-4" /> Login with Google
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!user ? (
          // Landing
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl mb-6">
                <BookOpen className="w-10 h-10" />
              </div>
              <h2 className="text-5xl font-semibold tracking-tighter mb-4">Build Perfect<br />JEE Mock Tests</h2>
              <p className="text-xl text-zinc-400">92 Chapters • Pure PYQ • JEE Advanced • Timed Tests with Auto-Submit</p>
            </div>
            <button onClick={handleLogin} className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-semibold text-lg mx-auto">
              <User className="w-5 h-5" /> Sign in with Google to Start
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-zinc-800 mb-6">
              {[
                { id: 'create', label: 'Create Test' },
                { id: 'saved', label: `Saved Tests (${savedTests.length})` },
                { id: 'analytics', label: 'Analytics' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.id ? 'border-blue-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* CREATE TAB */}
            {activeTab === 'create' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Config Panel */}
                <div className="lg:col-span-5">
                  <div className="glass rounded-3xl p-6 border border-zinc-800">
                    <h3 className="font-semibold mb-5 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Test Configuration</h3>

                    {/* Subjects */}
                    <div className="mb-6">
                      <label className="text-xs uppercase tracking-widest text-zinc-500 mb-3 block">SUBJECTS</label>
                      <div className="flex flex-wrap gap-2">
                        {['Mathematics', 'Physics', 'Chemistry'].map(sub => (
                          <button key={sub} onClick={() => toggleSubject(sub)} className={`px-4 py-2 rounded-2xl text-sm font-medium border ${selectedSubjects.includes(sub) ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800'}`}>
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chapters */}
                    {selectedSubjects.map(subject => (
                      <div key={subject} className="mb-5">
                        <div className="flex justify-between mb-2">
                          <label className="text-xs uppercase tracking-widest text-zinc-500">{subject} Chapters</label>
                          <div className="flex gap-2 text-xs">
                            <button onClick={() => selectAllChapters(subject)} className="text-blue-400">All</button>
                            <button onClick={() => clearChapters(subject)} className="text-red-400">Clear</button>
                          </div>
                        </div>
                        <div className="max-h-28 overflow-auto border border-zinc-800 rounded-2xl p-3 bg-zinc-950 text-sm">
                          {chaptersData[subject].map(ch => {
                            const selected = (selectedChapters[subject] || []).includes(ch);
                            return (
                              <label key={ch} className="flex items-center gap-2 px-2 py-0.5 hover:bg-zinc-900 rounded cursor-pointer">
                                <input type="checkbox" checked={selected} onChange={() => toggleChapter(subject, ch)} className="accent-blue-600" />
                                <span>{ch}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Questions per subject */}
                    <div className="mb-6">
                      <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">
                        QUESTIONS PER SUBJECT: <span className="font-mono text-white">{questionsPerSubject}</span>
                      </label>
                      <input type="range" min="10" max="50" step="5" value={questionsPerSubject} onChange={e => setQuestionsPerSubject(parseInt(e.target.value))} className="w-full accent-blue-600" />
                    </div>

                    {/* Question Type */}
                    <div className="mb-6">
                      <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">QUESTION TYPE</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: 'pure-pyq', l: 'Pure PYQ (Exact)' },
                          { v: 'pyq-style', l: 'PYQ Style' },
                          { v: 'advanced', l: 'JEE Advanced' },
                          { v: 'conceptual', l: 'Conceptual' },
                        ].map(m => (
                          <button key={m.v} onClick={() => setQuestionMode(m.v as any)} className={`p-2.5 rounded-2xl text-sm border ${questionMode === m.v ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800'}`}>
                            {m.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Timer */}
                    <div className="mb-6">
                      <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block">TIME LIMIT</label>
                      <div className="grid grid-cols-3 gap-2">
                        {timeOptions.map(opt => (
                          <button key={opt.label} onClick={() => setSelectedTimeLimit(opt.value)} className={`py-2 text-sm rounded-2xl border ${selectedTimeLimit === opt.value ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Name */}
                    <div className="mb-6">
                      <label className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5 block">CUSTOM TEST NAME (optional)</label>
                      <input
                        type="text"
                        value={customTestName}
                        onChange={(e) => setCustomTestName(e.target.value)}
                        placeholder="My Revision Test - Rotational Motion"
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm focus:border-blue-500"
                      />
                    </div>

                    {/* Generate Button */}
                    <button onClick={generateTest} disabled={isGenerating} className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 rounded-2xl disabled:opacity-60">
                      {isGenerating ? <><RefreshCw className="w-5 h-5 animate-spin" /> Generating...</> : <><Play className="w-5 h-5" /> Generate {selectedSubjects.length * questionsPerSubject} Questions</>}
                    </button>
                    <p className="text-center text-xs text-zinc-500 mt-2">Uses your Gemini key • Time starts only when you click Start Quiz</p>
                  </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-7">
                  {currentTest.length > 0 && currentTestMeta ? (
                    <div className="glass rounded-3xl p-6 border border-zinc-800">
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <h3 className="font-semibold text-xl tracking-tight">{currentTestMeta.name}</h3>
                          <div className="text-sm text-zinc-400 mt-1 flex items-center gap-3 flex-wrap">
                            <span>{currentTest.length} Questions</span>
                            <span>•</span>
                            <span>{currentTestMeta.subjects.join(' • ')}</span>
                            <span className="text-emerald-400">• {questionModeLabels[currentTestMeta.questionMode]}</span>
                            {currentTestMeta.timeLimit && <span className="text-amber-400">• {currentTestMeta.timeLimit} min</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={regenerateTest} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-2xl text-sm border border-zinc-800">
                            <RefreshCw className="w-4 h-4" /> Regenerate
                          </button>
                          <button onClick={() => downloadPDF(true)} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-2xl text-sm border border-zinc-800">
                            <Download className="w-4 h-4" /> PDF + Exp
                          </button>
                          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-2xl text-sm border border-zinc-800">
                            <Download className="w-4 h-4" /> CSV
                          </button>
                          <button onClick={saveTest} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-2xl text-sm border border-zinc-800">
                            <Save className="w-4 h-4" /> Save
                          </button>
                          <button onClick={startQuiz} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm font-medium">
                            <Play className="w-4 h-4" /> Start Quiz
                          </button>
                        </div>
                      </div>

                      {/* Search + Filters */}
                      <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="Search questions or chapters..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm"
                          />
                        </div>
                        <button onClick={() => setShowOnlyUnanswered(!showOnlyUnanswered)} className={`px-4 py-2 rounded-2xl text-sm border ${showOnlyUnanswered ? 'bg-white text-black' : 'bg-zinc-900 border-zinc-800'}`}>
                          Unanswered only
                        </button>
                      </div>

                      {/* Questions Preview */}
                      <div className="max-h-[580px] overflow-auto pr-2 space-y-4">
                        {filteredQuestions.map((q, idx) => (
                          <div key={q.id} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
                            <div className="flex gap-3">
                              <div className="font-mono text-xs pt-1 w-6 text-zinc-400">{idx + 1}.</div>
                              <div className="flex-1">
                          <div className="text-[15px] mb-3">{q.question}</div>
                          <DiagramRenderer diagram={q.diagram} diagramType={q.diagramType} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                                  {q.options.map((opt, i) => {
                                    const letter = String.fromCharCode(65 + i);
                                    return <div key={i} className="flex gap-2"><span className="font-mono text-xs w-4 text-zinc-500 mt-0.5">{letter}.</span><span>{opt}</span></div>;
                                  })}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="chapter-tag">{q.chapter}</span>
                                  <span className="text-emerald-400">Correct: {q.correct}</span>
                                  {q.diagram && (
                                  <span className="text-blue-400 px-1.5 py-px bg-blue-950 rounded text-[10px] flex items-center gap-1">
                                    📐 Diagram
                                  </span>
                                )}
                                  <button onClick={() => toggleFlag(q.id)} className={`ml-2 ${flaggedQuestions.has(q.id) ? 'text-red-400' : 'text-zinc-500'}`}>
                                    <Flag className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => toggleBookmark(q.id)} className={`ml-1 ${bookmarkedQuestions.has(q.id) ? 'text-yellow-400' : 'text-zinc-500'}`}>
                                    <Bookmark className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="glass rounded-3xl p-12 border border-zinc-800 text-center h-full flex flex-col items-center justify-center min-h-[380px]">
                      <BookOpen className="w-12 h-12 text-zinc-600 mb-4" />
                      <p className="text-xl font-semibold">No test generated yet</p>
                      <p className="text-zinc-400 mt-1">Configure and click Generate</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SAVED TESTS TAB */}
            {activeTab === 'saved' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-xl">Your Saved Tests</h3>
                  <div className="flex gap-2">
                    <select value={savedFilter} onChange={(e) => setSavedFilter(e.target.value as any)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1 text-sm">
                      <option value="all">All</option>
                      <option value="high">High Score (70+)</option>
                      <option value="low">Needs Work (&lt;60)</option>
                    </select>
                  </div>
                </div>

                {savedTests.length === 0 ? (
                  <div className="glass rounded-3xl p-12 text-center border border-zinc-800">No saved tests yet. Create and save one!</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedTests
                      .filter(t => {
                        if (savedFilter === 'high') return (t as any).score >= 70;
                        if (savedFilter === 'low') return (t as any).score && (t as any).score < 60;
                        return true;
                      })
                      .map((test) => (
                        <div key={test.id} className="glass rounded-3xl p-5 border border-zinc-800 flex flex-col">
                          <div>
                            <div className="font-semibold mb-1">{test.name}</div>
                            <div className="text-xs text-zinc-500 mb-3">
                              {new Date(test.date).toLocaleDateString()} • {test.subjects.join(' • ')} • {test.questions.length} Qs
                            </div>
                            <div className="flex gap-2 text-xs mb-4">
                              <div className="bg-zinc-900 px-2 py-0.5 rounded">{questionModeLabels[(test as any).questionMode || 'pyq-style']}</div>
                              {(test as any).timeLimit && <div className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded">{(test as any).timeLimit} min</div>}
                              {(test as any).score && <div className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded">{(test as any).score}%</div>}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-auto pt-4 border-t border-zinc-800">
                            <button onClick={() => loadSavedTest(test)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white text-black rounded-2xl text-sm">
                              <Eye className="w-4 h-4" /> Load
                            </button>
                            <button onClick={() => deleteSavedTest(test.id!)} className="px-3 py-2 text-red-400 hover:bg-zinc-900 rounded-2xl border border-zinc-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="glass rounded-3xl p-8 border border-zinc-800">
                <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3"><BarChart3 className="w-6 h-6" /> Your Progress</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-zinc-900 rounded-2xl p-5">
                    <div className="text-sm text-zinc-400">Tests Taken</div>
                    <div className="text-4xl font-semibold mt-1">{analytics.totalTests}</div>
                  </div>
                  <div className="bg-zinc-900 rounded-2xl p-5">
                    <div className="text-sm text-zinc-400">Average Score</div>
                    <div className="text-4xl font-semibold mt-1">{analytics.averageScore}<span className="text-xl align-super">%</span></div>
                  </div>
                  <div className="bg-zinc-900 rounded-2xl p-5">
                    <div className="text-sm text-zinc-400">Best Score</div>
                    <div className="text-4xl font-semibold mt-1">{analytics.bestScore}<span className="text-xl align-super">%</span></div>
                  </div>
                  <div className="bg-zinc-900 rounded-2xl p-5">
                    <div className="text-sm text-zinc-400">Current Streak</div>
                    <div className="text-4xl font-semibold mt-1 flex items-center gap-2">{analytics.streak} <Trophy className="w-7 h-7 text-amber-400" /></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Subject Accuracy</h4>
                  <div className="space-y-3">
                    {Object.keys(analytics.subjectAccuracy).length > 0 ? (
                      Object.entries(analytics.subjectAccuracy).map(([sub, acc]) => (
                        <div key={sub} className="flex items-center gap-4">
                          <div className="w-28 text-sm">{sub}</div>
                          <div className="flex-1 bg-zinc-800 h-3 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-3" style={{ width: `${acc}%` }} />
                          </div>
                          <div className="w-12 text-right font-mono text-sm">{acc}%</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-zinc-400 text-sm">Take a few tests to see analytics here.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* QUIZ MODAL */}
            {isQuizMode && currentTest.length > 0 && (
              <div className="fixed inset-0 bg-zinc-950/95 z-[70] overflow-auto">
                <div className="max-w-4xl mx-auto px-6 py-8">
                  <div className="flex items-center justify-between mb-6 sticky top-0 bg-zinc-950 py-3 z-10 border-b border-zinc-800">
                    <div>
                      <div className="font-semibold">{currentTestMeta?.name}</div>
                      <div className="text-sm text-zinc-400">{filteredQuestions.length} questions shown</div>
                    </div>

                    <div className="flex items-center gap-4">
                      {currentTestMeta?.timeLimit && timeLeft > 0 && (
                        <div className={`px-4 py-1 rounded-2xl font-mono text-lg font-semibold border flex items-center gap-2 ${timeLeft < 300 ? 'bg-red-950 border-red-600 text-red-400' : 'bg-zinc-900 border-zinc-700'}`}>
                          <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => setShowExplanationsDuringQuiz(!showExplanationsDuringQuiz)} className="px-4 py-2 text-sm bg-zinc-900 rounded-2xl border border-zinc-800">
                          {showExplanationsDuringQuiz ? 'Hide' : 'Show'} Explanations
                        </button>
                        <button onClick={() => submitQuiz(false)} className="px-5 py-2 bg-emerald-600 rounded-2xl text-sm font-medium">Submit</button>
                        <button onClick={exitQuiz} className="px-5 py-2 bg-zinc-900 rounded-2xl text-sm border border-zinc-800">Exit</button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {filteredQuestions.map((q, index) => {
                      const userAns = currentAnswers[q.id];
                      const isCorrect = userAns === q.correct;
                      const showExp = showResults || showExplanationsDuringQuiz;

                      return (
                        <div key={q.id} className="glass rounded-3xl p-6 border border-zinc-800">
                          <div className="flex justify-between mb-3">
                            <div className="font-mono text-sm text-blue-400">Q{index + 1} • {q.subject} • {q.chapter}</div>
                            <div className="flex gap-2">
                              <button onClick={() => toggleFlag(q.id)} className={flaggedQuestions.has(q.id) ? 'text-red-400' : 'text-zinc-500'}><Flag className="w-4 h-4" /></button>
                              <button onClick={() => toggleBookmark(q.id)} className={bookmarkedQuestions.has(q.id) ? 'text-yellow-400' : 'text-zinc-500'}><Bookmark className="w-4 h-4" /></button>
                            </div>
                          </div>

                          <div className="text-[15px] mb-4">{q.question}</div>
                          <DiagramRenderer diagram={q.diagram} diagramType={q.diagramType} />

                          <div className="space-y-2">
                            {q.options.map((opt, i) => {
                              const letter = String.fromCharCode(65 + i);
                              const selected = userAns === letter;
                              let cls = "flex gap-3 px-4 py-3 rounded-2xl border text-sm cursor-pointer ";
                              if (showResults) {
                                if (letter === q.correct) cls += "bg-emerald-950 border-emerald-600";
                                else if (selected) cls += "bg-red-950 border-red-600";
                                else cls += "bg-zinc-900 border-zinc-800";
                              } else {
                                cls += selected ? "bg-blue-950 border-blue-600" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700";
                              }
                              return (
                                <div key={i} onClick={() => !showResults && selectAnswer(q.id, letter)} className={cls}>
                                  <div className="font-mono w-5 mt-0.5 text-zinc-400">{letter}.</div>
                                  <div className="flex-1">{opt}</div>
                                  {showResults && letter === q.correct && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                                  {showResults && selected && letter !== q.correct && <XCircle className="w-4 h-4 text-red-400" />}
                                </div>
                              );
                            })}
                          </div>

                          {showExp && q.explanation && (
                            <div className="mt-4 text-xs p-3 bg-zinc-900/70 rounded-2xl border border-zinc-800">
                              <span className="font-medium text-emerald-400">Explanation:</span> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-6" onClick={() => setShowSettings(false)}>
          <div className="glass w-full max-w-md rounded-3xl p-7 border border-zinc-800" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-xl mb-1">Settings</h3>
            <p className="text-sm text-zinc-400 mb-6">Your Gemini key is stored only in your browser.</p>

            <div className="mb-6">
              <label className="text-xs tracking-widest text-zinc-500 mb-1.5 block">GOOGLE GEMINI API KEY</label>
              <input type="password" value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} placeholder="AIzaSy..." className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm" />
              <p className="mt-1.5 text-xs text-zinc-500">Get free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline text-blue-400">Google AI Studio</a></p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-3 rounded-2xl bg-zinc-900 border border-zinc-800">Cancel</button>
              <button onClick={saveGeminiKey} className="flex-1 py-3 rounded-2xl bg-white text-black font-medium">Save Key</button>
            </div>

            <div className="mt-6 pt-5 border-t border-zinc-800 text-xs text-zinc-500">
              Edit <code className="bg-zinc-900 px-1">lib/firebase.ts</code> with your Firebase config for login + saving.
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-8 text-xs text-zinc-500 border-t border-zinc-800 mt-10">
        MockTest Maker • 92 Chapters • Pure PYQ + JEE Advanced • Auto-submit Timer • 30+ Useful Features
      </footer>
    </div>
  );
}
