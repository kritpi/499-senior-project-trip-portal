import { apiClient } from "@/lib/axios";
import { GetTripByIdResponse, GetTripByIdSchema } from "@/services/schemas/trip"

export const getTripById = async (trip_id: number, access_token: string): Promise<GetTripByIdResponse> => {
    try {
        const { data } = await apiClient.get<GetTripByIdResponse>(`/api/v1/trip/${trip_id}`, {
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        });
        return GetTripByIdSchema.parse(data)
    } catch (error) {
        throw error;
    }
}