"use client";

import { useTrips } from "@/hooks/trip/use-trips";
import { TripCard } from "@/components/features/trip-card";
import { CreateTripCard } from "@/components/features/create-trip-card";
import {
  TripFilters,
  RoleFilter,
  DateFilter,
} from "@/components/features/trip-filters";
import {
  Map,
  MapPin,
  ReceiptText,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";


import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface JwtPayload {
  name?: string;
  picture?: string;
  email?: string;
}

function decodeJwt(token: string): JwtPayload {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload)) as JwtPayload;
  } catch {
    return {};
  }
}

const features = [
  {
    icon: Map,
    title: "Real-time Trip Planning",
    description:
      "Collaborative map, drag and reorder activities, everyone sees updates instantly",
  },
  {
    icon: MapPin,
    title: "Activities Management",
    description:
      "Organize places per day, add notes, times, and locations, clear daily itinerary",
  },
  {
    icon: ReceiptText,
    title: "Expense Management",
    description:
      "Log shared expenses, automatically calculate who owes who, simplify group payments",
  },
];

export default function TripsPage() {
  const [accessToken, setAccessToken] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<RoleFilter[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    // Access localStorage only on client side
    const token = localStorage.getItem("access_token") || "";
    setAccessToken(token);
    if (token) {
      setUser(decodeJwt(token));
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    setUser(null);
    setAccessToken("");
  }

  const { data, error } = useTrips(accessToken);

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
          return endDate >= today;
        } else if (dateFilter === "Past") {
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

  return (
    <main className="relative min-h-screen flex flex-col text-foreground overflow-hidden bg-background">
      <div className="relative z-10 flex flex-col flex-1">
        {/* Brown blurry accent spanning navbar and hero */}
        <div className="absolute top-0 left-1/4 -translate-y-1/4 w-[300px] h-[300px] md:w-[700px] md:h-[700px] bg-[#8B4513]/15 rounded-full blur-[100px] md:blur-[140px] pointer-events-none -z-10" />

        <header className="sticky top-0 z-40">
          <div className="container mx-auto max-w-7xl flex items-center justify-between h-16 px-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <Map className="size-4 text-primary-foreground" />
              </div>
              <span className="text-base font-bold text-foreground tracking-tight">
                Keep in Trip
              </span>
            </Link>

            {/* Right side — auth-aware */}
            <div className="flex items-center gap-3">
              {user ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors">
                      <Avatar
                        src={user.picture}
                        alt={user.name ?? "User"}
                        size="sm"
                      />
                      <span className="text-sm font-medium text-foreground max-w-[120px] truncate hidden sm:block">
                        {user.name ?? user.email}
                      </span>
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-56 p-3"
                    align="end"
                    side="bottom"
                  >
                    <div className="flex items-center gap-3 pb-3 mb-3 border-b border-border">
                      <Avatar
                        src={user.picture}
                        alt={user.name ?? "User"}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.name ?? "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </Button>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Feature Hero Section */}
        <section className="relative px-6 pt-12 pb-4 md:pt-10 md:pb-8 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20 flex-shrink-0">
          {/* Left side */}
          <div className="relative z-10 flex-1 space-y-6">
            {/* <div className="inline-flex items-center gap-2 bg-secondary/80 text-secondary-foreground text-xs font-semibold px-3 py-1.5 rounded-full border border-border backdrop-blur-sm shadow-sm">
              <Sparkles className="size-3 text-primary" />
              Your trip dashboard
            </div> */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15]">
              Plan trips{" "}
              <span className="text-primary relative inline-block">
                together
                <span className="absolute bottom-1 left-0 w-full h-[4px] bg-primary/30 rounded-full" />
              </span>
              <br />
              without the chaos.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              Keep in Trip helps groups plan trips on a shared live map, manage
              activities, and split expenses effortlessly.
            </p>
          </div>

          {/* Right side - Feature Cards */}
          <div className="flex-1 w-full max-w-lg flex flex-col gap-4">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="flex gap-4 p-5 rounded-2xl bg-card/60 border border-border backdrop-blur-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="size-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feat.icon className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground mb-1">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trip Listing Section */}
        <section className="px-6 py-12 flex-1 w-full">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            <div className="mb-2">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">
                Your Trips
              </h2>
            </div>

            <div className="space-y-6">
              {accessToken && !error && (
                <TripFilters
                  selectedRoles={selectedRoles}
                  onRolesChange={setSelectedRoles}
                  dateFilter={dateFilter}
                  onDateFilterChange={setDateFilter}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              )}

              {/* Horizontal Scroll Area */}
              <div className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-6 pb-8 pt-2 w-full">
                <div className="snap-start shrink-0 w-[300px] sm:w-[320px]">
                  <CreateTripCard />
                </div>
                {!error && filteredTrips.map((trip) => (
                  <div
                    key={trip.trip_id}
                    className="snap-start shrink-0 w-[300px] sm:w-[320px]"
                  >
                    <TripCard trip={trip} />
                  </div>
                ))}

                {/* Empty State when filtering returns nothing */}
                {!error && filteredTrips.length === 0 && (data?.trips?.length ?? 0) > 0 && (
                  <div className="flex flex-col items-center justify-center w-full py-10 text-center">
                    <p className="text-muted-foreground">
                      No trips match your filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
