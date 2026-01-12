import { tripInvitation } from "@/services/api/trip/trip-invitation";
import { TripInvitationRequest } from "@/services/schemas/trip";
import { tripKeys } from "@/services/query-keys/trip-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useTripInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      access_token,
    }: {
      payload: TripInvitationRequest;
      access_token: string;
    }) => tripInvitation(payload, access_token),
    onSuccess: (data) => {
      console.log("Trip invitation sent: ", data);

      // Invalidate and refetch trip queries to update member list
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
    onError: (error) => {
      console.error("Error sending trip invitation: ", error);
    },
  });
};
