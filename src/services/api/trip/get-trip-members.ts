import { apiClient } from "@/lib/axios";
import { GetTripMemberSchema, GetTripMemberResponse } from "@/services/schemas/member";
import z from "zod";

export const getTripMembers = async (
  trip_id: number,
  access_token: string
): Promise<GetTripMemberResponse> => {
  try {
    const { data } = await apiClient.get<GetTripMemberResponse>(
      `/api/v1/trip/${trip_id}/members`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    console.log(data)
    // return z.array(MemberSchema).parse(data);
    return GetTripMemberSchema.parse(data)
  } catch (error) {
    throw error;
  }
};
