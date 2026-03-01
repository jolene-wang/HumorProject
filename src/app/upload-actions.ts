"use server";

import { createClient } from "@/utils/supabase/server";

const API_BASE_URL = "https://api.almostcrackd.ai";

async function getAuthToken() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export async function generatePresignedUrl(contentType: string) {
  const token = await getAuthToken();
  if (!token) {
    return { error: "Not authenticated" };
  }

  const response = await fetch(`${API_BASE_URL}/pipeline/generate-presigned-url`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contentType }),
  });

  if (!response.ok) {
    return { error: `Failed to generate presigned URL: ${response.statusText}` };
  }

  const data = await response.json();
  return { data };
}

export async function uploadImageToPresignedUrl(presignedUrl: string, imageFile: File) {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": imageFile.type,
    },
    body: imageFile,
  });

  if (!response.ok) {
    return { error: `Failed to upload image: ${response.statusText}` };
  }

  return { success: true };
}

export async function registerImage(cdnUrl: string) {
  const token = await getAuthToken();
  if (!token) {
    return { error: "Not authenticated" };
  }

  const response = await fetch(`${API_BASE_URL}/pipeline/upload-image-from-url`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      imageUrl: cdnUrl,
      isCommonUse: false 
    }),
  });

  if (!response.ok) {
    return { error: `Failed to register image: ${response.statusText}` };
  }

  const data = await response.json();
  return { data };
}

export async function generateCaptions(imageId: string) {
  const token = await getAuthToken();
  if (!token) {
    return { error: "Not authenticated" };
  }

  const response = await fetch(`${API_BASE_URL}/pipeline/generate-captions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageId }),
  });

  if (!response.ok) {
    return { error: `Failed to generate captions: ${response.statusText}` };
  }

  const data = await response.json();
  return { data };
}
