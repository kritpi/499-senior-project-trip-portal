"use client"

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import GoogleLoginButton from "@/components/features/google-login-button";
import LogoutButton from "@/components/features/logout-button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";

export default function AuthenticationPage() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam === 'google_auth_failed') {
            toast.error('Authentication failed. Please try again.');
            // Clear the URL parameter without re-rendering
            window.history.replaceState({}, '', '/auth');
        }
    }, [searchParams]);

    return (
        <>
            <Toaster />
            <main className="container mx-auto py-8 max-w-md">
                <div className="space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-2">Authentication</h1>
                        <p className="text-muted-foreground">Sign in to continue</p>
                    </div>

                    <Card className="p-6">
                        <div className="space-y-4">
                            <GoogleLoginButton />
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">or</span>
                                </div>
                            </div>
                            <LogoutButton />
                        </div>
                    </Card>

                    {/* <p className="text-center text-sm text-muted-foreground">
                        By signing in, you agree to our Terms of Service and Privacy Policy
                    </p> */}
                    <div className='w-300px'>

                        {/* <p className='text-center text-sm text-muted-foreground'>
                            {localStorage.getItem("access_token") || ""}
                        </p> */}
                    </div>
                </div>
            </main>
        </>
    );
}