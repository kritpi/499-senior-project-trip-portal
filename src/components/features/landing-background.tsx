"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2000&auto=format&fit=crop", // Tokyo
  "https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=2000&auto=format&fit=crop", // Bangkok
  "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=2000&auto=format&fit=crop", // China (Great Wall)
  "https://images.unsplash.com/photo-1590234149667-bb718915cb1d?q=80&w=2000&auto=format&fit=crop", // Chiang Mai
  "https://images.unsplash.com/photo-1589394815804-964ce0ff9718?q=80&w=2000&auto=format&fit=crop", // Phuket
  "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=2000&auto=format&fit=crop", // New York
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2000&auto=format&fit=crop", // Paris
  "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=2000&auto=format&fit=crop", // London
];

export default function LandingBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Change image every 20 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-0 h-[60vh]">
      {BACKGROUND_IMAGES.map((src, index) => (
        <img
          key={src}
          src={src}
          alt="City Background"
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out",
            index === currentIndex ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-md" />
      {/* Gradient fade out effect */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
