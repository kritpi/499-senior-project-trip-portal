import Link from "next/link";
import LandingNavbar from "@/components/features/landing-navbar";
import { Button } from "@/components/ui/button";
import { Map, Users, DollarSign, ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wanderplan — Plan trips together",
  description:
    "Collaboratively plan activities, split expenses, and explore the world together with Wanderplan.",
};

const features = [
  {
    icon: Map,
    title: "Interactive Trip Planner",
    description:
      "Pin places on a live map, drag to reorder, and plan every day of your journey — collaboratively, in real time.",
  },
  {
    icon: Users,
    title: "Built for Groups",
    description:
      "Invite your travel crew, assign roles, and plan together. Everyone stays in sync, no matter where they are.",
  },
  {
    icon: DollarSign,
    title: "Effortless Expense Splitting",
    description:
      "Log costs, choose your split type, and see exactly who owes what — so money never kills the vibe.",
  },
];

import LandingBackground from "@/components/features/landing-background";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen flex flex-col text-foreground overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 flex flex-col flex-1">
        <LandingNavbar />

        {/* ── Hero ── */}
        <section className="flex-1 flex items-center justify-center px-6 py-24 relative overflow-hidden">
          {/* Decorative background blobs */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-secondary/40 blur-3xl pointer-events-none" />

          <div className="relative text-center max-w-3xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1.5 rounded-full border border-border">
              <Sparkles className="size-3 text-primary" />
              Collaborative trip planning, reimagined
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-[1.15] tracking-tight">
              Plan trips{" "}
              <span className="text-primary relative">
                together
                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary/30 rounded-full" />
              </span>
              <br />
              without the chaos.
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Wanderplan brings your whole crew onto a single live map — plan
              activities, log expenses, and travel smarter.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" className="px-8 gap-2" asChild>
                <Link href="/trips">
                  View My Trips
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {/* <Button size="lg" variant="outline" asChild>
              <Link href="/auth">Sign in with Google</Link>
            </Button> */}
            </div>
          </div>
        </section>

        {/* ── Feature Cards ── */}
        <section className="border-t border-border bg-muted/20 backdrop-blur-sm px-6 py-20 relative">
          <div className="container mx-auto max-w-5xl relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Everything your trip needs
              </h2>
              <p className="text-foreground/80 max-w-md mx-auto">
                From first idea to final receipt — Wanderplan handles the
                details so you can focus on the adventure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 space-y-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        {/* <section className="px-6 py-16 bg-primary">
        <div className="container mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-primary-foreground">
            Ready to start planning?
          </h2>
          <p className="text-primary-foreground/70 max-w-md mx-auto">
            Jump straight into your trips or sign in to get started.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="px-8 gap-2"
              asChild
            >
              <Link href="/trips">
                Go to My Trips
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link href="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </section> */}

        {/* ── Footer ── */}
        {/* <footer className="border-t border-border px-6 py-6 bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <span className="font-medium text-foreground">Wanderplan</span>
          </div>
          <p>© {new Date().getFullYear()} Wanderplan · Built for explorers</p>
        </div>
      </footer> */}
      </div>
    </main>
  );
}
