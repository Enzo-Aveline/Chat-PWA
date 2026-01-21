// components/Header.tsx
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getProfile, Profile, saveProfile } from "@/lib/idb";

/**
 * Composant d'en-tête global.
 * Affiche le titre de l'application et gère l'état de connexion de l'utilisateur (affichage du profil).
 * Persiste sur toutes les pages grâce au layout.
 */
export default function Header() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  // Au montage, récupérer le profil stocké localement (IndexedDB)
  useEffect(() => {
    getProfile().then((p) => setProfile(p));
  }, []);

  /**
   * Redirige l'utilisateur vers le menu s'il est connecté,
   * ou vers la page de login sinon.
   */
  const handleLoginOrMenu = () => {
    if (profile) {
      router.push("/chat/menu");
    } else {
      router.push("/login");
    }
  };

  /**
   * Déconnexion de l'utilisateur.
   * Efface le profil local et redirige vers l'accueil.
   */
  const handleLogout = async () => {
    if (profile) {
      await saveProfile({ username: "", photo: null, dirty: false });
      setProfile(null);
      router.push("/");
    }
  };

  return (
    <header className="w-full bg-blue-600 flex items-center justify-between px-6 py-4 shadow mb-6">
      <h1 className="text-white text-xl font-bold cursor-pointer" onClick={() => router.push("/")}>
        NextTalk
      </h1>
      <div className="flex items-center gap-4">
        {profile && (
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-full shadow hover:bg-red-400 transition"
          >
            Déconnexion
          </button>
        )}
        <button
          onClick={handleLoginOrMenu}
          className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-full shadow hover:bg-gray-100 transition"
        >
          {profile?.photo ? (
            <Image
              src={profile.photo}
              alt="Profil"
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              {profile?.username?.[0] || "?"}
            </div>
          )}
          <span>{profile ? profile.username : "Connexion"}</span>
        </button>
      </div>
    </header>
  );
}
