"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useGetTripById } from "@/hooks/trip/use-get-trip-by-id";
import ProgressLoading from "@/components/ui/loading-animation";
import ErrorCard from "@/components/common/ErrorCard";
import { useUpsertTrip } from "@/hooks/trip/use-upsert-trip";
import { useTripInvitation } from "@/hooks/trip/use-trip-invitation";
import { useForm, Controller } from "react-hook-form";
import z from "zod";
import {
  UpsertTripReqSchema,
  UpsertTripRequest,
} from "@/services/schemas/trip";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Loader2, AlertCircle, UserPlus, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TripPage() {
  const POPULAR_CITIES = [
    "Bangkok, Thailand",
    "Tokyo, Japan",
    "Singapore",
    "Seoul, South Korea",
    "Hong Kong",
    "Taipei, Taiwan",
    "Paris, France",
    "London, United Kingdom",
    "New York, USA",
  ];
  const params = useParams();
  const router = useRouter();

  const tripId =
    params?.trip_id === "create"
      ? "create"
      : typeof params?.trip_id === "string"
      ? parseInt(params.trip_id, 10)
      : NaN;

  const [accessToken, setAccessToken] = useState("");
  const [isNewTrip, setIsNewTrip] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
  const [membersToInvite, setMembersToInvite] = useState<
    Array<{ email: string; role: "EDITOR" | "VIEWER" }>
  >([]);

  // Load access token ONCE
  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    setAccessToken(token);
  }, []);

  const hasAccessToken = accessToken !== "";
  const isEditTrip = hasAccessToken && typeof tripId === "number" && tripId > 0;
  const isCreateTrip = hasAccessToken && tripId === "create";
  type FormValues = z.infer<typeof UpsertTripReqSchema>;
  const emptyTripValues: UpsertTripRequest = {
    trip_name: "",
    description: "",
    start_date: "",
    end_date: "",
    main_location: "",
  };

  // Decide new vs edit
  useEffect(() => {
    if (isCreateTrip) {
      setIsNewTrip(true);
    } else {
      setIsNewTrip(false);
    }
  }, [isCreateTrip]);

  const form = useForm<FormValues>({
    resolver: zodResolver(UpsertTripReqSchema),
    defaultValues: emptyTripValues,
  });

  const upsertTrip = useUpsertTrip();
  const tripInvitation = useTripInvitation();

  const onSubmit = (data: FormValues) => {
    const payload: UpsertTripRequest = {
      ...(isEditTrip && tripId ? { trip_id: tripId } : {}),
      trip_name: data.trip_name,
      description: data.description,
      start_date: data.start_date,
      end_date: data.end_date,
      main_location: data.main_location,
    };
    console.log("payload: ", payload);
    console.log("access token: ", accessToken);

    upsertTrip.mutate(
      { payload, access_token: accessToken },
      {
        onSuccess: () => {
          router.push("/trips");
        },
      }
    );
  };

  const handleAddMember = () => {
    if (!inviteEmail || !inviteRole) {
      return;
    }

    // Check if email already exists
    if (membersToInvite.some((m) => m.email === inviteEmail)) {
      // You could show an error message here
      return;
    }

    setMembersToInvite([
      ...membersToInvite,
      { email: inviteEmail, role: inviteRole },
    ]);
    setInviteEmail("");
    setInviteRole("VIEWER");
  };

  const handleRemoveMember = (emailToRemove: string) => {
    setMembersToInvite(
      membersToInvite.filter((m) => m.email !== emailToRemove)
    );
  };

  const handleSendInvitations = () => {
    if (membersToInvite.length === 0 || typeof tripId !== "number") {
      return;
    }

    tripInvitation.mutate(
      {
        payload: {
          trip_id: tripId,
          member: membersToInvite,
        },
        access_token: accessToken,
      },
      {
        onSuccess: () => {
          // Reset form
          setMembersToInvite([]);
          setInviteEmail("");
          setInviteRole("VIEWER");
          setShowInviteForm(false);
        },
      }
    );
  };

  // Fetch only when editing (isEditTrip already checks hasAccessToken)
  const {
    data: trip,
    isPending,
    error,
  } = useGetTripById(typeof tripId === "number" ? tripId : 0, accessToken, {
    enabled: isEditTrip,
  });

  // Populate form when trip data is loaded (must be before conditional returns)
  useEffect(() => {
    if (trip) {
      form.reset({
        trip_id: trip.trip_id,
        trip_name: trip.trip_name,
        description: trip.description,
        start_date: trip.start_date,
        end_date: trip.end_date,
        main_location: trip.main_location,
      });

      // Also populate the dateRange state for the calendar
      if (trip.start_date && trip.end_date) {
        setDateRange({
          from: new Date(trip.start_date),
          to: new Date(trip.end_date),
        });
      }
    }
  }, [trip, form]);

  // Conditional returns AFTER all hooks
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
    <main className="container mx-auto py-8 flex justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>{isNewTrip ? "Create Trip" : "Edit Trip"}</CardTitle>
          <CardDescription>
            {isNewTrip
              ? "Update your trip details"
              : "Plan your next adventure"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel>Trip Name *</FieldLabel>
                <Input
                  placeholder="Summer Vacation 2026"
                  {...form.register("trip_name")}
                />
                <FieldError errors={[form.formState.errors.trip_name]} />
              </Field>

              <Field>
                <FieldLabel>Description *</FieldLabel>
                <Textarea
                  placeholder="Tell us about your trip..."
                  {...form.register("description")}
                />
                <FieldError errors={[form.formState.errors.description]} />
              </Field>

              <Field>
                <FieldLabel>Main Location *</FieldLabel>
                <Controller
                  name="main_location"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a city" />
                      </SelectTrigger>
                      <SelectContent>
                        {POPULAR_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.main_location]} />
              </Field>

              <Field>
                <FieldLabel>Trip Dates *</FieldLabel>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from) {
                      form.setValue(
                        "start_date",
                        range.from.toISOString().split("T")[0]
                      );
                    }
                    if (range?.to) {
                      form.setValue(
                        "end_date",
                        range.to.toISOString().split("T")[0]
                      );
                    }
                  }}
                  numberOfMonths={2}
                  className="w-full"
                />
                <FieldError
                  errors={[
                    form.formState.errors.start_date,
                    form.formState.errors.end_date,
                  ]}
                />
              </Field>

              <Button
                type="submit"
                className="w-full"
                disabled={upsertTrip.isPending}
              >
                {upsertTrip.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : isNewTrip ? (
                  "Create Trip"
                ) : (
                  "Update Trip"
                )}
              </Button>
            </FieldGroup>
          </form>

          {/* Member Invitation Section - Only show for existing trips */}
          {isEditTrip && typeof tripId === "number" && (
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Invite Members</h3>
                  <p className="text-sm text-gray-500">
                    Invite others to collaborate on this trip
                  </p>
                </div>
                {showInviteForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail("");
                      setInviteRole("VIEWER");
                      setMembersToInvite([]);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>

              {!showInviteForm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(true)}
                  className="w-full"
                >
                  <UserPlus className="mr-2 size-4" />
                  Add Member
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* List of members to invite */}
                  {membersToInvite.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Members to invite ({membersToInvite.length}):
                      </p>
                      <div className="space-y-2">
                        {membersToInvite.map((member, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md border"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {member.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                Role: {member.role}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.email)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              aria-label="Remove member"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input fields for new member */}
                  <div className="flex items-end gap-2">
                    <Field className="flex-1">
                      <FieldLabel>Email Address *</FieldLabel>
                      <Input
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddMember();
                          }
                        }}
                      />
                    </Field>

                    <Field className="w-40">
                      <FieldLabel>Role *</FieldLabel>
                      <Select
                        value={inviteRole}
                        onValueChange={(value: "EDITOR" | "VIEWER") =>
                          setInviteRole(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EDITOR">Editor</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Full-width Add Member button */}
                  <Button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!inviteEmail}
                    variant="outline"
                    className="w-full"
                  >
                    <UserPlus className="mr-2 size-4" />
                    Add Member
                  </Button>

                  {/* Send Invitations Button - only show if there are members */}
                  {membersToInvite.length > 0 && (
                    <Button
                      type="button"
                      onClick={handleSendInvitations}
                      disabled={tripInvitation.isPending}
                      className="w-full"
                    >
                      {tripInvitation.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Sending Invitations...
                        </>
                      ) : (
                        `Send ${membersToInvite.length} Invitation${
                          membersToInvite.length !== 1 ? "s" : ""
                        }`
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
