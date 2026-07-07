'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ScanLine,
  Camera,
  Upload,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CapsuleLoader } from '@/components/medassist/capsule-loader';

type Phase = 'idle' | 'camera' | 'preview' | 'result';

export function MedicineView() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount.
  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPhase('camera');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Camera unavailable';
      toast.error(`Couldn't access camera: ${msg}`);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 540;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImage(dataUrl);
    stopCamera();
    setPhase('preview');
  }

  function cancelCamera() {
    stopCamera();
    setPhase('idle');
  }

  function onFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setPhase('preview');
    };
    reader.onerror = () => toast.error('Could not read that file');
    reader.readAsDataURL(file);
    // reset so selecting the same file again still fires change
    e.target.value = '';
  }

  function retake() {
    setImage(null);
    setResult(null);
    setNote('');
    setPhase('idle');
  }

  async function identify() {
    if (!image) return;
    setLoading(true);
    try {
      const res = await fetch('/api/medicine/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Identify failed (${res.status}) ${t}`);
      }
      const data = (await res.json()) as { result: string };
      setResult(data.result);
      setPhase('result');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Medicine identify failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <ScanLine className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Medicine Assistant
            </h2>
            <p className="text-sm text-muted-foreground">
              Snap or upload a photo of the pill or packaging to get an
              educational ID.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/8 p-3 text-xs text-foreground/90">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            For informational purposes only. AI photo identification isn’t
            always accurate, especially for loose or unmarked pills — always
            confirm with a pharmacist or doctor before taking anything.
          </p>
        </div>
      </div>

      {/* States */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {phase === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Camera className="size-7" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                Capture or upload a medicine photo
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Best with clear packaging text or pill imprints.
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={startCamera} className="rounded-full">
                <Camera className="size-4" />
                Use Camera
              </Button>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="rounded-full"
              >
                <Upload className="size-4" />
                Upload Photo
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFileSelected}
              className="hidden"
            />
          </div>
        )}

        {phase === 'camera' && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-[300px] w-full object-cover sm:h-[380px]"
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button onClick={capturePhoto} className="rounded-full">
                <Camera className="size-4" />
                Capture
              </Button>
              <Button
                variant="outline"
                onClick={cancelCamera}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {phase === 'preview' && image && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <img
                src={image}
                alt="Captured medicine"
                className="max-h-[360px] w-full object-contain"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="note"
                className="text-xs font-medium text-muted-foreground"
              >
                Optional: anything you already know
              </label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. round white tablet, no imprint"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={retake}
                className="rounded-full"
              >
                <RotateCcw className="size-4" />
                Retake
              </Button>
              <Button
                onClick={identify}
                disabled={loading}
                className="rounded-full"
              >
                {loading ? (
                  <CapsuleLoader className="h-4" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {loading ? 'Identifying…' : 'Identify Medicine'}
              </Button>
            </div>
          </div>
        )}

        {phase === 'result' && result && image && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <img
                src={image}
                alt="Captured medicine"
                className="max-h-[220px] w-full object-contain"
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-4" />
                <span className="text-sm font-semibold">AI Identification</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {result}
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-foreground/10 bg-foreground/4 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                Educational only — a pharmacist or doctor always makes the
                final call.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={retake}
                className="rounded-full"
              >
                <RotateCcw className="size-4" />
                Identify another
              </Button>
            </div>
          </div>
        )}

        {phase === 'idle' && (
          <p className="mt-1 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <ImageIcon className="size-3" />
            Photos are processed by the AI model and never stored.
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          The vision model is reading the packaging…
        </div>
      )}
    </motion.div>
  );
}

export default MedicineView;
