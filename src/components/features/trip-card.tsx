import { Trip } from "@/services/schemas/trip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User } from "lucide-react";
import Link from "next/link";

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const roleColors = {
    OWNER: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    EDITOR: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
    VIEWER: "bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{trip.trip_name}</CardTitle>
          <Badge className={roleColors[trip.role]} variant="outline">
            <User className="mr-1 size-3" />
            {trip.role}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-2 size-4" />
          <span>{trip.main_location}</span>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 size-4" />
          <span>
            {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/trips/${trip.trip_id}`}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
