"use client";

import { useTrips } from "@/hooks/trip/use-trips";
import { TripCard } from "@/components/features/trip-card";
import { CreateTripCard } from "@/components/features/create-trip-card";
import {
  TripFilters,
  RoleFilter,
  DateFilter,
} from "@/components/features/trip-filters";
import { PackageOpen, ArrowLeft, LogOut } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ErrorCard from "@/components/common/ErrorCard";
import ProgressLoading from "@/components/ui/loading-animation";
import { Trip } from "@/services/schemas/trip";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface JwtPayload {
  name?: string;
  picture?: string;
  email?: string;
}

function decodeJwt(token: string): JwtPayload {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded as JwtPayload;
  } catch {
    return {};
  }
}

export default function TripsPage() {
  const [accessToken, setAccessToken] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<RoleFilter[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<JwtPayload>({});

  const router = useRouter();

  useEffect(() => {
    // Access localStorage only on client side
    const token = localStorage.getItem("access_token") || "";
    setAccessToken(token);
    setTokenChecked(true);
    if (token) {
      setUser(decodeJwt(token));
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.push("/");
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

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
    if (dateFilter !== "All") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((trip) => {
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (dateFilter === "Upcoming") {
          // Upcoming: trips that haven't ended yet (future or ongoing)
          return endDate >= today;
        } else if (dateFilter === "Past") {
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

  const renderHeader = (subtitle: React.ReactNode) => (
    <div className="flex items-start justify-between mb-8">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="mt-1"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            All Trips
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="w-64">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors border border-border shadow-sm">
              <Avatar
                src={user.picture}
                alt={user.name}
                fallback={initials}
                size="sm"
              />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.name ?? "Profile"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user.email ?? "Settings"}
                </p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" side="bottom" align="end">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  // Empty state - show only CreateTripCard
  if (!data?.trips || data.trips.length === 0) {
    return (
      <main className="container mx-auto py-8">
        {renderHeader("Manage and view all your trips")}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <CreateTripCard />
        </div>
      </main>
    );
  }

  // Success state with data
  return (
    <main className="container mx-auto py-8">
      {renderHeader(
        <>
          Manage and view all your trips ({filteredTrips.length}
          {filteredTrips.length !== data.trips.length &&
            ` of ${data.trips.length}`}
          )
        </>,
      )}

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
          <PackageOpen className="size-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No trips found
          </h3>
          <p className="text-muted-foreground max-w-md">
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
