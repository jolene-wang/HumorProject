"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generatePresignedUrl, registerImage, generateCaptions } from "../upload-actions";

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

      setCaptions(captionsResult.data.captions || []);
      setStatus("Captions generated successfully!");
      setLoading(false);
    } catch (error) {
      setStatus(`Error: ${error}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Upload Image
          </h1>
          <button
            onClick={() => router.push("/")}
            className="bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Back to Home
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Select Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
              onChange={handleFileChange}
              className="block w-full text-sm text-zinc-900 dark:text-zinc-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
            />
          </div>

          {file && (
            <div className="mb-6">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing..." : "Upload & Generate Captions"}
          </button>

          {status && (
            <p className="mt-4 text-center text-zinc-700 dark:text-zinc-300">
              {status}
            </p>
          )}

          {captions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                Generated Captions
              </h2>
              <div className="space-y-2">
                {captions.map((caption, index) => (
                  <div
                    key={index}
                    className="p-4 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
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
