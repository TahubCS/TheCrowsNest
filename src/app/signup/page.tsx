import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-background p-8 rounded-2xl shadow-xl border border-border">
        
        <div className="text-center">
          <Link href="/" className="inline-block mb-4 font-bold text-2xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-ecu-purple">The Crow's</span>
            <span className="text-ecu-gold"> Nest</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground">Create an account</h1>
          <p className="text-muted-foreground mt-2 text-sm">Join the community of ECU students</p>
        </div>

        <form className="mt-6 space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="firstName">
                  First Name
                </label>
                <Input 
                  id="firstName" 
                  name="firstName" 
                  type="text" 
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
                  placeholder="Pirate" 
                  required 
                  className="h-11 border-border focus-visible:ring-ecu-purple"
                />
              </div>
            </div>

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
              <p className="text-[11px] text-muted-foreground">Must be a valid @students.ecu.edu email address.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                className="h-11 border-border focus-visible:ring-ecu-purple"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <Input 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                required 
                className="h-11 border-border focus-visible:ring-ecu-purple"
              />
            </div>
          </div>

          <Button type="button" className="w-full h-11 bg-ecu-gold text-ecu-purple hover:bg-ecu-gold/90 text-sm font-bold shadow-md rounded-lg mt-2">
            Create Account
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
