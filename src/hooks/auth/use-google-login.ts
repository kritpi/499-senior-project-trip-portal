import { useMutation } from '@tanstack/react-query';
import { createGoogleLogin } from '@/services/api/auth/google-auth';
import type { GoogleAuthRequest } from '@/services/schemas/google-login.schema';

export const useGoogleLogin = () => {
  return useMutation({
    mutationFn: (payload: GoogleAuthRequest) => createGoogleLogin(payload),
    onSuccess: (data) => {
      // Store the access token (e.g., in localStorage or cookies)
      localStorage.setItem('access_token', data.access_token);
      // You might also want to redirect the user or update global auth state
    },
    onError: (error) => {
      console.error('Google login failed:', error);
      // You can add additional error handling here (e.g., show toast notification)
    },
  });
};
