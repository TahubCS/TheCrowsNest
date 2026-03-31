import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Crow's Nest — ECU Study Hub",
  description: "Connect with ECU students to share notes, build AI-powered study plans, flashcards, and ace your exams. Exclusively for East Carolina University.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster 
            position="bottom-right" 
            theme="dark"
            toastOptions={{
              classNames: {
                toast: "bg-background/90 backdrop-blur-md border border-border text-foreground shadow-2xl rounded-xl p-4 flex gap-3 items-start font-sans",
                title: "font-bold text-sm",
                description: "text-muted-foreground text-xs",
                success: "border-green-500/30 bg-green-500/10 text-green-400",
                error: "border-red-500/30 bg-red-500/10 text-red-400",
                info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
              }
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
