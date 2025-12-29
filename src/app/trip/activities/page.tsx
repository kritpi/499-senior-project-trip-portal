"use client"

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Loader2, MapPin, GripVertical, X } from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// --- Types ---

interface Location {
    id: string
    name: string
    address: string
    lat: number
    lng: number
}

interface MapComponentProps {
    locations: Location[]
    onMapClick: (e: google.maps.MapMouseEvent) => void
    directions: google.maps.DirectionsResult | null
    setDirections: (result: google.maps.DirectionsResult | null) => void
    mapCenter: google.maps.LatLngLiteral
}

// --- Map Constants ---

const mapContainerStyle = {
    width: '100%',
    height: '100%',
}

const defaultCenter = {
    lat: 13.7563, // Bangkok
    lng: 100.5018,
}

// --- Sortable Item Component ---

function SortableLocationItem({
    location,
    index,
    onRemove,
    etaText,
}: {
    location: Location
    index: number
    onRemove: (id: string) => void
    etaText?: string
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: location.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    }

    return (
        <div ref={setNodeRef} style={style} className="mb-4">
            {etaText && (
                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                        🚗 {etaText}
                    </span>
                </div>
            )}
            <Card className={cn("relative", isDragging && "opacity-50 ring-2 ring-primary")}>
                <CardContent className="p-4 flex items-start gap-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                    >
                        <GripVertical size={20} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-sm leading-none">{location.name}</h4>
                        <p className="text-xs text-muted-foreground">{location.address}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                        onClick={() => onRemove(location.id)}
                    >
                        <X size={16} />
                    </Button>
                </CardContent>
            </Card>
            {/* Marker Number Badge in list logic could be added here if desired */}
        </div>
    )
}

// --- Main Page Component ---

// ... (imports remain mostly same, adding PlaceDetails)
import { PlaceDetails } from '@/components/features/place-details'

// ... (existing imports)

// --- Sortable Item Component --- (Unchanged)

// --- Main Page Component ---

