"use client";

import { motion, type PanInfo } from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Download,
  ImagePlus,
  Music,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { IMAGES_BUCKET } from "@/lib/supabase/storage";
import { InteractiveHoverButton } from "./InteractiveHoverButton";

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

/** Jamendo BGM track for workflow */
export type BgmTrack = { id: string; name: string; artist_name: string; audio: string };

const PREVIEW_DURATION_MS = 2500;
const CROSSFADE_DURATION_MS = 700;
const WORKFLOW_STORAGE_KEY = "image-store-workflow";

type SerializedNode = Pick<WorkflowNode, "id" | "type" | "title" | "description" | "color" | "position" | "imagePath">;

function serializeNodes(nodes: WorkflowNode[]): SerializedNode[] {
  return nodes.map(({ id, type, title, description, color, position, imagePath }) => ({
    id,
    type,
    title,
    description,
    color,
    position,
    imagePath,
  }));
}

function deserializeToNode(s: SerializedNode, imageUrl?: string): WorkflowNode {
  return { ...s, icon: ImagePlus, imageUrl };
}

function getOrderedPhotoNodes(nodes: WorkflowNode[], connections: WorkflowConnection[]): WorkflowNode[] {
  const withPhoto = nodes.filter((n) => n.imageUrl);
  if (withPhoto.length === 0) return [];
  if (connections.length === 0) return [...withPhoto].sort((a, b) => a.position.x - b.position.x);

  const toMap = new Map<string, string[]>();
  const fromSet = new Set<string>();
  connections.forEach((c) => {
    toMap.set(c.from, (toMap.get(c.from) ?? []).concat(c.to));
    fromSet.add(c.to);
  });
  const roots = nodes.filter((n) => !fromSet.has(n.id)).sort((a, b) => a.position.x - b.position.x);
  const ordered: WorkflowNode[] = [];
  const visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = nodes.find((n) => n.id === id);
    if (node) ordered.push(node);
    const next = (toMap.get(id) ?? []).sort((a, b) => {
      const na = nodes.find((n) => n.id === a);
      const nb = nodes.find((n) => n.id === b);
      return (na?.position.x ?? 0) - (nb?.position.x ?? 0);
    });
    next.forEach(visit);
  }
  roots.forEach((r) => visit(r.id));
  return ordered.filter((n) => n.imageUrl);
}

