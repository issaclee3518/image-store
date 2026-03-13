"use client";

import { motion, type PanInfo } from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import {
  ArrowRight,
  Database,
  ImagePlus,
  Mail,
  Plus,
  Settings,
  Webhook,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { IMAGES_BUCKET } from "@/lib/supabase/storage";

const SIGNED_URL_EXPIRE_SEC = 3600;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition";
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  position: { x: number; y: number };
  imageUrl?: string;
  imagePath?: string;
}

interface WorkflowConnection {
  from: string;
  to: string;
}

const nodeTemplates: Omit<WorkflowNode, "id" | "position" | "imageUrl" | "imagePath">[] = [
  { type: "trigger", title: "Webhook", description: "Receive data from external service", icon: Webhook, color: "emerald" },
  { type: "action", title: "Database Query", description: "Fetch user records", icon: Database, color: "blue" },
  { type: "condition", title: "Condition", description: "Check user status", icon: Settings, color: "amber" },
  { type: "action", title: "Send Email", description: "Notify user", icon: Mail, color: "purple" },
  { type: "action", title: "Log Event", description: "Record activity", icon: Zap, color: "indigo" },
];

const initialNodes: WorkflowNode[] = [];
const initialConnections: WorkflowConnection[] = [];

const colorClasses: Record<string, string> = {
  emerald: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
  blue: "border-blue-400/40 bg-blue-400/10 text-blue-400",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-400",
  purple: "border-purple-400/40 bg-purple-400/10 text-purple-400",
  indigo: "border-indigo-400/40 bg-indigo-400/10 text-indigo-400",
};

function WorkflowConnectionLine({
  from,
  to,
  nodes,
}: { from: string; to: string; nodes: WorkflowNode[] }) {
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  const startX = fromNode.position.x + NODE_WIDTH;
  const startY = fromNode.position.y + NODE_HEIGHT / 2;
  const endX = toNode.position.x;
  const endY = toNode.position.y + NODE_HEIGHT / 2;
  const cp1X = startX + (endX - startX) * 0.5;
  const cp2X = endX - (endX - startX) * 0.5;
  const path = `M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}`;

  return (
    <path
      d={path}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeDasharray="8,6"
      strokeLinecap="round"
      opacity={0.35}
      className="text-zinc-400"
    />
  );
}

type ImageOption = { path: string; url: string; name: string };

