"use client";

import React, { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Activity, ActivityCategory } from "@/types/activity";
import { useDebounce } from "@/hooks/use-debounce";

interface EditableActivityCardProps {
  activity: Activity;
  index: number;
  onRemove: (id: string) => void;
  onChange: (activity: Activity) => void;
  etaText?: string;
  isEditable?: boolean;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "FOOD", label: "Food" },
  { value: "ATTRACTION", label: "Attraction" },
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "OTHER", label: "Other" },
];

export function EditableActivityCard({
  activity,
  index,
  onRemove,
  onChange,
  etaText,
  isEditable = true,
}: EditableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id || `temp-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  // Local state for debounced fields
  const [note, setNote] = useState(activity.note || "");
  const [description, setDescription] = useState(activity.description || "");

  const debouncedNote = useDebounce(note, 500);
  const debouncedDescription = useDebounce(description, 500);

  // Sync local state with props when props change (e.g. initial load or external update)
  useEffect(() => {
    setNote(activity.note || "");
  }, [activity.note]);

  useEffect(() => {
    setDescription(activity.description || "");
  }, [activity.description]);

  // Trigger onChange when debounced values change
  useEffect(() => {
    if (debouncedNote !== activity.note) {
      onChange({ ...activity, note: debouncedNote });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNote]);

  useEffect(() => {
    if (debouncedDescription !== activity.description) {
      onChange({ ...activity, description: debouncedDescription });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDescription]);

  const handleFieldChange = (field: keyof Activity, value: any) => {
    onChange({
      ...activity,
      [field]: value,
    });
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-3 px-1 pt-1">
      {etaText && (
        <div className="flex items-center justify-center pb-6 pt-2 text-xs text-muted-foreground">
          <span className="bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full text-stone-500">
            🚗 {etaText}
          </span>
        </div>
      )}
      <Card
        className={cn(
          "relative   bg-white  transition-all rounded-2xl overflow-hidden",
          isDragging && "opacity-50",
        )}
      >
        {/* Remove Button - Top Right Corner */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-9 w-9 text-stone-400 hover:text-red-500 hover:bg-stone-200/50 z-10 rounded-full"
          onClick={() => onRemove(activity.id)}
          disabled={!isEditable}
        >
          <X size={20} />
        </Button>

        <div className="flex">
          {/* Drag Handle - Left Center */}
          <div
            {...attributes}
            {...listeners}
            className="flex flex-col items-center justify-center gap-0.5 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 pr-2 pl-4 flex-shrink-0"
          >
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
          </div>

          {/* Card Content */}
          <div className="py-3 pr-4 pl-2 flex-1 min-w-0">
            {/* Time Pickers */}
            <div className="flex gap-3 mb-1 pr-6">
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mx-2">
                  Start
                </label>
                <Input
                  id={`start-${activity.id}`}
                  type="time"
                  value={activity.start_time}
                  onChange={(e) =>
                    handleFieldChange("start_time", e.target.value)
                  }
                  className="h-9 text-sm bg-stone-100 border-0 rounded-xl text-stone-700 font-medium pl-3 pr-3 focus-visible:ring-1 focus-visible:ring-stone-300"
                  disabled={!isEditable}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mx-2">
                  End
                </label>
                <Input
                  id={`end-${activity.id}`}
                  type="time"
                  value={activity.end_time}
                  onChange={(e) =>
                    handleFieldChange("end_time", e.target.value)
                  }
                  className="h-9 text-sm bg-stone-100 border-0 rounded-xl text-stone-700 font-medium pl-3 pr-3 focus-visible:ring-1 focus-visible:ring-stone-300"
                  disabled={!isEditable}
                />
              </div>
            </div>

            {/* Location Info */}
            {activity.activity_location.address && (
              <div className="mb-3">
                <div className="flex items-start gap-1.5 mt-1.5 pl-1">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-stone-800 flex-shrink-0" />
                  <h3 className="text-base font-bold text-stone-800 leading-snug">
                    {activity.activity_location.name || "Unnamed Location"}
                  </h3>
                </div>
                {/* <div className="flex items-start gap-1.5 mt-1 pl-1">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-stone-400 flex-shrink-0" />
                  <p className="text-sm text-stone-500 leading-snug truncate">
                    {activity.activity_location.name}
                  </p>
                </div> */}
              </div>
            )}

            {/* Notes */}
            <div className="mb-3 space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mx-2">
                Notes
              </label>
              <Textarea
                id={`note-${activity.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add notes..."
                className="min-h-[40px] text-sm resize-none bg-white border border-stone-200 rounded-xl text-stone-600 placeholder:text-stone-300 focus-visible:ring-1 focus-visible:ring-stone-300"
                disabled={!isEditable}
              />
            </div>

            {/* Description */}
            <div className="mb-3 space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mx-2">
                Description
              </label>
              <Textarea
                id={`description-${activity.id}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                className="min-h-[40px] text-sm resize-none bg-white border border-stone-200 rounded-xl text-stone-600 placeholder:text-stone-300 focus-visible:ring-1 focus-visible:ring-stone-300"
                disabled={!isEditable}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 pr-2">
                Category
              </label>
              <Select
                value={activity.category}
                onValueChange={(value) =>
                  handleFieldChange("category", value as ActivityCategory)
                }
                disabled={!isEditable}
              >
                <SelectTrigger className="h-10 w-auto inline-flex text-sm bg-stone-100 border-0 rounded-xl text-stone-600 font-medium px-4 focus:ring-1 focus:ring-stone-300 [&>svg]:text-stone-400">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg text-stone-600"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
