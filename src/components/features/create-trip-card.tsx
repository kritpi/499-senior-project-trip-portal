import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export function CreateTripCard() {
  return (
    <Link href="/trips/create">
      <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group rounded-2xl border-2 border-dashed border-border shadow-sm pt-2 h-full bg-card/50 hover:bg-card">
        <div className="relative h-44 w-full px-2">
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-muted/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-primary/15 p-4 group-hover:bg-primary/25 transition-colors">
                <Plus className="size-8 text-primary" />
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-3 bg-card">
          <h3 className="text-xl font-bold text-card-foreground text-center">
            Create New Trip
          </h3>

          <p className="text-sm text-muted-foreground text-center">
            Start planning your next adventure
          </p>

          <div className="border-t border-border" />

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all text-sm">
              <Plus className="size-4" />
              <span>Get Started</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
