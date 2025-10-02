'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { saveProfile, getProfile } from '@/lib/idb';
import CameraModal from '@/components/CameraModal';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getProfile();
      if (profile) {
        setUsername(profile.username);
        setPhoto(profile.photo);
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
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Erreur accès caméra:', err);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const photoUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreviewPhoto(photoUrl);
        stopCamera();
      }
    }
  };

  const confirmPhoto = async () => {
    if (previewPhoto) {
      setPhoto(previewPhoto);
      setPreviewPhoto(null);
      await handleSave();
    }
  };

  const cancelPreview = () => {
    setPreviewPhoto(null);
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Cercles décoratifs */}
      <div className="absolute -left-32 -top-32 w-96 h-96 bg-blue-600 rounded-full opacity-20 z-0" />
      <div className="absolute -right-24 top-1/2 w-72 h-72 bg-blue-400 rounded-full opacity-20 z-0" />
      <div className="absolute left-1/2 bottom-0 w-80 h-80 bg-blue-600 rounded-full opacity-10 z-0" />

      <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl px-8 py-10 flex flex-col gap-8">
        <h1 className="text-3xl font-bold text-blue-600 text-center mb-2">Mon Profil</h1>
        
        <div className="flex flex-col items-center gap-6">
          {/* Photo */}
          <div>
            {(photo || previewPhoto) ? (
              <div className="w-[140px] h-[140px] rounded-full overflow-hidden border-4 border-blue-400 shadow-lg bg-blue-100 flex items-center justify-center">
                <Image
                  src={previewPhoto || photo!}
                  alt="Photo de profil"
                  width={140}
                  height={140}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="w-[140px] h-[140px] rounded-full bg-blue-100 border-4 border-blue-400 flex items-center justify-center text-blue-400 text-6xl shadow-lg">
                <span>👤</span>
              </div>
            )}
          </div>

          {/* Boutons photo */}
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowCameraModal(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-semibold shadow transition"
            >
              Prendre une photo
            </button>
            <label className="flex-1 bg-blue-400 hover:bg-blue-300 text-white px-4 py-2 rounded-full font-semibold shadow transition cursor-pointer text-center">
              Importer
              <input
                type="file"
                accept="image/*"
                capture
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Champ pseudo */}
        <div>
          <label className="block text-sm font-medium text-blue-600 mb-2">
            Pseudo
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded-full border border-blue-200 bg-gray-50 focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg shadow text-gray-700"
            placeholder="Entrez votre pseudo"
          />
        </div>

        <button
          onClick={async () => {
            await handleSave();
            router.push('/chat');
          }}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-full font-bold text-lg shadow transition"
        >
          Entrer dans le chat
        </button>
      </div>

      <CameraModal
        open={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onPhoto={(photo) => {
          setPhoto(photo);
          setPreviewPhoto(null); // <-- Ajoute cette ligne pour réinitialiser la preview
          setShowCameraModal(false);
        }}
      />
    </div>
  );
}