import { TripInvitationRequest, TripInvitationResponse } from "@/services/schemas/trip";

export const tripInvitation = async (payload: TripInvitationRequest, access_token: string): Promise<TripInvitationResponse> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trips/invitation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('Failed to send trip invitation');
    }

    return response.json();
}