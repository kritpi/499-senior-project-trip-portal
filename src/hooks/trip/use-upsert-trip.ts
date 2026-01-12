import { upsertTrip } from "@/services/api/trip/upsert-trip"
import { UpsertTripRequest } from "@/services/schemas/trip"
import { tripKeys } from "@/services/query-keys/trip-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export const useUpsertTrip = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ payload, access_token }: { payload: UpsertTripRequest; access_token: string }) => 
            upsertTrip(payload, access_token),        
        onSuccess: (data) => {
            // log trip id
            console.log("Trip id: ", data.trip_id);
            
            // Invalidate and refetch trip queries
            queryClient.invalidateQueries({ queryKey: tripKeys.all });
        },
        onError: (error) => {
            console.error("Error upsert trip: ", error);
        }
    });
};