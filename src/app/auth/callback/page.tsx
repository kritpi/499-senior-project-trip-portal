"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@/hooks/auth/use-google-login";

export default function GoogleCallback() {
  const hasCalled = useRef(false); // Prevents double-execution in React strict mode
  const router = useRouter();
  const { mutate: googleLogin, isPending, error } = useGoogleLogin();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const codeVerifier = localStorage.getItem("google_code_verifier");

    if (!code || !codeVerifier || hasCalled.current) return;
    hasCalled.current = true;

    // Use the React Query mutation hook
    googleLogin(
      {
        code: code,
        code_verifier: codeVerifier, // Fixed typo to match schema
        redirect_uri: window.location.origin + window.location.pathname,
      },
      {
        onSuccess: () => {
          // Clean up code verifier
          localStorage.removeItem("google_code_verifier");
          // Redirect to dashboard/home
          router.push("/auth");
        },
        onError: (error) => {
          console.error("Google login failed:", error);
          // Optionally redirect to login page with error
          router.push("/auth?error=google_auth_failed");
        },
      }
    );
  }, [googleLogin, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500">Authentication failed. Please try again.</p>
        <button onClick={() => router.push("/login")} className="mt-4">
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>{isPending ? "Signing you in..." : "Redirecting..."}</p>
    </div>
  );
}