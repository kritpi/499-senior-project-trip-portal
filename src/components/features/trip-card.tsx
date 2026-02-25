import { Trip } from "@/services/schemas/trip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const roleColors = {
    OWNER: "bg-slate-500/90 text-white",
    EDITOR: "bg-green-500/90 text-white",
    VIEWER: "bg-gray-500/90 text-white",
  };

  // Format date range to "Month Day - Day, Year"
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleString("en-US", { month: "long" });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = start.getFullYear();

    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  };

  return (
    <Link href={`/trips/${trip.trip_id}`}>
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group rounded-2xl border-0 shadow-md pt-2">
        {/* Image Section with Overlaid Badge */}
        <div className="relative h-44 w-full  px-2 bg-white dark:bg-slate-900">
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            {trip.image_url && trip.image_url.trim() !== "" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trip.image_url}
                alt={trip.trip_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                <Calendar className="size-12" />
              </div>
            )}

            {/* Role Badge Overlay */}
            <div className="absolute top-3 left-3">
              <Badge
                className={`${roleColors[trip.role]} border-none shadow-lg font-medium px-3 py-1 text-xs uppercase`}
              >
                {trip.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-4 space-y-3 bg-white dark:bg-slate-900">
          {/* Trip Title */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 line-clamp-1">
            {trip.trip_name}
          </h3>

          {/* Date Range */}
          <div className="flex items-center text-slate-600 dark:text-slate-400">
            <Calendar className="mr-2 size-4 flex-shrink-0" />
            <span className="text-sm">
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
          </div>

          {/* Separator */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Footer - View Trip Link Only */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold group-hover:gap-3 transition-all text-sm">
              <span>View Trip</span>
              <ArrowRight className="size-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
