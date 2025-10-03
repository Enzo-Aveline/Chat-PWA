import { useRef, useEffect, useState } from 'react';

type CameraModalProps = {
  open: boolean;
  onClose: () => void;
  onPhoto: (photo: string) => void;
};

const FILTERS = [
  { name: 'Aucun', value: '' },
  { name: 'Noir & Blanc', value: 'grayscale(1)' },
  { name: 'Sépia', value: 'sepia(1)' },
  { name: 'Contraste', value: 'contrast(1.5)' },
  { name: 'Vintage', value: 'sepia(0.5) contrast(1.2) brightness(0.9)' },
  { name: 'Bleu', value: 'contrast(1.1) brightness(1.1) hue-rotate(200deg)' },
  { name: 'Inversé', value: 'invert(1)' },
  { name: 'Saturé', value: 'saturate(2)' },
  { name: 'Flou', value: 'blur(5px)' },
  { name: 'Négatif', value: 'invert(1) hue-rotate(180deg)' },
  { name: 'Clair', value: 'brightness(1.3) saturate(1.2)' },
  { name: 'Foncé', value: 'brightness(0.7) contrast(1.2)' },
  { name: 'Dessin', value: 'contrast(1.5) brightness(1.2) saturate(0.5)' },
];

function FilterIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width={28} height={28}>
      <circle cx="6" cy="12" r="2" fill="#2563eb" />
      <circle cx="12" cy="12" r="2" fill="#60a5fa" />
      <circle cx="18" cy="12" r="2" fill="#6b7280" />
    </svg>
  );
}

export default function CameraModal({ open, onClose, onPhoto }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [filter, setFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fonction pour lancer la caméra
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  useEffect(() => {
    if (open) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setPreview(null);
    };
  }, [open]);

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = filter || 'none';
        ctx.drawImage(videoRef.current, 0, 0);
        const photoUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreview(photoUrl);
        // on arrête la caméra pendant la preview
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      }
    }
  };

  const confirmPhoto = () => {
    if (preview) {
      onPhoto(preview);
      onClose();
      setPreview(null);
    }
  };

  const cancelPreview = async () => {
    setPreview(null);
    await startCamera(); // ⬅️ relance la caméra
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="relative bg-gray-100 shadow-2xl w-full h-full flex flex-col items-center overflow-hidden">
        
        {preview ? (
          <>
            <img src={preview} alt="Prévisualisation" className="w-full h-full object-cover" />
            <div className="absolute bottom-6 left-0 w-full flex justify-center gap-6">
              <button
                onClick={cancelPreview}
                className="px-6 py-3 rounded-full bg-gray-700 text-white font-medium shadow hover:bg-gray-600 transition"
              >
                ❌ Reprendre
              </button>
              <button
                onClick={confirmPhoto}
                className="px-6 py-3 rounded-full bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
              >
                ✅ Valider
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowFilters(v => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-white/80 rounded-full shadow p-2 border border-blue-100 hover:bg-blue-50 transition"
            >
              <FilterIcon />
            </button>

            {showFilters && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 z-30 bg-white/95 rounded-2xl shadow-lg p-3 flex flex-col gap-2 border border-gray-200">
                {FILTERS.map(f => (
                  <button
                    key={f.name}
                    onClick={() => {
                      setFilter(f.value);
                      setShowFilters(false);
                    }}
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium transition
                      ${filter === f.value ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}
                  >
                    <span
                      className="inline-block w-7 h-7 rounded-full border border-gray-200"
                      style={{
                        filter: f.value || 'none',
                        background: 'url("/icons/icon-192.png") center/cover no-repeat',
                      }}
                    />
                    {f.name}
                  </button>
                ))}
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ filter: filter || 'none' }}
              className="w-full h-full object-cover transition-all duration-200"
            />

            <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pb-6 z-10">
              <div className="flex items-center justify-center gap-8 mb-4">
                <button
                  onClick={onClose}
                  className="w-12 h-12 rounded-full bg-gray-200/80 flex items-center justify-center text-gray-600 text-lg font-bold shadow hover:bg-gray-300 transition"
                >
                  ✕
                </button>
                <button
                  onClick={takePhoto}
                  className="w-16 h-16 rounded-full border-4 border-white bg-blue-600 flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <span className="block w-10 h-10 rounded-full bg-white" />
                </button>
                <div className="w-12 h-12" />
              </div>
              <span className="text-white text-xs opacity-80">Appuyez pour prendre une photo</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
