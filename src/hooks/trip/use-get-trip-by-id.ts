import { getTripById } from "@/services/api/trip/get-trip-by-id"
import { tripKeys } from "@/services/query-keys/trip-keys"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"

type TripQueryResult = Awaited<ReturnType<typeof getTripById>>

export const useGetTripById = (
    trip_id: number, 
    access_token: string,
    options?: Omit<UseQueryOptions<TripQueryResult>, 'queryKey' | 'queryFn'>
) => {    
    return useQuery({
        queryKey: tripKeys.detail(trip_id),
        queryFn: () => getTripById(trip_id, access_token),
        ...options, // Caller controls enabled state
    });
};
