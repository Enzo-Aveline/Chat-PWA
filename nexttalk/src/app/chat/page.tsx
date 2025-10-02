'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import icon from '../../../public/icons/icon-192.png';

type Message = {
  from: 'bot' | 'user';
  text: string;
  date: Date;
};
type Conversation = {
  id: string;
  name: string;
  messages: Message[];
};

function formatHour(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  // Profil utilisateur
  const [profile, setProfile] = useState<{ username: string; photo: string | null }>({ username: '', photo: null });
  useEffect(() => {
    const p = window.localStorage.getItem('profile');
    if (p) setProfile(JSON.parse(p));
  }, []);

  // Conversations (mock)
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      name: 'Bot',
      messages: [
        { from: 'bot', text: 'How can I help you today?', date: new Date() }
      ]
    },
    {
      id: '2',
      name: 'Support',
      messages: [
        { from: 'bot', text: 'Bonjour, comment puis-je vous aider ?', date: new Date() }
      ]
    }
  ]);
  const [currentConvId, setCurrentConvId] = useState('1');
  const [showMenu, setShowMenu] = useState(false);
  const [newConvName, setNewConvName] = useState('');

  // Conversation courante
  const currentConv = conversations.find(c => c.id === currentConvId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConv?.messages]);

  const handleSend = () => {
    if (!input.trim() || !currentConv) return;
    const now = new Date();
    const updatedConvs = conversations.map(conv =>
      conv.id === currentConvId
        ? {
            ...conv,
            messages: [...conv.messages, { from: 'user' as 'user', text: input, date: now }]
          }
        : conv
    );
    setConversations(updatedConvs);
    setTimeout(() => {
      setConversations(convs =>
        convs.map(conv =>
          conv.id === currentConvId
            ? {
                ...conv,
                messages: [
                  ...conv.messages,
                  { from: 'bot' as 'bot', text: "I'm just a demo bot 🤖", date: new Date() }
                ]
              }
            : conv
        )
      );
    }, 600);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  // Ajouter une conversation
  const handleAddConversation = () => {
    if (!newConvName.trim()) return;
    const newId = Date.now().toString();
    setConversations([
      ...conversations,
      {
        id: newId,
        name: newConvName,
        messages: [
          { from: 'bot', text: `Bienvenue dans "${newConvName}" !`, date: new Date() }
        ]
      }
    ]);
    setCurrentConvId(newId);
    setShowMenu(false);
    setNewConvName('');
  };

  // Quitter une conversation
  const handleDeleteConversation = (id: string) => {
    const filtered = conversations.filter(conv => conv.id !== id);
    setConversations(filtered);
    // Si on supprime la conv courante, bascule sur la première restante
    if (id === currentConvId && filtered.length > 0) {
      setCurrentConvId(filtered[0].id);
      setShowMenu(false);
    } else if (filtered.length === 0) {
      setCurrentConvId('');
      setShowMenu(false);
    }
  };

  // Layout principal (popup centrée, taille fixe)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Cercles décoratifs */}
      <div className="absolute -left-32 -top-32 w-96 h-96 bg-blue-600 rounded-full opacity-20 z-0" />
      <div className="absolute -right-24 top-1/2 w-72 h-72 bg-blue-400 rounded-full opacity-20 z-0" />
      <div className="absolute left-1/2 bottom-0 w-80 h-80 bg-blue-600 rounded-full opacity-10 z-0" />

      <div
        className="relative z-10 w-full max-w-2xl mx-auto bg-blue-100 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
        style={{ minHeight: 540, maxHeight: 700 }}
      >
        {/* Affiche soit le menu, soit la conversation, dans la même popup */}
        {showMenu ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 rounded-t-[2.5rem]">
              <span className="text-white text-xl font-bold">Conversations</span>
              <button
                className="text-white text-2xl font-bold opacity-70 hover:opacity-100 transition"
                onClick={() => setShowMenu(false)}
                aria-label="Fermer"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 flex flex-col gap-2 px-6 py-4 overflow-y-auto">
              {conversations.map(conv => (
                <div key={conv.id} className="flex items-center gap-3 p-3 rounded-2xl shadow bg-white text-blue-600 mb-2">
                  <button
                    onClick={() => {
                      setCurrentConvId(conv.id);
                      setShowMenu(false);
                    }}
                    className={`flex-1 flex items-center gap-3 text-left ${conv.id === currentConvId ? 'font-bold text-blue-600' : ''}`}
                  >
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                      <Image src={icon} alt="Bot" width={28} height={28} className="object-contain" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{conv.name}</span>
                      <span className="text-xs text-gray-500">
                        {conv.messages[conv.messages.length - 1]?.text.slice(0, 30)}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteConversation(conv.id)}
                    className="ml-2 text-red-500 hover:text-red-700 text-lg font-bold px-2"
                    title="Quitter la conversation"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {/* Ajouter une conversation */}
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="text"
                  value={newConvName}
                  onChange={e => setNewConvName(e.target.value)}
                  placeholder="Nouvelle conversation"
                  className="flex-1 px-3 py-2 rounded-full border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none text-blue-600 bg-white"
                />
                <button
                  onClick={handleAddConversation}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-semibold shadow transition"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 rounded-t-[2.5rem]">
              <button
                className="text-white text-2xl font-bold opacity-70 hover:opacity-100 transition"
                onClick={() => setShowMenu(true)}
                aria-label="Menu"
              >
                &lt;
              </button>
              <div className="flex-1 flex justify-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow">
                  <Image src={icon} alt="Bot" width={32} height={32} className="object-contain" />
                </div>
              </div>
              <button className="text-white text-2xl font-bold opacity-70 hover:opacity-100 transition">&#9776;</button>
            </div>
            {/* Messages */}
            <div className="flex-1 px-6 py-4 flex flex-col gap-3 overflow-y-auto bg-blue-100" style={{ minHeight: 350 }}>
              {currentConv && currentConv.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex flex-col items-end max-w-[70%]">
                    <div className="flex items-center justify-end gap-2 mb-1 w-full">
                      {msg.from === 'user' && (
                        <>
                          <span className="text-xs text-blue-600 font-semibold">{profile.username}</span>
                          {profile.photo && (
                            <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-blue-400 bg-blue-100">
                              <Image
                                src={profile.photo}
                                alt="Moi"
                                width={24}
                                height={24}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div
                      className={`
                        px-4 py-2 rounded-2xl shadow
                        ${msg.from === 'user'
                          ? 'bg-blue-400 text-white rounded-br-[0.75rem]'
                          : 'bg-white text-blue-600 rounded-bl-[0.75rem]'
                        }
                        w-fit text-base font-medium
                      `}
                    >
                      {msg.text}
                    </div>
                    {msg.from === 'user' && (
                      <span className="text-[11px] text-gray-400 mt-1 self-end">{formatHour(msg.date)}</span>
                    )}
                    {msg.from === 'bot' && (
                      <span className="text-[11px] text-gray-400 mt-1 self-start">{formatHour(msg.date)}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {/* Input */}
            {currentConv && (
              <div className="bg-white px-4 py-3 flex items-center gap-2 rounded-b-[2.5rem] border-t border-blue-200">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent outline-none text-blue-600 text-base px-2"
                  placeholder="Ask"
                />
                <button
                  onClick={handleSend}
                  className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow hover:bg-blue-500 transition"
                  aria-label="Envoyer"
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="10" fill="#2563eb"/>
                    <path d="M7 10h6M10 7l3 3-3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}