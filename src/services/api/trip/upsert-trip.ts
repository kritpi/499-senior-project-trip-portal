import { apiClient } from "@/lib/axios";
import { UpsertTripRequest, UpsertTripResponse, UpsertTripResSchema } from "@/services/schemas/trip";

export const upsertTrip = async (payload: UpsertTripRequest, access_token: string): Promise<UpsertTripResponse> => {
    
    try {        
        const { data } = await apiClient.put<UpsertTripResponse>('/api/v1/trip/', payload, {
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        });
        return UpsertTripResSchema.parse(data);
    } catch (error) {
        console.log('axios err: ',error)
        throw error;
    }
};