export function WorkflowBuilder({ userId }: { userId: string }) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [connections, setConnections] = useState<WorkflowConnection[]>(initialConnections);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [contentSize, setContentSize] = useState(() => ({
    width: initialNodes.length
      ? Math.max(...initialNodes.map((n) => n.position.x + NODE_WIDTH)) + 50
      : 600,
    height: initialNodes.length
      ? Math.max(...initialNodes.map((n) => n.position.y + NODE_HEIGHT)) + 50
      : 400,
  }));
  /** 'add' = 새 노드로 사진 추가, string = 해당 노드를 사진으로 교체 */
  const [photoPickerOpen, setPhotoPickerOpen] = useState<string | "add" | null>(null);
  const [photoOptions, setPhotoOptions] = useState<ImageOption[]>([]);
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false);

  const supabase = createClient();

  const loadUserImages = useCallback(async () => {
    setPhotoPickerLoading(true);
    const files: { path: string; name: string }[] = [];

    const { data: rootData } = await supabase.storage
      .from(IMAGES_BUCKET)
      .list(userId, { limit: 500 });
    const rootItems = (rootData ?? []).filter(
      (i) => !!i && typeof (i as { name?: string }).name === "string"
    ) as { name: string; id?: string }[];

    for (const item of rootItems) {
      const fullPath = `${userId}/${item.name}`;
      if ((item as { id?: string }).id) {
        if (!item.name.startsWith("thumb_")) files.push({ path: fullPath, name: item.name });
      } else {
        const { data: sub } = await supabase.storage
          .from(IMAGES_BUCKET)
          .list(fullPath, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
        const subItems = (sub ?? []).filter(
          (i) => !!i && typeof (i as { name?: string }).name === "string"
        ) as { name: string; id?: string }[];
        for (const i of subItems) {
          if ((i as { id?: string }).id && !i.name.startsWith("thumb_")) {
            files.push({ path: `${fullPath}/${i.name}`, name: i.name });
          }
        }
      }
    }

    const urls = await Promise.all(
      files.slice(0, 60).map(async (f) => {
        const { data } = await supabase.storage.from(IMAGES_BUCKET).createSignedUrl(f.path, SIGNED_URL_EXPIRE_SEC);
        return { path: f.path, url: data?.signedUrl ?? "", name: f.name };
      })
    );
    setPhotoOptions(urls.filter((u) => u.url));
    setPhotoPickerLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    if (photoPickerOpen) loadUserImages();
  }, [photoPickerOpen, loadUserImages]);

  const handleDragStart = (nodeId: string) => {
    setDraggingNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) dragStartPosition.current = { x: node.position.x, y: node.position.y };
  };

  const handleDrag = (nodeId: string, { offset }: PanInfo) => {
    if (draggingNodeId !== nodeId || !dragStartPosition.current) return;
    const newX = Math.max(0, dragStartPosition.current.x + offset.x);
    const newY = Math.max(0, dragStartPosition.current.y + offset.y);
    flushSync(() => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, position: { x: newX, y: newY } } : n))
      );
    });
    setContentSize((prev) => ({
      width: Math.max(prev.width, newX + NODE_WIDTH + 50),
      height: Math.max(prev.height, newY + NODE_HEIGHT + 50),
    }));
  };

  const handleDragEnd = () => {
    setDraggingNodeId(null);
    dragStartPosition.current = null;
  };

  const openAddNodePicker = () => {
    setPhotoPickerOpen("add");
  };

  const addNodeWithPhoto = (imageUrl: string, imagePath: string) => {
    const lastNode = nodes[nodes.length - 1];
    const newPosition = lastNode
      ? { x: lastNode.position.x + 260, y: lastNode.position.y }
      : { x: 50, y: 100 };
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: "action",
      title: "사진",
      description: "영상 시퀀스",
      icon: ImagePlus,
      color: "blue",
      position: newPosition,
      imageUrl,
      imagePath,
    };
    flushSync(() => {
      setNodes((prev) => [...prev, newNode]);
      if (lastNode) setConnections((prev) => [...prev, { from: lastNode.id, to: newNode.id }]);
    });
    setContentSize((prev) => ({
      width: Math.max(prev.width, newPosition.x + NODE_WIDTH + 50),
      height: Math.max(prev.height, newPosition.y + NODE_HEIGHT + 50),
    }));
    setPhotoPickerOpen(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.scrollTo({ left: newPosition.x + NODE_WIDTH - canvas.clientWidth + 100, behavior: "smooth" });
    }
  };

  const setNodePhoto = (nodeId: string, imageUrl: string, imagePath: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, imageUrl, imagePath } : n))
    );
    setPhotoPickerOpen(null);
  };

  const clearNodePhoto = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, imageUrl: undefined, imagePath: undefined } : n))
    );
    setPhotoPickerOpen(null);
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wide text-zinc-600 hover:text-zinc-900"
          >
            ← 메인으로
          </Link>
          <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            영상 제작
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Active
              </span>
              <span className="text-xs uppercase tracking-wider text-zinc-500">Workflow Builder</span>
            </div>
            <button
              type="button"
              onClick={openAddNodePicker}
              className="flex h-8 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-50"
            >
              <Plus className="h-3.5 w-3.5" />
              노드 추가 (사진 선택)
            </button>
          </div>

          <div
            ref={canvasRef}
            className="relative h-[400px] w-full overflow-auto rounded-xl border border-zinc-200 bg-white sm:h-[500px] md:h-[600px]"
            style={{ minHeight: "400px" }}
            role="region"
            aria-label="Workflow canvas"
            tabIndex={0}
          >
            <div
              className="relative"
              style={{ minWidth: contentSize.width, minHeight: contentSize.height }}
            >
              <svg
                className="pointer-events-none absolute left-0 top-0"
                width={contentSize.width}
                height={contentSize.height}
                style={{ overflow: "visible" }}
                aria-hidden="true"
              >
                {connections.map((c) => (
                  <WorkflowConnectionLine key={`${c.from}-${c.to}`} from={c.from} to={c.to} nodes={nodes} />
                ))}
              </svg>

              {nodes.length === 0 && (
                <div className="absolute left-1/2 top-1/2 flex w-full max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center">
                  <p className="text-sm font-medium text-zinc-600">아직 노드가 없어요</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    위의 <strong>노드 추가 (사진 선택)</strong>을 눌러 대시보드에 올린 사진 중 하나를 고르면, 해당 사진이 노드로 추가되고 순서대로 연결돼 영상 시퀀스를 만들 수 있어요.
                  </p>
                </div>
              )}

              {nodes.map((node) => {
                const Icon = node.icon;
                const isDragging = draggingNodeId === node.id;

                return (
                  <motion.div
                    key={node.id}
                    drag
                    dragMomentum={false}
                    dragConstraints={{ left: 0, top: 0, right: 100000, bottom: 100000 }}
                    onDragStart={() => handleDragStart(node.id)}
                    onDrag={(_, info) => handleDrag(node.id, info)}
                    onDragEnd={handleDragEnd}
                    style={{
                      x: node.position.x,
                      y: node.position.y,
                      width: NODE_WIDTH,
                      transformOrigin: "0 0",
                    }}
                    className="absolute cursor-grab"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ scale: 1.02 }}
                    whileDrag={{ scale: 1.05, zIndex: 50, cursor: "grabbing" }}
                  >
                    <div
                      className={`group/node relative w-full overflow-hidden rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur transition-all hover:shadow-lg ${
                        isDragging ? "ring-2 ring-zinc-400 shadow-xl" : ""
                      } ${colorClasses[node.color]}`}
                    >
                      {node.imageUrl ? (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100">
                          <img
                            src={node.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoPickerOpen(node.id);
                            }}
                            className="absolute bottom-1 right-1 rounded bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover/node:opacity-100"
                            aria-label="사진 변경"
                          >
                            <ImagePlus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNodePhoto(node.id);
                            }}
                            className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/node:opacity-100"
                          >
                            제거
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/node:opacity-100" />
                          <div className="relative space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colorClasses[node.color]} bg-white/80`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="mb-0.5 block rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0 text-[9px] uppercase tracking-wider text-zinc-500">
                                    {node.type}
                                  </span>
                                  <h3 className="truncate text-xs font-semibold text-zinc-900">{node.title}</h3>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPhotoPickerOpen(node.id);
                                }}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-50 hover:text-zinc-700 group-hover/node:opacity-100"
                                aria-label="사진으로 대체"
                              >
                                <ImagePlus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-600">{node.description}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                              <ArrowRight className="h-2.5 w-2.5" />
                              <span className="uppercase tracking-wider">Connected</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white/80 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="uppercase tracking-wider">{nodes.length} Nodes</span>
              <span className="uppercase tracking-wider">{connections.length} Connections</span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">
              노드 추가로 사진을 선택해 영상 순서를 만드세요. 노드를 드래그해 연결선으로 이어가요.
            </p>
          </div>
        </div>
      </div>

      {photoPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPhotoPickerOpen(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-100 p-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                {photoPickerOpen === "add" ? "노드로 추가할 사진 선택" : "노드에 넣을 사진 선택"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {photoPickerOpen === "add"
                  ? "대시보드에 올린 사진 중 하나를 고르면 새 노드로 추가되고, 이전 노드와 연결돼요."
                  : "사진을 클릭하면 해당 노드가 사진으로 바뀝니다."}
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              {photoPickerLoading ? (
                <p className="py-8 text-center text-sm text-zinc-500">불러오는 중…</p>
              ) : photoOptions.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">업로드한 사진이 없어요. 메인에서 먼저 사진을 올려 주세요.</p>
              ) : (
                <ul className="grid grid-cols-4 gap-2">
                  {photoOptions.map((img) => (
                    <li key={img.path}>
                      <button
                        type="button"
                        onClick={() => {
                          if (photoPickerOpen === "add") {
                            addNodeWithPhoto(img.url, img.path);
                          } else if (typeof photoPickerOpen === "string") {
                            setNodePhoto(photoPickerOpen, img.url, img.path);
                          }
                        }}
                        className="aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition hover:ring-2 hover:ring-zinc-400"
                      >
                        <img src={img.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-zinc-100 p-4">
              <button
                type="button"
                onClick={() => setPhotoPickerOpen(null)}
                className="w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
