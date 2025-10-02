import { openDB } from 'idb';

const DB_NAME = 'nexttalk-db';
const DB_VERSION = 1;

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