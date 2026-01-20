"use client";
import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import socket, { joinRoom, leaveRoom, ChatMessage } from "../../../lib/socket";
import ChatImage from "../../../components/ChatImage";
import CameraModal from "../../../components/CameraModal";

export default function ChatRoomPage() {
  const params = useParams();
  const rawId = params?.id as string | string[] | undefined;
  const roomId: string = Array.isArray(rawId) ? rawId[0] : rawId ?? "unknown";

  const router = useRouter();

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

  useEffect(() => {
    // Prevent double mount in Strict Mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    joinRoom(pseudo, roomId);

    const handleBeforeUnload = () => {
      try {
        leaveRoom(roomId);
      } catch { }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    function handleNewMessage(msg: ChatMessage) {
      // Filter out messages that don't belong to the current room
      if (msg.roomName && msg.roomName !== roomId) {
        return;
      }

      // Vibrate on incoming message
      if (msg.pseudo !== pseudo) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          console.log("Vibrate");
          navigator.vibrate(200);
        }
      }

      setMessages((prev) => {
        // Avoid duplicate messages with same content and timestamp
        const isDuplicate = prev.some(
          m => m.content === msg.content &&
            m.pseudo === msg.pseudo &&
            Math.abs(new Date(m.dateEmis).getTime() - new Date(msg.dateEmis).getTime()) < 1000
        );
        if (isDuplicate) return prev;
        return [...prev, msg];
      });
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

    socket.on("chat-msg", handleNewMessage);
    socket.on("chat-joined-room", handleUserJoin);
    socket.on("chat-disconnected", handleUserLeave);
    socket.on("error", handleError);

    return () => {
      try {
        leaveRoom(roomId);
      } catch { }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);

      socket.off("chat-msg", handleNewMessage);
      socket.off("chat-joined-room", handleUserJoin);
      socket.off("chat-disconnected", handleUserLeave);
      socket.off("error", handleError);

      mountedRef.current = false;
    };
  }, [roomId, pseudo]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendingRef = useRef(false);

  function sendMessage() {
    if (!input.trim() || sendingRef.current) return;

    sendingRef.current = true;
    const content = input.trim();

    socket.emit("chat-msg", { content, roomName: roomId, pseudo });
    setInput("");

    setTimeout(() => {
      sendingRef.current = false;
    }, 500);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Note: This API seems to only support one current image per connected user.
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
            pseudo,
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
              try {
                leaveRoom(roomId);
              } catch { }
              router.push("/chat/menu");
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

          // Special handling for server image notifications
          const lowerContent = m.content.toLowerCase().trim();
          if (lowerContent.startsWith("nouvelle image pour le user")) {
            const parts = m.content.trim().split(" ");
            let potentialId = parts[parts.length - 1];
            // Remove trailing dot if present
            if (potentialId.endsWith('.')) {
              potentialId = potentialId.slice(0, -1);
            }

            if (potentialId) {
              // Prevent double display for own images (handled by standard flow)
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
                  // Debug log
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