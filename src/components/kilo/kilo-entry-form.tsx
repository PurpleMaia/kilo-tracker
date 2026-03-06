"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AudioRecorder } from "./audio-recorder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const handleTranscription = (field: "q1" | "q2" | "q3", text: string) => {
    const setter = { q1: setQ1, q2: setQ2, q3: setQ3 }[field];
    setter((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const canSubmit = q1.trim() !== "" && q2.trim() !== "" && q3.trim() !== "";

  const handleSubmit = async () => {
    if (!q1.trim() || !q2.trim() || !q3.trim()) {
      setError("All questions are required");
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

      if (photoPreview) URL.revokeObjectURL(photoPreview);
      sessionStorage.setItem("kilo_submitted", "true");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setIsSubmitting(false);
      router.push("/dashboard");
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>KILO Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Q1 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            What is your weather today? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 items-start">
            <Textarea
              placeholder="Type your response or use the mic..."
              value={q1}
              onChange={(e) => setQ1(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="flex-1"
            />
            <AudioRecorder
              compact
              onTranscription={(text) => handleTranscription("q1", text)}
              onRecordingStateChange={() => {}}
            />
          </div>
        </div>

        {/* Q2 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            What do you see outside today? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 items-start">
            <Textarea
              placeholder="Type your response or use the mic..."
              value={q2}
              onChange={(e) => setQ2(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="flex-1"
            />
            <AudioRecorder
              compact
              onTranscription={(text) => handleTranscription("q2", text)}
              onRecordingStateChange={() => {}}
            />
          </div>
          {/* Photo upload */}
          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground">Upload a photo of your Kilo (optional)</p>
            {photoPreview ? (
              <div className="relative w-fit">
                <Image src={photoPreview} alt="Kilo photo" width={300} height={200} className="rounded-md max-h-48 object-cover" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
          </div>
        </div>

        {/* Q3 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            What are you excited to do today? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 items-start">
            <Textarea
              placeholder="Type your response or use the mic..."
              value={q3}
              onChange={(e) => setQ3(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="flex-1"
            />
            <AudioRecorder
              compact
              onTranscription={(text) => handleTranscription("q3", text)}
              onRecordingStateChange={() => {}}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit} className="w-full">
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
          ) : (
            "Save Entry"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}