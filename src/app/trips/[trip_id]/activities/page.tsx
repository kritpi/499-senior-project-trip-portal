"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import ErrorCard from "@/components/common/ErrorCard";
import { useParams } from "next/navigation";
import { useJsApiLoader } from "@react-google-maps/api";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2, MapPin, Plus, Calendar } from "lucide-react";
import { format, eachDayOfInterval, parseISO } from "date-fns";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlaceDetails } from "@/components/features/place-details";
import { ActivityMap } from "@/components/features/activity-map";
import { EditableActivityCard } from "@/components/features/editable-activity-card";
import { useActivitySocket } from "@/hooks/use-activity-socket";
import { getTripById } from "@/services/api/trip/get-trip-by-id";
import { tripKeys } from "@/services/query-keys/trip-keys";
import { Activity } from "@/types/activity";

// // --- Map Constants ---

const defaultCenter = {
  lat: 13.7563, // Bangkok
  lng: 100.5018,
};

// Google Maps libraries - must be a constant to prevent LoadScript from reloading
const GOOGLE_MAPS_LIBRARIES: "places"[] = ["places"];

// --- Main Page Component ---

export default function TripActivitiesPage() {
  const params = useParams();
  const tripId = parseInt(params.trip_id as string);

  // Get access token
  const [accessToken, setAccessToken] = useState<string>("");
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    setAccessToken(token);
    setTokenChecked(true);
  }, []);

  // Fetch trip details
  const {
    data: tripData,
    isLoading: isTripLoading,
    error: tripError,
  } = useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => getTripById(tripId, accessToken),
    enabled: !!accessToken && !!tripId,
  });

  // Date selection
  const tripDates = useMemo(() => {
    if (!tripData) return [];
    const start = parseISO(tripData.start_date);
    const end = parseISO(tripData.end_date);
    return eachDayOfInterval({ start, end });
  }, [tripData]);

  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    if (tripDates.length > 0 && !selectedDate) {
      setSelectedDate(format(tripDates[0], "yyyy-MM-dd"));
    }
  }, [tripDates, selectedDate]);

  // Socket connection
  const { activities, isEditable, isConnected, upsertActivities } =
    useActivitySocket({
      tripId,
      tripDate: selectedDate,
      enabled: !!selectedDate && !!accessToken,
    });

  // Map state
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Keep track of the last date we centered the map for to prevent re-centering on every edit
  const lastCenteredDateRef = useRef<string | null>(null);

  // Update map center only when activities load for a new date
  useEffect(() => {
    if (activities.length > 0 && activities[0]?.activity_location) {
      // Only center if we haven't centered for this date yet
      if (lastCenteredDateRef.current !== selectedDate) {
        setMapCenter({
          lat: activities[0].activity_location.lat,
          lng: activities[0].activity_location.lng,
        });
        lastCenteredDateRef.current = selectedDate;
      }
    }
  }, [activities, selectedDate]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Map Load Handler
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Map Click Handler
  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const placeId = (e as any).placeId;

      if (placeId) {
        if (!map || !window.google) return;

        const placesService = new window.google.maps.places.PlacesService(map);
        placesService.getDetails(
          {
            placeId: placeId,
            fields: [
              "name",
              "formatted_address",
              "geometry",
              "photos",
              "rating",
              "user_ratings_total",
              "reviews",
              "types",
              "website",
              "international_phone_number",
              "opening_hours",
            ],
          },
          (
            place: google.maps.places.PlaceResult | null,
            status: google.maps.places.PlacesServiceStatus,
          ) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place
            ) {
              setSelectedPlace(place);
            }
          },
        );
        return;
      }

      // Clicked on empty map space (dropped pin)
      if (!e.latLng || !map || !window.google) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode(
        { location: { lat, lng } },
        (
          results: google.maps.GeocoderResult[] | null,
          status: google.maps.GeocoderStatus,
        ) => {
          if (status === "OK" && results && results[0]) {
            const placeId = results[0].place_id;
            const placesService = new window.google.maps.places.PlacesService(
              map,
            );
            placesService.getDetails(
              {
                placeId: placeId,
                fields: [
                  "name",
                  "formatted_address",
                  "geometry",
                  "photos",
                  "rating",
                  "user_ratings_total",
                  "reviews",
                  "types",
                  "website",
                  "international_phone_number",
                  "opening_hours",
                ],
              },
              (
                place: google.maps.places.PlaceResult | null,
                status: google.maps.places.PlacesServiceStatus,
              ) => {
                if (
                  status === window.google.maps.places.PlacesServiceStatus.OK &&
                  place
                ) {
                  setSelectedPlace(place);
                } else {
                  // Fallback if details fail
                  setSelectedPlace({
                    name: "Selected Location",
                    formatted_address: results[0].formatted_address,
                    geometry: { location: e.latLng } as any,
                  } as any);
                }
              },
            );
          }
        },
      );
    },
    [map],
  );

  // Add selected place to activity list
  const handleAddPlace = () => {
    if (!selectedPlace || !selectedPlace.geometry?.location) return;

    const newActivity: Activity = {
      id: "", // Empty string for new activities
      start_time: "09:00",
      end_time: "10:00",
      note: "",
      description: "",
      activity_location: {
        name: selectedPlace.name || "Unknown Location",
        address: selectedPlace.formatted_address || "",
        lat: selectedPlace.geometry.location.lat(),
        lng: selectedPlace.geometry.location.lng(),
      },
      category: "NONE",
      rank: activities.length + 1,
    };

    const updatedActivities = [...activities, newActivity];
    upsertActivities(updatedActivities);
    setSelectedPlace(null);
  };

  // Add empty activity without location
  const handleAddEmptyActivity = () => {
    const newActivity: Activity = {
      id: "", // Empty string for new activities
      start_time: "09:00",
      end_time: "10:00",
      note: "",
      description: "",
      activity_location: {
        name: "New Activity",
        address: "",
        lat: mapCenter.lat,
        lng: mapCenter.lng,
      },
      category: "NONE",
      rank: activities.length + 1,
    };

    const updatedActivities = [...activities, newActivity];
    upsertActivities(updatedActivities);
  };

  // Remove Handler
  const handleRemoveActivity = (id: string) => {
    const updatedActivities = activities
      .filter((act) => act.id !== id)
      .map((act, index) => ({ ...act, rank: index + 1 }));
    upsertActivities(updatedActivities);
  };

  // Change Handler
  const handleActivityChange = (updatedActivity: Activity) => {
    const updatedActivities = activities.map((act) =>
      act.id === updatedActivity.id ? updatedActivity : act,
    );
    upsertActivities(updatedActivities);
  };

  // Drag End Handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activities.findIndex((item) => item.id === active.id);
      const newIndex = activities.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(activities, oldIndex, newIndex);
      const updatedActivities = reordered.map((act, index) => ({
        ...act,
        rank: index + 1,
      }));
      upsertActivities(updatedActivities);
    }
  };

  // Clear directions when activities change
  useEffect(() => {
    if (activities.length < 2) {
      setDirections(null);
      return;
    }
  }, [activities]);

  // Calculate ETAs from directions
  const etas = useMemo(() => {
    if (!directions || !directions.routes[0]) return [];
    return directions.routes[0].legs.map((leg) => leg.duration?.text || "");
  }, [directions]);

  // Locations for map markers (derived from activities)
  const locations = useMemo(() => {
    return activities.map((activity) => ({
      id: activity.id || `temp-${activity.rank}`,
      name: activity.activity_location.name,
      address: activity.activity_location.address,
      lat: activity.activity_location.lat,
      lng: activity.activity_location.lng,
    }));
  }, [activities]);

  // Still waiting for localStorage read
  if (!tokenChecked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // No token — not logged in
  if (!accessToken) {
    return (
      <ErrorCard
        error={{
          status: 401,
          message: "You must be logged in to view activities.",
        }}
        title="Authentication Required"
      />
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center">
        Error loading maps
      </div>
    );
  }

  if (tripError) {
    return (
      <ErrorCard error={tripError} title="Failed to Load Trip Activities" />
    );
  }

  if (!isLoaded || isTripLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-[calc(100vw-16rem)] overflow-hidden bg-gray-50">
      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full w-full rounded-lg border"
      >
        {/* Left Panel: Activities List */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
            {/* Day Tabs Navigation */}
            {tripDates.length > 0 && (
              <div className="border-b bg-white dark:bg-slate-950">
                <div
                  className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden"
                  style={{
                    scrollbarWidth: "none" /* Firefox */,
                    msOverflowStyle: "none" /* IE and Edge */,
                  }}
                >
                  {tripDates.map((date, idx) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const isActive = selectedDate === dateStr;
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={cn(
                          "flex-shrink-0 px-6 py-3 text-center border-b-2 transition-colors",
                          isActive
                            ? "border-primary text-foreground font-medium"
                            : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <div className="text-xs font-medium uppercase tracking-wide">
                          DAY {idx + 1}
                        </div>
                        <div className="text-xs mt-0.5">
                          {format(date, "MMM d")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity Input Field */}
            {/* <div className="p-4 pb-3 bg-white dark:bg-slate-950">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder={`Add a place or note to Day ${tripDates.findIndex((d) => format(d, "yyyy-MM-dd") === selectedDate) + 1}...`}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  disabled
                />
              </div>
              {isConnected && (
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-xs">
                    🟢 Live
                  </Badge>
                  <p className="text-muted-foreground text-xs">
                    {isEditable ? "Click map to add locations" : "View only"}
                  </p>
                </div>
              )}
            </div> */}

            {/* Activities List */}
            <ScrollArea className="flex-1 px-4 pt-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activities.map((a) => a.id || `temp-${a.rank}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4 pb-4">
                    {activities.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                        <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p>No activities scheduled</p>
                        <p className="text-xs">
                          Click on the map to find and add places
                        </p>
                      </div>
                    )}
                    {activities.map((activity, index) => (
                      <EditableActivityCard
                        key={activity.id || `temp-${activity.rank}`}
                        activity={activity}
                        index={index}
                        onRemove={handleRemoveActivity}
                        onChange={handleActivityChange}
                        etaText={index > 0 ? etas[index - 1] : undefined}
                        // isEditable={isEditable}
                        isEditable={true}
                      />
                    ))}

                    {/* Add Activity Button */}
                    <Button
                      variant="outline"
                      className="w-full border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors h-auto py-6"
                      onClick={handleAddEmptyActivity}
                      disabled={!isEditable}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      ADD ACTIVITY
                    </Button>
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Map */}
        <ResizablePanel defaultSize={60} minSize={30}>
          <div className="h-full relative">
            {/* Place Details Overlay */}
            {selectedPlace && (
              <PlaceDetails
                place={selectedPlace}
                onAdd={handleAddPlace}
                onClose={() => setSelectedPlace(null)}
              />
            )}

            <ActivityMap
              locations={locations}
              onMapClick={onMapClick}
              directions={directions}
              setDirections={setDirections}
              mapCenter={mapCenter}
              onMapLoad={onMapLoad}
              selectedPlace={selectedPlace}
              onPlaceSelect={(place) => setSelectedPlace(place)}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
