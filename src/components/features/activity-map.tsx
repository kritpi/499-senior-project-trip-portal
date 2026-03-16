"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  Autocomplete,
} from "@react-google-maps/api";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface ActivityMapProps {
  locations: Location[];
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  directions: google.maps.DirectionsResult | null;
  setDirections: (result: google.maps.DirectionsResult | null) => void;
  mapCenter: google.maps.LatLngLiteral;
  onMapLoad?: (map: google.maps.Map) => void;
  selectedPlace?: google.maps.places.PlaceResult | null;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

export function ActivityMap({
  locations,
  onMapClick,
  directions,
  setDirections,
  mapCenter,
  onMapLoad,
  selectedPlace,
  onPlaceSelect,
}: ActivityMapProps) {
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const handleMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      if (onMapLoad) {
        onMapLoad(mapInstance);
      }
    },
    [onMapLoad],
  );

  const onAutocompleteLoad = (
    autocompleteInstance: google.maps.places.Autocomplete,
  ) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        // Pan map to the selected place
        map?.panTo(place.geometry.location);
        map?.setZoom(15);

        // Notify parent component
        if (onPlaceSelect) {
          onPlaceSelect(place);
        }
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Search Bar Overlay */}
      <div className="absolute top-4 left-4 z-10 w-80">
        {/* Note: Using Autocomplete (legacy). Google recommends PlaceAutocompleteElement but 
            Autocomplete will continue to receive bug fixes and is not scheduled for discontinuation.
            Migration to PlaceAutocompleteElement can be done later if needed. */}
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
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
              "place_id",
            ],
          }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search for places..."
              className="pl-11 h-12 bg-card/95 backdrop-blur-sm shadow-lg border-border focus-visible:ring-1 focus-visible:ring-primary rounded-2xl text-base"
            />
          </div>
        </Autocomplete>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={10}
        center={mapCenter}
        onLoad={handleMapLoad}
        onClick={onMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: true,
        }}
      >
        {/* Markers */}
        {locations.map((loc, index) => (
          <Marker
            key={loc.id}
            position={{ lat: loc.lat, lng: loc.lng }}
            label={(index + 1).toString()}
            animation={window.google.maps.Animation.DROP}
          />
        ))}

        {/* Temporary Marker for selection */}
        {selectedPlace && selectedPlace.geometry?.location && (
          <Marker
            position={selectedPlace.geometry.location}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            }}
          />
        )}

        {/* Directions Calculation */}
        {locations.length >= 2 && (
          <DirectionsService
            options={{
              destination: {
                lat: locations[locations.length - 1].lat,
                lng: locations[locations.length - 1].lng,
              },
              origin: { lat: locations[0].lat, lng: locations[0].lng },
              waypoints: locations.slice(1, -1).map((loc) => ({
                location: { lat: loc.lat, lng: loc.lng },
                stopover: true,
              })),
              travelMode: window.google.maps.TravelMode.DRIVING,
            }}
            callback={(result, status) => {
              if (result !== null && status === "OK") {
                if (
                  !directions ||
                  directions.geocoded_waypoints?.length !==
                    result.geocoded_waypoints?.length ||
                  directions.routes[0]?.legs?.length !==
                    result.routes[0]?.legs?.length ||
                  (result.request as any).destination?.location?.lat() !==
                    (directions.request as any).destination?.location?.lat()
                ) {
                  setDirections(result);
                }
              } else if (result !== null && status !== "OK") {
                console.error("Directions request failed", result, status);
              }
            }}
          />
        )}

        {/* Directions Renderer */}
        {directions && (
          <DirectionsRenderer
            options={{
              directions: directions,
              suppressMarkers: true,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
