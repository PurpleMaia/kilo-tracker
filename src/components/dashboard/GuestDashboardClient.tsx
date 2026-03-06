"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthUser } from "@/types/auth";
import { UserProfile, isProfileComplete } from "@/lib/profile-utils";
import { KiloHistoryCard } from "@/components/kilo/kilo-history-card";
import { DailyOleloCard } from "@/components/shared/DailyON";

type GuestDashboardClientProps = {
  user: AuthUser;
  profile: UserProfile | null;
};

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

export default function GuestDashboardClient({ user, profile: initialProfile }: GuestDashboardClientProps) {
  const router = useRouter();
  const toastShown = useRef(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("kilo_submitted") === "true" && !toastShown.current) {
      toastShown.current = true;
      sessionStorage.removeItem("kilo_submitted");
      toast.success("KILO entry saved successfully!");
    }
  }, []);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [form, setForm] = useState<ProfileForm>(toFormValues(initialProfile));

  const profileComplete = isProfileComplete(profile);

  function handleChange(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleEdit() {
    setForm(toFormValues(profile));
    setEditing(true);
  }

  function handleCancel() {
    setForm(toFormValues(profile));
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save profile");
        return;
      }

      const data = await res.json();
      const saved = data.profile;
      setProfile({
        ...saved,
        dob: saved.dob ? new Date(saved.dob) : null,
      });
      setEditing(false);
      toast.success("Profile saved!");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.username}!</h1>
          </div>
        </div>
        {profileComplete ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/kilo">Start a new KILO</Link>
          </Button>
        ) : (
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <Button disabled className="w-full sm:w-auto" variant="outline">
              Start a new KILO
            </Button>
            <p className="text-xs text-muted-foreground text-center">Complete your profile to unlock.</p>
          </div>
        )}
      </div>

      <DailyOleloCard />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Your Account</CardTitle>
              <CardDescription>View or edit account</CardDescription>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Read-only account info */}
            <div className="space-y-2 text-sm border-b pb-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Account Info</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Username:</span>
                <span className="font-medium">{user.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              {/* <div className="flex justify-between">
                <span className="text-muted-foreground">Account Type:</span>
                <Badge variant="outline">Guest</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization:</span>
                <span className="text-muted-foreground italic">None</span>
              </div> */}
            </div>

            {/* Editable profile fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Profile</p>
                {!profileComplete && !editing && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                    Incomplete
                  </Badge>
                )}
                {profileComplete && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                    Complete
                  </Badge>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="first_name" className="text-xs">First Name</Label>
                      <Input
                        id="first_name"
                        value={form.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                        placeholder="First name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="last_name" className="text-xs">Last Name</Label>
                      <Input
                        id="last_name"
                        value={form.last_name}
                        onChange={(e) => handleChange("last_name", e.target.value)}
                        placeholder="Last name"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dob" className="text-xs">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={form.dob}
                      onChange={(e) => handleChange("dob", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mauna" className="text-xs">Mauna (Mountain)</Label>
                    <Input
                      id="mauna"
                      value={form.mauna}
                      onChange={(e) => handleChange("mauna", e.target.value)}
                      placeholder="Your mauna"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="aina" className="text-xs">ʻĀina (Land)</Label>
                    <Input
                      id="aina"
                      value={form.aina}
                      onChange={(e) => handleChange("aina", e.target.value)}
                      placeholder="Your ʻāina"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wai" className="text-xs">Wai (Water)</Label>
                    <Input
                      id="wai"
                      value={form.wai}
                      onChange={(e) => handleChange("wai", e.target.value)}
                      placeholder="Your wai"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="kula" className="text-xs">School (Kula)</Label>
                    <Input
                      id="kula"
                      value={form.kula}
                      onChange={(e) => handleChange("kula", e.target.value)}
                      placeholder="Your school"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="role" className="text-xs">Role</Label>
                    <Input
                      id="role"
                      value={form.role}
                      onChange={(e) => handleChange("role", e.target.value)}
                      placeholder="e.g. Kumu, Haumāna, Researcher"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <ProfileRow label="Name" value={[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null} />
                  <ProfileRow
                    label="Date of Birth"
                    value={profile?.dob ? new Date(profile.dob).toLocaleDateString() : null}
                  />
                  <ProfileRow label="Mauna" value={profile?.mauna ?? null} />
                  <ProfileRow label="ʻĀina" value={profile?.aina ?? null} />
                  <ProfileRow label="Wai" value={profile?.wai ?? null} />
                  <ProfileRow label="School" value={profile?.kula ?? null} />
                  <ProfileRow label="Role" value={profile?.role ?? null} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>        
      </div>

      <KiloHistoryCard />
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      {value ? (
        <span className="font-medium">{value}</span>
      ) : (
        <span className="text-muted-foreground italic">Not set</span>
      )}
    </div>
  );
}

function FeatureItem({ enabled, label, description }: { enabled: boolean; label: string; description: string }) {
  return (
    <div className="flex items-start space-x-3">
      <div className={`rounded-full p-2 ${enabled ? "bg-green-100" : "bg-zinc-100"}`}>
        {enabled ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-green-600">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-zinc-400">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>
      <div>
        <h4 className={`text-sm font-medium ${!enabled ? "text-muted-foreground" : ""}`}>{label}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
