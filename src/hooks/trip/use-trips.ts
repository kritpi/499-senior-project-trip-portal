import { useQuery } from '@tanstack/react-query';
import { getTrips } from '@/services/api/trip/get-trips';
import { tripKeys } from '@/services/query-keys/trip-keys';

export const useTrips = (access_token: string) => {
  return useQuery({
    queryKey: tripKeys.lists(),
    queryFn: () => getTrips(access_token),
    enabled: !!access_token, // Only fetch when access_token is available
  });
};
