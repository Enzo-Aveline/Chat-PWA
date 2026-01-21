"use client";
import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import socket, { joinRoom, leaveRoom, disconnectSocket, ChatMessage } from "../../../lib/socket";
import {
  getConversation,
  addMessageToConversation,
  savePendingMessage,
  getPendingMessages,
  deletePendingMessage
} from "../../../lib/idb";
import ChatImage from "../../../components/ChatImage";
import CameraModal from "../../../components/CameraModal";

/**
 * Page de salle de discussion (Chat Room).
 * Cœur de l'application de messagerie.
 * Gère :
 * - La connexion Socket.io au salon spécifique.
 * - L'affichage de l'historique des messages.
 * - L'envoi de messages texte et d'images (via API + notif socket).
 * - Les notifications de connexion/déconnexion des autres utilisateurs.
 * - L'intégration de la modale caméra.
 */
export default function ChatRoomPage() {
  const params = useParams();
  const rawId = params?.id as string | string[] | undefined;
  const roomId: string = Array.isArray(rawId) ? rawId[0] : rawId ?? "unknown";

  const router = useRouter();

  // Récupération du profil depuis localStorage (plus rapide que IDB pour l'UI synchrone)
  const [pseudo] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("pseudo") || "Invité" : "Invité"
  );
  const [photo] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("photo") : null
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  /**
   * Effet principal de gestion du cycle de vie du socket dans la room.
   * Gère la connexion, l'écoute des événements, et le nettoyage propre.
   */
  useEffect(() => {
    // Prevent double mount in Strict Mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    // 1. Charger l'historique local (offline-first)
    getConversation(roomId).then((conv) => {
      if (conv && conv.messages) {
        setMessages((prev) => {
          // Fusionner l'historique (conv.messages) avec les messages potentiellement reçus (prev)
          // pendant le chargement asynchrone pour éviter d'écraser le direct.
          const combined = [...conv.messages];

          prev.forEach(p => {
            const exists = combined.some(c =>
              c.dateEmis === p.dateEmis &&
              c.content === p.content &&
              c.pseudo === p.pseudo
            );
            if (!exists) combined.push(p);
          });

          // Re-trier par date pour être sûr
          return combined.sort((a, b) => new Date(a.dateEmis).getTime() - new Date(b.dateEmis).getTime());
        });
      }
    });

    joinRoom(pseudo, roomId);

    // Nettoyage de sécurité en cas de fermeture d'onglet/navigateur
    const handleBeforeUnload = () => {
      try {
        leaveRoom(roomId);
        disconnectSocket();
      } catch { }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    function handleNewMessage(msg: ChatMessage) {
      // Filtrer les messages qui ne concernent pas cette room (par sécurité)
      if (msg.roomName && msg.roomName !== roomId) {
        return;
      }

      // Vibration sur message entrant (si ce n'est pas nous)
      if (msg.pseudo !== pseudo) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          console.log("Vibrate");
          navigator.vibrate(200);
        }
      }

      setMessages((prev) => {
        // 1. Déduplication par ID (si présent)
        if (msg.id) {
          const existingIndex = prev.findIndex(m => m.id === msg.id);
          if (existingIndex !== -1) {
            // On a trouvé le message local correspondant (optimistic)
            // On le remplace par la version serveur (autoritaire sur la date, etc.)
            const newArr = [...prev];
            newArr[existingIndex] = msg;
            return newArr;
          }
        }

        // 2. Fallback: Déduplication floue pour les messages sans ID ou venant d'autres clients
        // On garde la tolérance de 1s pour le "temps réel", mais pour nos propres messages offline (décalage temporel),
        // on espère que l'ID a fonctionné. Si le serveur strip l'ID, on utilise une heuristique.
        const isDuplicateFuzzy = prev.some(
          m => m.content === msg.content &&
            m.pseudo === msg.pseudo &&
            Math.abs(new Date(m.dateEmis).getTime() - new Date(msg.dateEmis).getTime()) < 1000
        );

        // Hack: Si c'est MON message, qu'il a le même contenu, mais que l'ID n'est pas là (server strip?),
        // on peut potentiellement le considérer comme un doublon si c'était le dernier message envoyé ?
        // Trop risqué pour l'instant, on mise sur le support de l'ID.

        if (isDuplicateFuzzy) return prev;

        // Persister le message reçu pour l'historique offline
        addMessageToConversation(roomId, msg);

        return [...prev, msg];
      });
    }

    // Fonction de synchronisation des messages en attente
    const syncPendingMessages = async () => {
      const pending = await getPendingMessages();
      if (pending.length === 0) return;

      console.log(`[Sync] Found ${pending.length} pending messages`);

      for (const msg of pending) {
        // Envoi via socket
        socket.emit("chat-msg", {
          id: msg.id, // Important: transmettre l'ID d'origine
          content: msg.content,
          roomName: msg.roomName || roomId,
          pseudo: msg.pseudo
        });

        // Supprimer une fois envoyé (ou du moins émis)
        await deletePendingMessage(msg.dateEmis);
      }
    };

    // Gestion de la reconnexion : on doit rejoindre la room à nouveau
    // et synchroniser les messages en attente.
    const handleReconnection = () => {
      console.log("[Page] Socket connected/reconnected");
      // On rejoint la room (socket.ts s'assure de ne pas le faire en double si déjà clean)
      joinRoom(pseudo, roomId);

      // Petit délai pour laisser le temps au join de se propager avant d'envoyer les messages
      setTimeout(() => {
        syncPendingMessages();
      }, 500);
    };

    socket.on("connect", handleReconnection);

    // Écouteur explicite "online" du navigateur (utile pour PWA/Mobile quand le socket met du temps)
    const handleOnline = () => {
      console.log("[Page] Browser online event");
      if (!socket.connected) {
        console.log("[Page] Socket not connected, forcing connect...");
        socket.connect();
      } else {
        // Déjà connecté, on tente quand même de resacrer la logique de room/sync
        handleReconnection();
      }
    };
    window.addEventListener("online", handleOnline);

    // Si déjà connecté au montage
    if (socket.connected) {
      handleReconnection();
    }

    function handleUserJoin(info: any) {
      // Ne rien faire ici - on laisse seulement le serveur envoyer le message via chat-msg
    }

    function handleUserLeave(info: any) {
      // Ne rien faire ici - on laisse seulement le serveur envoyer le message via chat-msg
    }

    function handleError(err: any) {
      const m: ChatMessage = {
        pseudo: "SERVER",
        content: typeof err === "string" ? err : JSON.stringify(err),
        dateEmis: new Date().toISOString(),
        category: "INFO",
      };
      setMessages((prev) => [...prev, m]);
    }

    // Abonnements aux événements Socket
    socket.on("chat-msg", handleNewMessage);
    socket.on("chat-joined-room", handleUserJoin);
    socket.on("chat-disconnected", handleUserLeave);
    socket.on("error", handleError);

    return () => {
      try {
        leaveRoom(roomId);
        disconnectSocket(); // Force disconnect on unmount (navigation) to free the pseudo
      } catch { }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);

      socket.off("chat-msg", handleNewMessage);
      socket.off("chat-joined-room", handleUserJoin);
      socket.off("chat-disconnected", handleUserLeave);
      socket.off("error", handleError);

      window.removeEventListener("online", handleOnline);

      mountedRef.current = false;
    };
  }, [roomId, pseudo]);

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendingRef = useRef(false);

  /**
   * Envoi d'un message texte simple.
   * Utilise un verrou (sendingRef) et un timeout pour éviter le double-envoi (debounce).
   */
  function sendMessage() {
    if (!input.trim() || sendingRef.current) return;

    sendingRef.current = true;
    const content = input.trim();

    // Créer l'objet message complet pour affichage immédiat et stockage local
    const tempMsg: ChatMessage = {
      id: crypto.randomUUID(), // Génération ID unique client
      pseudo,
      content,
      roomName: roomId,
      dateEmis: new Date().toISOString(),
      category: "MESSAGE"
    };

    // 1. Optimistic UI update
    setMessages(prev => [...prev, tempMsg]);
    // 2. Persister dans l'historique local (pour le rechargement futur)
    addMessageToConversation(roomId, tempMsg);

    if (socket.connected) {
      socket.emit("chat-msg", {
        id: tempMsg.id, // Envoi de l'ID
        content,
        roomName: roomId
      });
    } else {
      console.log("[Offline] Queuing message");
      savePendingMessage(roomId, tempMsg);
    }

    setInput("");

    setTimeout(() => {
      sendingRef.current = false;
    }, 500);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Logique complexe d'envoi d'image :
   * 1. Compresse l'image via Canvas (max 800x600, qualité 0.7).
   * 2. Upload l'image sur l'API `/api/images/:id` (id = socket.id).
   * 3. Si succès, envoie un message socket contenant l'URL de l'image `[IMAGE] url`.
   */
  const processAndSendImage = async (base64: string) => {
    // Compress image first
    const img = new Image();
    img.src = base64;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

      // Use socket.id as required by the API (images are tied to the connected user)
      const userId = socket.id;

      if (!userId) {
        alert("Erreur: Vous n'êtes pas connecté au serveur (Socket ID manquant)");
        return;
      }

      try {
        // Upload to API
        // According to doc: POST /api/images/:id
        const encodedId = encodeURIComponent(userId);
        const response = await fetch(`https://api.tools.gavago.fr/socketio/api/images/${encodedId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: userId,
            image_data: compressedBase64
          })
        });

        if (response.ok) {
          const imageUrl = `https://api.tools.gavago.fr/socketio/api/images/${encodedId}`;
          socket.emit("chat-msg", {
            content: `[IMAGE] ${imageUrl}`,
            roomName: roomId,
          });
        } else {
          console.error("Failed to upload image", await response.text());
          alert("Erreur lors de l'envoi de l'image");
        }
      } catch (e) {
        console.error("Error sending image:", e);
        alert("Erreur lors de l'envoi de l'image");
      }
    };
  };

  /**
   * Gestion de la sélection de fichier image.
   * Vérifie la taille (max 5Mo) avant traitement.
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image trop lourde (max 5Mo)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      processAndSendImage(base64);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCameraPhoto = (photoBase64: string) => {
    processAndSendImage(photoBase64);
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-content">
          <div className="header-left">
            {photo ? (
              <img src={photo} alt="avatar" className="avatar" />
            ) : (
              <div className="avatar avatar-placeholder">
                {pseudo[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="title">{pseudo}</div>
              <div className="subtitle">Room: {roomId}</div>
            </div>
          </div>
          <button
            onClick={() => {
              router.back();
            }}
            className="btn btn-ghost btn-sm"
          >
            Quitter
          </button>
        </div>
      </header>

      <main className="chat-messages" ref={listRef}>
        {messages.map((m, idx) => {
          const isMe = m.pseudo === pseudo;
          const isServer = m.pseudo === "SERVER" || m.category === "INFO";

          // Gestion spéciale pour les notifications serveur d'image ("nouvelle image pour le user X")
          const lowerContent = m.content.toLowerCase().trim();
          if (lowerContent.startsWith("nouvelle image pour le user")) {
            const parts = m.content.trim().split(" ");
            let potentialId = parts[parts.length - 1];
            // Remove trailing dot if present
            if (potentialId.endsWith('.')) {
              potentialId = potentialId.slice(0, -1);
            }

            if (potentialId) {
              // On n'affiche pas cette notification spéciale si c'est notre propre image (déjà affichée via le flux normal)
              if (potentialId === pseudo) return null;

              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div className="message message-received">
                    <div className="message-author">{potentialId}</div>
                    <ChatImage pseudo={potentialId} />
                    <div className="message-meta">
                      {new Date(m.dateEmis).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            }
          }

          if (isServer) {
            return (
              <div key={idx} className="message-info">
                {m.content}{" "}
                <span className="message-meta">
                  {new Date(m.dateEmis).toLocaleTimeString()}
                </span>
              </div>
            );
          }

          return (
            <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div className={`message ${isMe ? 'message-sent' : 'message-received'}`}>
                <div className="message-author">{isMe ? "Vous" : m.pseudo}</div>
                {(() => {
                  // Rendu conditionnel du contenu (Texte, Image ou URL API)
                  console.log("Message content:", m.content);

                  if (m.content.startsWith("IMAGE:")) {
                    return <ChatImage src={m.content.slice(6)} />;
                  }
                  if (m.content.startsWith("[IMAGE]")) {
                    return <ChatImage src={m.content.replace("[IMAGE]", "").trim()} />;
                  }
                  if (m.content.includes("/api/images/")) {
                    return <ChatImage src={m.content.trim()} />;
                  }

                  return <div>{m.content}</div>;
                })()}
                <div className="message-meta">
                  {new Date(m.dateEmis).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="chat-footer">
        <div className="chat-input-group">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Écrire un message..."
            className="input chat-input"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-ghost text-xl"
            title="Envoyer une image"
          >
            📎
          </button>
          <button
            onClick={() => setIsCameraOpen(true)}
            className="btn btn-ghost text-xl"
            title="Prendre une photo"
          >
            📷
          </button>
          <button onClick={sendMessage} className="btn btn-primary">
            Envoyer
          </button>
        </div>
      </footer>

      <CameraModal
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhoto={handleCameraPhoto}
      />
    </div>
  );
}