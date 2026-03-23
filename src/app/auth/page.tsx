"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import GoogleLoginButton from "@/components/features/google-login-button";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { Map, Globe, Users, DollarSign } from "lucide-react";

const features = [
  {
    icon: Map,
    title: "Plan activities",
    description:
      "Organise every day of your trip with a live collaborative map.",
  },
  {
    icon: Users,
    title: "Invite your crew",
    description: "Add travel partners and assign roles in seconds.",
  },
  {
    icon: DollarSign,
    title: "Track expenses",
    description: "Split costs fairly and see who owes what at a glance.",
  },
];

function AuthenticationPageContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "google_auth_failed") {
      toast.error("Authentication failed. Please try again.");
      window.history.replaceState({}, "", "/auth");
    }

    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      localStorage.setItem("return_to", returnTo);
      window.history.replaceState({}, "", "/auth");
    }
  }, [searchParams]);

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-background flex">
        {/* ── Left panel: branding ── */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary-foreground/5 blur-3xl" />

          {/* Logo */}
          <div className="relative flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm border border-primary-foreground/20">
              <Globe className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary-foreground tracking-tight">
              Keep in Trip
            </span>
          </div>

          {/* Hero copy */}
          <div className="relative">
            <h1 className="text-4xl font-bold text-primary-foreground leading-tight mb-4">
              Your trips, <span className="opacity-70">beautifully</span>{" "}
              organised.
            </h1>
            <p className="text-primary-foreground/70 text-lg mb-10 max-w-sm leading-relaxed">
              Plan activities, invite friends and track expenses — all in one
              place.
            </p>

            {/* Feature list */}
            <div className="space-y-5">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="size-9 rounded-lg bg-primary-foreground/10 flex items-center justify-center flex-shrink-0 border border-primary-foreground/15">
                    <Icon className="size-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-primary-foreground font-semibold text-sm">
                      {title}
                    </p>
                    <p className="text-primary-foreground/60 text-sm leading-snug">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <p className="relative text-primary-foreground/40 text-xs">
            © {new Date().getFullYear()} Keep in Trip · Built for explorers
          </p>
        </div>

        {/* ── Right panel: sign-in form ── */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            {/* Mobile-only logo */}
            <div className="flex lg:hidden items-center gap-2 mb-10">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <Globe className="size-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">
                Keep in Trip
              </span>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Welcome back
              </h2>
              <p className="text-muted-foreground text-sm">
                Sign in to continue planning your adventures.
              </p>
            </div>

            {/* Sign-in card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <GoogleLoginButton />

              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                By signing in you agree to our{" "}
                <span className="text-foreground font-medium">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-foreground font-medium">
                  Privacy Policy
                </span>
                .
              </p>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-muted-foreground">
              New here?{" "}
              <span className="text-foreground font-medium">
                Sign in with Google to create your account automatically.
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AuthenticationPage() {
  return (
    <Suspense fallback={null}>
      <AuthenticationPageContent />
    </Suspense>
  );
}
