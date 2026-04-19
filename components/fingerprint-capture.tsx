'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, CheckCircle, AlertCircle, Fingerprint, X } from 'lucide-react';
import { getApiUrl, getValidAccessToken } from '../lib/utils';

interface FingerprintCaptureProps {
  cnic: string;
  onVerificationComplete: (verified: boolean, fingerprintImages: string[]) => void;
  onCancel: () => void;
}

type CaptureState = 'idle' | 'camera-loading' | 'camera-active' | 'captured' | 'review' | 'verifying' | 'verified' | 'failed';

export default function FingerprintCapture({ cnic, onVerificationComplete, onCancel }: FingerprintCaptureProps) {
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [fingerprintImages, setFingerprintImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
  }, []);

  const resetCapture = () => {
    setFingerprintImages([]);
    setCapturedImage(null);
    setError('');
    setCameraError('');
    setVideoReady(false);
    setCaptureState('idle');
    stopCamera();
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = async () => {
    try {
      setError('');
      setCameraError('');
      setCaptureState('camera-loading');

      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setCameraError('Camera access requires HTTPS.');
        setCaptureState('idle');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 } 
        } 
      });

      streamRef.current = stream;
      
      // Critical: Wait for the next tick to ensure the video element is rendered in 'camera-active' state
      setCaptureState('camera-active');

      // We use a small timeout to let React finish rendering the video element
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(e => {
            console.error("Autoplay prevented:", e);
            setCameraError("Please click the video to start the camera.");
          });
        }
      }, 100);

    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setCameraError(err.name === 'NotAllowedError' ? 'Permission denied.' : 'Could not access camera.');
      setCaptureState('idle');
    }
  };

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    setCaptureState('captured');
    stopCamera();
  }, [stopCamera]);

  const confirmCapture = () => {
    if (!capturedImage) return;
    const rawBase64 = capturedImage.split(',')[1];
    setFingerprintImages([rawBase64]);
    setCaptureState('review');
  };

  const verifyFingerprint = async () => {
    setCaptureState('verifying');
    try {
      const token = await getValidAccessToken();
      const response = await fetch(`${getApiUrl()}/api/nadra/verify-fingerprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cnic, fingerprintImages }),
      });

      const data = await response.json();
      if (response.ok && data.verified) {
        setCaptureState('verified');
        setTimeout(() => onVerificationComplete(true, fingerprintImages), 1500);
      } else {
        setCaptureState('failed');
        setError(data.message || 'Verification failed.');
      }
    } catch (err) {
      setCaptureState('failed');
      setError('Service unavailable.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Fingerprint className="text-primary" size={22} />
            <h2 className="font-bold text-foreground">Biometric Verification</h2>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-muted rounded-full"><X size={20} /></button>
        </div>

        <div className="p-5">
          {captureState === 'idle' && (
            <div className="text-center space-y-4">
              <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                <Fingerprint size={48} className="mx-auto text-primary mb-2 opacity-50" />
                <p className="text-sm">Position your hand against a plain background.</p>
              </div>
              {cameraError && <p className="text-destructive text-xs">{cameraError}</p>}
              <button onClick={startCamera} className="w-full bg-primary text-white py-3 rounded-xl font-bold">Open Camera</button>
            </div>
          )}

          {captureState === 'camera-loading' && (
            <div className="py-12 text-center animate-pulse">
              <Camera className="mx-auto mb-2 text-muted-foreground" />
              <p>Waking up camera...</p>
            </div>
          )}

          {captureState === 'camera-active' && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-primary">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onCanPlay={() => setVideoReady(true)}
                  className="w-full h-full object-cover"
                />
                {!videoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  </div>
                )}
                {videoReady && (
                  <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-full border border-white/30 rounded-lg" />
                  </div>
                )}
              </div>
              <button 
                disabled={!videoReady}
                onClick={captureImage} 
                className="w-full bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                Capture Hand
              </button>
            </div>
          )}

          {captureState === 'captured' && (
            <div className="space-y-4">
              <img src={capturedImage!} className="w-full rounded-xl aspect-video object-cover" alt="Captured" />
              <div className="flex gap-2">
                <button onClick={() => { setCapturedImage(null); startCamera(); }} className="flex-1 bg-secondary py-3 rounded-xl">Retake</button>
                <button onClick={confirmCapture} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold">Confirm</button>
              </div>
            </div>
          )}

          {captureState === 'review' && (
            <div className="text-center space-y-4">
              <p className="font-bold">Image Ready</p>
              <button onClick={verifyFingerprint} className="w-full bg-primary text-white py-3 rounded-xl">Verify with NADRA</button>
              <button onClick={resetCapture} className="text-xs text-muted-foreground underline">Start Over</button>
            </div>
          )}

          {(captureState === 'verifying' || captureState === 'verified') && (
            <div className="py-10 text-center space-y-4">
              {captureState === 'verifying' ? (
                <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full mx-auto" />
              ) : (
                <CheckCircle size={48} className="mx-auto text-green-500" />
              )}
              <p className="font-medium">{captureState === 'verifying' ? 'Processing...' : 'Verified Successfully'}</p>
            </div>
          )}

          {captureState === 'failed' && (
            <div className="text-center space-y-4">
              <AlertCircle size={48} className="mx-auto text-destructive" />
              <p className="text-destructive font-bold">{error}</p>
              <button onClick={resetCapture} className="w-full bg-primary text-white py-3 rounded-xl">Try Again</button>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}