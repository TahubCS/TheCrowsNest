import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Your Profile</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage your personal information and academic preferences.</p>
      </div>

      <div className="bg-background rounded-2xl border border-border p-8 shadow-sm">
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">First Name</label>
              <Input defaultValue="Muhammad" className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Last Name</label>
              <Input defaultValue="Khatri" className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">ECU Email</label>
            <Input defaultValue="khatrim22@students.ecu.edu" disabled className="bg-muted/50 text-muted-foreground cursor-not-allowed border-dashed" />
            <p className="text-xs text-muted-foreground">Your university email cannot be changed.</p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border mt-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ecu-purple">Academic Major</label>
              <div className="relative">
                <select className="w-full h-11 px-3 appearance-none rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ecu-purple shadow-sm cursor-pointer">
                  <option>Computer Science (BS)</option>
                  <option>Engineering</option>
                  <option>Business Administration</option>
                  <option>Nursing</option>
                  <option>Biology</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ecu-gold">Class Year</label>
              <div className="relative">
                <select className="w-full h-11 px-3 appearance-none rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ecu-gold shadow-sm cursor-pointer">
                  <option>Freshman</option>
                  <option>Sophomore</option>
                  <option>Junior</option>
                  <option>Senior</option>
                  <option>Graduate</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex justify-end">
            <Button type="button" className="bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground font-bold px-10 h-12 rounded-xl shadow-md transition-transform hover:-translate-y-0.5">
              Save Preferences
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
