import { apiClient } from "@/lib/axios";
import { DeleteInvitationRequest } from "@/services/schemas/trip";

export const deleteInvitation = async (payload: DeleteInvitationRequest, access_token: string): Promise<void> => {
    try {
        await apiClient.delete('/api/v1/trip/invitation', {
            data: payload,
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        });
    } catch (error) {
        console.log('axios err: ', error);
        throw error;
    }
}
