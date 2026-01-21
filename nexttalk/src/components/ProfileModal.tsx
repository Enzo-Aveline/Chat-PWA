'use client';
import React, { useState, useEffect } from 'react';

type ProfileModalProps = {
    open: boolean;
    onClose: () => void;
    pseudo: string | null;
    photo: string | null;
    address: string | null;
    locationError: string | null;
};

/**
 * Modale affichant les informations du profil utilisateur courant.
 * Affiche : Avatar, Pseudo, Adresse (si géoloc activée) et niveau de batterie.
 * Utilise l'API expérimentale `navigator.getBattery()` pour l'état de la batterie.
 */
export default function ProfileModal({ open, onClose, pseudo, photo, address, locationError }: ProfileModalProps) {
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [isCharging, setIsCharging] = useState(false);

    useEffect(() => {
        if (!open) return;

        let battery: any;

        const updateBattery = () => {
            setBatteryLevel(battery.level);
            setIsCharging(battery.charging);
        };

        const initBattery = async () => {
            // @ts-ignore : L'API Battery est standard mais pas encore dans les types TS par défaut partout
            if (navigator.getBattery) {
                try {
                    // @ts-ignore
                    battery = await navigator.getBattery();
                    updateBattery();
                    battery.addEventListener('levelchange', updateBattery);
                    battery.addEventListener('chargingchange', updateBattery);
                } catch (e) {
                    console.error("Battery API error:", e);
                }
            }
        };

        initBattery();

        return () => {
            if (battery) {
                battery.removeEventListener('levelchange', updateBattery);
                battery.removeEventListener('chargingchange', updateBattery);
            }
        };
    }, [open]);

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
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                    }}
                >
                    ×
                </button>

                <h2 className="title" style={{ margin: 0 }}>Mon Profil</h2>

                <div style={{ position: 'relative' }}>
                    {photo ? (
                        <img
                            src={photo}
                            alt="avatar"
                            className="avatar"
                            style={{ width: '100px', height: '100px', fontSize: '2rem' }}
                        />
                    ) : (
                        <div
                            className="avatar avatar-placeholder"
                            style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}
                        >
                            {pseudo?.[0]?.toUpperCase() || "I"}
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {pseudo || "Invité"}
                    </h3>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {address ? (
                                <>
                                    <span>📍</span>
                                    <span>{address}</span>
                                </>
                            ) : locationError ? (
                                <span style={{ color: "#ef4444" }}>{locationError}</span>
                            ) : (
                                <span>📍 Recherche de localisation...</span>
                            )}
                        </div>

                        {batteryLevel !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{isCharging ? '⚡' : '🔋'}</span>
                                <span>{Math.round(batteryLevel * 100)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
