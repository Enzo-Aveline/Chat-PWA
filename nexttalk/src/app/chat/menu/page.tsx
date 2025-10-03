'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllConversations, saveConversation, deleteConversation, Conversation } from "@/lib/idb";

export default function ChatMenuPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    getAllConversations().then(setConversations);
  }, []);

  const handleOpenModal = () => {
    setNewName("");
    setShowModal(true);
  };

  const handleCreateConversation = async () => {
    if (!newName.trim()) return;

    const newConv: Conversation = {
      id: Date.now().toString(),
      name: newName.trim(),
      messages: []
    };

    await saveConversation(newConv);
    setConversations(prev => [...prev, newConv]);
    setShowModal(false);
    router.push(`/chat/${newConv.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 relative flex flex-col items-center p-6">
      <h1 className="text-2xl text-gray-800 font-bold mb-6">Mes conversations</h1>

      <button
        onClick={handleOpenModal}
        className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-[2.5rem] shadow hover:bg-blue-500 transition"
      >
        Nouvelle conversation
      </button>

      <div className="w-full max-w-2xl flex flex-col gap-4">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="bg-blue-100 rounded-[2.5rem] p-4 flex justify-between items-center shadow cursor-pointer hover:bg-blue-200 transition"
          >
            <button
              className="flex-1 text-left font-medium text-blue-800"
              onClick={() => router.push(`/chat/${conv.id}`)}
            >
              {conv.name} ({conv.messages.length} message{conv.messages.length > 1 ? 's' : ''})
            </button>
            <button
              className="text-red-500 hover:underline"
              onClick={() => handleDelete(conv.id)}
            >
              Supprimer
            </button>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="text-gray-500 text-center mt-8">Aucune conversation pour l'instant</p>
        )}
      </div>

      {/* Modal pour nouvelle conversation */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-[2.5rem] shadow p-6 w-80 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Nom de la conversation</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Entrez un nom"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-800 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateConversation}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
