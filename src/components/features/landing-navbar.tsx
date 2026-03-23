"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Globe, ArrowRight, LogOut, ChevronDown } from "lucide-react";

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

export default function LandingNavbar() {
  const router = useRouter();
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token") || "";
    if (token) {
      setUser(decodeJwt(token));
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    setUser(null);
    // router.push("/auth");
  }

  return (
    <header className="bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <Globe className="size-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">
            Keep in Trip
          </span>
        </Link>

        {/* Right side — auth-aware */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* View My Trips */}
              {/* <Button size="sm" variant="outline" asChild>
                <Link href="/trips">
                  My Trips <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button> */}

              {/* User popover */}
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

                <PopoverContent className="w-56 p-3" align="end" side="bottom">
                  {/* User info */}
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

                  {/* Logout */}
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
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth">Sign in</Link>
              </Button>
              {/* <Button size="sm" asChild>
                <Link href="/trips">
                  View My Trips <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button> */}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
