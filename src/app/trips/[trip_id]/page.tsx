"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useGetTripById } from "@/hooks/trip/use-get-trip-by-id";
import { useUpsertTrip } from "@/hooks/trip/use-upsert-trip";
import ProgressLoading from "@/components/ui/loading-animation";
import ErrorCard from "@/components/common/ErrorCard";
import TripForm from "@/components/trip/TripForm";
import type { TripFormRef } from "@/components/trip/TripForm";
import TripInvitation from "@/components/trip/TripInvitation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { UpsertTripRequest } from "@/services/schemas/trip";

export default function TripPage() {
  const params = useParams();
  const router = useRouter();

  const tripId =
    params?.trip_id === "create"
      ? "create"
      : typeof params?.trip_id === "string"
        ? parseInt(params.trip_id, 10)
        : NaN;

  const [accessToken, setAccessToken] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [isNewTrip, setIsNewTrip] = useState(false);
  const [formData, setFormData] = useState<UpsertTripRequest | null>(null);

  const upsertTrip = useUpsertTrip();
  const tripFormRef = useRef<TripFormRef>(null);

  // Load access token ONCE
  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    setAccessToken(token);
    setTokenChecked(true);
  }, []);

  const hasAccessToken = accessToken !== "";
  const isEditTrip = hasAccessToken && typeof tripId === "number" && tripId > 0;
  const isCreateTrip = hasAccessToken && tripId === "create";

  // Decide new vs edit
  useEffect(() => {
    if (isCreateTrip) {
      setIsNewTrip(true);
    } else {
      setIsNewTrip(false);
    }
  }, [isCreateTrip]);

  // Fetch only when editing (isEditTrip already checks hasAccessToken)
  const {
    data: trip,
    isPending,
    error,
  } = useGetTripById(typeof tripId === "number" ? tripId : 0, accessToken, {
    enabled: isEditTrip,
  });

  // Determine if the user has a VIEWER role
  const isViewer = isEditTrip && trip?.role === "VIEWER";

  useEffect(() => {
    if (trip && isEditTrip && trip.image_url) {
      const initialFormData: UpsertTripRequest = {
        trip_id: trip.trip_id,
        trip_name: trip.trip_name,
        start_date: trip.start_date,
        end_date: trip.end_date,
        main_location: trip.main_location,
        description: trip.description,
        image_url: trip.image_url,
      };
      setFormData(initialFormData);
    }
  }, [isEditTrip, trip]);

  // Handle form submission
  const handleFormSubmit = (data: UpsertTripRequest) => {
    setFormData(data);
  };

  // Handle navigation to activities - validate trip is saved first
  const handleNavigateToActivities = async () => {
    if (isViewer) {
      router.push(`/trips/${tripId}/activities`);
      return;
    }

    // Trigger form validation
    const isValid = await tripFormRef.current?.validateForm();

    if (!isValid) {
      console.error("Form validation failed");
      return;
    }

    // Get the latest form data directly from the form ref to avoid race conditions
    const currentFormData = tripFormRef.current?.getFormData();

    // Check if formData exists and has all required fields
    if (
      !currentFormData ||
      !currentFormData.trip_name ||
      !currentFormData.start_date ||
      !currentFormData.end_date ||
      !currentFormData.main_location ||
      !currentFormData.image_url
    ) {
      return;
    }

    // Call upsertTrip API
    upsertTrip.mutate(
      {
        payload: currentFormData,
        access_token: accessToken,
      },
      {
        onSuccess: (response) => {
          // Navigate to activities page using the trip ID from response or currentFormData
          const savedTripId = response.trip_id || currentFormData.trip_id;
          if (savedTripId) {
            router.push(`/trips/${savedTripId}/activities`);
          }
        },
        onError: (error) => {
          console.error("Failed to save trip:", error);
          // Error will be handled by the mutation hook
        },
      },
    );
  };

  // Conditional returns AFTER all hooks

  // Still waiting for localStorage read
  if (!tokenChecked) {
    return <ProgressLoading />;
  }

  // No token — not logged in
  if (!accessToken) {
    return (
      <ErrorCard
        error={{
          status: 401,
          message: "You must be logged in to view this trip.",
        }}
        title="Authentication Required"
      />
    );
  }

  if (isEditTrip && isPending) {
    return <ProgressLoading />;
  }

  if (!isNewTrip && error) {
    return (
      <ErrorCard
        error={error}
        title="Failed to Load Trip"
        onAction={() => router.push("/trips")}
        actionLabel="Back to Trips"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1 pt-10 pb-12 px-12 max-w-full">
        {/* <main className="flex-1 p-8 max-w-5xl"> */}
        <div className="mx-5">
          {/* Section Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="mt-1"
                onClick={() => router.push("/trips")}
              >
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                {/* Breadcrumb */}
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  MY TRIPS <span className="text-primary mx-1">›</span> TRIP
                  SETUP
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Trip Setup &amp; Collaboration
                </h1>
                <p className="text-muted-foreground">
                  Define your journey details and invite your travel crew.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                onClick={handleNavigateToActivities}
                disabled={upsertTrip.isPending}
                variant={"default"}
                size="lg"
              >
                {upsertTrip.isPending ? (
                  "Saving & Continuing..."
                ) : (
                  <>
                    Next Step: Plan Activities
                    <ArrowRight className="ml-2 size-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        {/* Trip Form */}
        <TripForm
          ref={tripFormRef}
          isNewTrip={isNewTrip}
          tripId={tripId}
          accessToken={accessToken}
          {...(trip && trip.image_url ? { initialData: trip } : {})}
          onSubmit={handleFormSubmit}
          onFormChange={handleFormSubmit}
          isViewer={isViewer}
        />

        {/* Member Invitation Section - Show for trips with valid ID */}
        {typeof tripId === "number" && tripId > 0 && (
          <TripInvitation
            tripId={tripId}
            accessToken={accessToken}
            existingMembers={trip?.members?.map((member) => ({
              email: member.email,
              name: member.name,
              role: member.role as "OWNER" | "EDITOR" | "VIEWER",
              avatar: member.image_url || "",
            }))}
            isViewer={isViewer}
          />
        )}
      </main>
    </div>
  );
}
