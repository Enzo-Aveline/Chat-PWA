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
    await startCamera();
  };

  if (!open) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div 
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt="Prévisualisation" 
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'contain',
                display: 'block'
              }} 
            />
            <div 
              style={{
                position: 'absolute',
                bottom: '2rem',
                left: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                gap: '1.5rem'
              }}
            >
              <button
                onClick={cancelPreview}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '9999px',
                  backgroundColor: '#374151',
                  color: 'white',
                  fontWeight: '600',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ❌ Reprendre
              </button>
              <button
                onClick={confirmPhoto}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '9999px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontWeight: '600',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ✅ Valider
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowFilters(v => !v)}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 30,
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '9999px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                padding: '0.5rem',
                border: '1px solid #dbeafe',
                cursor: 'pointer'
              }}
            >
              <FilterIcon />
            </button>

            {showFilters && (
              <div 
                style={{
                  position: 'absolute',
                  left: '4rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 30,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: '1rem',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  border: '1px solid #e5e7eb',
                  maxHeight: '80vh',
                  overflowY: 'auto'
                }}
              >
                {FILTERS.map(f => (
                  <button
                    key={f.name}
                    onClick={() => {
                      setFilter(f.value);
                      setShowFilters(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      backgroundColor: filter === f.value ? '#2563eb' : 'transparent',
                      color: filter === f.value ? 'white' : '#374151',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '1.75rem',
                        height: '1.75rem',
                        borderRadius: '9999px',
                        border: '1px solid #e5e7eb',
                        filter: f.value || 'none',
                        background: 'url("/icons/icon-192.png") center/cover no-repeat'
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
              style={{ 
                filter: filter || 'none',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />

            <div 
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingBottom: '2rem',
                zIndex: 10
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2rem',
                  marginBottom: '1rem'
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4b5563',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
                <button
                  onClick={takePhoto}
                  style={{
                    width: '4.5rem',
                    height: '4.5rem',
                    borderRadius: '9999px',
                    border: '4px solid white',
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    cursor: 'pointer'
                  }}
                >
                  <span 
                    style={{
                      display: 'block',
                      width: '2.75rem',
                      height: '2.75rem',
                      borderRadius: '9999px',
                      backgroundColor: 'white'
                    }}
                  />
                </button>
                <div style={{ width: '3.5rem', height: '3.5rem' }} />
              </div>
              <span 
                style={{
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: 0.9,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                Appuyez pour prendre une photo
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
