"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface ActivityCardProps {
  location: Location;
  index: number;
  onRemove: (id: string) => void;
  etaText?: string;
}

export function ActivityCard({
  location,
  index,
  onRemove,
  etaText,
}: ActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      {etaText && (
        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
          <span className="bg-muted px-2 py-1 rounded-full">🚗 {etaText}</span>
        </div>
      )}
      <Card
        className={cn(
          "relative",
          isDragging && "opacity-50 ring-2 ring-primary",
        )}
      >
        <CardContent className="p-4 flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical size={20} />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-sm leading-none">
              {location.name}
            </h4>
            <p className="text-xs text-muted-foreground">{location.address}</p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(location.id)}
          >
            <X size={16} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
