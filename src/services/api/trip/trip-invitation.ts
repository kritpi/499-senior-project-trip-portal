import { apiClient } from "@/lib/axios";
import { TripInvitationRequest, TripInvitationResponse } from "@/services/schemas/trip";

export const tripInvitation = async (payload: TripInvitationRequest, access_token: string): Promise<TripInvitationResponse> => {
    console.log(payload)
    
    try {
        const { data } = await apiClient.post<TripInvitationResponse>('/api/v1/trip/invitation', payload, {
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        });
        return TripInvitationResponse.parse(data)
    } catch (error) {
        console.log('axios err: ', error)
        throw error;
    }
}