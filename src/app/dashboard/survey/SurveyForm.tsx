"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Hard-coded organizations for now
const ORGANIZATIONS = [
  { id: "org-1", name: "Purple Maiʻa" },
];

const WEATHER_OPTIONS = [
  { value: "sunny", label: "Sunny" },
  { value: "partly_cloudy", label: "Partly Cloudy" },
  { value: "cloudy", label: "Cloudy" },
  { value: "rainy", label: "Rainy" },
  { value: "stormy", label: "Stormy" },
  { value: "windy", label: "Windy" },
];

type Step = "org-select" | "survey" | "submitted";

type SurveyData = {
  orgId: string;
  weather: string;
  kilo: string;
  kiloPhoto: File | null;
  excitedAbout: string;
};

export default function SurveyForm() {
  const [step, setStep] = useState<Step>("org-select");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyData>({
    orgId: "",
    weather: "",
    kilo: "",
    kiloPhoto: null,
    excitedAbout: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const selectedOrgName = ORGANIZATIONS.find((o) => o.id === selectedOrg)?.name;

  function handleOrgContinue() {
    if (!selectedOrg) return;
    setSurvey((prev) => ({ ...prev, orgId: selectedOrg }));
    setStep("survey");
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSurvey((prev) => ({ ...prev, kiloPhoto: file }));
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire up to API when ready
    console.log("[survey] Submitted:", {
      org: selectedOrgName,
      weather: survey.weather,
      kilo: survey.kilo,
      hasPhoto: !!survey.kiloPhoto,
      excitedAbout: survey.excitedAbout,
    });
    setStep("submitted");
  }

  const canSubmit =
    survey.weather !== "" &&
    survey.kilo !== "" &&
    survey.kiloPhoto !== null &&
    survey.excitedAbout.trim() !== "";

  if (step === "org-select") {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today's Kilo</h1>
          <p className="text-muted-foreground mt-1">
            Select your organization to begin
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select an Organization</CardTitle>
            <CardDescription>
              Choose the organization you are submitting this survey for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-select">Organization</Label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger id="org-select">
                  <SelectValue placeholder="Choose an organization" />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATIONS.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleOrgContinue}
              disabled={!selectedOrg}
            >
              Continue to Survey
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "submitted") {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Survey Submitted</h1>
          <p className="text-muted-foreground mt-1">
            Thank you for completing today&apos;s survey.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization</span>
              <Badge variant="outline">{selectedOrgName}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weather</span>
              <span className="font-medium capitalize">{survey.weather.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kilo</span>
              <span className="font-medium">{survey.kilo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Photo uploaded</span>
              <span className="font-medium">{survey.kiloPhoto ? "Yes" : "No"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Excited about</span>
              <span className="font-medium">{survey.excitedAbout}</span>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => { setStep("org-select"); setSurvey({ orgId: "", weather: "", kilo: "", kiloPhoto: null, excitedAbout: "" }); setPhotoPreview(null); setSelectedOrg(""); }}>
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today's Kilo</h1>
          <p className="text-muted-foreground mt-1">
            Fill out today&apos;s observations
          </p>
        </div>
        <Badge variant="outline">{selectedOrgName}</Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question 1: Weather */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. What is your weather today? <span className="text-red-500">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={survey.weather}
              onValueChange={(val) => setSurvey((prev) => ({ ...prev, weather: val }))}
              className="grid grid-cols-2 gap-3"
            >
              {WEATHER_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`weather-${option.value}`} />
                  <Label htmlFor={`weather-${option.value}`} className="cursor-pointer font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Question 2: Kilo + photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. What is the kilo of what you see outside today? <span className="text-red-500">*</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                id="kilo"
                type="text"
                placeholder="Describe your kilo..."
                value={survey.kilo}
                onChange={(e) => setSurvey((prev) => ({ ...prev, kilo: e.target.value }))}
              />
            </div>

            {/* Follow-up: photo upload */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-medium">
                Upload a photo of your Kilo
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const inputEl = fileInputRef.current;
                    if (!inputEl) return;
                    const previousCapture = inputEl.getAttribute("capture");
                    inputEl.removeAttribute("capture");
                    inputEl.click();
                    if (previousCapture !== null) {
                      inputEl.setAttribute("capture", previousCapture);
                    }
                  }}
                >
                  Upload from Gallery
                </Button>
              </div>

              {photoPreview && (
                <div className="mt-2 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Kilo photo preview"
                    className="w-full max-h-48 object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 bg-white/80 hover:bg-white"
                    onClick={() => {
                      setSurvey((prev) => ({ ...prev, kiloPhoto: null }));
                      setPhotoPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return null;
                      });
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </Button>
                </div>
              )}

              {!photoPreview && (
                <p className="text-xs text-muted-foreground italic">No photo selected</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question 3: Excited about */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. What are you excited to do today? <span className="text-red-500">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Share what you're looking forward to today..."
              rows={4}
              value={survey.excitedAbout}
              onChange={(e) => setSurvey((prev) => ({ ...prev, excitedAbout: e.target.value }))}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("org-select")}
          >
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={!canSubmit}>
            Submit Survey
          </Button>
        </div>
        {!canSubmit && (
          <p className="text-xs text-muted-foreground text-center">
            All questions and the photo are required to submit
          </p>
        )}
      </form>
    </div>
  );
}
