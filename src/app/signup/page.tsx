"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { validateEcuEmail, validatePassword } from "@/lib/validators";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    pirateId: "",
    major: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Real-time ECU email validation
  const handleEmailChange = (value: string) => {
    updateField("email", value);
    if (value.length > 0 && value.includes("@")) {
      const check = validateEcuEmail(value);
      setEmailError(check.valid ? "" : check.message);
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setPasswordError("");
    setLoading(true);

    // --- Client-side validations ---
    const emailCheck = validateEcuEmail(form.email);
    if (!emailCheck.valid) {
      setEmailError(emailCheck.message);
      setLoading(false);
      return;
    }

    const passwordCheck = validatePassword(form.password);
    if (!passwordCheck.valid) {
      setPasswordError(passwordCheck.message);
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setPasswordError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!form.pirateId.trim()) {
      setError("Pirate ID is required.");
      setLoading(false);
      return;
    }

    if (!form.major.trim()) {
      setError("Major is required.");
      setLoading(false);
      return;
    }

    try {
      // Call the register API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          email: form.email.trim(),
          password: form.password,
          pirateId: form.pirateId.trim(),
          major: form.major.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Registration successful — redirect to login
      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-background p-8 rounded-2xl shadow-xl border border-border">

        <div className="text-center">
          <Link href="/" className="inline-block mb-4 font-bold text-2xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-ecu-purple">The Crow&apos;s</span>
            <span className="text-ecu-gold"> Nest</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground">Create an account</h1>
          <p className="text-muted-foreground mt-2 text-sm">Join the community of ECU students</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="firstName">
                  First Name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="PeeDee"
                  required
                  className="h-11 border-border focus-visible:ring-ecu-purple"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lastName">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="Pirate"
                  required
                  className="h-11 border-border focus-visible:ring-ecu-purple"
                />
              </div>
            </div>

            {/* ECU Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                ECU Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="student@students.ecu.edu"
                required
                className={`h-11 ${emailError ? "border-red-500 focus-visible:ring-red-500" : "border-border focus-visible:ring-ecu-purple"}`}
              />
              {emailError ? (
                <p className="text-xs text-red-500 font-medium">{emailError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Must be a valid @students.ecu.edu email address.</p>
              )}
            </div>

            {/* Pirate ID & Major */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pirateId">
                  Pirate ID
                </label>
                <Input
                  id="pirateId"
                  name="pirateId"
                  type="text"
                  value={form.pirateId}
                  onChange={(e) => updateField("pirateId", e.target.value)}
                  placeholder="900123456"
                  required
                  className="h-11 border-border focus-visible:ring-ecu-purple"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="major">
                  Major
                </label>
                <Input
                  id="major"
                  name="major"
                  type="text"
                  value={form.major}
                  onChange={(e) => updateField("major", e.target.value)}
                  placeholder="Computer Science"
                  required
                  className="h-11 border-border focus-visible:ring-ecu-purple"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                required
                className={`h-11 ${passwordError ? "border-red-500 focus-visible:ring-red-500" : "border-border focus-visible:ring-ecu-purple"}`}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="••••••••"
                required
                className={`h-11 ${passwordError ? "border-red-500 focus-visible:ring-red-500" : "border-border focus-visible:ring-ecu-purple"}`}
              />
              {passwordError && (
                <p className="text-xs text-red-500 font-medium">{passwordError}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-ecu-gold text-ecu-purple hover:bg-ecu-gold/90 text-sm font-bold shadow-md rounded-lg mt-2 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground border-t border-border pt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-ecu-purple hover:text-ecu-purple/80 font-semibold hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