export function WorkflowBuilder({ userId }: { userId: string }) {
  const router = useRouter();
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [connections, setConnections] = useState<WorkflowConnection[]>(initialConnections);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panStartOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewNextIndex, setPreviewNextIndex] = useState(0);
  const [previewTransitioning, setPreviewTransitioning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  /** 완성된 영상 Blob; 사용자가 '다운로드' 버튼을 눌렀을 때만 저장 (사용자 제스처) */
  const [downloadReady, setDownloadReady] = useState<{ blob: Blob; filename: string } | null>(null);
  const previewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [restored, setRestored] = useState(false);
  /** BGM from Jamendo; persisted with workflow */
  const [selectedBgm, setSelectedBgm] = useState<BgmTrack | null>(null);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [musicSearch, setMusicSearch] = useState("");
  const [musicResults, setMusicResults] = useState<BgmTrack[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const el = previewAudioRef.current;
    if (!selectedBgm) {
      if (el) {
        el.pause();
        el.removeAttribute("src");
      }
      return;
    }
    if (!el) return;
    el.src = `/api/jamendo/audio/${encodeURIComponent(selectedBgm.id)}`;
    el.loop = true;
    const play = () => {
      el.play().catch(() => {
        // Autoplay may be blocked; user can click BGM again or use controls
      });
    };
    play();
    return () => {
      el.pause();
      el.removeAttribute("src");
    };
  }, [selectedBgm]);

  useEffect(() => {
    if (restored) return;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(`${WORKFLOW_STORAGE_KEY}-${userId}`) : null;
      if (!raw) {
        setRestored(true);
        return;
      }
      const data = JSON.parse(raw) as {
        nodes: SerializedNode[];
        connections: WorkflowConnection[];
        bgmTrack?: BgmTrack;
      };
      if (!Array.isArray(data.nodes) || !Array.isArray(data.connections)) {
        setRestored(true);
        return;
      }
      if (data.bgmTrack && typeof data.bgmTrack === "object" && data.bgmTrack.id && data.bgmTrack.audio) {
        setSelectedBgm(data.bgmTrack);
      }
      (async () => {
        try {
          const withUrls = await Promise.all(
            data.nodes.map(async (s) => {
              let imageUrl: string | undefined;
              if (s.imagePath) {
                const { data: urlData } = await supabase.storage
                  .from(IMAGES_BUCKET)
                  .createSignedUrl(s.imagePath, SIGNED_URL_EXPIRE_SEC);
                imageUrl = urlData?.signedUrl;
              }
              return deserializeToNode(s, imageUrl);
            })
          );
          setNodes(withUrls);
          setConnections(data.connections);
          if (withUrls.length > 0) {
            const maxX = Math.max(...withUrls.map((n) => n.position.x + NODE_WIDTH)) + 50;
            const maxY = Math.max(...withUrls.map((n) => n.position.y + NODE_HEIGHT)) + 50;
            setContentSize((prev) => ({ width: Math.max(prev.width, maxX), height: Math.max(prev.height, maxY) }));
          }
        } finally {
          setRestored(true);
        }
      })();
    } catch {
      setRestored(true);
    }
  }, [userId, supabase, restored]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        `${WORKFLOW_STORAGE_KEY}-${userId}`,
        JSON.stringify({
          nodes: serializeNodes(nodes),
          connections,
          bgmTrack: selectedBgm ?? undefined,
        })
      );
    } catch {
      // ignore
    }
  }, [userId, restored, nodes, connections, selectedBgm]);

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

  const [musicError, setMusicError] = useState<string | null>(null);

  const searchJamendo = useCallback(async (query: string) => {
    setMusicLoading(true);
    setMusicError(null);
    try {
      const params = new URLSearchParams({ limit: "20" });
      const searchTerm = query.trim() || "music";
      params.set("search", searchTerm);
      const res = await fetch(`/api/jamendo/tracks?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setMusicError(body.error ?? "목록을 불러올 수 없어요.");
        setMusicResults([]);
        return;
      }
      const data = (await res.json()) as { tracks?: BgmTrack[] };
      setMusicResults(data.tracks ?? []);
    } catch {
      setMusicError("목록을 불러올 수 없어요. 연결을 확인해 주세요.");
      setMusicResults([]);
    } finally {
      setMusicLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!musicPickerOpen) return;
    setMusicError(null);
    const timer = setTimeout(() => searchJamendo(musicSearch), 300);
    return () => clearTimeout(timer);
  }, [musicPickerOpen, musicSearch, searchJamendo]);

  const orderedPhotoNodes = getOrderedPhotoNodes(nodes, connections);

  useEffect(() => {
    setPreviewIndex(0);
    setPreviewNextIndex(0);
    setPreviewTransitioning(false);
  }, [orderedPhotoNodes.length]);

  useEffect(() => {
    if (orderedPhotoNodes.length <= 1) return;
    previewIntervalRef.current = setInterval(() => {
      setPreviewNextIndex((i) => (i + 1) % orderedPhotoNodes.length);
      setPreviewTransitioning(true);
    }, PREVIEW_DURATION_MS);
    return () => {
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
      if (previewTransitionTimeoutRef.current) clearTimeout(previewTransitionTimeoutRef.current);
    };
  }, [orderedPhotoNodes.length]);

  useEffect(() => {
    if (!previewTransitioning || orderedPhotoNodes.length <= 1) return;
    previewTransitionTimeoutRef.current = setTimeout(() => {
      setPreviewIndex(previewNextIndex);
      setPreviewTransitioning(false);
      previewTransitionTimeoutRef.current = null;
    }, CROSSFADE_DURATION_MS);
    return () => {
      if (previewTransitionTimeoutRef.current) clearTimeout(previewTransitionTimeoutRef.current);
    };
  }, [previewTransitioning, previewNextIndex, orderedPhotoNodes.length]);

  const handleDownloadVideo = useCallback(
    async (format: "webm" | "mp4") => {
      if (orderedPhotoNodes.length === 0) return;
      setDownloadReady(null);
      const mp4Native = format === "mp4" && MediaRecorder.isTypeSupported("video/mp4");
      const recordAsWebm = format === "webm" || !mp4Native; // MP4 요청이어도 미지원 시 WebM으로 녹화 후 변환
      setDownloading(true);
      let audioSource: AudioBufferSourceNode | null = null;
      let audioCtx: AudioContext | null = null;
      try {
        const durationPerFrame = PREVIEW_DURATION_MS / 1000;
        const width = 1280;
        const height = 720;
        const fps = 30;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        const canvasCtx: CanvasRenderingContext2D = ctx;

        const images: HTMLImageElement[] = [];
        for (const node of orderedPhotoNodes) {
          if (!node.imageUrl) continue;
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.crossOrigin = "anonymous";
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Image load failed"));
            el.src = node.imageUrl!;
          });
          images.push(img);
        }
        if (images.length === 0) throw new Error("No images");

        const videoStream = canvas.captureStream(fps);
        let stream: MediaStream = videoStream;

        if (selectedBgm?.id) {
          const audioRes = await fetch(`/api/jamendo/audio/${encodeURIComponent(selectedBgm.id)}`);
          if (!audioRes.ok) throw new Error("BGM을 불러올 수 없어요.");
          const arrayBuffer = await audioRes.arrayBuffer();
          audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
          const dest = audioCtx.createMediaStreamDestination();
          audioSource = audioCtx.createBufferSource();
          audioSource.buffer = decoded;
          audioSource.loop = true;
          audioSource.connect(dest);
          stream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ]);
        }

        const mimeType = recordAsWebm
          ? MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm"
          : "video/mp4";
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: mimeType });
          try {
            let downloadBlob = blob;
            let extension = format;
            if (format === "mp4" && recordAsWebm) {
              const { FFmpeg } = await import("@ffmpeg/ffmpeg");
              const ffmpeg = new FFmpeg();
              await ffmpeg.load();
              await ffmpeg.writeFile("input.webm", new Uint8Array(await blob.arrayBuffer()));
              await ffmpeg.exec(["-i", "input.webm", "-c:v", "libx264", "-profile:v", "main", "-level", "4.0", "-preset", "fast", "-crf", "23", "-movflags", "+faststart", "-c:a", "aac", "output.mp4"]);
              const data = await ffmpeg.readFile("output.mp4");
              const arr = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(0);
              downloadBlob = new Blob([arr], { type: "video/mp4" });
              extension = "mp4";
            }
            const filename = `영상-${Date.now()}.${extension}`;
            setDownloadReady({ blob: downloadBlob, filename });
          } catch (err) {
            console.error(err);
            if (format === "mp4" && recordAsWebm) alert("MP4 변환에 실패했어요. WebM으로 다시 시도해 주세요.");
          } finally {
            setDownloading(false);
          }
        };

      recorder.start(100);
      const startTime = performance.now();
      const totalDuration = images.length * durationPerFrame;
      const crossfadeDurationSec = CROSSFADE_DURATION_MS / 1000;
      if (audioSource) audioSource.start(0);

      function drawImageScaled(img: HTMLImageElement, alpha: number) {
        canvasCtx.save();
        canvasCtx.globalAlpha = alpha;
        const scale = Math.max(width / img.width, height / img.height);
        const sw = width / scale;
        const sh = height / scale;
        canvasCtx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, width, height);
        canvasCtx.restore();
      }

      function draw() {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= totalDuration) {
          if (audioSource) {
            try {
              audioSource.stop(0);
            } catch {
              // ignore
            }
          }
          if (audioCtx) audioCtx.close();
          recorder.requestData();
          recorder.stop();
          return;
        }
        const slotIndex = Math.min(Math.floor(elapsed / durationPerFrame), images.length - 1);
        const tInSlot = elapsed - slotIndex * durationPerFrame;
        const currentImg = images[slotIndex];
        const nextImg = images[(slotIndex + 1) % images.length];

        canvasCtx.fillStyle = "#000";
        canvasCtx.fillRect(0, 0, width, height);

        if (tInSlot < durationPerFrame - crossfadeDurationSec) {
          drawImageScaled(currentImg, 1);
        } else {
          const crossfadeProgress = (tInSlot - (durationPerFrame - crossfadeDurationSec)) / crossfadeDurationSec;
          drawImageScaled(currentImg, 1 - crossfadeProgress);
          drawImageScaled(nextImg, crossfadeProgress);
        }
        requestAnimationFrame(draw);
      }
      draw();
    } catch (err) {
      console.error(err);
      alert("영상 만들기에 실패했어요. 이미지 주소가 만료됐거나 CORS 제한일 수 있어요.");
      setDownloading(false);
    }
  },
    [orderedPhotoNodes, selectedBgm],
  );

  const handleDownloadReadyClick = useCallback(() => {
    const ready = downloadReady;
    if (!ready) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(ready.blob);
    a.download = ready.filename;
    a.click();
    URL.revokeObjectURL(a.href);
    setDownloadReady(null);
  }, [downloadReady]);

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

  const handleDeleteNode = (nodeId: string) => {
    if (!window.confirm("이 노드를 삭제할까요? 연결도 함께 정리돼요.")) return;

    setNodes((prevNodes) => prevNodes.filter((n) => n.id !== nodeId));
    setConnections((prevConnections) => {
      const incoming = prevConnections.filter((c) => c.to === nodeId);
      const outgoing = prevConnections.filter((c) => c.from === nodeId);

      // 기존에 nodeId와 연결된 간선은 모두 제거
      const remaining = prevConnections.filter((c) => c.from !== nodeId && c.to !== nodeId);

      if (incoming.length === 0 || outgoing.length === 0) {
        return remaining;
      }

      // 가장 단순하게: 첫 번째 들어오는 노드와 첫 번째 나가는 노드를 다시 연결
      const fromId = incoming[0].from;
      const toId = outgoing[0].to;

      if (!fromId || !toId || fromId === toId) {
        return remaining;
      }

      const alreadyExists = remaining.some((c) => c.from === fromId && c.to === toId);
      if (alreadyExists) {
        return remaining;
      }

      return [...remaining, { from: fromId, to: toId }];
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // only left click
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panStartOffsetRef.current = { ...viewportOffset };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !panStartRef.current || !panStartOffsetRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setViewportOffset({
      x: panStartOffsetRef.current.x + dx,
      y: panStartOffsetRef.current.y + dy,
    });
  };

  const endPan = () => {
    if (!isPanning) return;
    setIsPanning(false);
    panStartRef.current = null;
    panStartOffsetRef.current = null;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // 캔버스 안에서만 확대/축소되도록 기본 스크롤 막기
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 0.92;
    setZoom((z) => {
      const next = Math.min(2.5, Math.max(0.4, z * factor));
      return next;
    });
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
        <div className="mx-auto flex max-w-8xl">
          <InteractiveHoverButton
            type="button"
            onClick={() => router.push("/")}
            text="메인으로"
            back
            className="px-4 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex w-full gap-6 px-6 py-4 sm:py-6">
        {/* 왼쪽: 영상 미리보기 + 다운로드 */}
        <aside className="flex w-full shrink-0 flex-col lg:w-[480px] xl:w-[520px] lg:justify-center">
          <audio
            ref={previewAudioRef}
            loop
            playsInline
            className="hidden"
            aria-label={selectedBgm ? `BGM: ${selectedBgm.name}` : "BGM"}
          />
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-2">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600">영상 미리보기</h2>
            <div className="relative aspect-video min-h-[340px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-black sm:min-h-[460px] md:min-h-[500px] lg:min-h-[560px]">
              {orderedPhotoNodes.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-zinc-500">
                  <p className="text-center text-sm">노드를 추가하면<br />연결 순서대로 여기에 표시돼요</p>
                </div>
              ) : (
                <>
                  {/* 현재 프레임 — 전환 중이면 서서히 사라짐 */}
                  <img
                    key={`current-${orderedPhotoNodes[previewIndex]?.id}`}
                    src={orderedPhotoNodes[previewIndex % orderedPhotoNodes.length]?.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain transition-opacity ease-out"
                    style={{
                      opacity: previewTransitioning ? 0 : 1,
                      transitionDuration: `${CROSSFADE_DURATION_MS}ms`,
                    }}
                  />
                  {/* 다음 프레임 — 전환 중이면 서서히 나타남 */}
                  <img
                    key={`next-${orderedPhotoNodes[previewNextIndex]?.id}`}
                    src={orderedPhotoNodes[previewNextIndex % orderedPhotoNodes.length]?.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain transition-opacity ease-out"
                    style={{
                      opacity: previewTransitioning ? 1 : 0,
                      transitionDuration: `${CROSSFADE_DURATION_MS}ms`,
                    }}
                  />
                </>
              )}
            </div>
            {orderedPhotoNodes.length > 1 && (
              <p className="mt-2 text-center text-xs text-zinc-500">
                {previewIndex + 1} / {orderedPhotoNodes.length} (자동 재생)
              </p>
            )}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">BGM</span>
                {selectedBgm ? (
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span className="truncate text-right text-sm text-zinc-700" title={`${selectedBgm.name} - ${selectedBgm.artist_name}`}>
                      {selectedBgm.name} · {selectedBgm.artist_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBgm(null)}
                      className="shrink-0 rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      제거
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMusicPickerOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    <Music className="h-3.5 w-3.5" />
                    BGM 선택
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {downloadReady ? (
                  <button
                    type="button"
                    onClick={handleDownloadReadyClick}
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500 bg-emerald-500 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
                  >
                    <Download className="h-4 w-4" />
                    영상 다운로드
                  </button>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={orderedPhotoNodes.length === 0 || downloading}
                    onClick={() => handleDownloadVideo("webm")}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {downloading ? "만드는 중…" : "WebM"}
                  </button>
                  <button
                    type="button"
                    disabled={orderedPhotoNodes.length === 0 || downloading}
                    onClick={() => handleDownloadVideo("mp4")}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {downloading ? "만드는 중…" : "MP4"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* 오른쪽: 노드 캔버스 */}
        <div className="min-w-0 flex-1">
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
              className="relative h-[520px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-white sm:h-[640px] md:h-[760px] lg:h-[820px]"
              style={{ minHeight: "500px" }}
              role="region"
              aria-label="Workflow canvas"
              tabIndex={0}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={endPan}
              onMouseLeave={endPan}
              onWheel={handleCanvasWheel}
            >
              <div
                className="relative"
                style={{
                  minWidth: contentSize.width,
                  minHeight: contentSize.height,
                  transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                  cursor: isPanning ? "grabbing" : "grab",
                }}
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
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    style={{
                      x: node.position.x,
                      y: node.position.y,
                      width: NODE_WIDTH,
                      transformOrigin: "0 0",
                    }}
                    className="absolute cursor-grab active:cursor-grabbing"
                    title="드래그해서 이동"
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/node:opacity-100 hover:bg-black/70"
                        aria-label="노드 삭제"
                      >
                        <span className="text-xs leading-none">×</span>
                      </button>
                      {node.imageUrl ? (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100">
                          <img
                            src={node.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
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

      {musicPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMusicPickerOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-100 p-4">
              <h2 className="text-lg font-semibold text-zinc-900">BGM 선택 (Jamendo)</h2>
              <p className="mt-1 text-sm text-zinc-500">
                검색어를 입력하면 무료 음원 목록이 나와요. 곡을 선택하면 영상 다운로드 시 함께 넣어집니다.
              </p>
              <input
                type="text"
                value={musicSearch}
                onChange={(e) => setMusicSearch(e.target.value)}
                placeholder="곡명, 아티스트 검색…"
                className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {musicError ? (
                <p className="py-8 text-center text-sm text-amber-600">{musicError}</p>
              ) : musicLoading ? (
                <p className="py-8 text-center text-sm text-zinc-500">검색 중…</p>
              ) : musicResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  {musicSearch.trim() ? "검색 결과가 없어요." : "검색어를 입력해 보세요."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {musicResults.map((track) => (
                    <li key={track.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBgm(track);
                          setMusicPickerOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-left transition hover:border-zinc-300 hover:bg-zinc-100"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-500">
                          <Music className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-zinc-900">{track.name}</p>
                          <p className="truncate text-xs text-zinc-500">{track.artist_name}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-zinc-100 p-4">
              <button
                type="button"
                onClick={() => setMusicPickerOpen(false)}
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
