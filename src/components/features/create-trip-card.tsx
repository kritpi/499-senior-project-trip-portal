import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export function CreateTripCard() {
  return (
    <Link href="/trips/create">
      <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 shadow-md pt-2 h-full">
        <div className="relative h-44 w-full px-2">
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-blue-500/20 dark:bg-blue-500/30 p-4 group-hover:bg-blue-500/30 dark:group-hover:bg-blue-500/40 transition-colors">
                <Plus className="size-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-3 bg-white dark:bg-slate-900">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 text-center">
            Create New Trip
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Start planning your next adventure
          </p>

          <div className="border-t border-slate-200 dark:border-slate-700" />

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold group-hover:gap-3 transition-all text-sm">
              <Plus className="size-4" />
              <span>Get Started</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
