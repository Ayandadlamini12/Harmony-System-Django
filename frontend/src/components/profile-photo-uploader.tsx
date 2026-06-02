"use client";

import { Camera, RotateCcw, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import { Button } from "@/components/ui/button";
import { showActionError } from "@/lib/action-error";

type UploadState = "idle" | "saving" | "saved" | "error";

export function ProfilePhotoUploader({ avatarUrl, name }: { avatarUrl?: string; name: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<UploadState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(nextFile?: File) {
    if (!nextFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
      const message = "Use a JPG, PNG, or WebP image.";
      setError(message);
      setStatus("error");
      showActionError({ title: "Profile image error", message });
      return;
    }
    if (nextFile.size > 6 * 1024 * 1024) {
      const message = "Choose an image under 6 MB before cropping.";
      setError(message);
      setStatus("error");
      showActionError({ title: "Profile image error", message });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setZoom(1);
    setError("");
    setStatus("idle");
  }

  async function createCroppedAvatar(): Promise<Blob> {
    if (!file || !previewUrl) throw new Error("Select a profile image first.");

    const image = new Image();
    image.src = previewUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the image crop.");

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not crop the image."))), "image/png", 0.92);
    });
  }

  async function uploadAvatar() {
    setStatus("saving");
    setError("");
    try {
      const croppedAvatar = await createCroppedAvatar();
      const formData = new FormData();
      formData.set("avatar", croppedAvatar, "profile-avatar.png");
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error("The profile image could not be saved.");
      setStatus("saved");
      toast.success("Profile picture saved");
      router.refresh();
    } catch (uploadError) {
      setStatus("error");
      const message = uploadError instanceof Error ? uploadError.message : "The profile image could not be saved.";
      setError(message);
      showActionError({
        title: "Profile image error",
        message
      });
    }
  }

  async function removeAvatar() {
    setStatus("saving");
    setError("");
    const response = await fetch("/api/account/avatar", { method: "DELETE" });
    if (response.ok) {
      setFile(null);
      setPreviewUrl(null);
      setStatus("idle");
      toast.success("Profile picture removed");
      router.refresh();
      return;
    }
    setStatus("error");
    const message = "The profile image could not be removed.";
    setError(message);
    showActionError({
      title: "Profile image error",
      message
    });
  }

  const displayUrl = previewUrl || avatarUrl || "/brand/harmony-icon-sm.webp";

  return (
    <div className="mt-5 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-[#d9c7e8] bg-white">
          <img
            alt={`${name} profile`}
            className="h-full w-full object-cover"
            src={displayUrl}
            style={previewUrl ? { transform: `scale(${zoom})` } : undefined}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileInputRef.current?.click()} type="button" variant="secondary">
              <Camera size={17} />
              Choose picture
            </Button>
            {file && (
              <LoadingButton onClick={uploadAvatar} type="button" loading={status === "saving"} loadingText="Saving crop...">
                {status !== "saving" && <Upload size={17} />}
                Save crop
              </LoadingButton>
            )}
            {avatarUrl && !file && (
              <Button onClick={removeAvatar} type="button" variant="secondary" disabled={status === "saving"}>
                <Trash2 size={17} />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          {file && (
            <div className="mt-4 max-w-xs">
              <label className="text-xs font-bold uppercase text-[#5d6b64]" htmlFor="profile-crop-zoom">
                Crop zoom
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="profile-crop-zoom"
                  className="w-full accent-[var(--hh-purple)]"
                  type="range"
                  min="1"
                  max="2"
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
                <Button className="h-9 w-9" onClick={() => setZoom(1)} size="icon" type="button" variant="secondary">
                  <RotateCcw size={15} />
                  <span className="sr-only">Reset crop</span>
                </Button>
              </div>
            </div>
          )}
          {status === "saved" && <p className="mt-3 text-sm font-semibold text-[var(--hh-green-dark)]">Profile picture saved.</p>}
          {error && <p className="mt-3 text-sm font-semibold text-[#a11b1b]">{error}</p>}
        </div>
      </div>
    </div>
  );
}
