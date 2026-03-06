"use client";

import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Loader2, Keyboard, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { KiloEntry } from "@/types/kilo";

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

interface KiloEntryFormProps {
  initialData?: KiloEntry | null;
}

export function KiloEntryForm({ initialData }: KiloEntryFormProps) {
  const isEditMode = !!initialData;

  // Initialize form data from initialData
  const [formData, setFormData] = useState<FormData>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const router = useRouter();

  // Populate form with initial data when provided
  useEffect(() => {
    if (initialData) {
      const data: FormData = {};
      if (initialData.q1) data.q1 = initialData.q1;
      if (initialData.q2) data.q2 = initialData.q2;
      if (initialData.q3) data.q3 = initialData.q3;
      setFormData(data);

      // Start with all fields visible in edit mode
      setShowTextInput(true);
    }
  }, [initialData]);

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
      const payload = {
        q1: formData.q1 || "",
        q2: formData.q2 || null,
        q3: formData.q3 || null,
      };

      const method = isEditMode ? "PUT" : "POST";      

      const response = await fetch("/api/kilo", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(isEditMode ? { id: initialData!.id, ...payload } : payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save entry");
      }

      setFormData({});
      setCurrentStep(0);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setIsSubmitting(false);
      router.push("/dashboard");
    }
  };

  return (
    <Card className="">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg">
            {currentQuestion.question}
          </CardTitle>
          <div className="flex items-center justify-between sm:justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                disabled={isSubmitting}
                className="touch-action-manipulation h-10 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentStep + 1} / {QUESTIONS.length}
              </span>
          </div>
        </div>
        {!isEditMode && currentQuestion.required && (
          <CardDescription className="text-red-500">
            * Required
          </CardDescription>
        )}
      </CardHeader>
      {/* Create mode: wizard steps */}
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
              className="w-full text-muted-foreground hover:text-foreground touch-action-manipulation h-10"
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

      <CardFooter className="flex justify-between gap-3 pb-safe">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep || isSubmitting}
            className="touch-action-manipulation flex-1 sm:flex-none h-11"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="touch-action-manipulation flex-1 sm:flex-none h-11">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditMode ? (
              "Update Entry"
            ) : (
              "Save Entry"
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={isSubmitting} className="touch-action-manipulation flex-1 sm:flex-none h-11">
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}