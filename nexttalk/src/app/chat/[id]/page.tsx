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

  const processAndSendImage = (base64: string) => {
    // Compress image to ensure it fits in socket message (legacy 1MB limits often apply)
    const img = new Image();
    img.src = base64;
    img.onload = () => {
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

      // Directly send image data via socket to ensure persistence (API is ephemeral)
      // The image is compressed (max 800x600), so it should fit in the socket payload (approx <100KB)
      socket.emit("chat-msg", {
        content: `IMAGE:${compressedBase64}`,
        roomName: roomId,
        pseudo,
      });
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
                {m.content.startsWith("IMAGE:") ? (
                  <ChatImage src={m.content.slice(6)} />
                ) : (m.content.includes("/api/images/") || m.content.startsWith("[IMAGE]")) ? (
                  <ChatImage src={m.content.replace("[IMAGE]", "").trim()} />
                ) : (
                  <div>{m.content}</div>
                )}
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