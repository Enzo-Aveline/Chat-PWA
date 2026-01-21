"use client";

import React, { useEffect, useState } from "react";

interface ChatImageProps {
    src?: string;
    pseudo?: string;
}

/**
 * Composant d'affichage d'image intelligent.
 * Gère plusieurs sources possibles :
 * - Data URI (base64) direct.
 * - URL absolue ou relative (appel API).
 * - Résolution d'image par pseudo (tente de trouver le socket ID de l'utilisateur pour récupérer sa photo, mode compat).
 * 
 * Inclut un état de chargement et un gestionnaire d'erreurs visuel.
 */
export default function ChatImage({ src, pseudo }: ChatImageProps) {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchImage = async (url: string) => {
            // Ajout d'un cache-buster pour éviter que le navigateur ne serve une vieille version
            const fetchUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
            console.log("[ChatImage] Fetching:", fetchUrl);

            try {
                const res = await fetch(fetchUrl, {
                    headers: { "Content-Type": "application/json" },
                });
                if (!res.ok) throw new Error("Network response was not ok");
                const data = await res.json();

                if (isMounted) {
                    // L'API peut retourner data.data_image ou data.data selon le point de terminaison
                    const content = data.data_image || data.data;
                    if (data.success && content) {
                        setImgSrc(content);
                    } else {
                        console.log("[ChatImage] Unavailable:", data.message);
                        setError(data.message || "Image indisponible");
                    }
                }
            } catch (err) {
                if (isMounted) {
                    console.error("[ChatImage] Error:", err);
                    setError("Erreur de chargement");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Fonction complexe pour tenter de retrouver l'image d'un user via son pseudo et les rooms
        // (Méthode de fallback si on n'a pas l'ID direct)
        const resolvePseudo = async () => {
            if (!pseudo) return;
            setLoading(true);
            setError(null);

            try {
                const res = await fetch('https://api.tools.gavago.fr/socketio/api/rooms');
                const data = await res.json();

                let foundSocketId: string | null = null;
                if (data.success && data.data) {
                    for (const roomName in data.data) {
                        const clients = data.data[roomName].clients;
                        for (const socketId in clients) {
                            if (clients[socketId].pseudo === pseudo) {
                                foundSocketId = socketId;
                                break;
                            }
                        }
                        if (foundSocketId) break;
                    }
                }

                if (foundSocketId && isMounted) {
                    const url = `https://api.tools.gavago.fr/socketio/api/images/${encodeURIComponent(foundSocketId)}`;
                    fetchImage(url);
                } else if (isMounted) {
                    setError(`Utilisateur ${pseudo} introuvable ou déconnecté`);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("[ChatImage] Resolve Error:", err);
                    setError("Erreur lors de la recherche de l'utilisateur");
                    setLoading(false);
                }
            }
        };

        if (pseudo) {
            resolvePseudo();
            return () => { isMounted = false; };
        }

        if (!src) return;

        // Si c'est déjà du base64, pas besoin de fetch
        if (src.startsWith("data:")) {
            setImgSrc(src);
            return;
        }

        // Si c'est une URL d'API, on doit fetch le contenu JSON
        if (src.includes("/api/images/")) {
            setLoading(true);
            setError(null);
            fetchImage(src);
            return () => { isMounted = false; };
        }

        // Sinon (URL standard), on l'utilise direct
        setImgSrc(src);
        return () => { isMounted = false; };

    }, [src, pseudo]);

    if (loading) {
        return <div className="animate-pulse bg-gray-200 h-48 w-48 rounded flex items-center justify-center p-4">Chargement...</div>;
    }

    if (error) {
        return (
            <div className="bg-slate-800/50 text-slate-400 h-48 w-48 rounded flex flex-col items-center justify-center p-2 text-xs text-center border border-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span>Image indisponible: {error}</span>
            </div>
        );
    }

    if (!imgSrc) return null;

    return (
        <img
            src={imgSrc}
            alt="Shared content"
            className="max-w-full rounded-lg border border-gray-200 dark:border-gray-700 mt-2"
            style={{ maxHeight: '300px', objectFit: 'contain' }}
            loading="lazy"
        />
    );
}
