"use client";

import { useTrips } from "@/hooks/trip/use-trips";
import { TripCard } from "@/components/features/trip-card";
import { CreateTripCard } from "@/components/features/create-trip-card";
import {
  TripFilters,
  RoleFilter,
  DateFilter,
} from "@/components/features/trip-filters";
import { PackageOpen } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ErrorCard from "@/components/common/ErrorCard";
import ProgressLoading from "@/components/ui/loading-animation";
import { Trip } from "@/services/schemas/trip";

export default function TripsPage() {
  const [accessToken, setAccessToken] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<RoleFilter[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Access localStorage only on client side
    const token = localStorage.getItem("access_token") || "";
    setAccessToken(token);
    setTokenChecked(true);
  }, []);

  const { data, isPending, error } = useTrips(accessToken);

  // Filter trips based on selected filters
  const filteredTrips = useMemo(() => {
    if (!data?.trips) return [];

    let filtered = data.trips;

    // Filter by role
    if (selectedRoles.length > 0) {
      filtered = filtered.filter((trip) =>
        selectedRoles.includes(trip.role as RoleFilter),
      );
    }

    // Filter by date
    if (dateFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((trip) => {
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (dateFilter === "upcoming") {
          // Upcoming: trips that haven't ended yet (future or ongoing)
          return endDate >= today;
        } else if (dateFilter === "past") {
          // Past: trips that have already ended
          return endDate < today;
        }
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.trip_name.toLowerCase().includes(query) ||
          trip.main_location.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [data?.trips, selectedRoles, dateFilter, searchQuery]);

  // Still waiting for localStorage read
  if (!tokenChecked) {
    return <ProgressLoading />;
  }

  // No token — not logged in
  if (!accessToken) {
    return (
      <ErrorCard
        error={{ status: 401, message: "You must be logged in to view trips." }}
        title="Authentication Required"
      />
    );
  }

  // Loading state
  if (isPending) {
    return <ProgressLoading />;
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

  // Empty state - show only CreateTripCard
  if (!data?.trips || data.trips.length === 0) {
    return (
      <main className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            All Trips
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Manage and view all your trips
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <CreateTripCard />
        </div>
      </main>
    );
  }

  // Success state with data
  return (
    <main className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          All Trips
        </h1>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Manage and view all your trips ({filteredTrips.length}
          {filteredTrips.length !== data.trips.length &&
            ` of ${data.trips.length}`}
          )
        </p>
      </div>

      {/* Filters */}
      <TripFilters
        selectedRoles={selectedRoles}
        onRolesChange={setSelectedRoles}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Trip Grid */}
      {filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageOpen className="size-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
            No trips found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-md">
            Try adjusting your filters or search query to find what you're
            looking for.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <CreateTripCard />
          {filteredTrips.map((trip) => (
            <TripCard key={trip.trip_id} trip={trip} />
          ))}
        </div>
      )}
    </main>
  );
}
