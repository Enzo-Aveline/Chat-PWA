import { openDB, IDBPDatabase } from 'idb';
import { ChatMessage } from './socket';

const DB_NAME = 'nexttalk-db';
const DB_VERSION = 2; // Incrémenté si changement de structure, bonne pratique pour les upgrades de schéma.

// Re-export specific types if needed, or just use ChatMessage
export type { ChatMessage };

/**
 * Structure d'une conversation stockée localement.
 */
export interface Conversation {
  id: string;
  name: string;
  messages: ChatMessage[];
}

/**
 * Structure du profil utilisateur local.
 */
export interface Profile {
  username: string;
  photo: string | null;
  dirty: boolean; // Flag indiquant si le profil a été modifié localement
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Initialise la connexion à IndexedDB.
 * Utilise le pattern singleton pour ne pas rouvrir la connexion à chaque appel.
 * Crée les stores 'profile' et 'conversations' si nécessaires lors de l'upgrade.
 */
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

/**
 * Ferme explicitement la connexion IDB.
 * Utile lors du nettoyage ou déconnexion.
 */
export async function closeDBConnection() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

/**
 * Sauvegarde le profil utilisateur dans IndexedDB.
 */
export async function saveProfile(profile: Profile): Promise<void> {
  const db = await initDB();
  await db.put('profile', { ...profile, dirty: true }, 'userProfile');
}

/**
 * Récupère le profil utilisateur depuis IndexedDB.
 */
export async function getProfile(): Promise<Profile | null> {
  const db = await initDB();
  const profile = await db.get('profile', 'userProfile');
  return profile || null;
}

// --- Conversations ---

/**
 * Sauvegarde une conversation entière (avec ses messages) dans IndexedDB.
 * Gère le cas où 'id' est in-line ou out-of-line selon le store.
 */
export async function saveConversation(conv: Conversation): Promise<void> {
  const db = await initDB();
  // Détecte si le store utilise une clé "inline" (ex: "id").
  // Si oui, on put directement l'objet. Sinon, on fournit la clé conv.id.
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

/**
 * Récupère une conversation spécifique par son ID.
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await initDB();
  return (await db.get('conversations', id)) || null;
}

/**
 * Récupère TOUTES les conversations.
 * Stratégie hybride/sync :
 * 1. Tente de récupérer la liste des rooms depuis l'API distante.
 * 2. Si succès, fusionne avec les données locales (préserve les messages existants).
 * 3. Si échec API (offline), retourne uniquement les données locales.
 */
export async function getAllConversations(): Promise<Conversation[]> {
  const db = await initDB();
  
  try {
    const res = await fetch("https://api.tools.gavago.fr/socketio/api/rooms");
    console.debug("[rooms] fetch status", res.status, res.statusText);

    if (!res.ok) {
       // fallback si API échoue
       throw new Error("API non OK");
    }

    // Essayer de parser le JSON de manière robuste
    let body: any;
    try {
      body = await res.json();
    } catch (e) {
      // fallback parsing texte
      const txt = await res.text().catch(() => "");
      try { body = JSON.parse(txt); } catch { body = txt; }
    }

    // Normaliser le format des rooms en string[]
    // L'API peut retourner différents formats {data: ...} ou direct array
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
         // fallback simpliste regex
         const match = (body.data as string).match(/\[.*\]/);
         if (match) {
            try { if (Array.isArray(JSON.parse(match[0]))) rooms = JSON.parse(match[0]); } catch {}
         }
      }
    } else if (typeof body === "string") {
       try { if (Array.isArray(JSON.parse(body))) rooms = JSON.parse(body); } catch {}
    }

    // Sécurité: garder uniquement les strings
    rooms = rooms.filter(r => typeof r === "string");

    // Récupérer toutes les conversations existantes pour préserver les messages locaux
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.store;
    const usesInlineKey = store.keyPath != null;

    const existingConvs: Conversation[] = [];
    let cursor = await store.openCursor();
    while (cursor) {
      existingConvs.push(cursor.value);
      cursor = await cursor.continue();
    }

    // Fusionner la liste du serveur avec les données locales
    const mergedConversations: Conversation[] = [];

    for (const roomName of rooms) {
      const existing = existingConvs.find(c => c.id === roomName);
      // Si on connait déjà la room, on garde son contenu (messages).
      // Sinon on crée une nouvelle entry vide.
      const conv: Conversation = existing 
        ? existing 
        : { id: roomName, name: roomName, messages: [] };
      
      mergedConversations.push(conv);

       // Mettre à jour la DB locale avec cette nouvelle liste (cache freshening)
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
    // Mode OFFLINE ou Erreur API : on retourne ce qu'il y a dans IDB
    const all: Conversation[] = [];
    let cursor = await db.transaction("conversations").store.openCursor();
    while (cursor) {
      all.push(cursor.value);
      cursor = await cursor.continue();
    }
    // Si vide, on feint une room par défaut pour ne pas casser l'UI
    return all.length ? all : [{ id: "general", name: "general", messages: [] }];
  }
}

/**
 * Supprime une conversation de la base locale.
 */
export async function deleteConversation(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('conversations', id);
}
