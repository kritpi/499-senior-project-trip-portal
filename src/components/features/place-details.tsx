import React from 'react'
import { Star, X, MapPin, Phone, Globe, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import Image from 'next/image'

interface PlaceDetailsProps {
    place: google.maps.places.PlaceResult
    onAdd: () => void
    onClose: () => void
}

export function PlaceDetails({ place, onAdd, onClose }: PlaceDetailsProps) {
    const mainPhotoUrl = place.photos && place.photos.length > 0
        ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
        : null

    return (
        <Card className="absolute top-4 right-4 w-96 max-h-[calc(100%-2rem)] z-10 shadow-xl flex flex-col animate-in fade-in slide-in-from-right-5">
            <div className="relative">
                {mainPhotoUrl && (
                    <div className="h-48 w-full relative bg-slate-100 rounded-t-lg overflow-hidden">
                        {/* Note: Using standard img tag because Google Maps URLs are external and dynamic */}
                        <img
                            src={mainPhotoUrl}
                            alt={place.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white text-black rounded-full h-8 w-8"
                    onClick={onClose}
                >
                    <X size={16} />
                </Button>
            </div>

            <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-start justify-between gap-2">
                    {place.name}
                </CardTitle>
                <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                    <span className="flex items-center">
                        {place.rating} <Star size={14} className="fill-current ml-0.5" />
                    </span>
                    <span className="text-muted-foreground font-normal">
                        ({place.user_ratings_total?.toLocaleString()} reviews)
                    </span>
                </div>
                <CardDescription className="text-xs space-y-1 mt-1">
                    {place.formatted_address}
                </CardDescription>

                <div className="flex flex-wrap gap-2 mt-2">
                    {place.types?.slice(0, 3).map((type) => (
                        <span key={type} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] capitalize text-muted-foreground">
                            {type.replace(/_/g, ' ')}
                        </span>
                    ))}
                </div>
            </CardHeader>

            <div className="p-4 pt-0">
                <Button onClick={onAdd} className="w-full mb-4">
                    <Plus size={16} className="mr-2" /> Add to Trip
                </Button>
            </div>

            <Separator />

            <ScrollArea className="flex-1">
                <CardContent className="space-y-4 pt-4">
                    {/* Contact Info */}
                    <div className="space-y-2 text-sm">
                        {place.international_phone_number && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone size={14} />
                                <span>{place.international_phone_number}</span>
                            </div>
                        )}
                        {place.website && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Globe size={14} />
                                <a href={place.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate max-w-[250px]">
                                    Visit Website
                                </a>
                            </div>
                        )}
                        {place.opening_hours && (
                            <div className="flex items-start gap-2 text-muted-foreground">
                                <Clock size={14} className="mt-0.5" />
                                <div>
                                    <p className={place.opening_hours.isOpen() ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                        {place.opening_hours.isOpen() ? "Open Now" : "Closed"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Reviews */}
                    <div>
                        <h4 className="font-semibold mb-3 text-sm">Reviews</h4>
                        <div className="space-y-4">
                            {place.reviews?.slice(0, 3).map((review, i) => (
                                <div key={i} className="text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <img src={review.profile_photo_url} alt={review.author_name} className="w-6 h-6 rounded-full" />
                                            <span className="font-medium text-xs">{review.author_name}</span>
                                        </div>
                                        <div className="flex text-amber-500 text-[10px]">
                                            {Array.from({ length: 5 }).map((_, starI) => (
                                                <Star
                                                    key={starI}
                                                    size={10}
                                                    className={starI < (review.rating || 0) ? "fill-current" : "text-slate-200 dark:text-slate-700"}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground text-xs line-clamp-3 italic">"{review.text}"</p>
                                </div>
                            ))}
                            {(!place.reviews || place.reviews.length === 0) && (
                                <p className="text-muted-foreground text-xs">No reviews available.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </ScrollArea>
        </Card>
    )
}
