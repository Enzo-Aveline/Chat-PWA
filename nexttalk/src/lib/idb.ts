import { openDB } from 'idb';

const DB_NAME = 'nexttalk-db';
const DB_VERSION = 2; // ⬅️ incrémenter la version pour forcer l'upgrade

export interface Message {
  from: "bot" | "user";
  text: string;         // si c’est une image, on met l’URL/base64
  date: Date | string;
  type: "text" | "image"; // ⬅️ nouvelle propriété
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
}

export interface Profile {
  username: string;
  photo: string | null;
  dirty: boolean;
}

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile');
      }
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations');
      }
    },
  });
};

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await initDB();
  await db.put('profile', { ...profile, dirty: true }, 'userProfile');
}

export async function getProfile(): Promise<Profile | null> {
  const db = await initDB();
  const profile = await db.get('profile', 'userProfile');
  return profile || null;
}

// --- Conversations ---

export async function saveConversation(conv: Conversation): Promise<void> {
  const db = await initDB();
  await db.put('conversations', conv, conv.id);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await initDB();
  return (await db.get('conversations', id)) || null;
}

export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const res = await fetch("https://api.tools.gavago.fr/socketio/api/rooms");
    if (!res.ok) throw new Error("API non OK");

    const json = await res.json();
    const rooms: string[] = JSON.parse(json.data);

    const conversations: Conversation[] = rooms.map((room) => ({
      id: room,
      name: room,
      messages: []
    }));

    const db = await initDB();
    for (const conv of conversations) {
      await db.put("conversations", conv); // 🔹 ici plus de conv.id
    }

    return conversations;
  } catch (err) {
    console.warn("⚠️ API indisponible, fallback IDB :", err);

    const db = await initDB();
    const all: Conversation[] = [];
    let cursor = await db.transaction("conversations").store.openCursor();
    while (cursor) {
      all.push(cursor.value);
      cursor = await cursor.continue();
    }
    return all;
  }
}




export async function deleteConversation(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('conversations', id);
}
