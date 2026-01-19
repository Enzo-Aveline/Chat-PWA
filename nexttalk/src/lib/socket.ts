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
let connectPromise: Promise<void> | null = null;

export function joinRoom(pseudo: any, roomName: string) {
  // Already joined this room
  if (joinedRooms.has(roomName)) {
    console.log(`[Socket] Already in room: ${roomName}`);
    return;
  }

  const doJoin = () => {
    console.log(`[Socket] Joining room: ${roomName}`);
    socket.emit("chat-join-room", { pseudo, roomName });
    joinedRooms.add(roomName);
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
  joinedRooms.clear();
  socket.disconnect();
}

export default socket;