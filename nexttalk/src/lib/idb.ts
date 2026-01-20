import { openDB, IDBPDatabase } from 'idb';
import { ChatMessage } from './socket';

const DB_NAME = 'nexttalk-db';
const DB_VERSION = 2; // Incremented version not strictly needed if schema is compatible, but good practice if changing types significantly. However, since we write full objects, let's keep it simple.

// Re-export specific types if needed, or just use ChatMessage
export type { ChatMessage };

export interface Conversation {
  id: string;
  name: string;
  messages: ChatMessage[];
}

export interface Profile {
  username: string;
  photo: string | null;
  dirty: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile');
        }
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations');
        }
      },
    });
  }
  return dbPromise;
};

export async function closeDBConnection() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

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
  const db = await initDB();
  
  try {
    const res = await fetch("https://api.tools.gavago.fr/socketio/api/rooms");
    console.debug("[rooms] fetch status", res.status, res.statusText);

    if (!res.ok) {
       // fallback if API fails
       throw new Error("API non OK");
    }

    // try to parse JSON safely
    let body: any;
    try {
      body = await res.json();
    } catch (e) {
      // fallback parsing
      const txt = await res.text().catch(() => "");
      try { body = JSON.parse(txt); } catch { body = txt; }
    }

    // Normalize rooms into string[]
    let rooms: string[] = [];
    if (Array.isArray(body)) {
      rooms = body;
    } else if (body && typeof body.data === "object" && !Array.isArray(body.data)) {
      rooms = Object.keys(body.data);
    } else if (body && typeof body.data === "string") {
      try {
        const parsed = JSON.parse(body.data);
         if (Array.isArray(parsed)) rooms = parsed;
      } catch {
         // simplistic fallback
         const match = (body.data as string).match(/\[.*\]/);
         if (match) {
            try { if (Array.isArray(JSON.parse(match[0]))) rooms = JSON.parse(match[0]); } catch {}
         }
      }
    } else if (typeof body === "string") {
       try { if (Array.isArray(JSON.parse(body))) rooms = JSON.parse(body); } catch {}
    }

    // ensure only string ids
    rooms = rooms.filter(r => typeof r === "string");

    // Fetch ALL existing conversations first to preserve messages
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.store;
    const usesInlineKey = store.keyPath != null;

    const existingConvs: Conversation[] = [];
    let cursor = await store.openCursor();
    while (cursor) {
      existingConvs.push(cursor.value);
      cursor = await cursor.continue();
    }

    const mergedConversations: Conversation[] = [];

    for (const roomName of rooms) {
      const existing = existingConvs.find(c => c.id === roomName);
      const conv: Conversation = existing 
        ? existing 
        : { id: roomName, name: roomName, messages: [] };
      
      mergedConversations.push(conv);

       // Update or add to DB
       if (usesInlineKey) {
        await store.put(conv);
      } else {
        await store.put(conv, conv.id);
      }
    }
    
    await tx.done;

    return mergedConversations;

  } catch (err) {
    console.error("⚠️ getAllConversations failed:", err);
    // fallback: return only what's in IDB
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
