import { z } from "zod";
import { MemberSchema } from "./member";

export const UpsertTripReqSchema = z.object({
    trip_id: z.number().optional(),
    trip_name: z.string().min(1, "Trip name is required"),
    description: z.string().min(1, "Description is required"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    main_location: z.string().min(1, "Main location is required"),
    image_url: z.string().min(1, "Trip image is required")
})

export const UpsertTripResSchema = z.object({
    trip_id: z.number()
})

export type UpsertTripRequest = z.infer<typeof UpsertTripReqSchema>;
export type UpsertTripResponse = z.infer<typeof UpsertTripResSchema>;

// GET trips schemas
export const TripSchema = z.object({
    trip_id: z.number(),
    trip_name: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    main_location: z.string(),
    image_url: z.string(),
    role: z.enum(["OWNER", "EDITOR", "VIEWER"])
})

export const GetTripsResSchema = z.object({
    trips: z.array(TripSchema)
})

export type Trip = z.infer<typeof TripSchema>;
export type GetTripsResponse = z.infer<typeof GetTripsResSchema>;

export const GetTripByIdSchema = z.object({
    trip_id: z.number(),
    owner_id: z.string().optional(),
    trip_name: z.string(),
    description: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    main_location: z.string(),
    image_url: z.string().optional(),
    role: z.string(),
    members: z.array(MemberSchema)
})

export type GetTripByIdResponse = z.infer<typeof GetTripByIdSchema>;

export const TripInvitationRequest = z.object({
    trip_id: z.number(),
    email: z.string().email("invalid email address"),
    role: z.string()
})
export type TripInvitationRequest = z.infer<typeof TripInvitationRequest>;

export const TripInvitationResponse = z.object({
    email: z.string(),
    role: z.string()
})
export type TripInvitationResponse = z.infer<typeof TripInvitationResponse>;

export const DeleteInvitationRequest = z.object({
    trip_id: z.number(),
    email: z.string().email()
})
export type DeleteInvitationRequest = z.infer<typeof DeleteInvitationRequest>;