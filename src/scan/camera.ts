export type CameraErrorKind = 'insecure' | 'unsupported' | 'denied' | 'unavailable' | 'unknown';

export class CameraError extends Error {
  constructor(
    public readonly kind: CameraErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export interface CameraSession {
  stream: MediaStream;
  facingMode: 'environment' | 'user' | undefined;
  stop(): void;
}

/**
 * Starts the camera into `video`. Prefers the rear camera. Requires a secure
 * context (HTTPS or localhost) — the static host must serve over HTTPS.
 */
export async function startCamera(
  video: HTMLVideoElement,
  facingMode: 'environment' | 'user' = 'environment',
): Promise<CameraSession> {
  if (!window.isSecureContext) {
    throw new CameraError('insecure', 'Camera access requires HTTPS.');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('unsupported', 'This browser does not support camera access.');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (e) {
    throw toCameraError(e);
  }
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();

  const settings = stream.getVideoTracks()[0]?.getSettings();
  const actual = settings?.facingMode as 'environment' | 'user' | undefined;
  return {
    stream,
    facingMode: actual,
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      if (video.srcObject === stream) video.srcObject = null;
    },
  };
}

function toCameraError(e: unknown): CameraError {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new CameraError('denied', 'Camera permission was denied.');
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') {
    return new CameraError('unavailable', 'No usable camera was found.');
  }
  return new CameraError('unknown', e instanceof Error ? e.message : 'Could not start the camera.');
}
