import { apiClient } from "@/lib/axios";
import { GoogleAuthRequest, GoogleAuthResp } from "@/services/schemas/google-login.schema";
import { AxiosError } from "axios";

export const createGoogleLogin = async (payload: GoogleAuthRequest): Promise<GoogleAuthResp> => {
  try {
    const { data } = await apiClient.post<GoogleAuthResp>('/api/v1/auth/google', payload);
    // Zod validation ensures data structure is correct
    return GoogleAuthResp.parse(data);
  } catch (error) {
    // Re-throw with more context
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(`Google login failed (${status}): ${errorMessage}`);
    }
    throw error;
  }
};