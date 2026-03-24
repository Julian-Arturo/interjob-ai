// ===== CANDIDATE PROFILE =====
export const CANDIDATE_PROFILE = `Julian Hernández - Flutter Engineer Colombia
- 4+ años Flutter (Pure Flutter, fintech/banking apps)
- NEORIS/Itaú: Banking app multiplataforma, Flutter+AWS+Firebase+CI/CD
- HEXA: Mobile wallet banco nacional, Clean Architecture, Crashlytics
- 27 Industries: Apps desde cero (GreenWall+Arduino, CanchaApp)
- Skills: State mgmt (Provider/Riverpod/BLoC), testing, AI tools (Copilot/ChatGPT), massive codebases
- Inglés intermedio, español nativo`;

// ===== JOB REQUIREMENTS =====
export const JOB_REQUIREMENTS = `Acorns Senior Flutter Engineer (fintech micro-investing)
Requiere: 4+ años Flutter, Pure Flutter dev, AI tools proficiency, code quality/PR rigor, massive codebase, fintech experience`;

// ===== MODE LABELS =====
export const MODE_LABELS = {
  flutter: 'MODO FLUTTER — ACORNS FINTECH',
  hr: 'MODO HR — COMPORTAMIENTO',
  tech: 'MODO TECNICO — CODIGO',
  english: 'MODO INGLES GENERAL'
};

// ===== MODE INSTRUCTIONS =====
export const getModeInstructions = (mode) => {
  const instructions = {
    flutter: `Flutter: Pure Flutter dev, fintech apps (Itaú/wallet), AI tools, state mgmt, testing, Clean Arch, massive codebase, PR rigor`,
    hr: `HR: Método STAR con proyectos reales (Itaú, wallet, CanchaApp). Resultados medibles`,
    tech: `Tech: Algoritmo, Big O, edge cases, Flutter/Dart solution con código funcional actualizado (Flutter 3.27+), best practices, explicación bilingüe (español + inglés)`,
    english: `English: Natural, profesional, idiomático para tech interviews`
  };
  return instructions[mode] || instructions.flutter;
};

// ===== FILLER PHRASES (mientras esperas la respuesta) =====
export const FILLER_PHRASES = [
  {
    en: "That's a great question, let me think...",
    phonetic: "Dats a greit kuéschen, let mi zink..."
  },
  {
    en: "Interesting question...",
    phonetic: "Ínteresting kuéschen..."
  },
  {
    en: "Good question, let me elaborate...",
    phonetic: "Gud kuéschen, let mi iláboreit..."
  },
  {
    en: "Let me think about that for a moment...",
    phonetic: "Let mi zink abaut dat for a móument..."
  },
  {
    en: "That's an important topic...",
    phonetic: "Dats an impórtant tópic..."
  },
  {
    en: "Well, from my experience...",
    phonetic: "Uel, from mai ecspíriens..."
  }
];

// ===== CONSTANTS =====
export const SILENCE_DELAY = 1800; // 1.8 seconds
// Users must provide their own OpenAI API key for security
export const API_KEY = '';
