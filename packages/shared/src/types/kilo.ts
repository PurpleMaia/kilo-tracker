
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
    question: "Lani (Air) — What do you observe in the sky and air around you today?",
    required: true,
  },
  {
    id: "q2",
    question: "Honua (Earth & Ocean) — What do you notice about the land and water today?",
    required: true,
    picture: true,
  },
  {
    id: "q3",
    question: "Hānaumoku (All Life Forces) — What living things do you observe today?",
    required: true,
  },
];
