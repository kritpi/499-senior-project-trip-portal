"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

export type RoleFilter = "OWNER" | "EDITOR" | "VIEWER";
export type DateFilter = "All" | "Upcoming" | "Past";

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
  { value: "All", label: "All Trips" },
  { value: "Upcoming", label: "Upcoming" },
  { value: "Past", label: "Past" },
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
        roleOptions
          .find((opt) => opt.value === role)
          ?.label.replace(/\b\w/g, (c) => c.toUpperCase()),
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
                      className="px-2 py-2 my-0.5 rounded-md cursor-pointer hover:bg-accent"
                    >
                      {option.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Date Filter - Combobox for consistent styling */}
          <div className="flex-1">
            <Combobox
              onValueChange={(value: DateFilter | DateFilter[] | null) => {
                if (typeof value === "string") {
                  onDateFilterChange(value);
                }
              }}
            >
              <ComboboxInput
                placeholder={
                  dateOptions.find((o) => o.value === dateFilter)?.label ??
                  "All Trips"
                }
                readOnly
                showTrigger
                className="h-11 cursor-pointer w-full [&_input]:!text-muted-foreground"
              />
              <ComboboxContent className="w-full px-1 py-1">
                <ComboboxList className="p-1">
                  {dateOptions.map((option) => (
                    <ComboboxItem
                      key={option.value}
                      value={option.value}
                      className="px-2 py-2 my-0.5 rounded-md cursor-pointer hover:bg-accent"
                    >
                      {option.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </div>
      </div>
    </div>
  );
}
