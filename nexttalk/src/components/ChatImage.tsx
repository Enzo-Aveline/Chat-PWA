"use client";

import React, { useEffect, useState } from "react";

interface ChatImageProps {
    src: string;
}

export default function ChatImage({ src }: ChatImageProps) {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!src) return;

        // If it's already a data URL (my implementation), use it directly
        if (src.startsWith("data:")) {
            setImgSrc(src);
            return;
        }

        // If it's an API URL, fetch the JSON wrapper
        if (src.includes("/api/images/")) {
            setLoading(true);
            setError(null);
            fetch(src)
                .then(res => {
                    if (!res.ok) throw new Error("Network response was not ok");
                    return res.json();
                })
                .then(data => {
                    // The API returns { data_image: "base64..." } or maybe { data: ... }
                    const content = data.data_image || data.data;
                    if (data.success && content) {
                        setImgSrc(content);
                    } else {
                        // API explicitly returned failure (e.g. user offline)
                        console.log("[ChatImage] Unavailable:", data.message || "Unknown error");
                        setError(data.message || "Image indisponible");
                    }
                })
                .catch(err => {
                    console.error("[ChatImage] Error:", err);
                    setError("Erreur de chargement");
                })
                .finally(() => setLoading(false));
            return;
        }

        // Fallback for standard standard URLs
        setImgSrc(src);

    }, [src]);

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
