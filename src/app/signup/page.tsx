"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { validateEcuEmail, validatePassword } from "@/lib/validators";

export default function SignupPage() {
  const router = useRouter();

  // UX State
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Step 1 State (Registration Details)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Step 2 State (Verification Code)
  const [verificationCode, setVerificationCode] = useState("");

  // =========================================================================
  // HANDLERS: Step 1 (Registration Details)
  // =========================================================================

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

  const handleSendCode = async (e: React.FormEvent) => {
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

    try {
      // Step 1: Request verification code
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed. Please try again.");
        return;
      }

      // Success — transition to Step 2
      setStep(2);
      setError("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // HANDLERS: Step 2 (Verification Code)
  // =========================================================================

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (verificationCode.length !== 6) {
      setError("Please enter the 6-digit code.");
      setLoading(false);
      return;
    }

    try {
      // Step 2: Verify code and create user
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Verification failed. Please try again.");
        return;
      }

      // Success — account is officially created! Redirect to login.
      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    // Re-run the send code logic
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to resend code.");
      } else {
        setError("New code sent! Check your email.");
      }
    } catch {
      setError("Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-12">
      <div className="w-full max-w-md bg-background p-8 rounded-2xl shadow-xl border border-border relative overflow-hidden">
        
        {/* LOGO AREA */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4 font-bold text-2xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-ecu-purple">The Crow&apos;s</span>
            <span className="text-ecu-gold"> Nest</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground">
            {step === 1 ? "Create an account" : "Check your email"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {step === 1
              ? "Join the community of ECU students"
              : `We sent a 6-digit code to ${form.email}`}
          </p>
        </div>

        {error && (
          <div className={`text-sm px-4 py-3 rounded-lg mb-6 ${error.includes("sent!") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {error}
          </div>
        )}

        {/* ============================== */}
        {/* STEP 1: Registration Form      */}
        {/* ============================== */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="firstName">First Name</label>
                  <Input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="PeeDee"
                    required
                    className="h-11 border-border focus-visible:ring-ecu-purple"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="lastName">Last Name</label>
                  <Input
                    id="lastName"
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
                <label className="text-sm font-medium" htmlFor="email">ECU Email Address</label>
                <Input
                  id="email"
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

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <Input
                  id="password"
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
                <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm Password</label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`h-11 ${passwordError ? "border-red-500 focus-visible:ring-red-500" : "border-border focus-visible:ring-ecu-purple"}`}
                />
                {passwordError && <p className="text-xs text-red-500 font-medium">{passwordError}</p>}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-ecu-gold text-ecu-purple hover:bg-ecu-gold/90 text-sm font-bold shadow-md rounded-lg mt-2 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Continue"}
            </Button>
            
            <div className="mt-6 text-center text-sm text-muted-foreground border-t border-border pt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-ecu-purple hover:text-ecu-purple/80 font-semibold hover:underline">
                Log in
              </Link>
            </div>
          </form>
        )}

        {/* ============================== */}
        {/* STEP 2: Verification Form      */}
        {/* ============================== */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className="space-y-2 text-center">
              <label className="text-sm font-bold text-foreground" htmlFor="code">
                Enter 6-Digit Code
              </label>
              <Input
                id="code"
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
                className="h-14 text-center text-3xl font-mono tracking-[0.5em] border-border focus-visible:ring-ecu-purple placeholder:tracking-normal placeholder:text-muted/30"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                Code expires in 15 minutes.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full h-11 bg-ecu-purple text-white hover:bg-ecu-purple/90 text-sm font-bold shadow-md rounded-lg mt-4 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify & Create Account"}
            </Button>

            <div className="mt-6 text-center text-sm text-muted-foreground border-t border-border pt-6 flex flex-col gap-2">
              <div>
                Didn't receive the email?{" "}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-ecu-purple hover:text-ecu-purple/80 font-semibold hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  Resend code
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                  setVerificationCode("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline bg-transparent border-none cursor-pointer p-0 mt-2"
              >
                ← Back to edit email
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
