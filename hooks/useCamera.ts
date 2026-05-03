import { useState, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraCapturedPicture } from 'expo-camera';

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const hasPermission = permission?.granted ?? false;
  const canAskPermission = permission?.canAskAgain ?? true;

  async function capture(): Promise<CameraCapturedPicture | null> {
    if (!cameraRef.current || isCapturing) return null;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        exif: false,
      });
      return photo ?? null;
    } catch (err) {
      console.error('Camera capture error:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }

  return {
    cameraRef,
    hasPermission,
    canAskPermission,
    requestPermission,
    capture,
    isCapturing,
  };
}
