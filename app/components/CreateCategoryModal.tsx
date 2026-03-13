"use client";

import { useState } from "react";

type CreateCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export function CreateCategoryModal({
  isOpen,
  onClose,
  onCreate,
}: CreateCategoryModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("카테고리 이름을 입력해 주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onCreate(trimmed);
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-category-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h2 id="create-category-title" className="mb-4 text-lg font-semibold text-zinc-900">
          새 카테고리
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 여행, 일상"
            className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            autoFocus
          />
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "만드는 중…" : "만들기"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
