"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

export type RoleFilter = "OWNER" | "EDITOR" | "VIEWER";
export type DateFilter = "all" | "upcoming" | "past";

interface TripFiltersProps {
  selectedRoles: RoleFilter[];
  onRolesChange: (roles: RoleFilter[]) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const roleOptions: { value: RoleFilter; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "EDITOR", label: "Editor" },
  { value: "VIEWER", label: "Viewer" },
];

const dateOptions: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All Trips" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export function TripFilters({
  selectedRoles,
  onRolesChange,
  dateFilter,
  onDateFilterChange,
  searchQuery,
  onSearchChange,
}: TripFiltersProps) {
  // Get display text for selected roles
  const getSelectedRolesText = () => {
    if (selectedRoles.length === 0) return "All Roles";

    const concatString = selectedRoles
      .map((role) =>
        roleOptions.find((opt) => opt.value === role)?.label.toLowerCase(),
      )
      .filter(Boolean)
      .join(", ");

    return concatString || "All Roles";
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-4">
        {/* Search Bar - Takes 2 columns (2/3 width) */}
        <div className="col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search trips by name or location..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Filters - Takes 1 column (1/3 width) */}
        <div className="col-span-1 flex gap-2">
          {/* Role Filter - Non-typing Combobox */}
          <div className="flex-1">
            <Combobox
              value={selectedRoles}
              onValueChange={(value: RoleFilter[] | RoleFilter | null) => {
                if (Array.isArray(value)) {
                  onRolesChange(value);
                } else if (value === null) {
                  onRolesChange([]);
                }
              }}
              multiple
            >
              <ComboboxInput
                placeholder={getSelectedRolesText()}
                readOnly
                showTrigger
                className="h-11 cursor-pointer w-full"
              />
              {/* <ComboboxContent className="min-w-[200px]"> */}
              <ComboboxContent className="w-full px-1 py-1">
                <ComboboxList className="p-1">
                  {roleOptions.map((option) => (
                    <ComboboxItem
                      key={option.value}
                      value={option.value}
                      className="px-2 py-2 my-0.5 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {option.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Date Filter - Select Component */}
          <div className="flex-1">
            <Select value={dateFilter} onValueChange={onDateFilterChange}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select date filter" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
