/**
 * Per-question color themes inspired by each papa (realm).
 *
 * Papahulilani  — sky, atmosphere, celestial  → cool blues / lavender
 * Papahulihonua — earth, ocean, land          → warm sand / deep ocean teal
 * Papahānaumoku — life, growth, regeneration  → lush greens / botanical
 * Naʻau         — inner self, gratitude       → warm amber / soft rose / sunset
 */

export type QuestionTheme = {
  /** Gradient start (top / left) */
  gradientStart: string;
  /** Gradient end (bottom / right) */
  gradientEnd: string;
  /** Background for the content area (semi-transparent overlay) */
  contentBg: string;
  /** Primary accent for text, icons, buttons */
  accent: string;
  /** Darker shade for headers */
  accentDark: string;
  /** Light tint for guiding-prompts background */
  guideBg: string;
  /** Border for guiding-prompts */
  guideBorder: string;
  /** Text color for guide items */
  guideText: string;
  /** Dot color for guide bullets */
  guideDot: string;
  /** Icon name (Ionicons) */
  icon: string;
  /** Progress bar active color */
  progressActive: string;
  /** Progress bar completed color */
  progressDone: string;
  /** Recording button color override */
  recordBg: string;
  /** Input border focused */
  inputBorder: string;
  /** Subtle label for step indicator */
  stepLabel: string;
};

export const QUESTION_THEMES: Record<string, QuestionTheme> = {
  q1: {
    // Papahulilani — Sky & Stars
    gradientStart: "#E0ECFF",
    gradientEnd: "#C7D9F5",
    contentBg: "rgba(255, 255, 255, 0.85)",
    accent: "#2563EB",
    accentDark: "#1E3A5F",
    guideBg: "#EEF4FF",
    guideBorder: "#C7D9F5",
    guideText: "#2C5282",
    guideDot: "#60A5FA",
    icon: "cloud-outline",
    progressActive: "#3B82F6",
    progressDone: "#93C5FD",
    recordBg: "#2563EB",
    inputBorder: "#93C5FD",
    stepLabel: "#64748B",
  },
  q2: {
    // Papahulihonua — Earth & Ocean
    gradientStart: "#D4E7E0",
    gradientEnd: "#B5CFC4",
    contentBg: "rgba(255, 255, 255, 0.85)",
    accent: "#0E7490",
    accentDark: "#134E4A",
    guideBg: "#ECFDF5",
    guideBorder: "#A7D8C8",
    guideText: "#115E59",
    guideDot: "#2DD4BF",
    icon: "earth-outline",
    progressActive: "#0D9488",
    progressDone: "#5EEAD4",
    recordBg: "#0E7490",
    inputBorder: "#5EEAD4",
    stepLabel: "#64748B",
  },
  q3: {
    // Papahānaumoku — Life & Growth
    gradientStart: "#D5F0D5",
    gradientEnd: "#B8DFB8",
    contentBg: "rgba(255, 255, 255, 0.85)",
    accent: "#15803D",
    accentDark: "#14532D",
    guideBg: "#F0FDF4",
    guideBorder: "#BBF7D0",
    guideText: "#166534",
    guideDot: "#4ADE80",
    icon: "leaf-outline",
    progressActive: "#16A34A",
    progressDone: "#86EFAC",
    recordBg: "#15803D",
    inputBorder: "#86EFAC",
    stepLabel: "#64748B",
  },
  q4: {
    // Naʻau — Inner Self & Gratitude
    gradientStart: "#FDE8D8",
    gradientEnd: "#F5D0B5",
    contentBg: "rgba(255, 255, 255, 0.85)",
    accent: "#C2410C",
    accentDark: "#7C2D12",
    guideBg: "#FFF7ED",
    guideBorder: "#FDBA74",
    guideText: "#9A3412",
    guideDot: "#FB923C",
    icon: "heart-outline",
    progressActive: "#EA580C",
    progressDone: "#FDBA74",
    recordBg: "#C2410C",
    inputBorder: "#FDBA74",
    stepLabel: "#64748B",
  },
};

/** Fallback to q1 theme if question ID not found */
export function getTheme(questionId: string): QuestionTheme {
  return QUESTION_THEMES[questionId] ?? QUESTION_THEMES.q1;
}
