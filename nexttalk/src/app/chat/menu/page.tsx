"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CreateRoomModal from "../../../components/CreateRoomModal";
import ProfileModal from "../../../components/ProfileModal";
import Toast from "../../../components/Toast";
import { useToast } from "../../../hooks/useToast";

type Room = {
  rawKey: string;
  name: string;
  clients: number;
};

export default function ChatMenuPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const router = useRouter();
  const { toasts, removeToast, showError, showSuccess } = useToast();

  const loadRooms = () => {
    fetch("https://api.tools.gavago.fr/socketio/api/rooms")
      .then((r) => r.json())
      .then((json) => {
        const data = json?.data ?? {};
        const list: Room[] = Object.keys(data).map((rawKey) => {
          const room = data[rawKey] ?? {};
          const clientsObj = room?.clients ?? {};
          const clientsCount = Object.keys(clientsObj).length;
          const name = (() => {
            try {
              return decodeURIComponent(rawKey);
            } catch {
              return rawKey;
            }
          })();
          return { rawKey, name, clients: clientsCount };
        });
        setRooms(list);
      })
      .catch(() => {
        setRooms([]);
      });
  };

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const [address, setAddress] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`)
            .then((res) => res.json())
            .then((data) => {
              if (data && data.features && data.features.length > 0) {
                setAddress(data.features[0].properties.label);
              } else {
                setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
              }
            })
            .catch(() => {
              setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            });
        },
        (error) => {
          console.error("Geoloc error:", error);
          setLocationError("Loc. indisponible");
        }
      );
    } else {
      setLocationError("Loc. non supportée");
    }
  }, []);

  const pseudo = typeof window !== "undefined" ? localStorage.getItem("pseudo") : null;
  const photo = typeof window !== "undefined" ? localStorage.getItem("photo") : null;

  function openRoom(name: string) {
    router.push(`/chat/${encodeURIComponent(name)}`);
  }

  function handleRoomCreated(roomName: string) {
    showSuccess(`Room "${roomName}" créée avec succès !`);
    loadRooms();
    setTimeout(() => {
      openRoom(roomName);
    }, 500);
  }

  return (
    <>
      <div className="page">
        <div className="container-sm">
          <header className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="title">Salons de discussion</h1>
              <p className="subtitle">Rejoignez une conversation</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                + Créer
              </button>

              <div
                onClick={() => setShowProfileModal(true)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                className="card-hover"
                title="Mon Profil"
              >
                {photo ? (
                  <img
                    src={photo}
                    alt="avatar"
                    className="avatar"
                    style={{ width: '40px', height: '40px', margin: 0 }}
                  />
                ) : (
                  <div
                    className="avatar avatar-placeholder"
                    style={{ width: '40px', height: '40px', fontSize: '1rem', margin: 0 }}
                  >
                    {pseudo?.[0]?.toUpperCase() || "I"}
                  </div>
                )}
              </div>
            </div>
          </header>

          <ul className="room-list">
            {rooms.length === 0 && (
              <li className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                Aucune room trouvée. Crée-en une !
              </li>
            )}
            {rooms.map((r) => (
              <li
                key={r.rawKey}
                onClick={() => openRoom(r.name)}
                className="room-item card-hover"
              >
                <div className="room-content">
                  <div className="room-title">{r.name}</div>
                  <div className="room-meta">{r.clients} connecté(s)</div>
                </div>
                <button className="btn btn-ghost btn-sm">Rejoindre</button>
              </li>
            ))}
          </ul>
        </div>

        <CreateRoomModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={handleRoomCreated}
          onError={showError}
        />

        <ProfileModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          pseudo={pseudo}
          photo={photo}
          address={address}
          locationError={locationError}
        />
      </div>

      {/* Affichage des toasts */}
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 10000 }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}
