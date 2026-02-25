import { deleteInvitation } from "@/services/api/trip/delete-invitation";
import { DeleteInvitationRequest } from "@/services/schemas/trip";
import { tripKeys } from "@/services/query-keys/trip-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      access_token,
    }: {
      payload: DeleteInvitationRequest;
      access_token: string;
    }) => deleteInvitation(payload, access_token),
    onSuccess: () => {
      console.log("Member invitation deleted successfully");

      // Invalidate and refetch trip queries to update member list
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
    onError: (error) => {
      console.error("Error deleting member invitation: ", error);
    },
  });
};
