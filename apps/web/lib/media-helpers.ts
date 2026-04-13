type UploadedMediaResult = {
  provider: "CLOUDINARY";
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

type ReverseGeocodeResult = {
  addressLine1?: string;
  city?: string;
  stateRegion?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
};

export async function collectFileMetadata(file: File) {
  if (typeof window === "undefined") {
    return {};
  }

  if (file.type.startsWith("image/")) {
    const dimensions = await readImageDimensions(file);
    return dimensions;
  }

  if (file.type.startsWith("video/")) {
    const video = await readVideoMetadata(file);
    return video;
  }

  if (file.type.startsWith("audio/")) {
    const audio = await readAudioMetadata(file);
    return audio;
  }

  return {};
}

export async function uploadFileToCloudinary(file: File): Promise<UploadedMediaResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    const missing = [
      !cloudName ? "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" : null,
      !uploadPreset ? "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET" : null
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(`Cloudinary browser uploads need ${missing}. Make sure apps/web can read the repo root .env before starting Next.js.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("resource_type", "auto");

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Cloudinary upload failed.");
  }

  const payload = (await response.json()) as {
    public_id: string;
    secure_url: string;
    bytes?: number;
    width?: number;
    height?: number;
    duration?: number;
    resource_type?: string;
  };

  return {
    provider: "CLOUDINARY",
    storageKey: payload.public_id,
    url: payload.secure_url,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: payload.bytes ?? file.size,
    width: payload.width,
    height: payload.height,
    durationMs: payload.duration ? Math.round(payload.duration * 1000) : undefined
  };
}

export async function reverseGeocodeCurrentPosition(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
    {
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error("Could not resolve your current location right now.");
  }

  const payload = (await response.json()) as {
    address?: {
      road?: string;
      house_number?: string;
      city?: string;
      town?: string;
      village?: string;
      county?: string;
      state?: string;
      region?: string;
      country_code?: string;
    };
  };

  const address = payload.address ?? {};
  const road = [address.house_number, address.road].filter(Boolean).join(" ").trim();

  return {
    addressLine1: road || undefined,
    city: address.city || address.town || address.village || address.county || undefined,
    stateRegion: address.state || address.region || undefined,
    countryCode: address.country_code?.toUpperCase(),
    latitude,
    longitude
  };
}

function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      resolve({
        width: image.naturalWidth || undefined,
        height: image.naturalHeight || undefined
      });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      resolve({});
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}

function readVideoMetadata(file: File): Promise<{ width?: number; height?: number; durationMs?: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined
      });
      URL.revokeObjectURL(objectUrl);
    };
    video.onerror = () => {
      resolve({});
      URL.revokeObjectURL(objectUrl);
    };
    video.src = objectUrl;
  });
}

function readAudioMetadata(file: File): Promise<{ durationMs?: number }> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve({
        durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined
      });
      URL.revokeObjectURL(objectUrl);
    };
    audio.onerror = () => {
      resolve({});
      URL.revokeObjectURL(objectUrl);
    };
    audio.src = objectUrl;
  });
}
