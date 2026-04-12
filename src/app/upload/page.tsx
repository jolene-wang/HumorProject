"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generatePresignedUrl, registerImage, generateCaptions } from "../upload-actions";
import Nav from "../components/Nav";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [captions, setCaptions] = useState<string[]>([]);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setCaptions([]);
      setStatus("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a file");
      return;
    }

    setLoading(true);
    setStatus("Generating presigned URL...");

    try {
      // Step 1: Generate presigned URL
      const presignedResult = await generatePresignedUrl(file.type);
      if (presignedResult.error) {
        setStatus(`Error: ${presignedResult.error}`);
        setLoading(false);
        return;
      }

      const { presignedUrl, cdnUrl } = presignedResult.data;
      setStatus("Uploading image...");

      // Step 2: Upload image to presigned URL
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        setStatus(`Upload failed: ${uploadResponse.statusText}`);
        setLoading(false);
        return;
      }

      setStatus("Registering image...");

      // Step 3: Register image
      const registerResult = await registerImage(cdnUrl);
      if (registerResult.error) {
        setStatus(`Error: ${registerResult.error}`);
        setLoading(false);
        return;
      }

      const { imageId } = registerResult.data;
      setStatus("Generating captions...");

      // Step 4: Generate captions
      const captionsResult = await generateCaptions(imageId);
      if (captionsResult.error) {
        setStatus(`Error: ${captionsResult.error}`);
        setLoading(false);
        return;
      }
      
      const captionData = captionsResult.data;
      let captionsList: string[] = [];
      
      if (Array.isArray(captionData)) {
        captionsList = captionData.map((c: any) => c.content || c.caption || c);
      } else if (captionData.captions) {
        captionsList = Array.isArray(captionData.captions) 
          ? captionData.captions.map((c: any) => c.content || c.caption || c)
          : [captionData.captions];
      } else if (captionData.content) {
        captionsList = [captionData.content];
      }
      
      setCaptions(captionsList);
      setStatus(captionsList.length > 0 ? "Captions generated successfully!" : "No captions generated");
      setLoading(false);
    } catch (error) {
      setStatus(`Error: ${error}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">📸 Create a Meme</h1>
          <p className="text-zinc-400 mt-1">Upload an image and AI will generate captions for it</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Select Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
              onChange={handleFileChange}
              className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
            />
          </div>

          {file && (
            <div className="mb-6">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                className="max-w-full h-auto rounded-xl"
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing..." : "Upload & Generate Captions"}
          </button>

          {status && (
            <p className="mt-4 text-center text-zinc-400">
              {status}
            </p>
          )}

          {captions.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Generated Captions</h2>
                <button
                  onClick={() => router.push("/mymemes")}
                  className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  View in My Memes →
                </button>
              </div>
              <div className="space-y-2">
                {captions.map((caption, index) => (
                  <div
                    key={index}
                    className="p-4 bg-zinc-800 rounded-xl text-zinc-200 text-sm leading-relaxed"
                  >
                    {caption}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
