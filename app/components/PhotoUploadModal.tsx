"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IMAGES_BUCKET } from "@/lib/supabase/storage";
import type { User } from "@supabase/supabase-js";

export type CategoryOption = { id: string; name: string };

type UploadedImage = {
  path: string;
  url: string;
  name: string;
  categoryId: string;
};

type PhotoUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (uploaded: UploadedImage[]) => void;
  categories?: CategoryOption[];
  selectedCategoryId?: string | null;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

const UNCATEGORIZED_ID = "uncategorized";

async function createThumbnailBlob(file: File, maxSize = 480): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      let { width, height } = img;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create thumbnail"));
          } else {
            resolve(blob);
          }
        },
        "image/jpeg",
        0.8,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}

export function PhotoUploadModal({
  isOpen,
  onClose,
  onSuccess,
  categories = [],
  selectedCategoryId = UNCATEGORIZED_ID,
}: PhotoUploadModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [categoryId, setCategoryId] = useState<string>(selectedCategoryId ?? UNCATEGORIZED_ID);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const supabase = createClient();

  // Create preview URLs when files change; revoke on cleanup to avoid memory leaks
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  useEffect(() => {
    if (!isOpen) return;
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
  }, [isOpen]);

  useEffect(() => {
    setCategoryId(selectedCategoryId ?? UNCATEGORIZED_ID);
  }, [selectedCategoryId, isOpen]);

  const reset = useCallback(() => {
    setFiles([]);
    setError(null);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  async function handleUpload() {
    if (!user) {
      setError("로그인한 후 사진을 올릴 수 있어요.");
      return;
    }

    if (files.length === 0) {
      setError("갤러리에서 사진을 선택해 주세요.");
      return;
    }

    setError(null);
    setUploading(true);
    let success = 0;
    let failed = 0;
    const uploadedItems: UploadedImage[] = [];

    const folder = categoryId === UNCATEGORIZED_ID ? "uncategorized" : categoryId;
    const baseTime = Date.now();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
      const path = `${user.id}/${folder}/${baseTime}-${i}-${safeName}.${ext}`;
      const thumbPath = `${user.id}/${folder}/thumb_${baseTime}-${i}-${safeName}.jpg`;

      const thumbnailBlob = await createThumbnailBlob(file);

      const [{ error: uploadError }, { error: thumbError }] = await Promise.all([
        supabase.storage.from(IMAGES_BUCKET).upload(path, file, {
          contentType: file.type || "image/jpeg",
          cacheControl: "31536000",
          upsert: false,
        }),
        supabase.storage.from(IMAGES_BUCKET).upload(thumbPath, thumbnailBlob, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false,
        }),
      ]);

      if (uploadError || thumbError) {
        failed += 1;
        const message = uploadError?.message ?? thumbError?.message ?? "업로드 실패";
        setError((prev) => (prev ? `${prev}; ` : "") + `${file.name}: ${message}`);
      } else {
        success += 1;
        const { data: urlData } = await supabase.storage
          .from(IMAGES_BUCKET)
          .createSignedUrl(path, 3600);
        if (urlData?.signedUrl) {
          uploadedItems.push({
            path,
            url: urlData.signedUrl,
            name: file.name,
            categoryId: categoryId === UNCATEGORIZED_ID ? UNCATEGORIZED_ID : categoryId,
          });
        }
      }
    }

    setUploading(false);
    setResult({ success, failed });
    if (success > 0) {
      setFiles([]);
      onSuccess?.(uploadedItems);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files || []);
    const images = chosen.filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...images]);
    setError(null);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const chosen = Array.from(e.dataTransfer.files || []);
    const images = chosen.filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...images]);
    setError(null);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDragLeave() {
    setDragActive(false);
  }

  if (!isOpen) return null;

  const isLoggedIn = !!user;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="upload-title" className="text-lg font-semibold text-zinc-900">
            갤러리에서 사진 가져오기
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isLoggedIn ? (
          <p className="text-sm text-zinc-600">
            로그인한 후 갤러리에서 사진을 가져올 수 있어요.
          </p>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">저장할 카테고리</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              >
                <option value={UNCATEGORIZED_ID}>미분류</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <label
              className={`mb-4 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
                dragActive ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
              }`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={onFileChange}
                aria-label="갤러리에서 사진 선택"
              />
              <span className="text-sm font-medium text-zinc-600">클릭하면 갤러리(사진 앨범)에서 고를 수 있어요</span>
              <span className="mt-1 text-xs text-zinc-500">PC에서는 여기에 사진을 끌어다 놓아도 됩니다</span>
            </label>

            {previewUrls.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <ul className="grid grid-cols-4 gap-2">
                  {previewUrls.map((url, i) => (
                    <li key={url} className="aspect-square overflow-hidden rounded-lg bg-zinc-200">
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <p className="mb-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {result && (
              <p className="mb-4 text-sm text-zinc-600" role="status">
                {result.success}개 업로드 완료
                {result.failed > 0 && `, ${result.failed}개 실패`}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="flex-1 rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {uploading ? "업로드 중…" : "업로드"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
