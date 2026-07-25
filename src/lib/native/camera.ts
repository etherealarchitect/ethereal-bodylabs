import { isNative } from "@/lib/platform";

export type PhysiquePose = "front" | "side" | "back";

export interface CapturedPhysiquePhoto {
  dataUrl: string; // base64 image/jpeg
  pose: PhysiquePose;
  width: number;
  height: number;
}

/**
 * Capture a physique photo using the native camera when running inside
 * the iOS app; otherwise open the browser file picker.
 */
export async function capturePhysiquePhoto(pose: PhysiquePose): Promise<CapturedPhysiquePhoto | null> {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const result = await Camera.getPhoto({
      quality: 92,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
      correctOrientation: true,
      presentationStyle: "fullscreen",
    });
    if (!result.dataUrl) return null;
    return {
      dataUrl: result.dataUrl,
      pose,
      width: result.exif?.PixelXDimension ? Number(result.exif.PixelXDimension) : 0,
      height: result.exif?.PixelYDimension ? Number(result.exif.PixelYDimension) : 0,
    };
  }

  // Web fallback: file input
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ dataUrl: String(reader.result), pose, width: 0, height: 0 });
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
