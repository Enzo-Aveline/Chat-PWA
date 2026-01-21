"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "../../../components/Loader";
import CreateRoomModal from "../../../components/CreateRoomModal";
import ProfileModal from "../../../components/ProfileModal";
import Toast from "../../../components/Toast";
import { useToast } from "../../../hooks/useToast";
import socket, { joinRoom, leaveRoom, ChatMessage } from "../../../lib/socket";

type Room = {
  rawKey: string;
  name: string;
  clients: number;
};

/**
 * Page de menu principal des salons (Lobby).
 * Fonctionnalités clés :
 * 1. Liste des salons existants (polling API).
 * 2. Création de nouveau salon.
 * 3. Gestion des notifications par salon (rejoindre/quitter socket room sans y entrer visuellement).
 * 4. Géolocalisation de l'utilisateur (affichage adresse ou coordonnées).
 */
export default function ChatMenuPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [monitoredRooms, setMonitoredRooms] = useState<string[]>([]);
  const router = useRouter();
  const { toasts, removeToast, showError, showSuccess } = useToast();

  /**
   * Charge la liste des rooms depuis l'API.
   * Transforme les clés brutes (souvent encodées) en noms lisibles.
   */
  const loadRooms = (isPolling = false) => {
    if (!isPolling) setIsLoading(true);
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
      })
      .finally(() => {
        if (!isPolling) setIsLoading(false);
      });
  };

  /**
   * Effect de polling pour rafraîchir la liste des rooms toutes les 5s.
   * Restaure aussi les rooms surveillées (notifications) depuis le localStorage.
   */
  useEffect(() => {
    loadRooms();
    const interval = setInterval(() => loadRooms(true), 5000);

    // Restore monitored rooms from localStorage
    try {
      const saved = localStorage.getItem("monitoredRooms");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMonitoredRooms(parsed);
          // Re-join rooms logic is handled by the user clicking or explicit join
          // Mais comme le socket peut être frais, on rejoint à nouveau pour être sûr de recevoir les events
          const p = localStorage.getItem("pseudo");
          if (p) {
            parsed.forEach(r => joinRoom(p, r));
          }
        }
      }
    } catch { }

    return () => clearInterval(interval);
  }, []);

  const [address, setAddress] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  /**
   * Gestion de la géolocalisation au montage.
   * Tente d'obtenir lat/long puis reverse geocoding via API adresse.data.gouv.fr.
   */
  useEffect(() => {
    let isMounted = true;

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          setLocationError(null);
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`)
            .then((res) => res.json())
            .then((data) => {
              if (!isMounted) return;
              if (data && data.features && data.features.length > 0) {
                setAddress(data.features[0].properties.label);
              } else {
                setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
              }
            })
            .catch(() => {
              if (!isMounted) return;
              setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            });
        },
        (error) => {
          if (!isMounted) return;
          // Ignorer les erreurs vides (souvent dues à des extensions)
          if (error.message || error.code) {
            console.error("Geoloc error details:", {
              code: error.code,
              message: error.message,
              PERMISSION_DENIED: error.PERMISSION_DENIED,
              POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
              TIMEOUT: error.TIMEOUT
            });
          }
          setLocationError("Loc. indisponible");
        }
      );
    } else {
      setLocationError("Loc. non supportée");
    }

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Écoute globale des messages socket pour les notifications.
   * Ne déclenche une notification que si :
   * - La room est dans 'monitoredRooms'.
   * - Le message ne vient pas de nous.
   * - Le message est récent (évite le spam à la reconnexion pour l'historique).
   */
  useEffect(() => {
    const handleMsg = (msg: ChatMessage) => {
      if (msg.roomName && monitoredRooms.includes(msg.roomName)) {
        // Ignorer ses propres messages
        if (msg.pseudo === pseudo) return;

        // Check if message is recent (less than 2 seconds old relative to receiving time)
        // This prevents notifications for history messages sent upon joining a room
        const msgTime = new Date(msg.dateEmis).getTime();
        const now = Date.now();
        // Allow a small grace period (e.g. 5 secons) for network latency, but filter out history
        if (now - msgTime > 5000) {
          return;
        }

        // Trigger notification
        if (Notification.permission === "granted") {
          new Notification(`Nouveau message dans ${msg.roomName}`, {
            body: `${msg.pseudo}: ${msg.content.startsWith("IMAGE:") ? "Une image" : msg.content}`,
            icon: "/favicon.ico" // Fallback icon
          });
        }

        // Vibrate
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(200);
        }
      }
    };

    socket.on("chat-msg", handleMsg);
    return () => {
      socket.off("chat-msg", handleMsg);
    };
  }, [monitoredRooms]); // Re-bind when monitoredRooms changes is okay, or use ref

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

  /**
   * Active ou désactive les notifications (monitoring) pour une room.
   * Demande la permission Notification au navigateur si nécessaire.
   */
  function toggleNotification(e: React.MouseEvent, roomName: string) {
    e.stopPropagation();

    if (Notification.permission !== "granted") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          toggleNotificationLogic(roomName);
        } else {
          showError("Permission de notification refusée");
        }
      });
    } else {
      toggleNotificationLogic(roomName);
    }
  }

  function toggleNotificationLogic(roomName: string) {
    setMonitoredRooms(prev => {
      const isMonitored = prev.includes(roomName);
      let next;
      if (isMonitored) {
        next = prev.filter(r => r !== roomName);
        leaveRoom(roomName);
        showSuccess(`Notifications désactivées pour ${roomName}`);
      } else {
        next = [...prev, roomName];
        joinRoom(pseudo || "Invité", roomName);
        showSuccess(`Notifications activées pour ${roomName}`);
      }
      localStorage.setItem("monitoredRooms", JSON.stringify(next));
      return next;
    });
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
            {isLoading ? (
              <Loader />
            ) : rooms.length === 0 ? (
              <li className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                Aucune room trouvée. Crée-en une !
              </li>
            ) : (
              rooms.map((r) => {
                const isMonitored = monitoredRooms.includes(r.name);
                return (
                  <li
                    key={r.rawKey}
                    onClick={() => openRoom(r.name)}
                    className="room-item card-hover"
                  >
                    <div className="room-content">
                      <div className="room-title">{r.name}</div>
                      <div className="room-meta">{r.clients} connecté(s)</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        className={`btn btn-sm ${isMonitored ? "btn-primary" : "btn-ghost"}`}
                        onClick={(e) => toggleNotification(e, r.name)}
                        title={isMonitored ? "Désactiver les notifications" : "Activer les notifications"}
                        style={{ fontSize: '1.2rem', padding: '0.2rem 0.6rem' }}
                      >
                        {isMonitored ? "🔔" : "🔕"}
                      </button>
                      <button className="btn btn-ghost btn-sm">Rejoindre</button>
                    </div>
                  </li>
                );
              })
            )}
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
