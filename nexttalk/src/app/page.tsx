'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, Profile } from '../lib/idb';

/**
 * Page d'accueil (Landing Page).
 * Rôle :
 * 1. Vérifier si l'utilisateur a déjà un profil stocké (IndexedDB).
 * 2. Si oui, proposer d'aller au chat.
 * 3. Sinon, rediriger vers le login.
 * Affiche également un état de chargement initial.
 */
export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérification du profil au montage
  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  const handleLoginOrMenu = () => {
    if (profile?.username) {
      router.push('/chat/menu');
    } else {
      router.push('/login');
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
    <div className="page">
      <div className="container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 4rem)',
          gap: '2rem',
          textAlign: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem' }}>
              NextTalk
            </h1>
            <p className="subtitle" style={{ fontSize: '1.2rem' }}>
              Rejoins des conversations en temps réel
            </p>
          </div>

          {profile?.username && (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div className="profile-avatar-section">
                {profile.photo ? (
                  <img src={profile.photo} alt="avatar" className="avatar avatar-lg" />
                ) : (
                  <div className="avatar avatar-lg avatar-placeholder">
                    {profile.username[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="title">{profile.username}</div>
                  <div className="subtitle">Bienvenue !</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={handleLoginOrMenu} className="btn btn-primary">
              {profile?.username ? 'Accéder au Chat' : 'Se connecter'}
            </button>
            {profile?.username && (
              <button
                onClick={() => router.push('/login')}
                className="btn btn-secondary"
              >
                Modifier le profil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}