export default function TripActivitiesPage() {
    // const params = useParams()
    // const trip_id = params.trip_id as string
    const trip_id = 12

    // State
    const [locations, setLocations] = useState<Location[]>([])
    const [mapCenter, setMapCenter] = useState(defaultCenter)
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
    const [map, setMap] = useState<google.maps.Map | null>(null) // Keep track of map instance
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null)

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places'],
    })

    // DnD Sensors (Unchanged)
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Map Load Handler
    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance)
    }, [])

    // Map Click Handler
    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        // e.placeId exists if user clicked on a POI (Point of Interest) icon
        const placeId = (e as any).placeId

        if (placeId) {
            // Stop converting click to coordinate immediately if POI content
            // Need to stop event propagation if possible, but map events are tricky.
            // Actually, we should just prioritize placeId logic.
            if (!map || !window.google) return;

            const placesService = new window.google.maps.places.PlacesService(map)
            placesService.getDetails({
                placeId: placeId,
                fields: ['name', 'formatted_address', 'geometry', 'photos', 'rating', 'user_ratings_total', 'reviews', 'types', 'website', 'international_phone_number', 'opening_hours']
            }, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    setSelectedPlace(place)
                    // Center map on place?
                    // map.panTo(place.geometry!.location!)
                }
            })
            return;
        }

        // Clicked on empty map space (dropped pin)
        if (!e.latLng || !map || !window.google) return

        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        const geocoder = new window.google.maps.Geocoder()

        geocoder.geocode({ location: { lat, lng } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
            if (status === 'OK' && results && results[0]) {
                // Even for reverse geocoding, we might want "details" to get photos etc.
                // But geocoding result doesn't give photos/reviews usually.
                // We can use the place_id from geocode to fetch details.
                const placeId = results[0].place_id
                const placesService = new window.google.maps.places.PlacesService(map)
                placesService.getDetails({
                    placeId: placeId,
                    fields: ['name', 'formatted_address', 'geometry', 'photos', 'rating', 'user_ratings_total', 'reviews', 'types', 'website', 'international_phone_number', 'opening_hours']
                }, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                        setSelectedPlace(place)
                    } else {
                        // Fallback if details fail (shouldn't happen for valid place_id)
                        // Construct a minimal "place" object
                        setSelectedPlace({
                            name: "Selected Location",
                            formatted_address: results[0].formatted_address,
                            geometry: { location: e.latLng } as any
                        } as any)
                    }
                })
            }
        })
    }, [map])

    // Add selected place to list
    const handleAddPlace = () => {
        if (!selectedPlace || !selectedPlace.geometry?.location) return

        const newLocation: Location = {
            id: crypto.randomUUID(),
            name: selectedPlace.name || "Unknown Location",
            address: selectedPlace.formatted_address || "",
            lat: selectedPlace.geometry.location.lat(),
            lng: selectedPlace.geometry.location.lng(),
        }

        setLocations((prev) => [...prev, newLocation])
        setSelectedPlace(null) // Close details after adding
    }

    // Remove Handler
    const handleRemoveLocation = (id: string) => {
        setLocations((prev) => prev.filter((loc) => loc.id !== id))
    }

    // Drag End Handler
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setLocations((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    useEffect(() => {
        console.log(locations.map((location, index) => ({
            ...location,
            rank: index + 1
        })))
    }, [locations])

    // Directions Service Effect (Unchanged logic, just ensure hooks are clean)
    useEffect(() => {
        if (locations.length < 2) {
            setDirections(null)
            return
        }
    }, [locations])

    const etas = useMemo(() => {
        if (!directions || !directions.routes[0]) return []
        return directions.routes[0].legs.map(leg => leg.duration?.text || "")
    }, [directions])


    if (loadError) {
        return <div className="flex h-screen items-center justify-center">Error loading maps</div>
    }

    if (!isLoaded) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full flex-col md:flex-row overflow-hidden relative">
            {/* Left Panel: List */}
            <div className="w-full md:w-1/2 p-4 flex flex-col border-r bg-slate-50/50 dark:bg-slate-900/50 z-20">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold">Trip Activities</h1>
                    <p className="text-muted-foreground text-sm">Drag to reorder. Click map to search.</p>
                </div>

                <ScrollArea className="flex-1 pr-4">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={locations.map(l => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-4 pb-10">
                                {locations.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                        <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                        <p>No locations selected</p>
                                        <p className="text-xs">Click on the map to find places</p>
                                    </div>
                                )}
                                {locations.map((loc, index) => (
                                    <SortableLocationItem
                                        key={loc.id}
                                        location={loc}
                                        index={index}
                                        onRemove={handleRemoveLocation}
                                        etaText={index > 0 ? etas[index - 1] : undefined}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </ScrollArea>
            </div>

            {/* Right Panel: Map */}
            <div className="w-full md:w-1/2 h-[50vh] md:h-auto relative">

                {/* Place Details Overlay */}
                {selectedPlace && (
                    <PlaceDetails
                        place={selectedPlace}
                        onAdd={handleAddPlace}
                        onClose={() => setSelectedPlace(null)}
                    />
                )}

                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    zoom={10}
                    center={mapCenter}
                    onLoad={onMapLoad}
                    onClick={onMapClick}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        clickableIcons: true, // Allow clicking POIs
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

                    {/* Temporary Marker for selection? Optional, can add if desired */}
                    {selectedPlace && selectedPlace.geometry?.location && (
                        <Marker
                            position={selectedPlace.geometry.location}
                            icon={{
                                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                            }}
                        />
                    )}

                    {/* Directions Calculation */}
                    {locations.length >= 2 && (
                        <DirectionsService
                            options={{
                                destination: { lat: locations[locations.length - 1].lat, lng: locations[locations.length - 1].lng },
                                origin: { lat: locations[0].lat, lng: locations[0].lng },
                                waypoints: locations.slice(1, -1).map(loc => ({
                                    location: { lat: loc.lat, lng: loc.lng },
                                    stopover: true
                                })),
                                travelMode: window.google.maps.TravelMode.DRIVING,
                            }}
                            callback={(result, status) => {
                                if (result !== null && status === 'OK') {
                                    if (
                                        !directions ||
                                        directions.geocoded_waypoints?.length !== result.geocoded_waypoints?.length ||
                                        directions.routes[0]?.legs?.length !== result.routes[0]?.legs?.length ||
                                        (result.request as any).destination?.location?.lat() !== (directions.request as any).destination?.location?.lat()
                                    ) {
                                        setDirections(result)
                                    }
                                } else if (result !== null && status !== 'OK') {
                                    console.error("Directions request failed", result, status)
                                }
                            }}
                        />
                    )}

                    {/* Directions Renderer */}
                    {directions && (
                        <DirectionsRenderer
                            options={{
                                directions: directions,
                                suppressMarkers: true, // We are rendering our own markers
                            }}
                        />
                    )}
                </GoogleMap>
            </div>
        </div>
    )
}
