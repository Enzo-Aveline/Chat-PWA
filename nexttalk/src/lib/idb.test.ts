import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveProfile, getProfile, saveConversation, getConversation, getAllConversations, Message, Conversation, closeDBConnection } from './idb';
import 'fake-indexeddb/auto';
import { openDB, deleteDB } from 'idb';

const DB_NAME = 'nexttalk-db';

describe('IDB Library', () => {
  beforeEach(async () => {
    // Clear DB before each test
    await closeDBConnection();
    await deleteDB(DB_NAME);
    vi.restoreAllMocks();
  });

  afterEach(async () => {
      await closeDBConnection();
      vi.restoreAllMocks();
  });


  describe('Profile Management', () => {
    it('should save and retrieve a profile', async () => {
      const profile = { username: 'testuser', photo: 'base64...', dirty: true };
      await saveProfile(profile);

      const retrieved = await getProfile();
      expect(retrieved).toEqual(profile);
    });

    it('should return null if no profile exists', async () => {
      const retrieved = await getProfile();
      expect(retrieved).toBeNull();
    });
  });

  describe('Conversation Management', () => {
    it('should save and retrieve a conversation', async () => {
      const conv: Conversation = {
        id: 'room1',
        name: 'Room 1',
        messages: []
      };
      await saveConversation(conv);

      const retrieved = await getConversation('room1');
      expect(retrieved).toEqual(conv);
    });
  });

  describe('getAllConversations', () => {
    it('should fetch from API and save to IDB on success', async () => {
      // Mock API success
      const rooms = ['roomA', 'roomB'];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => rooms,
      });

      const convs = await getAllConversations();
      
      expect(fetch).toHaveBeenCalledWith('https://api.tools.gavago.fr/socketio/api/rooms');
      expect(convs).toHaveLength(2);
      expect(convs[0].id).toBe('roomA');
      expect(convs[1].id).toBe('roomB');

      // Verify it persisted to IDB
      const dbConv = await getConversation('roomA');
      expect(dbConv).toBeDefined();
      expect(dbConv?.id).toBe('roomA');
    });

    it('should fallback to IDB if API fails', async () => {
      // Pre-populate IDB
      const existingConv: Conversation = { id: 'offline-room', name: 'offline-room', messages: [] };
      await saveConversation(existingConv);

      // Mock API failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

      const logs = vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs

      const convs = await getAllConversations();

      expect(convs).toHaveLength(1);
      expect(convs[0].id).toBe('offline-room');
    });

    it('should handle non-array API response gracefully', async () => {
        // Mock API returning weird structure (as logged in source code handling)
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ data: { roomX: {} } }), // Newer API shape case from code
        });
        
        const convs = await getAllConversations();
        expect(convs).toHaveLength(1);
        expect(convs[0].id).toBe('roomX');
    });
  });
});
