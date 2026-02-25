import { SidebarProvider } from "@/components/ui/sidebar";
import TripSidebar from "@/components/trip/TripSidebar";
import { ReactNode } from "react";

export default function TripLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <TripSidebar />
      <main className="flex-1 ml-64">{children}</main>
    </SidebarProvider>
  );
}
