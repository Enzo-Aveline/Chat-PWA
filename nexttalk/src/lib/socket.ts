import { io, Socket } from "socket.io-client";

/**
 * Définition de la structure d'un message de chat.
 * Utilisé à la fois pour l'envoi et la réception.
 */
export type ChatMessage = {
  id?: string;
  pseudo: string;
  content: string;
  dateEmis: string;
  category?: "MESSAGE" | "INFO" | string;
  roomName?: string;
};

/**
 * Définition des événements envoyés par le serveur au client.
 * Assure le typage fort des callbacks.
 */
type ServerToClient = {
  "chat-msg": (msg: ChatMessage) => void;
  "chat-joined-room": (info: any) => void;
  "chat-disconnected": (info: any) => void;
  error: (err: any) => void;
};

/**
 * Définition des événements envoyés par le client au serveur.
 */
type ClientToServer = {
  "chat-join-room": (payload: { pseudo: any; roomName: string }) => void;
  "chat-msg": (payload: { content: string; roomName: string; pseudo?: any }) => void;
  "chat-leave-room": (payload: { roomName: string }) => void;
};

/**
 * Initialisation de l'instance Socket.io.
 * `autoConnect: false` est crucial pour contrôler manuellement le moment de la connexion
 * (généralement après que l'utilisateur a saisi son pseudo ou rejoint une salle).
 */
const socket: Socket<ServerToClient, ClientToServer> = io("https://api.tools.gavago.fr", {
  autoConnect: false,
});

// Suivi local des salles rejointes pour éviter les émissions en double
const joinedRooms = new Set<string>();
const pendingJoins = new Set<string>();
let connectPromise: Promise<void> | null = null;

/**
 * Rejoint une salle de chat spécifique.
 * Gère la connexion socket si elle n'est pas encore établie.
 * Utilise un mécanisme de "pending" pour éviter les race conditions si join est appelé plusieurs fois rapidement.
 * 
 * @param pseudo Le pseudo de l'utilisateur
 * @param roomName Le nom/ID de la salle à rejoindre
 */
export function joinRoom(pseudo: any, roomName: string) {
  // Déjà dans la salle ou en cours de jonction
  if (joinedRooms.has(roomName) || pendingJoins.has(roomName)) {
    console.log(`[Socket] Already in room (or joining): ${roomName}`);
    return;
  }

  // Marquer comme "en cours" immédiatement
  pendingJoins.add(roomName);

  const doJoin = () => {
    // Si l'action a été annulée entre temps (ex: leaveRoom appelé), ne pas rejoindre
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
    // Éviter de lancer plusieurs connexions simultanées
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

/**
 * Quitte une salle de chat.
 * Annule toute tentative de jonction en cours si nécessaire.
 * 
 * @param roomName Le nom de la salle à quitter
 */
export function leaveRoom(roomName: string) {
  // Si nous sommes en attente de jonction, annuler
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

/**
 * Déconnecte totalement le socket et nettoie l'état local.
 * Tente de quitter proprement toutes les salles avant de couper la connexion.
 */
export function disconnectSocket() {
  console.log("[Socket] Disconnecting");
  
  // Tenter de quitter proprement toutes les salles
  for (const roomName of joinedRooms) {
    try {
        console.log(`[Socket] Force leaving room before disconnect: ${roomName}`);
        socket.emit("chat-leave-room", { roomName });
    } catch (e) {
        console.error("Error sending leave-room:", e);
    }
  }
  
  joinedRooms.clear();
  pendingJoins.clear(); // Nettoyer aussi les attentes
  
  // Toujours déconnecter, même si `connected` est faux (peut être en cours de connexion/tentative)
  socket.disconnect();
  
  connectPromise = null;
}

export default socket;