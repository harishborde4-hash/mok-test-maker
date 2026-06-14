import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: string; // "A", "B", "C", or "D"
  explanation: string;
  chapter: string;
  subject: string;
  diagram?: string;           // Mermaid.js code or detailed text description
  diagramType?: 'mermaid' | 'text' | 'svg';
}

export interface GeneratedTest {
  id?: string;
  name: string;
  date: string;
  subjects: string[];
  numQuestionsPerSubject: number;
  includePYQ: boolean;
  questions: Question[];
}

// =====================================================
// COMPLETE JEE MAIN + ADVANCED SYLLABUS — EXACT AS PROVIDED
// Mathematics: 30 Chapters | Physics: 30 Chapters | Chemistry: 32 Chapters
// Total: 92 Chapters (Full Official JEE Syllabus)
// =====================================================

export const chaptersData: Record<string, string[]> = {
  Mathematics: [
    // Class 11 Mathematics (17 chapters)
    "Sets",
    "Relations and Functions",
    "Trigonometric Functions",
    "Principle of Mathematical Induction",
    "Complex Numbers",
    "Quadratic Equations",
    "Linear Inequalities",
    "Permutations and Combinations",
    "Binomial Theorem",
    "Sequences and Series",
    "Straight Lines",
    "Conic Sections (Circle, Parabola, Ellipse, Hyperbola)",
    "Introduction to Three-Dimensional Geometry",
    "Limits and Derivatives",
    "Mathematical Reasoning",
    "Statistics",
    "Probability (Class 11 Basics)",
    // Class 12 Mathematics (13 chapters)
    "Inverse Trigonometric Functions",
    "Matrices",
    "Determinants",
    "Continuity and Differentiability",
    "Application of Derivatives",
    "Indefinite Integrals",
    "Definite Integrals",
    "Application of Integrals (Area Under Curves)",
    "Differential Equations",
    "Vector Algebra",
    "Three-Dimensional Geometry (Class 12 Advanced)",
    "Probability (Class 12 Advanced)",
    "Linear Programming"
  ],

  Physics: [
    // Class 11 Physics (15 chapters)
    "Physical World",
    "Units and Measurements",
    "Motion in a Straight Line",
    "Motion in a Plane",
    "Laws of Motion",
    "Work, Energy, and Power",
    "System of Particles and Rotational Motion",
    "Gravitation",
    "Mechanical Properties of Solids",
    "Mechanical Properties of Fluids",
    "Thermal Properties of Matter",
    "Thermodynamics",
    "Kinetic Theory of Gases",
    "Oscillations (SHM)",
    "Waves",
    // Class 12 Physics (15 chapters)
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
    "Magnetism and Matter",
    "Electromagnetic Induction",
    "Alternating Current",
    "Electromagnetic Waves",
    "Ray Optics and Optical Instruments",
    "Wave Optics",
    "Dual Nature of Radiation and Matter",
    "Atoms",
    "Nuclei",
    "Semiconductor Electronics: Materials, Devices and Simple Circuits",
    "Communication Systems"
  ],

  Chemistry: [
    // Class 11 Chemistry (16 chapters)
    "Some Basic Concepts of Chemistry (Mole Concept)",
    "Structure of Atom",
    "Classification of Elements and Periodicity in Properties",
    "Chemical Bonding and Molecular Structure",
    "States of Matter (Gaseous and Liquid States)",
    "Thermodynamics",
    "Chemical Equilibrium",
    "Ionic Equilibrium",
    "Redox Reactions",
    "Hydrogen",
    "The s-Block Elements",
    "The p-Block Elements (Group 13 and 14)",
    "Organic Chemistry: Some Basic Principles and Techniques (GOC)",
    "Isomerism in Organic Compounds",
    "Hydrocarbons",
    "Environmental Chemistry",
    // Class 12 Chemistry (16 chapters)
    "The Solid State",
    "Solutions",
    "Electrochemistry",
    "Chemical Kinetics",
    "Surface Chemistry",
    "General Principles and Processes of Isolation of Elements (Metallurgy)",
    "The p-Block Elements (Group 15 to 18)",
    "The d- and f-Block Elements",
    "Coordination Compounds",
    "Haloalkanes and Haloarenes",
    "Alcohols, Phenols, and Ethers",
    "Aldehydes, Ketones, and Carboxylic Acids",
    "Amines (Organic Compounds Containing Nitrogen)",
    "Biomolecules",
    "Polymers and Chemistry in Everyday Life",
    "Principles Related to Practical Chemistry"
  ]
};

export const subjectColors: Record<string, string> = {
  Mathematics: "bg-blue-500",
  Physics: "bg-purple-500",
  Chemistry: "bg-green-500"
};

export type QuestionMode = 'conceptual' | 'pyq-style' | 'pure-pyq' | 'advanced';

export const questionModeLabels: Record<QuestionMode, string> = {
  conceptual: "Conceptual (Fresh)",
  "pyq-style": "PYQ Style",
  "pure-pyq": "Pure PYQ (Exact)",
  advanced: "JEE Advanced"
};

