import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  chapter: string;
  subject: string;
}

// =====================================================
// COMPLETE JEE MAIN + ADVANCED SYLLABUS (92 Chapters)
// EXACT AS PROVIDED BY USER
// Mathematics: 30 Chapters | Physics: 30 Chapters | Chemistry: 32 Chapters
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

export async function generateQuestionsWithGemini(
  selectedSubjects: string[],
  selectedChapters: Record<string, string[]>,
  numPerSubject: number,
  includePYQ: boolean,
  apiKey: string
) {
  if (!apiKey) {
    throw new Error("Please provide your Google Gemini API key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const allQuestions = [];
  let questionId = 1;

  for (const subject of selectedSubjects) {
    let chapters = selectedChapters[subject] || [];
    if (chapters.length === 0) {
      chapters = [...chaptersData[subject]];
    }

    const chapterList = chapters.join(", ");
    const pyqInstruction = includePYQ
      ? "Make the questions closely resemble the style, difficulty, and pattern of real Previous Year Questions (PYQs) from JEE Main, JEE Advanced, or NEET exams."
      : "Create high-quality conceptual, numerical, and application-based questions suitable for competitive exams like JEE/NEET.";

    const prompt = `You are an expert question paper setter for JEE Main, JEE Advanced and NEET exams.

Generate EXACTLY ${numPerSubject} unique, high-quality Multiple Choice Questions (MCQs) for ${subject}.

Focus ONLY on these chapters: ${chapterList}.

${pyqInstruction}

Requirements for EACH question:
- Clear, well-written question text (can include formulas, values).
- Exactly 4 options labeled A, B, C, D.
- Exactly ONE correct answer.
- A short, accurate explanation (1-2 sentences).
- Mention the specific chapter it belongs to.

Output format: Return ONLY a valid JSON array (no markdown, no explanations outside JSON).

Example structure:
[
  {
    "question": "What is the value of ...?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct": "B",
    "explanation": "Because of XYZ principle...",
    "chapter": "${chapters[0] || 'General'}"
  }
]

Generate exactly ${numPerSubject} questions now. Make them original and good quality.`;

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

      const subjectQuestions: Question[] = parsed.slice(0, numPerSubject).map((q: any, idx: number) => ({
        id: questionId++,
        question: q.question || `Question ${idx + 1}`,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["A", "B", "C", "D"],
        correct: ["A", "B", "C", "D"].includes(q.correct) ? q.correct : "A",
        explanation: q.explanation || "Refer to NCERT concepts.",
        chapter: q.chapter || chapters[0] || "General",
        subject: subject
      }));

      allQuestions.push(...subjectQuestions);
    } catch (error) {
      console.error(`Error generating for ${subject}:`, error);
      for (let i = 0; i < numPerSubject; i++) {
        const ch = chapters[i % chapters.length] || "General";
        allQuestions.push({
          id: questionId++,
          question: `[Fallback] ${subject} Question ${i + 1} on ${ch}. What is the correct value?`,
          options: ["Option A - Correct concept", "Option B - Incorrect value", "Option C - Wrong formula", "Option D - Misleading distractor"],
          correct: "A",
          explanation: "Fallback question. Check your Gemini API key.",
          chapter: ch,
          subject: subject
        });
      }
    }
  }

  return allQuestions;
}
