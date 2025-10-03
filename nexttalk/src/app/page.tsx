'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getProfile, Profile, saveProfile } from "@/lib/idb";
import Header from "@/components/Header";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile().then((p) => setProfile(p));
  }, []);

  const handleLoginOrMenu = () => {
    if (profile) {
      router.push("/chat/menu"); // Déjà connecté, va au menu
    } else {
      router.push("/login"); // Non connecté, redirige vers connexion
    }
  };

  const handleLogout = async () => {
    if (profile) {
      // Supprime le profil
      await saveProfile({ username: "", photo: null, dirty: false });
      setProfile(null);
      router.push("/"); // Retour à l'accueil
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-3xl font-bold text-blue-600 mb-4">Bienvenue sur NextTalk</h2>
        <p className="text-gray-700 mb-6 text-center max-w-md">
          Une messagerie instantanée moderne, progressive et offline-friendly.
        </p>
        <button
          onClick={handleLoginOrMenu}
          className="px-6 py-3 bg-blue-600 text-white rounded-[2.5rem] shadow hover:bg-blue-500 transition"
        >
          {profile ? "Accéder à mes conversations" : "Se connecter"}
        </button>
      </main>
    </div>
  );
}
