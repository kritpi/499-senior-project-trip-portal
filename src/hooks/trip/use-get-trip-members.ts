import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getTripMembers } from "@/services/api/trip/get-trip-members";
import { tripKeys } from "@/services/query-keys/trip-keys";
import { GetTripMemberResponse } from "@/services/schemas/member";

export const useGetTripMembers = (
  trip_id: number,
  access_token: string,
  options?: Omit<UseQueryOptions<GetTripMemberResponse>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: tripKeys.members(trip_id),
    queryFn: () => getTripMembers(trip_id, access_token),
    enabled: !!access_token && !!trip_id,
    ...options,
  });
};
