"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Mountain, Sparkles, Waves } from "lucide-react";
import { toast } from "sonner";
import { profileUpdateSchema } from "@kilo/shared/schemas";
import type { AuthUser } from "@/types/auth";
import type { UserProfile } from "@/lib/profile-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ProfileForm = {
  first_name: string;
  last_name: string;
  dob: string;
  mauna: string;
  aina: string;
  wai: string;
  kula: string;
  role: string;
};

type StepKey = "identity" | "roots" | "community";

type StepField = {
  key: keyof ProfileForm;
  label: string;
  placeholder: string;
  type?: "text" | "date";
};

type StepConfig = {
  key: StepKey;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  icon: typeof Sparkles;
  fields: StepField[];
};

const STEPS: StepConfig[] = [
  {
    key: "identity",
    eyebrow: "Identity",
    title: "Start with who you are.",
    description: "Set the basics we use to anchor your profile and unlock KILO entry creation.",
    accent: "from-amber-300/30 via-transparent to-transparent",
    icon: Sparkles,
    fields: [
      { key: "first_name", label: "First name", placeholder: "Kealani" },
      { key: "last_name", label: "Last name", placeholder: "Akana" },
      { key: "dob", label: "Date of birth", placeholder: "", type: "date" },
    ],
  },
  {
    key: "roots",
    eyebrow: "Roots",
    title: "Map the places that shape your lens.",
    description: "Your mauna, aina, and wai become part of how this space frames your observations.",
    accent: "from-emerald-300/25 via-transparent to-transparent",
    icon: Mountain,
    fields: [
      { key: "mauna", label: "Mauna", placeholder: "Mauna Kea" },
      { key: "aina", label: "ʻĀina", placeholder: "Kailua" },
      { key: "wai", label: "Wai", placeholder: "Nuʻuanu Stream" },
    ],
  },
  {
    key: "community",
    eyebrow: "Community",
    title: "Finish the profile settings.",
    description: "Add the role and school context that complete your setup and open the rest of the app.",
    accent: "from-sky-300/25 via-transparent to-transparent",
    icon: Waves,
    fields: [
      { key: "kula", label: "School", placeholder: "Kamehameha Schools" },
      { key: "role", label: "Role", placeholder: "Student, teacher, mentor" },
    ],
  },
];

function toFormValues(profile: UserProfile | null): ProfileForm {
  return {
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    dob: profile?.dob ? new Date(profile.dob).toISOString().split("T")[0] : "",
    mauna: profile?.mauna ?? "",
    aina: profile?.aina ?? "",
    wai: profile?.wai ?? "",
    kula: profile?.kula ?? "",
    role: profile?.role ?? "",
  };
}

function isStepComplete(form: ProfileForm, step: StepConfig): boolean {
  return step.fields.every((field) => form[field.key].trim().length > 0);
}

export function ProfileOnboarding({
  user,
  initialProfile,
}: {
  user: AuthUser;
  initialProfile: UserProfile | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(toFormValues(initialProfile));
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const completedCount = STEPS.filter((item) => isStepComplete(form, item)).length;
  const progressValue = Math.round((completedCount / STEPS.length) * 100);
  const isLastStep = currentStep === STEPS.length - 1;

  function updateField(key: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function goNext() {
    if (!isStepComplete(form, step)) {
      setError("Fill in every field in this section before continuing.");
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function handleSubmit() {
    if (!STEPS.every((item) => isStepComplete(form, item))) {
      setError("Complete every profile field before continuing.");
      return;
    }

    const parsed = profileUpdateSchema.safeParse(form);

    if (!parsed.success) {
      setError("Complete every profile field before continuing.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);

        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data.error ?? "Failed to save your profile.");
          return;
        }

        toast.success("Profile complete. KILO is unlocked.");
        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("Failed to save your profile.");
      }
    });
  }

  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#07131a] text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_85%_18%,_rgba(125,211,252,0.18),_transparent_24%),linear-gradient(135deg,_rgba(8,24,32,0.96),_rgba(2,8,12,0.98))]" />
      <div className="absolute inset-y-0 right-[-12%] w-[38%] rotate-[16deg] bg-white/5 blur-3xl" />

      <div className="relative grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="border-b border-white/10 p-8 sm:p-10 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-4">
              <p
                className="text-xs uppercase tracking-[0.35em] text-white/55"
                style={{ fontFamily: '"Avenir Next", "Helvetica Neue", sans-serif' }}
              >
                Profile Onboarding
              </p>
              <div className="space-y-3">
                <h1
                  className="max-w-xl text-4xl leading-none sm:text-5xl"
                  style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", serif' }}
                >
                  Build the profile that opens your KILO practice.
                </h1>
                <p className="max-w-lg text-sm leading-6 text-white/68 sm:text-base">
                  New registrations need a complete profile before they can create entries. This setup writes
                  directly into your profile settings.
                </p>
              </div>
            </div>

            <div className="hidden rounded-full border border-white/12 bg-white/6 px-4 py-2 text-right text-xs text-white/65 sm:block">
              <div className="font-medium text-white">{user.username}</div>
              <div>{user.email}</div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((item, index) => {
              const complete = isStepComplete(form, item);
              const active = index === currentStep;

              return (
                <div
                  key={item.key}
                  className={`rounded-[1.5rem] border px-4 py-4 transition-all ${
                    active
                      ? "border-white/25 bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.28em] text-white/48">
                      0{index + 1}
                    </span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        complete ? "border-emerald-300/40 bg-emerald-300/16 text-emerald-100" : "border-white/12 text-white/45"
                      }`}
                    >
                      {complete ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{item.eyebrow}</p>
                  <p className="mt-1 text-xs leading-5 text-white/58">{item.title}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Progress</p>
                <p
                  className="mt-2 text-2xl font-medium text-white"
                  style={{ fontFamily: '"Avenir Next", "Helvetica Neue", sans-serif' }}
                >
                  {progressValue}%
                </p>
              </div>
              <div className="max-w-[17rem] text-right text-sm leading-6 text-white/65">
                Complete all 3 sections to unlock KILO entry creation.
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-200 via-emerald-200 to-sky-200 transition-all duration-500"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className={`relative animate-in fade-in-0 slide-in-from-right-4 duration-500 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-7`}>
            <div className={`absolute inset-x-0 top-0 h-28 rounded-t-[2rem] bg-gradient-to-br ${step.accent}`} />
            <div className="relative">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/48">{step.eyebrow}</p>
                  <div>
                    <h2
                      className="text-3xl text-white"
                      style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", serif' }}
                    >
                      {step.title}
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-white/68">
                      {step.description}
                    </p>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white">
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-5">
                {step.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key} className="text-sm text-white/78">
                      {field.label}
                    </Label>
                    <Input
                      id={field.key}
                      type={field.type ?? "text"}
                      value={form[field.key]}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={isPending}
                      className="h-12 border-white/12 bg-black/25 text-white placeholder:text-white/30 focus-visible:ring-amber-100/50"
                    />
                  </div>
                ))}
              </div>

              {error && (
                <Alert className="mt-5 border-red-300/30 bg-red-400/10 text-red-50">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                  disabled={currentStep === 0 || isPending}
                  className="justify-start text-white hover:bg-white/10 hover:text-white"
                >
                  Back
                </Button>

                {isLastStep ? (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="h-12 rounded-full bg-white px-6 text-[#07131a] hover:bg-white/90"
                  >
                    {isPending ? "Saving profile..." : "Finish onboarding"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={isPending}
                    className="h-12 rounded-full bg-white px-6 text-[#07131a] hover:bg-white/90"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
