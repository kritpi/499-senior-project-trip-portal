"use client";

import { cn } from "@/lib/utils";
import { Map, Calendar, DollarSign, LogOut } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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

export default function TripSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tripId = params?.trip_id as string;

  const [user, setUser] = useState<JwtPayload>({});

  useEffect(() => {
    const token = localStorage.getItem("access_token") || "";
    if (token) {
      setUser(decodeJwt(token));
    }
  }, []);

  const planningItems = [
    {
      id: "overview",
      label: "Trip Overview",
      icon: Map,
      href: `/trips/${tripId}`,
    },
    {
      id: "activities",
      label: "Activities",
      icon: Calendar,
      href: `/trips/${tripId}/activities`,
    },
    {
      id: "expenses",
      label: "Expenses",
      icon: DollarSign,
      href: `/trips/${tripId}/expenses`,
    },
  ];

  function getActiveItem(): string {
    if (pathname === `/trips/${tripId}`) return "overview";
    if (pathname?.includes("/activities")) return "activities";
    if (pathname?.includes("/expenses")) return "expenses";
    return "overview";
  }

  const activeItem = getActiveItem();

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

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen fixed top-0 left-0 p-6 flex flex-col overflow-y-auto">
      {/* Logo at top */}
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">W</span>
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">
            Wanderplan
          </span>
        </Link>
      </div>

      {/* PLANNING Section */}
      <div className="flex-1">
        <div>
          <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-3">
            Planning
          </h3>
          <nav className="space-y-1">
            {planningItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Profile at bottom */}
      <div className="border-t border-sidebar-border pt-4 mt-4">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors">
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
          <PopoverContent className="w-48 p-2" side="top" align="start">
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
    </aside>
  );
}
