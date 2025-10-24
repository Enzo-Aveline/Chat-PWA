import { openDB } from 'idb';

const DB_NAME = 'nexttalk-db';
const DB_VERSION = 2; // ⬅️ incrémenter la version pour forcer l'upgrade

export interface Message {
  from: "bot" | "user";
  text: string;         // si c’est une image, on met l’URL/base64
  date: Date | string;
  // "system" pour join/leave notifications
  type: "text" | "image" | "system";
  serverId?: string;    // id fourni par le serveur (pour dédup)
  localId?: string;     // id local temporaire (optimistic)
  pending?: boolean;    // true tant que la confirmation serveur n'est pas reçue
  senderName?: string;   // nom affiché de l'émetteur (client ou distant)
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
  // Detect if the object store uses an inline keyPath (e.g. "id").
  // If it does, call put without the explicit key. Otherwise provide conv.id.
  const tx = db.transaction('conversations', 'readwrite');
  const store = tx.store;
  const usesInlineKey = store.keyPath != null;
  if (usesInlineKey) {
    await db.put('conversations', conv);
  } else {
    await db.put('conversations', conv, conv.id);
  }
  await tx.done;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await initDB();
  return (await db.get('conversations', id)) || null;
}

export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const res = await fetch("https://api.tools.gavago.fr/socketio/api/rooms");
    console.debug("[rooms] fetch status", res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      console.warn("[rooms] bad response body:", text);
      throw new Error("API non OK");
    }

    // try to parse JSON safely (some responses may not be strict)
    let body: any;
    try {
      body = await res.json();
    } catch (e) {
      // response not JSON — try as text then attempt to extract JSON array
      const txt = await res.text().catch(() => "");
      console.warn("[rooms] response not JSON, raw text:", txt);
      // try to parse text directly
      try {
        body = JSON.parse(txt);
      } catch {
        // leave as string
        body = txt;
      }
    }

    // Normalize rooms into string[]
    let rooms: string[] = [];
    if (Array.isArray(body)) {
      rooms = body;
    } else if (body && typeof body.data === "object" && !Array.isArray(body.data)) {
      // Newer API shape: data is an object with roomName keys
      rooms = Object.keys(body.data);
    } else if (body && typeof body.data === "string") {
      // API historically returned { data: '["room1","room2"]' }
      try {
        const parsed = JSON.parse(body.data);
        if (Array.isArray(parsed)) rooms = parsed;
      } catch {
        const match = (body.data as string).match(/\[.*\]/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) rooms = parsed;
          } catch (e) {
            console.warn("[rooms] can't parse body.data as JSON array", e);
          }
        }
      }
    } else if (typeof body === "string") {
      // body might be a JSON array string
      try {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed)) rooms = parsed;
      } catch {
        console.warn("[rooms] body is string but not JSON array");
      }
    } else {
      console.warn("[rooms] unexpected body shape", body);
    }

    // ensure only string ids
    rooms = rooms.filter(r => typeof r === "string");

    const conversations: Conversation[] = rooms.map((room) => ({
      id: room,
      name: room,
      messages: []
    }));

    // persist to IDB respecting store keyPath configuration
    const db = await initDB();
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.store;
    const usesInlineKey = store.keyPath != null;
    for (const conv of conversations) {
      if (usesInlineKey) {
        await db.put("conversations", conv);
      } else {
        await db.put("conversations", conv, conv.id);
      }
    }
    await tx.done;

    // fallback: if API returned empty list, return a default room
    if (conversations.length === 0) {
      return [{ id: "general", name: "general", messages: [] }];
    }
    return conversations;
  } catch (err) {
    console.error("⚠️ getAllConversations failed:", err);
    // fallback IDB
    const db = await initDB();
    const all: Conversation[] = [];
    let cursor = await db.transaction("conversations").store.openCursor();
    while (cursor) {
      all.push(cursor.value);
      cursor = await cursor.continue();
    }
    return all.length ? all : [{ id: "general", name: "general", messages: [] }];
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('conversations', id);
}
