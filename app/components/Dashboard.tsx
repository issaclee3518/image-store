"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IMAGES_BUCKET } from "@/lib/supabase/storage";
import type { User } from "@supabase/supabase-js";
import { PhotoUploadModal, type CategoryOption } from "./PhotoUploadModal";
import { ImageLightbox } from "./ImageLightbox";
import { CreateCategoryModal } from "./CreateCategoryModal";
import { InteractiveHoverButton } from "./InteractiveHoverButton";
import { MotionButton } from "./MotionButton";

const SIGNED_URL_EXPIRE_SEC = 3600;
const ALL_ID = "all";
const UNCATEGORIZED_ID = "uncategorized";
const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 224;

type ImageItem = { path: string; url: string; name: string; categoryId?: string };

type CategoryRow = { id: string; name: string };

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_ID);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageCache, setImageCache] = useState<Record<string, ImageItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, w: 0 });

  const supabase = createClient();

  useEffect(() => {
    if (!isResizing) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartRef.current.x;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartRef.current.w + delta));
      setSidebarWidth(next);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStartRef.current = { x: e.clientX, w: sidebarWidth };
      setIsResizing(true);
    },
    [sidebarWidth],
  );

  const fetchCategories = useCallback(
    async (uid: string) => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", uid)
        .order("name");
      if (error) {
        setCategories([]);
        return;
      }
      setCategories((data ?? []) as CategoryRow[]);
    },
    [supabase],
  );

  const fetchImages = useCallback(
    async (uid: string, categoryId: string): Promise<ImageItem[]> => {
      const listFolder = async (path: string): Promise<ImageItem[]> => {
        const { data: listData, error: listError } = await supabase.storage
          .from(IMAGES_BUCKET)
          .list(path, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
        if (listError) return [];
        const items = (listData ?? []).filter(
          (i) => !!i && typeof (i as { name?: string }).name === "string",
        ) as { name: string; id?: string }[];
        const results = await Promise.all(
          items.map(async (item) => {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            const isFile = !!(item as { id?: string }).id;
            if (!isFile) return null;
            const { data: urlData } = await supabase.storage
              .from(IMAGES_BUCKET)
              .createSignedUrl(fullPath, SIGNED_URL_EXPIRE_SEC);
            if (!urlData?.signedUrl) return null;
            return {
              path: fullPath,
              url: urlData.signedUrl,
              name: item.name,
            } satisfies ImageItem;
          }),
        );
        return results.filter((img): img is ImageItem => img !== null);
      };

      if (categoryId === ALL_ID) {
        const { data: rootData } = await supabase.storage
          .from(IMAGES_BUCKET)
          .list(uid, { limit: 500 });
        const rootItems = (rootData ?? []).filter(
          (i) => !!i && typeof (i as { name?: string }).name === "string",
        ) as { name: string; id?: string }[];
        const allResults = await Promise.all(
          rootItems.map(async (item) => {
            const fullPath = `${uid}/${item.name}`;
            const isFile = !!(item as { id?: string }).id;
            if (isFile) {
              const { data: urlData } = await supabase.storage
                .from(IMAGES_BUCKET)
                .createSignedUrl(fullPath, SIGNED_URL_EXPIRE_SEC);
              if (!urlData?.signedUrl) return [] as ImageItem[];
              return [
                {
                  path: fullPath,
                  url: urlData.signedUrl,
                  name: item.name,
                } satisfies ImageItem,
              ];
            }
            const inFolder = await listFolder(fullPath);
            return inFolder;
          }),
        );
        const allImages = allResults.flat();
        allImages.sort((a, b) => b.path.localeCompare(a.path));
        return allImages;
      }

      if (categoryId === UNCATEGORIZED_ID) {
        const rootFiles = await listFolder(uid);
        const uncategorizedFolder = await listFolder(`${uid}/uncategorized`);
        const merged = [...rootFiles, ...uncategorizedFolder];
        merged.sort((a, b) => b.path.localeCompare(a.path));
        return merged.map((img) => ({
          ...img,
          // Treat everything shown here as uncategorized for incremental updates
          categoryId: UNCATEGORIZED_ID,
        }));
      }

      const list = await listFolder(`${uid}/${categoryId}`);
      return list.map((img) => ({ ...img, categoryId }));
    },
    [supabase],
  );

  const loadData = useCallback(
    async (u: User) => {
      setLoading(true);
      await fetchCategories(u.id);
      const list = await fetchImages(u.id, selectedCategoryId);
      setImages(list);
      setImageCache((prev) => ({ ...prev, [selectedCategoryId]: list }));
      setLoading(false);
    },
    [fetchCategories, fetchImages, selectedCategoryId],
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      if (u) loadData(u);
      else setLoading(false);
    });
  }, [loadData, supabase.auth]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadData(u);
      else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [loadData, supabase.auth]);

  useEffect(() => {
    if (!user) return;
    const cached = imageCache[selectedCategoryId];
    if (cached) {
      setImages(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchImages(user.id, selectedCategoryId)
      .then((list) => {
        setImages(list);
        setImageCache((prev) => ({ ...prev, [selectedCategoryId]: list }));
      })
      .finally(() => setLoading(false));
  }, [user, fetchImages, selectedCategoryId, imageCache]);

  async function handleCreateCategory(name: string) {
    if (!user) return;
    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: name.trim(),
    });
    if (error) throw error;
    await fetchCategories(user.id);
  }

  function handleUploadSuccess(
    uploaded: { path: string; url: string; name: string; categoryId: string }[] = [],
  ) {
    if (uploaded.length > 0) {
      setImages((prev) => {
        const visible = uploaded.filter((img) => {
          if (selectedCategoryId === ALL_ID) return true;
          if (selectedCategoryId === UNCATEGORIZED_ID) {
            return img.categoryId === UNCATEGORIZED_ID;
          }
          return img.categoryId === selectedCategoryId;
        });
        if (visible.length === 0) return prev;
        return [...visible, ...prev];
      });
      // 캐시에도 반영해서 다시 카테고리 이동해도 재요청을 최소화
      setImageCache((prev) => {
        const next = { ...prev };
        // ALL 카테고리 캐시
        next[ALL_ID] = [...(next[ALL_ID] ?? []), ...uploaded];
        // 각 개별 카테고리/미분류 캐시
        for (const img of uploaded) {
          const key = img.categoryId === UNCATEGORIZED_ID ? UNCATEGORIZED_ID : img.categoryId;
          next[key] = [img, ...(next[key] ?? [])];
        }
        return next;
      });
    }
    setUploadOpen(false);
  }

  const categoryOptions: CategoryOption[] = categories.map((c) => ({ id: c.id, name: c.name }));

  if (!user) return null;

  return (
    <>
      <div className="flex min-h-screen w-full">
        {/* Left sidebar: categories (resizable) */}
        <aside
          className="shrink-0 border-r border-zinc-100 bg-white py-6 pl-6 pr-0"
          style={{ width: sidebarWidth }}
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            카테고리
          </h2>
          <nav className="flex flex-col gap-1 pr-4">
            <MotionButton
              label="전체"
              active={selectedCategoryId === ALL_ID}
              onClick={() => setSelectedCategoryId(ALL_ID)}
            />
            <MotionButton
              label="미분류"
              active={selectedCategoryId === UNCATEGORIZED_ID}
              onClick={() => setSelectedCategoryId(UNCATEGORIZED_ID)}
            />
            {categories.map((c) => (
              <MotionButton
                key={c.id}
                label={c.name}
                active={selectedCategoryId === c.id}
                onClick={() => setSelectedCategoryId(c.id)}
              />
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setCreateCategoryOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-200 py-2 text-sm font-medium text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
          >
            <span className="text-base">+</span> 카테고리 만들기
          </button>
        </aside>

        {/* Resize handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          tabIndex={0}
          onMouseDown={handleResizeStart}
          className={`flex w-1 shrink-0 cursor-col-resize items-stretch justify-center border-r border-transparent transition-colors hover:border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 ${
            isResizing ? "border-zinc-200 bg-zinc-100" : ""
          }`}
          style={{ touchAction: "none" }}
        >
          <span className="w-px bg-zinc-200" aria-hidden />
        </div>

        {/* Main: photo grid (flex-1 so width follows sidebar resize) */}
        <div className="min-w-0 flex-1 px-6 py-10 md:px-12 md:py-16">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {selectedCategoryId === ALL_ID
                ? "전체 사진"
                : selectedCategoryId === UNCATEGORIZED_ID
                  ? "미분류"
                  : categories.find((c) => c.id === selectedCategoryId)?.name ?? "사진"}
            </h1>
            <InteractiveHoverButton
              type="button"
              onClick={() => setUploadOpen(true)}
              text="추가"
              className="min-w-[8rem] px-6 py-2.5"
            />
          </div>

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center text-zinc-500">
              불러오는 중…
            </div>
          ) : images.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center">
              <p className="text-zinc-600">
                {selectedCategoryId === ALL_ID
                  ? "아직 올린 사진이 없어요."
                  : "이 카테고리에 사진이 없어요."}
              </p>
          
            </div>
          ) : (
            <ul
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
            >
              {images.map((img) => (
                <li
                  key={img.path}
                  className="group aspect-square cursor-pointer overflow-hidden rounded-xl bg-zinc-100"
                  onClick={() => setLightboxUrl(img.url)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setLightboxUrl(img.url);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="사진 크게 보기"
                >
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <PhotoUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleUploadSuccess}
        categories={categoryOptions}
        selectedCategoryId={selectedCategoryId === ALL_ID ? UNCATEGORIZED_ID : selectedCategoryId}
      />

      <CreateCategoryModal
        isOpen={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onCreate={handleCreateCategory}
      />

      <ImageLightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </>
  );
}

