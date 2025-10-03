'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { getAllConversations, saveConversation, getProfile, Conversation, Message } from "@/lib/idb";
import CameraModal from "@/components/CameraModal";

function formatHour(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatConvPage() {
  const router = useRouter();
  const params = useParams();
  const convId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [profile, setProfile] = useState<{ username: string; photo: string | null }>({ username: "", photo: null });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConv, setCurrentConv] = useState<Conversation | undefined>();
  const [input, setInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger profil et conversations
  useEffect(() => {
    getProfile().then(p => {
      if (p) setProfile({ username: p.username, photo: p.photo });
    });

    getAllConversations().then(convs => {
      setConversations(convs);
    });
  }, []);

  // Mettre à jour la conversation courante
  useEffect(() => {
    const conv = conversations.find(c => c.id === convId);
    setCurrentConv(conv);
  }, [conversations, convId]);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConv?.messages]);

  // Envoyer un message texte
  const handleSend = async () => {
    if (!input.trim() || !currentConv) return;

    const now = new Date();
    const newMsg: Message = { from: "user", text: input, date: now, type: "text" };
    const updatedConv: Conversation = {
      ...currentConv,
      messages: [...currentConv.messages, newMsg]
    };

    setConversations(prev =>
      prev.map(c => (c.id === convId ? updatedConv : c))
    );
    await saveConversation(updatedConv);

    // Réponse bot
    setTimeout(async () => {
      const botReply: Message = { from: "bot", text: "I'm just a demo bot 🤖", date: new Date(), type: "text" };
      const convWithBot = {
        ...updatedConv,
        messages: [...updatedConv.messages, botReply]
      };
      setConversations(prev =>
        prev.map(c => (c.id === convId ? convWithBot : c))
      );
      await saveConversation(convWithBot);
    }, 600);

    setInput("");
  };

  // Envoyer une photo depuis CameraModal
  const handleSendPhoto = async (photo: string) => {
    if (!currentConv) return;
    const now = new Date();
    const newMsg: Message = { from: "user", text: photo, date: now, type: "image" };
    const updatedConv: Conversation = {
      ...currentConv,
      messages: [...currentConv.messages, newMsg]
    };
    setConversations(prev =>
      prev.map(c => (c.id === convId ? updatedConv : c))
    );
    await saveConversation(updatedConv);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  if (!currentConv) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow text-blue-600">
          Conversation introuvable.<br />
          <button className="underline" onClick={() => router.push("/chat/menu")}>Retour au menu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="relative z-10 w-full max-w-2xl mx-auto bg-blue-100 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden" style={{ minHeight: 540, maxHeight: 700 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 rounded-t-[2.5rem]">
          <button
            className="text-white text-2xl font-bold opacity-70 hover:opacity-100 transition"
            onClick={() => router.push("/chat/menu")}
            aria-label="Menu"
          >
            &lt;
          </button>
          <div className="flex-1 flex justify-center">
            <div className="text-white text-lg font-semibold">
              {currentConv.name}
            </div>
          </div>
          <div className="text-white text-2xl font-bold opacity-70 hover:opacity-100 transition">&#9776;</div>
        </div>

        {/* Messages */}
        <div className="flex-1 px-6 py-4 flex flex-col gap-3 overflow-y-auto bg-blue-100" style={{ minHeight: 350 }}>
          {currentConv.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className="flex flex-col items-end max-w-[70%]">
                {msg.from === "user" && profile.username && (
                  <span className="text-xs text-blue-600 font-semibold">{profile.username}</span>
                )}
                {msg.type === "image" ? (
                  <img
                    src={msg.text}
                    alt="Envoyé"
                    className="rounded-2xl shadow max-w-[200px] max-h-[200px] object-cover"
                  />
                ) : (
                  <div className={`px-4 py-2 rounded-2xl shadow ${msg.from === "user" ? "bg-blue-400 text-white rounded-br-[0.75rem]" : "bg-white text-blue-600 rounded-bl-[0.75rem]"} w-fit text-base font-medium`}>
                    {msg.text}
                  </div>
                )}
                <span className="text-[11px] text-gray-400 mt-1 self-end">{formatHour(msg.date)}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white px-4 py-3 flex items-center gap-2 rounded-b-[2.5rem] border-t border-blue-200">
          <button
            onClick={() => setCameraOpen(true)}
            className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow hover:bg-blue-500 transition"
          >
            📷
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-blue-600 text-base px-2"
            placeholder="Écris ton message..."
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow hover:bg-blue-500 transition"
            aria-label="Envoyer"
          >
            &#9658;
          </button>
        </div>
      </div>

      {/* Camera */}
      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onPhoto={handleSendPhoto}
      />
    </div>
  );
}
