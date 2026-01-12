import { apiClient } from "@/lib/axios";
import { GetTripsResponse, GetTripsResSchema } from "@/services/schemas/trip";

export const getTrips = async (access_token: string): Promise<GetTripsResponse> => {
    try {
        const { data } = await apiClient.get<GetTripsResponse>('/api/v1/trip/', {
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        });
        return GetTripsResSchema.parse(data);
    } catch (error) {
        throw error;
    }
};
