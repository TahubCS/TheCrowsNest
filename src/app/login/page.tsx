"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { validateEcuEmail } from "@/lib/validators";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  // Real-time ECU email validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
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
    setLoading(true);

    // Validate ECU email before submitting
    const emailCheck = validateEcuEmail(email);
    if (!emailCheck.valid) {
      setEmailError(emailCheck.message);
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-8 bg-background p-8 rounded-2xl shadow-xl border border-border">

        <div className="text-center">
          <Link href="/" className="inline-block mb-6 font-bold text-2xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-ecu-purple">The Crow&apos;s</span>
            <span className="text-ecu-gold"> Nest</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2 text-sm">Log in to your account to continue</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                ECU Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="student@students.ecu.edu"
                required
                className={`h-11 ${emailError ? "border-red-500 focus-visible:ring-red-500" : "border-border focus-visible:ring-ecu-purple"}`}
              />
              {emailError && (
                <p className="text-xs text-red-500 font-medium mt-1">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <button 
                  type="button"
                  onClick={() => toast.info("Password reset is not yet available. Please contact your ECU IT support or re-register with a new password.")}
                  className="text-xs hover:underline font-medium text-primary cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 border-border focus-visible:ring-ecu-purple"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground text-sm font-semibold shadow-md rounded-lg disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-ecu-purple hover:text-ecu-purple/80 font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
