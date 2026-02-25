"use client";

import { useState } from "react";
import { z } from "zod";
import { useTripInvitation } from "@/hooks/trip/use-trip-invitation";
import { useDeleteInvitation } from "@/hooks/trip/use-delete-invitation";
import { Loader2, UserPlus, X, Users } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  user_id?: number;
  email: string;
  name?: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  avatar?: string;
  isPending?: boolean;
}

interface TripInvitationProps {
  tripId: number;
  accessToken: string;
  existingMembers?: Member[];
}

export default function TripInvitation({
  tripId,
  accessToken,
  existingMembers = [],
}: TripInvitationProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviteError, setInviteError] = useState<string>("");
  const [emailValidationError, setEmailValidationError] = useState<string>("");

  const tripInvitation = useTripInvitation();
  const deleteInvitation = useDeleteInvitation();

  // Email validation schema
  const emailSchema = z.string().email("Invalid email address");

  // Email validation function using Zod
  const validateEmail = (
    email: string,
  ): { isValid: boolean; error?: string } => {
    if (!email) return { isValid: true }; // Don't show error for empty field

    const result = emailSchema.safeParse(email);
    if (result.success) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        error: result.error.issues[0]?.message || "Invalid email address",
      };
    }
  };

  // Use existing members from API
  const sortedMembers = existingMembers.sort((a, b) => {
    const roleOrder = { OWNER: 0, EDITOR: 1, VIEWER: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  // Get role-based badge styling
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-red-100 text-red-700 border-red-200";
      case "EDITOR":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "VIEWER":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleAddMember = () => {
    if (!inviteEmail || !inviteRole) {
      return;
    }

    // Validate email format using Zod
    const validation = validateEmail(inviteEmail);
    if (!validation.isValid) {
      setEmailValidationError(validation.error || "Invalid email address");
      return;
    }

    // Clear any previous errors
    setInviteError("");
    setEmailValidationError("");
    console.log(inviteEmail);
    console.log(inviteRole);
    // Call API immediately to add the member
    tripInvitation.mutate(
      {
        payload: {
          trip_id: tripId,
          email: inviteEmail,
          role: inviteRole,
        },
        access_token: accessToken,
      },
      {
        onSuccess: () => {
          // The member list will be automatically refreshed via query invalidation
          // in the useTripInvitation hook, so we don't need to manually update state
          // Reset form
          setInviteEmail("");
          setInviteRole("EDITOR");
          setInviteError("");
          setEmailValidationError("");
        },
        onError: (error: any) => {
          // Display error message below the field
          const errorMessage =
            error?.response?.data?.message ||
            "Cannot invite non-existent member";
          setInviteError(errorMessage);
        },
      },
    );
  };

  const handleRemoveMember = (member: Member) => {
    // Don't allow removing the owner
    if (member.role === "OWNER") {
      return;
    }

    // Call API to delete the member invitation
    deleteInvitation.mutate(
      {
        payload: {
          trip_id: tripId,
          email: member.email,
        },
        access_token: accessToken,
      },
      {
        onSuccess: () => {
          console.log("Member removed successfully");
          // The member list will be automatically refreshed via query invalidation
        },
        onError: (error: any) => {
          console.error("Error removing member:", error);
          // Optionally show an error message to the user
        },
      },
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="size-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Invite Members</h2>
        <Badge variant="outline" className="ml-auto">
          STEP 2 OF 3
        </Badge>
      </div>

      {/* THE TRAVEL CREW */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          The Travel Crew
        </h3>
        <div className="flex flex-wrap gap-3">
          {sortedMembers.map((member, index) => (
            <div
              key={member.email || index}
              className="relative inline-flex items-center gap-2 pl-2 pr-4 py-2 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <Avatar
                src={member.avatar}
                alt={member.name || member.email}
                fallback={
                  member.name
                    ? member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : member.email.charAt(0).toUpperCase()
                }
                size="sm"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-gray-900 leading-none">
                  {member.name || member.email}
                </span>
                <Badge
                  className={`text-[10px] uppercase leading-none h-auto py-0.5 px-1.5 w-fit border ${getRoleBadgeClass(
                    member.role,
                  )}`}
                >
                  {member.role}
                </Badge>
              </div>
              {/* Show X button for all members except OWNER */}
              {member.role !== "OWNER" && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member)}
                  className="ml-1 p-0.5 text-gray-400 hover:text-red-600 transition-colors"
                  aria-label="Remove member"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <Field>
            <FieldLabel>Email Address</FieldLabel>
            <Input
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => {
                const newEmail = e.target.value;
                setInviteEmail(newEmail);
                // Clear API error when user starts typing
                if (inviteError) setInviteError("");
                // Validate email format in real-time using Zod
                if (newEmail) {
                  const validation = validateEmail(newEmail);
                  if (!validation.isValid) {
                    setEmailValidationError(
                      validation.error || "Invalid email address",
                    );
                  } else {
                    setEmailValidationError("");
                  }
                } else {
                  setEmailValidationError("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMember();
                }
              }}
            />
            {emailValidationError && (
              <p className="text-sm text-red-600 mt-1">
                {emailValidationError}
              </p>
            )}
            {inviteError && !emailValidationError && (
              <p className="text-sm text-red-600 mt-1">{inviteError}</p>
            )}
          </Field>

          <Field className="md:w-40">
            <FieldLabel>Role</FieldLabel>
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

        {/* Add Another Member Button */}
        <Button
          type="button"
          onClick={handleAddMember}
          disabled={
            !inviteEmail || tripInvitation.isPending || !!emailValidationError
          }
          variant="outline"
          className="w-full"
        >
          {tripInvitation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Adding member...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 size-4" />
              Add another member
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
