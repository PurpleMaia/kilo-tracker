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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Populate form with initial data when provided
  useEffect(() => {
    if (initialData) {
      const data: FormData = {};
      if (initialData.q1) data.q1 = initialData.q1;
      if (initialData.q2) data.q2 = initialData.q2;
      if (initialData.q3) data.q3 = initialData.q3;
      if (initialData.has_photo) {
        // Set preview to API URL for existing photo
        setPhotoPreview(`/api/kilo/photo?id=${initialData.id}`);
      }
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

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
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
      let photoPath = null;

      // Upload photo if available (data URL from camera capture)
      if (photoPreview && photoPreview.startsWith("data:")) {
        const photoFormData = new FormData();
        // Convert data URL to blob
        const blobResponse = await fetch(photoPreview);
        const blob = await blobResponse.blob();
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        photoFormData.append("photo", file);

        const uploadRes = await fetch("/api/photo", {
          method: "POST",
          body: photoFormData,
        });

        if (!uploadRes.ok) {
          const uploadError = await uploadRes.json().catch(() => ({}));
          const errorMessage = uploadError.error || "Failed to upload photo";
          toast.error("Photo upload failed", {
            description: errorMessage + ". Your entry will be saved without the photo.",
          });
          // Don't throw - allow entry to be saved without photo, but warn user
          console.error("[KiloEntryForm] Photo upload failed:", errorMessage);
        } else {
          const { path } = await uploadRes.json();
          photoPath = path;
        }
      }

      const payload: Record<string, unknown> = {
        q1: formData.q1 || "",
        q2: formData.q2 || null,
        q3: formData.q3 || null,
      };

      if (isEditMode) {
        payload.id = initialData!.id;
        if (photoPath) {
          // New photo was uploaded
          payload.photo_path = photoPath;
        } else if (photoPreview && photoPreview.startsWith("/api/")) {
          // Existing photo URL from edit mode — keep it
          payload.keep_photo = true;
        }
        // If photoPreview is null, photo was removed — don't set keep_photo
      } else {
        // New entry
        if (photoPath) {
          payload.photo_path = photoPath;
        }
      }

      const method = isEditMode ? "PUT" : "POST";

      const apiResponse = await fetch("/api/kilo", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
      setPhotoPreview(null);
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
              photoPreview={photoPreview}
              onPhotoCapture={setPhotoPreview}
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