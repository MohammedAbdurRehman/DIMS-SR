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
  const [countdown, setCountdown] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const resetCapture = () => {
    setFingerprintImages([]);
    setCapturedImage(null);
    setError('');
    setCameraError('');
    setCaptureState('idle');
    stopCamera();
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      setCameraError('');
      setCameraAvailable(true);
      setCaptureState('camera-loading');

      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
      if (!hasVideoDevice) {
        setCameraAvailable(false);
        setCameraError('No camera device detected on this system.');
        setCaptureState('idle');
        return;
      }

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use rear camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (primaryError) {
        console.warn('Primary camera access failed, falling back to default camera:', primaryError);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCaptureState('camera-active');
        };
      } else {
        setCaptureState('camera-active');
      }
    } catch (err: any) {
      setCameraError('Could not access camera. Please allow camera permission and try again.');
      setError('Camera initialization failed.');
      setCaptureState('idle');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    setCapturedImage(imageDataUrl);
    setCaptureState('captured');
  }, []);

  const confirmCapture = () => {
    if (!capturedImage) return;
    const rawBase64 = capturedImage.split(',')[1];
    // For single hand capture, we store just one image
    setFingerprintImages([rawBase64]);
    setCapturedImage(null);
    setError('');
    stopCamera();
    setCaptureState('review');
  };

  const retake = () => {
    setCapturedImage(null);
    setCaptureState('camera-active');
    setError('');
  };

  const verifyFingerprint = async () => {
    if (fingerprintImages.length !== 1) {
      setCaptureState('failed');
      setError('Please capture your hand before verification.');
      return;
    }

    setCaptureState('verifying');
    setError('');

    try {
      const token = await getValidAccessToken();
      if (!token) {
        setCaptureState('failed');
        setError('Authentication required. Please login again.');
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/nadra/verify-fingerprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cnic, fingerprintImages }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setCaptureState('verified');
        setTimeout(() => {
          onVerificationComplete(true, fingerprintImages);
        }, 1500);
      } else {
        setCaptureState('failed');
        setError(data.message || 'Fingerprint verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Fingerprint verify error:', err);
      setCaptureState('failed');
      setError('Verification service unavailable. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Fingerprint className="text-primary" size={22} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">Fingerprint Verification</h2>
              <p className="text-xs text-muted-foreground">Via NADRA Biometric System</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Idle State */}
          {captureState === 'idle' && (
            <div className="text-center space-y-4">
              <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                <Fingerprint size={56} className="mx-auto text-primary mb-3 opacity-70" />
                <p className="text-sm text-foreground font-medium mb-1">
                  Biometric Verification Required
                </p>
                <p className="text-xs text-muted-foreground">
                  Place your entire hand flat on a light surface or directly on the camera lens,
                  ensuring all five fingers are visible, then capture a clear image for NADRA verification.
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-left">
                <p className="text-xs text-muted-foreground font-medium mb-1">Tips for best results:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Ensure all five fingers are clearly visible</li>
                  <li>Keep hand flat and spread fingers slightly</li>
                  <li>Ensure good lighting on your hand</li>
                  <li>Hold still during capture</li>
                  <li>Keep background plain and well-lit</li>
                </ul>
              </div>
              {(error || cameraError) && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  {cameraError || error}
                </div>
              )}
              <button
                onClick={startCamera}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={18} />
                Open Camera
              </button>
              {!cameraAvailable && (
                <div className="text-sm text-muted-foreground">
                  Camera not found. You can still capture a fingerprint image by using any available camera device or a plain surface.
                </div>
              )}
            </div>
          )}

          {/* Camera Loading */}
          {captureState === 'camera-loading' && (
            <div className="text-center py-8 space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Camera className="absolute inset-0 m-auto text-primary" size={32} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Initializing Camera...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please allow camera access when prompted
                </p>
              </div>
            </div>
          )}

          {/* Camera Active */}
          {captureState === 'camera-active' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 border border-border bg-slate-950/10">
                <p className="text-sm font-semibold text-foreground">Capture Your Hand</p>
                <p className="text-xs text-muted-foreground">Position all five fingers clearly in frame</p>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-black border-2 border-primary aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Hand overlay guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-primary/60 rounded-lg w-48 h-32 flex items-center justify-center">
                    <Fingerprint size={48} className="text-primary/40" />
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-green-500 w-3 h-3 rounded-full animate-pulse" />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Position your entire hand within the frame with all fingers visible and spread slightly.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    resetCapture();
                    onCancel();
                  }}
                  className="flex-1 border border-border text-foreground py-3 rounded-xl font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={captureImage}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera size={16} />
                  Capture
                </button>
              </div>
            </div>
          )}

          {/* Captured Finger */}
          {captureState === 'captured' && capturedImage && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-border aspect-video bg-black">
                <img
                  src={capturedImage}
                  alt="Captured fingerprint"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Review the captured image of your hand.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className="flex-1 border border-border text-foreground py-3 rounded-xl font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  Retake
                </button>
                <button
                  onClick={confirmCapture}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Fingerprint size={16} />
                  Save Hand Capture
                </button>
              </div>
            </div>
          )}

          {/* Review All Fingers */}
          {captureState === 'review' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 border border-primary/20 bg-primary/5">
                <p className="text-sm font-semibold text-foreground">Hand Capture Complete</p>
                <p className="text-xs text-muted-foreground">Review the image below before verification.</p>
              </div>
              <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
                <img
                  src={`data:image/jpeg;base64,${fingerprintImages[0]}`}
                  alt="Captured hand"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetCapture}
                  className="flex-1 border border-border text-foreground py-3 rounded-xl font-semibold hover:bg-muted transition-colors"
                >
                  Retake
                </button>
                <button
                  onClick={verifyFingerprint}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  Verify Hand
                </button>
              </div>
            </div>
          )}

          {/* Verifying */}
          {captureState === 'verifying' && (
            <div className="text-center py-8 space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Fingerprint className="absolute inset-0 m-auto text-primary" size={32} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Verifying with NADRA...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comparing biometric data with NADRA records
                </p>
              </div>
            </div>
          )}

          {/* Verified */}
          {captureState === 'verified' && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle size={48} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">Fingerprint Verified!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Identity confirmed by NADRA. Proceeding with SIM registration...
                </p>
              </div>
            </div>
          )}

          {/* Failed */}
          {captureState === 'failed' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle size={48} className="text-destructive" />
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">Verification Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <button
                onClick={retake}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}