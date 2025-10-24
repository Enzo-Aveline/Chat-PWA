'use client';
import { useEffect } from 'react';

type ToastProps = {
  message: string;
  type?: 'error' | 'success' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
};

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    error: 'var(--error)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    info: 'var(--primary)',
  }[type];

  const icon = {
    error: '❌',
    success: '✅',
    warning: '⚠️',
    info: 'ℹ️',
  }[type];

  return (
    <div
      style={{
        position: 'fixed',
        top: '2rem',
        right: '2rem',
        zIndex: 10000,
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: bgColor,
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <p style={{ margin: 0, flex: 1, fontWeight: '500' }}>{message}</p>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '0',
            opacity: 0.8,
          }}
        >
          ✕
        </button>
      </div>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}