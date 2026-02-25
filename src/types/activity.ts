export interface ClientToServerEvents {
  "activity:join": (payload: ActivityJoinPayload) => void

  "activity:leave": (payload: ActivityLeavePayload) => void

  "activity:upsert": (payload: ActivityUpsertPayload) => void
}

export interface ServerToClientEvents {
  "activity:broadcast": (payload: ActivityBroadcastResponse) => void
  // Note: activity:join response comes on the same event name (bidirectional)
  "activity:join": (payload: ActivityJoinResponse) => void
}
// Activity types and interfaces for socket.io events
export interface ActivityLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export type ActivityCategory = "FOOD" | "ATTRACTION" | "ACCOMMODATION" | "TRANSPORT" | "OTHER" | "NONE";

export interface Activity {
  id: string;
  trip_id?: number;
  activity_date?: string;
  start_time: string;
  end_time: string;
  note: string;
  description: string;
  activity_location: ActivityLocation;
  category: ActivityCategory;
  rank: number;
}

export interface ActivityJoinPayload {
  trip_id: number;
  trip_date: string;
}

export interface ActivityLeavePayload {
  trip_id: number;
  trip_date: string;
}

export interface ActivityJoinResponse {
  trip_id: number;
  date: string;
  activities: Activity[];
  is_editable: boolean;
}

export interface ActivityUpsertPayload {
  trip_id: number;
  date: string;
  activities: Activity[];
}

export interface ActivityUpsertResponse {
  message: string;
}

export interface ActivityBroadcastPayload {
  trip_id: number;
  trip_date: string;
}

export interface ActivityBroadcastResponse {
  trip_id: number;
  date: string;
  activities: Activity[];
  is_editable: boolean;
}

