import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-8 bg-background p-8 rounded-2xl shadow-xl border border-border">
        
        <div className="text-center">
          <Link href="/" className="inline-block mb-6 font-bold text-2xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-ecu-purple">The Crow's</span>
            <span className="text-ecu-gold"> Nest</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2 text-sm">Log in to your account to continue</p>
        </div>

        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                ECU Email Address
              </label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="student@students.ecu.edu" 
                required 
                className="h-11 border-border focus-visible:ring-ecu-purple"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <Link href="#" className="text-xs text-ecu-purple hover:underline font-medium text-primary">
                  Forgot password?
                </Link>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                className="h-11 border-border focus-visible:ring-ecu-purple"
              />
            </div>
          </div>

          <Button type="button" className="w-full h-11 bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground text-sm font-semibold shadow-md rounded-lg">
            Log In
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-ecu-purple hover:text-ecu-purple/80 font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
