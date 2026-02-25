"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import {
  Activity,
  ActivityJoinPayload,
  ActivityJoinResponse,
  ActivityLeavePayload,
  ActivityUpsertPayload,
  ActivityBroadcastResponse,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/activity";

// Socket.IO v2 client (downgraded for compatibility with go-socket.io v1.7.0)
type ActivitySocket = SocketIOClient.Socket;

interface UseActivitySocketProps {
  tripId: number;
  tripDate: string;
  enabled?: boolean;
}

interface UseActivitySocketReturn {
  activities: Activity[];
  isEditable: boolean;
  isConnected: boolean;
  upsertActivities: (activities: Activity[]) => void;
}

export function useActivitySocket({
  tripId,
  tripDate,
  enabled = true,
}: UseActivitySocketProps): UseActivitySocketReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isEditable, setIsEditable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<ActivitySocket | null>(null);
  const currentRoomRef = useRef<{ tripId: number; tripDate: string } | null>(null);

  const upsertActivities = useCallback(
    (updatedActivities: Activity[]) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        console.warn("⚠️ socket not connected");
        return;
      }

      const payload: ActivityUpsertPayload = {
        trip_id: tripId,
        date: tripDate,
        activities: updatedActivities,
      };

      socket.emit("activity:upsert", payload);
    },
    [tripId, tripDate]
  );

    useEffect(() => {
    if (!enabled) return;

    // Clear activities from previous state when switching dates/trips
    setActivities([]);

    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("❌ missing auth token");
      return;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:8080";

    const socket: ActivitySocket = io(socketUrl, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      query: {
        token: token,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current = socket;

    console.log("🔌 Socket created, waiting for connection...");
    console.log("🔌 Socket URL:", socketUrl);
    console.log("🔌 tripId:", tripId, "tripDate:", tripDate);

    // Listen for any errors from the server
    socket.on("error", (error: any) => {
      console.error("❌ Socket error event:", error);
    });

    // ----------------------------
    // Response listeners (must be set up before emitting)
    // ----------------------------
    // Note: go-socket.io server sends response on the SAME event name as the request
    socket.on("activity:join", (response: ActivityJoinResponse) => {
      console.log("🎉 activity:join response received");
      console.log("✅ joined activity response:", response);
      setActivities(response.activities);
      setIsEditable(response.is_editable);
      currentRoomRef.current = { tripId, tripDate };
    });

    // Temporary debug listener to catch ALL events from server
    (socket as any).onAny?.((eventName: string, ...args: any[]) => {
      console.log("📥 Server event received:", eventName, args);
    });

    // ----------------------------
    // Connection state
    // ----------------------------
    socket.on("connect", () => {
      console.log("🟢 connected:", socket.id);
      console.log("📤 About to emit activity:join with payload:", {
        trip_id: tripId,
        trip_date: tripDate,
      });
      setIsConnected(true);

      const joinPayload: ActivityJoinPayload = {
        trip_id: tripId,
        trip_date: tripDate,
      };

      console.log("📤 Emitting activity:join event...");
      console.log(joinPayload);
      socket.emit("activity:join", joinPayload);
      console.log("📤 activity:join emitted (listening for activity:joined response)");
    });

    socket.on("disconnect", (reason: any) => {
      console.log("🟡 disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err: any) => {
      console.error("🔴 connect error:", err.message);
      setIsConnected(false);
    });

    // ----------------------------
    // Broadcast listener
    // ----------------------------
    socket.on("activity:broadcast", (data: ActivityBroadcastResponse) => {
      if (
        data.trip_id === tripId &&
        data.date === tripDate
      ) {
        setActivities(data.activities);
        setIsEditable(data.is_editable);
      }
    });

    // ----------------------------
    // Cleanup
    // ----------------------------
    return () => {
      const socket = socketRef.current;

      if (socket && socket.connected && currentRoomRef.current) {
        const leavePayload: ActivityLeavePayload = {
          trip_id: currentRoomRef.current.tripId,
          trip_date: currentRoomRef.current.tripDate,
        };
        socket.emit("activity:leave", leavePayload);
      }

      socket?.disconnect();
      socketRef.current = null;
      currentRoomRef.current = null;
    };
  }, [tripId, tripDate, enabled]);

  // Mask activities to ensure we don't return stale data when switching dates
  const safeActivities =
    currentRoomRef.current?.tripDate === tripDate ? activities : [];

  return {
    activities: safeActivities,
    isEditable,
    isConnected,
    upsertActivities,
  };
}
