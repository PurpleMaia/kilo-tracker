
export type KiloEntry = {
  id: number;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  location: string | null;
  has_photo: boolean;
  created_at: string | null;
};

export type Question = {
  id: string;
  question: string;
  required: boolean;
  picture?: boolean;
};

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    question: "What is your internal weather today?",
    required: true,
  },
  {
    id: "q2",
    question: "What do you see outside today?",
    required: true,
    picture: true,
  },
  {
    id: "q3",
    question: "What are you excited to do today?",
    required: true,
  },
];
