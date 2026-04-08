"use client";

import { useState, useEffect } from "react";
import { AudioRecorder } from "./audio-recorder";
import { PhotoTaker } from "./photo-taker";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { KiloEntry, QUESTIONS } from "@/types/kilo";

type KiloFormData = Record<string, string>;
type PhotoQuestion = "q1" | "q2" | "q3";

interface KiloEntryFormProps {
  initialData?: KiloEntry | null;
}

export function KiloEntryForm({ initialData }: KiloEntryFormProps) {
  const isEditMode = !!initialData;

  // Initialize form data from initialData
  const [formData, setFormData] = useState<KiloFormData>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const router = useRouter();
  const [photoPreviews, setPhotoPreviews] = useState<Record<PhotoQuestion, string | null>>({
    q1: null,
    q2: null,
    q3: null,
  });

  // Populate form with initial data when provided
  useEffect(() => {
    if (initialData) {
      const data: KiloFormData = {};
      if (initialData.q1) data.q1 = initialData.q1;
      if (initialData.q2) data.q2 = initialData.q2;
      if (initialData.q3) data.q3 = initialData.q3;
      if (initialData.q4) data.q4 = initialData.q4;
      setFormData(data);

      // Set previews for existing photos
      const previews: Record<PhotoQuestion, string | null> = { q1: null, q2: null, q3: null };
      for (const q of ["q1", "q2", "q3"] as PhotoQuestion[]) {
        if (initialData[`${q}_photo_path`]) {
          previews[q] = `/api/kilo/photo?id=${initialData.id}&question=${q}`;
        }
      }
      setPhotoPreviews(previews);

      // Start with all fields visible in edit mode
      setShowTextInput(true);
    }
  }, [initialData]);

  const currentQuestion = QUESTIONS[currentStep];
  const currentQuestionId = currentQuestion.id as PhotoQuestion;
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

  const handlePhotoCapture = (dataUrl: string) => {
    setPhotoPreviews((prev) => ({ ...prev, [currentQuestionId]: dataUrl }));
  };

  const handleRemovePhoto = () => {
    const preview = photoPreviews[currentQuestionId];
    if (preview && !preview.startsWith("/api/")) {
      URL.revokeObjectURL(preview);
    }
    setPhotoPreviews((prev) => ({ ...prev, [currentQuestionId]: null }));
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
      const body = new FormData();
      body.append("q1", formData.q1 || "");
      if (formData.q2) body.append("q2", formData.q2);
      if (formData.q3) body.append("q3", formData.q3);
      if (formData.q4) body.append("q4", formData.q4);

      if (isEditMode) {
        body.append("id", String(initialData!.id));
      }

      // Handle per-question photos
      for (const q of ["q1", "q2", "q3"] as PhotoQuestion[]) {
        const preview = photoPreviews[q];
        if (preview && preview.startsWith("/api/")) {
          // Existing photo URL from edit mode — keep it
          body.append(`keep_${q}_photo`, "true");
        } else if (preview && preview.startsWith("data:")) {
          // New capture — attach as file
          const res = await fetch(preview);
          const blob = await res.blob();
          body.append(`${q}_photo`, blob, `${q}_photo.jpg`);
        }
        // If null, photo was removed — don't set keep flag
      }

      const method = isEditMode ? "PUT" : "POST";

      const apiResponse = await fetch("/api/kilo", {
        method,
        body,
      });

      if (!apiResponse.ok) {
        const data = await apiResponse.json().catch(() => ({}));
        const errorMessage = data.error || "Failed to save entry";

        // Log validation issues for debugging
        if (data.issues) {
          console.error("[KiloEntryForm] Validation issues:", data.issues);
        }

        throw new Error(errorMessage);
      }

      const savedEntry = await apiResponse.json();

      toast.success(isEditMode ? "Entry updated" : "Entry saved", {
        description: "Your KILO entry has been saved successfully.",
      });

      // Trigger task extraction and store pending state for KiloCard
      if (savedEntry.entry?.id) {
        const kiloId = savedEntry.entry.id;
        sessionStorage.setItem("generatingTasksFor", String(kiloId));

        fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kiloId,
            q1: formData.q1 || null,
            q2: formData.q2 || null,
            q3: formData.q3 || null,
          }),
        })
          .then(() => sessionStorage.removeItem("generatingTasksFor"))
          .catch((err) => {
            console.error("[KiloEntryForm] Task extraction failed:", err);
            sessionStorage.removeItem("generatingTasksFor");
          });
      }

      setFormData({});
      setCurrentStep(0);
      setPhotoPreviews({ q1: null, q2: null, q3: null });
      router.push("/dashboard");

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save entry";
      setError(message);
      toast.error("Failed to save entry", {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
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

          {/* Show photo/camera section if applicable */}
          {currentQuestion.picture && (
            <PhotoTaker
              photoPreview={photoPreviews[currentQuestionId]}
              onPhotoCapture={handlePhotoCapture}
              onPhotoRemove={handleRemovePhoto}
            />
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
