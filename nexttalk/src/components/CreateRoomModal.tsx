'use client';
import { useState } from 'react';

type CreateRoomModalProps = {
  open: boolean;
  onClose: () => void;
  onRoomCreated: (roomName: string) => void;
  onError: (message: string) => void;
};

export default function CreateRoomModal({ open, onClose, onRoomCreated, onError }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);

  const checkRoomExists = async (name: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.tools.gavago.fr/socketio/api/rooms');
      if (!response.ok) return false;
      
      const json = await response.json();
      const data = json?.data ?? {};
      
      return Object.keys(data).some((rawKey) => {
        try {
          return decodeURIComponent(rawKey).toLowerCase() === name.toLowerCase();
        } catch {
          return rawKey.toLowerCase() === name.toLowerCase();
        }
      });
    } catch (err) {
      // Log silencieux sans déclencher l'overlay Next.js
      return false;
    }
  };

  const handleCreate = async () => {
    const trimmedName = roomName.trim();
    
    if (!trimmedName) {
      onError('Le nom de la room ne peut pas être vide');
      return;
    }

    setLoading(true);

    try {
      // Check if room already exists
      const exists = await checkRoomExists(trimmedName);
      if (exists) {
        onError(`La room "${trimmedName}" existe déjà`);
        setLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.tools.gavago.fr';
      const response = await fetch(`${apiUrl}/socketio/chat/${encodeURIComponent(trimmedName)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Réponse serveur non OK');
      }

      onRoomCreated(trimmedName);
      setRoomName('');
      onClose();
    } catch (err) {
      // Log silencieux
      onError('Erreur réseau lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '400px',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="title" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          Créer une nouvelle room
        </h2>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
            Nom de la room
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) handleCreate();
            }}
            placeholder="Ex: SalonPrincipal"
            className="input"
            disabled={loading}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary" disabled={loading}>
            Annuler
          </button>
          <button onClick={handleCreate} className="btn btn-primary" disabled={loading || !roomName.trim()}>
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}