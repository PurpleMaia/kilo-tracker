
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
  guides: string[];
  required: boolean;
  picture?: boolean;
};

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    question: "Papahulilani - the space above your head to where the stars sit",
    required: true,
    picture: true,
    guides: [
      "What does the sky look like? Clear, cloudy, or hazy?",
      "Can you feel the wind? Which direction is it coming from?",
      "What is the temperature like? Warm, cool, humid?",
      "Do you notice any smells in the air?",
    ],
  },
  {
    id: "q2",
    question: "Papahulihonua - the earth and oceans",
    required: true,    
    guides: [
      "What does the ground look like? Dry, wet, muddy?",
      "Is the ocean calm, choppy, or rough?",
      "Do you notice the color of the water today?",
      "Are there any changes to the land or shoreline?",
    ],
  },
  {
    id: "q3",
    question: "Papahānaumoku — all things that give birth, regenerate and procreate?",
    required: true,
    guides: [
      "What plants do you see? Are they flowering or fruiting?",
      "Do you see or hear any birds? What are they doing?",
      "Are there any insects or sea creatures around?",
      "How do the living things seem today — active, quiet, abundant?",
    ],
  },
  {
    id: "q4",
    question: "Naʻau — How are you feeling internally and what are you grateful for today?",
    required: false,
    guides: [
      "How are you feeling physically, mentally, emotionally?",
      "What is something you are grateful for today?",
      "Is there anything you want to set an intention for?",
    ],
  }
];
