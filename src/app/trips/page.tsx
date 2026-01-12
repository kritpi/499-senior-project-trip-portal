"use client";

import { useTrips } from "@/hooks/trip/use-trips";
import { TripCard } from "@/components/features/trip-card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import ErrorCard from "@/components/common/ErrorCard";
import ProgressLoading from "@/components/ui/loading-animation";

export default function TripsPage() {
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    // Access localStorage only on client side
    const token = localStorage.getItem("access_token") || "";
    setAccessToken(token);
  }, []);

  const { data, isPending, error } = useTrips(accessToken);

  // Loading state
  if (isPending) {
    return <ProgressLoading/>;
  }

  // Error state
  if (error) {
    return (
      <ErrorCard 
        error={error}
        title="Failed to Load Trips"
        onAction={() => window.location.reload()}
        actionLabel="Try Again"
      />
    );
  }

  // Empty state
  if (!data?.trips || data.trips.length === 0) {
    return (
      <main className="container mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              All Trips
            </h1>
            <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
              Manage and view all your trips
            </p>
          </div>
          <Button asChild>
            <Link href="/trips/create">
              <Plus className="mr-2 size-4" />
              Create Trip
            </Link>
          </Button>
        </div>
        
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <PackageOpen className="size-16 text-muted-foreground/50 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              No trips yet
            </h2>
            <p className="text-muted-foreground max-w-md">
              Start planning your next adventure by creating your first trip!
            </p>
            <Button asChild size="lg">
              <Link href="/trips/create">
                <Plus className="mr-2 size-5" />
                Create Your First Trip
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Success state with data
  return (
    <main className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            All Trips
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Manage and view all your trips ({data.trips.length})
          </p>
        </div>
        <Button asChild>
          <Link href="/trips/create">
            <Plus className="mr-2 size-4" />
            Create Trip
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.trips.map((trip) => (
          <TripCard key={trip.trip_id} trip={trip} />
        ))}
      </div>
    </main>
  );
}