export async function generateQuestionsWithGemini(
  selectedSubjects: string[],
  selectedChapters: Record<string, string[]>,
  numPerSubject: number,
  questionMode: QuestionMode,
  apiKey: string
): Promise<Question[]> {
  if (!apiKey) {
    throw new Error("Please provide your Google Gemini API key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const allQuestions: Question[] = [];
  let questionId = 1;

  for (const subject of selectedSubjects) {
    const chapters = selectedChapters[subject] || [];
    if (chapters.length === 0) {
      chapters.push(...chaptersData[subject]);
    }

    const chapterList = chapters.join(", ");

    let modeInstruction = "";
    let modeName = "";

    switch (questionMode) {
      case "pure-pyq":
        modeInstruction = `You must generate questions that are as CLOSE AS POSSIBLE to ACTUAL real Previous Year Questions (PYQs) from JEE Main (2019-2024). 
Try to recall or recreate the exact wording, numerical values, options, and concepts from real past papers as accurately as possible. 
Prioritize authenticity over originality. If you remember a real PYQ on the topic, reproduce it (or a very close variant). 
Label these as authentic PYQ recreations.`;
        modeName = "Pure PYQ (Exact)";
        break;

      case "pyq-style":
        modeInstruction = `Make the questions closely resemble the style, difficulty, wording, and pattern of real Previous Year Questions (PYQs) from JEE Main and JEE Advanced. 
Use similar language, common traps, and exam-like framing, but you may create new questions.`;
        modeName = "PYQ Style";
        break;

      case "advanced":
        modeInstruction = `These questions are for JEE Advanced level. Make them significantly harder, more conceptual, multi-layered, and tricky. 
Include questions that require deeper understanding, multiple concepts in one question, or clever applications. 
Use the kind of language and complexity seen in actual JEE Advanced papers. Avoid simple direct questions.`;
        modeName = "JEE Advanced";
        break;

      case "conceptual":
      default:
        modeInstruction = `Create high-quality, fresh conceptual, numerical, and application-based questions suitable for JEE Main / NEET level practice. 
Focus on clear understanding and good variety.`;
        modeName = "Conceptual (Fresh)";
        break;
    }

    const prompt = `You are an expert question paper setter specializing in JEE Main and JEE Advanced.

Generate EXACTLY ${numPerSubject} high-quality Multiple Choice Questions (MCQs) for ${subject}.

Focus ONLY on these chapters: ${chapterList}.

MODE: ${modeName}
${modeInstruction}

**IMPORTANT - DIAGRAMS:**
Many JEE questions benefit greatly from diagrams (ray diagrams, circuits, free body diagrams, graphs, geometry figures, vector diagrams, molecular structures, etc.).
- If a diagram would make the question clearer or more authentic, **include a "diagram" field**.
- Prefer **Mermaid.js syntax** (very reliable for rendering in web apps). Use these types when suitable:
  - graph TD / flowchart for circuits, processes, free body diagrams
  - graph LR for geometry, ray optics paths
  - sequenceDiagram for some mechanisms
  - xychart-beta or line graphs for graphs in Physics/Math
- If Mermaid is not ideal, put a **very detailed, step-by-step text description** of what the diagram should show (so student can sketch it).

Requirements for EACH question:
- Clear, well-written question text (can include formulas, values).
- Exactly 4 options labeled A, B, C, D.
- Exactly ONE correct answer.
- A short, accurate explanation (1-2 sentences).
- Mention the specific chapter it belongs to.
- (Optional but highly encouraged when useful) "diagram" field containing Mermaid code or detailed description.
- (Optional) "diagramType": "mermaid" or "text"

Output format: Return ONLY a valid JSON array (no markdown, no explanations outside JSON).

Example structure:
[
  {
    "question": "In the given ray diagram...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": "B",
    "explanation": "Because of the law of reflection...",
    "chapter": "Ray Optics and Optical Instruments",
    "diagram": "graph LR\n    A[Object] --> B[Lens]\n    B --> C[Image]",
    "diagramType": "mermaid"
  }
]

Generate exactly ${numPerSubject} questions now.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      if (text.startsWith("```json")) {
        text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (text.startsWith("```")) {
        text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed: any[] = JSON.parse(text);

      const subjectQuestions: Question[] = (parsed as any[]).slice(0, numPerSubject).map((q: any, idx: number) => ({
        id: questionId++,
        question: q.question || `Question ${idx + 1}`,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["A", "B", "C", "D"],
        correct: ["A", "B", "C", "D"].includes(q.correct) ? q.correct : "A",
        explanation: q.explanation || "Refer to NCERT concepts.",
        chapter: q.chapter || chapters[0] || "General",
        subject: subject
      }));

      allQuestions.push(...subjectQuestions);
    } catch (error: any) {
      console.error(`Error generating for ${subject}:`, error);
      const fallbackQs = createFallbackQuestions(subject, chapters, numPerSubject, questionId);
      allQuestions.push(...fallbackQs);
      questionId += numPerSubject;
    }
  }

  return allQuestions;
}

function createFallbackQuestions(
  subject: string,
  chapters: string[],
  count: number,
  startId: number
): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const ch = chapters[i % chapters.length] || "General";
    qs.push({
      id: startId + i,
      question: `[Fallback] ${subject} Question ${i + 1} on ${ch}. What is the correct value?`,
      options: [
        "Option A - Correct concept",
        "Option B - Incorrect value",
        "Option C - Wrong formula",
        "Option D - Misleading distractor"
      ],
      correct: "A",
      explanation: "This is a fallback question. Please check your Gemini API key and try regenerating.",
      chapter: ch,
      subject: subject
    });
  }
  return qs;
}
