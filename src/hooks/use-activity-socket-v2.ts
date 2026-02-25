// "use client";

// import { useEffect, useRef, useState, useCallback } from "react";
// import io, { Socket } from "socket.io-client";
// import {
//   Activity,
//   ActivityJoinPayload,
//   ActivityJoinResponse,
//   ActivityLeavePayload,
//   ActivityUpsertPayload,
//   ActivityBroadcastResponse,
//   ClientToServerEvents,
//   ServerToClientEvents,
// } from "@/types/activity";

// type ActivitySocket = Socket<
//   ServerToClientEvents,
//   ClientToServerEvents
// >;

// interface UseActivitySocketProps {
//   tripId: number;
//   tripDate: string;
//   enabled?: boolean;
// }

// interface UseActivitySocketReturn {
//   activities: Activity[];
//   isEditable: boolean;
//   isConnected: boolean;
//   upsertActivities: (activities: Activity[]) => void;
// }

// export function useActivitySocket({
//   tripId,
//   tripDate,
//   enabled = true,
// }: UseActivitySocketProps): UseActivitySocketReturn {
//   const [activities, setActivities] = useState<Activity[]>([]);
//   const [isEditable, setIsEditable] = useState(false);
//   const [isConnected, setIsConnected] = useState(false);

//   const socketRef = useRef<ActivitySocket | null>(null);
//   const currentRoomRef = useRef<{ tripId: number; tripDate: string } | null>(null);

//   // ----------------------------
//   // Emit upsert
//   // ----------------------------
//   const upsertActivities = useCallback(
//     (updatedActivities: Activity[]) => {
//       const socket = socketRef.current;
//       if (!socket || !socket.connected) {
//         console.warn("⚠️ socket not connected");
//         return;
//       }

//       const payload: ActivityUpsertPayload = {
//         trip_id: tripId,
//         date: tripDate,
//         activities: updatedActivities,
//       };

//       socket.emit("activityUpsert", payload);
//     },
//     [tripId, tripDate]
//   );

//   // ----------------------------
//   // Socket lifecycle
//   // ----------------------------
//   useEffect(() => {
//     if (!enabled) return;

//     const token = localStorage.getItem("access_token");
//     if (!token) {
//       console.error("❌ missing auth token");
//       return;
//     }

//     const socketUrl =
//       process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:8080";

//     const socket: ActivitySocket = io(socketUrl, {
//       path: "/socket.io/",
//       transports: ["websocket"],
//       auth: { token },
//       reconnection: true,
//       reconnectionAttempts: 5,
//       timeout: 20000,
//     });

//     socketRef.current = socket;

//     // ----------------------------
//     // Connection state
//     // ----------------------------
//     socket.on("connect", () => {
//       console.log("🟢 connected:", socket.id);
//       setIsConnected(true);

//       const joinPayload: ActivityJoinPayload = {
//         trip_id: tripId,
//         trip_date: tripDate,
//       };

//       socket.emit("activityJoin", joinPayload, (response: ActivityJoinResponse) => {
//         console.log("✅ joined activity:", response);
//         setActivities(response.activities);
//         setIsEditable(response.is_editable);
//         currentRoomRef.current = { tripId, tripDate };
//       });
//     });

//     socket.on("disconnect", (reason: any) => {
//       console.log("🟡 disconnected:", reason);
//       setIsConnected(false);
//     });

//     socket.on("connect_error", (err: any) => {
//       console.error("🔴 connect error:", err.message);
//       setIsConnected(false);
//     });

//     // ----------------------------
//     // Broadcast listener
//     // ----------------------------
//     socket.on("activityBroadcast", (data: ActivityBroadcastResponse) => {
//       if (
//         data.trip_id === tripId &&
//         data.date === tripDate
//       ) {
//         setActivities(data.activities);
//         setIsEditable(data.is_editable);
//       }
//     });

//     // ----------------------------
//     // Cleanup
//     // ----------------------------
//     return () => {
//       const socket = socketRef.current;

//       if (socket && socket.connected && currentRoomRef.current) {
//         const leavePayload: ActivityLeavePayload = {
//           trip_id: currentRoomRef.current.tripId,
//           trip_date: currentRoomRef.current.tripDate,
//         };
//         socket.emit("activityLeave", leavePayload);
//       }

//       socket?.disconnect();
//       socketRef.current = null;
//       currentRoomRef.current = null;
//     };
//   }, [tripId, tripDate, enabled]);

//   return {
//     activities,
//     isEditable,
//     isConnected,
//     upsertActivities,
//   };
// }
