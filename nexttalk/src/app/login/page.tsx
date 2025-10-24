'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, saveProfile } from '../../lib/idb';
import CameraModal from '../../components/CameraModal';

export default function ProfilePage() {
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getProfile();
      if (profile) {
        setUsername(profile.username || '');
        setPhoto(profile.photo || null);
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveProfile({
        username,
        photo,
        dirty: true
      });
      // Store in localStorage for chat pages
      localStorage.setItem("pseudo", username || "Invité");
      if (photo) {
        localStorage.setItem("photo", photo);
      } else {
        localStorage.removeItem("photo");
      }
      router.push('/chat/menu');
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="card profile-card">
        <h1 className="title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Profil
        </h1>

        <div className="profile-avatar-section">
          {photo ? (
            <img src={photo} alt="avatar" className="avatar avatar-lg" />
          ) : (
            <div className="avatar avatar-lg avatar-placeholder">
              {username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowCameraModal(true)}
              className="btn btn-secondary btn-sm"
            >
              📷 Prendre une photo
            </button>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              📁 Choisir fichier
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </label>
            {photo && (
              <button
                onClick={() => setPhoto(null)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="profile-form">
          <div className="form-group">
            <label className="form-label">Pseudo</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ton pseudo"
              className="input"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!username.trim()}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Enregistrer
          </button>
        </div>
      </div>

      <CameraModal
        open={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onPhoto={(photoData) => {
          setPhoto(photoData);
          setShowCameraModal(false);
        }}
      />
    </div>
  );
}