import { io, Socket } from "socket.io-client";

export type ChatMessage = {
  id?: string;
  pseudo: string;
  content: string;
  dateEmis: string;
  category?: "MESSAGE" | "INFO" | string;
  roomName?: string;
};

type ServerToClient = {
  "chat-msg": (msg: ChatMessage) => void;
  "chat-joined-room": (info: any) => void;
  "chat-disconnected": (info: any) => void;
  error: (err: any) => void;
};

type ClientToServer = {
  "chat-join-room": (payload: { pseudo: any; roomName: string }) => void;
  "chat-msg": (payload: { content: string; roomName: string; pseudo?: any }) => void;
  "chat-leave-room": (payload: { roomName: string }) => void;
};

const socket: Socket<ServerToClient, ClientToServer> = io("https://api.tools.gavago.fr", {
  autoConnect: false,
});

// Track joined rooms client-side to prevent duplicate emits
const joinedRooms = new Set<string>();
const pendingJoins = new Set<string>();
let connectPromise: Promise<void> | null = null;

export function joinRoom(pseudo: any, roomName: string) {
  // Already joined or joining this room
  if (joinedRooms.has(roomName) || pendingJoins.has(roomName)) {
    console.log(`[Socket] Already in room (or joining): ${roomName}`);
    return;
  }

  // Mark as pending immediately
  pendingJoins.add(roomName);

  const doJoin = () => {
    // If it was removed from pending (e.g. by leaveRoom), don't join
    if (!pendingJoins.has(roomName)) {
      console.log(`[Socket] Join cancelled for room: ${roomName}`);
      return;
    }
    
    console.log(`[Socket] Joining room: ${roomName}`);
    pendingJoins.delete(roomName);
    joinedRooms.add(roomName);
    socket.emit("chat-join-room", { pseudo, roomName });
  };

  if (!socket.connected) {
    // Avoid multiple concurrent connections
    if (!connectPromise) {
      connectPromise = new Promise((resolve) => {
        socket.connect();
        socket.once("connect", () => {
          console.log("[Socket] Connected");
          connectPromise = null;
          resolve();
        });
      });
    }
    connectPromise.then(doJoin);
  } else {
    doJoin();
  }
}

export function leaveRoom(roomName: string) {
  // If we are pending join, cancel it
  if (pendingJoins.has(roomName)) {
    console.log(`[Socket] Cancelling pending join for room: ${roomName}`);
    pendingJoins.delete(roomName);
    return;
  }

  if (!joinedRooms.has(roomName)) return;
  console.log(`[Socket] Leaving room: ${roomName}`);
  try {
    socket.emit("chat-leave-room", { roomName });
  } catch {
    /* ignore if emit fails */
  }
  joinedRooms.delete(roomName);
}

export function disconnectSocket() {
  console.log("[Socket] Disconnecting");
  
  // Attempt to leave all joined rooms cleanly before disconnecting
  for (const roomName of joinedRooms) {
    try {
        console.log(`[Socket] Force leaving room before disconnect: ${roomName}`);
        socket.emit("chat-leave-room", { roomName });
    } catch (e) {
        console.error("Error sending leave-room:", e);
    }
  }
  
  joinedRooms.clear();
  pendingJoins.clear(); // Also clear pending joins
  
  // Always disconnect, even if "connected" is false (it might be connecting)
  socket.disconnect();
  
  connectPromise = null;
}

export default socket;