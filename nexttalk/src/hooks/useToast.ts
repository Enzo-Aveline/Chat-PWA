import { useState, useCallback } from 'react';

type ToastType = 'error' | 'success' | 'info' | 'warning';

type ToastData = {
  id: number;
  message: string;
  type: ToastType;
};

/**
 * Hook personnalisé pour gérer l'affichage de notifications (Toasts).
 * Permet d'empiler plusieurs notifications et de les supprimer individuellement.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  /**
   * Ajoute une notification à la liste.
   * L'ID est généré via timestamp + random pour unicité simple.
   */
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Log silencieux pour debug sans déclencher l'overlay Next.js
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const style = type === 'error' ? 'color: red' : type === 'success' ? 'color: green' : 'color: blue';
      console.log(`%c[Toast ${type.toUpperCase()}]`, style, message);
    }
  }, []);

  /**
   * Supprime une notification spécifique par son ID.
   */
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    // Helpers pratiques pour chaque type de notification
    showError: useCallback((msg: string) => showToast(msg, 'error'), [showToast]),
    showSuccess: useCallback((msg: string) => showToast(msg, 'success'), [showToast]),
    showWarning: useCallback((msg: string) => showToast(msg, 'warning'), [showToast]),
    showInfo: useCallback((msg: string) => showToast(msg, 'info'), [showToast]),
  };
}