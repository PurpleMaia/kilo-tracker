"use client";

import { useState } from "react";
import { AudioRecorder } from "./audio-recorder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight, Loader2, Keyboard } from "lucide-react";

type Question = {
  id: string;
  question: string;
  required: boolean;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    question: "question 1",
    required: true,
  },
  {
    id: "q2",
    question: "question 2",
    required: false,
  },
  {
    id: "q3",
    question: "question 3",
    required: false,
  },
];

type FormData = Record<string, string>;

export function KiloEntryForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const currentQuestion = QUESTIONS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === QUESTIONS.length - 1;
  const currentAnswer = formData[currentQuestion.id] || "";
  const hasAnswer = currentAnswer.trim().length > 0;

  const handleTranscription = (transcribedText: string) => {
    // Append to existing text if there's already content
    setFormData((prev) => {
      const existing = prev[currentQuestion.id]?.trim() || "";
      const newText = existing
        ? `${existing} ${transcribedText}`
        : transcribedText;
      return {
        ...prev,
        [currentQuestion.id]: newText,
      };
    });
    // Show text input after transcription so user can edit
    setShowTextInput(true);
  };

  const handleTextChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleBack = () => {
    setError(null);
    setShowTextInput(false);
    setCurrentStep((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentQuestion.required && !currentAnswer.trim()) {
      setError("This question is required");
      return;
    }
    setError(null);
    setShowTextInput(false);
    setCurrentStep((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    if (currentQuestion.required && !currentAnswer.trim()) {
      setError("This question is required");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/kilo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q1: formData.q1 || "",
          q2: formData.q2 || null,
          q3: formData.q3 || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save entry");
      }

      setSuccess(true);
      setFormData({});
      setCurrentStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              Your entry has been saved successfully!
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4 w-full"
            onClick={() => setSuccess(false)}
          >
            Add Another Entry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {currentStep + 1} / {QUESTIONS.length}
          </span>
        </div>
        {currentQuestion.required && (
          <CardDescription className="text-red-500">
            * Required
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <AudioRecorder onTranscription={handleTranscription} onRecordingStateChange={setIsTranscribing} />

        {/* Show editable textarea if there's an answer OR user clicked "prefer to type" */}
        {(hasAnswer || showTextInput) && (
          <Textarea
            placeholder="Your response..."
            value={currentAnswer}
            onChange={(e) => handleTextChange(e.target.value)}
            disabled={isSubmitting || isTranscribing}
            rows={4}
            autoFocus={showTextInput && !hasAnswer}
          />
        )}

        {/* Show "prefer to type" only when no answer exists yet */}
        {!hasAnswer && !showTextInput && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => setShowTextInput(true)}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Prefer to type instead?
          </Button>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep || isSubmitting}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Entry"
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={isSubmitting}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}