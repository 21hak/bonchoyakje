"use client";

import { useEffect, useRef, useState } from "react";

type Tool = "pen" | "eraser";

export default function WritingPad({ resetKey }: { resetKey: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const toolRef = useRef<Tool>("pen");
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // 지우개 크기 (px). 핸들러는 ref로 최신값 참조.
  const [eraserSize, setEraserSize] = useState(24);
  const eraserSizeRef = useRef(24);
  useEffect(() => {
    eraserSizeRef.current = eraserSize;
  }, [eraserSize]);

  // 지우개 범위 원형 표시 링
  const ringRef = useRef<HTMLDivElement | null>(null);

  // 한 획 진행 상태
  const drawingRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const activeTouchRef = useRef<number | null>(null); // 그리는 중인 stylus touch identifier

  // 캔버스 픽셀 크기를 컨테이너에 맞춰 설정 (dpr 보정). 크기가 바뀔 때만 재생성.
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    // 같은 크기로 다시 불리면 그림을 지우지 않도록 early-return
    if (canvas.width === w && canvas.height === h && ctxRef.current) return;

    // 리사이즈로 캔버스 backing store 가 바뀌면 내용이 지워지므로,
    // 기존 그림을 스냅샷해 두었다가 새 크기에 1:1(디바이스 픽셀)로 복원한다.
    let prev: HTMLCanvasElement | null = null;
    if (ctxRef.current && canvas.width > 0 && canvas.height > 0) {
      prev = document.createElement("canvas");
      prev.width = canvas.width;
      prev.height = canvas.height;
      prev.getContext("2d")?.drawImage(canvas, 0, 0);
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#171717";
    ctxRef.current = ctx;

    if (prev) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // 디바이스 픽셀 그대로 복원 (크기·위치 유지)
      ctx.drawImage(prev, 0, 0);
      ctx.restore();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  // 마운트 시 셋업 + 리사이즈 대응
  useEffect(() => {
    setupCanvas();
    const ro = new ResizeObserver(() => setupCanvas());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카드가 바뀌면 캔버스 리셋 + 펜으로 복귀
  useEffect(() => {
    clearCanvas();
    setTool("pen");
  }, [resetKey]);

  // 그리기. iPad Safari는 멀티터치(손바닥+펜)에서 Apple Pencil의 Pointer pointerdown을 자주
  // 드롭하므로, 펜은 Touch Events(stylus)로 처리하고 데스크톱 마우스만 Pointer Events로 처리.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const applyTool = (ctx: CanvasRenderingContext2D, pressure: number) => {
      if (toolRef.current === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = eraserSizeRef.current;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = pressure > 0 ? 1.5 + pressure * 3 : 2.5;
      }
    };
    const strokeTo = (x: number, y: number, pressure: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      applyTool(ctx, pressure);
      ctx.beginPath();
      ctx.moveTo(lastRef.current.x, lastRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastRef.current = { x, y };
    };

    // 지우개 범위 원형 링: 그리는 좌표 p로 위치 갱신(리렌더 없이 ref로 직접).
    const updateRing = (x: number, y: number) => {
      const ring = ringRef.current;
      if (!ring) return;
      if (toolRef.current !== "eraser") {
        ring.style.display = "none";
        return;
      }
      const r = eraserSizeRef.current / 2;
      ring.style.display = "block";
      ring.style.transform = `translate(${x - r}px, ${y - r}px)`;
    };
    const hideRing = () => {
      if (ringRef.current) ringRef.current.style.display = "none";
    };

    // ── 펜(stylus) = Touch Events ──────────────────────────────
    const isStylus = (t: Touch) =>
      (t as Touch & { touchType?: string }).touchType === "stylus";
    const pickStylus = (list: TouchList): Touch | null => {
      for (let i = 0; i < list.length; i++) {
        if (isStylus(list[i])) return list[i];
      }
      return null;
    };
    const findById = (list: TouchList, id: number): Touch | null => {
      for (let i = 0; i < list.length; i++) {
        if (list[i].identifier === id) return list[i];
      }
      return null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!ctxRef.current) return;
      const t = pickStylus(e.changedTouches);
      if (!t) return; // 손바닥/손가락은 무시
      e.preventDefault();
      activeTouchRef.current = t.identifier;
      const p = pointAt(t.clientX, t.clientY);
      drawingRef.current = true;
      lastRef.current = p;
      strokeTo(p.x, p.y, t.force);
      updateRing(p.x, p.y);
    };
    const onTouchMove = (e: TouchEvent) => {
      const id = activeTouchRef.current;
      if (!drawingRef.current || id === null) return;
      const t = findById(e.changedTouches, id);
      if (!t) return;
      e.preventDefault();
      const p = pointAt(t.clientX, t.clientY);
      strokeTo(p.x, p.y, t.force);
      updateRing(p.x, p.y);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const id = activeTouchRef.current;
      if (id === null) return;
      if (findById(e.changedTouches, id)) {
        drawingRef.current = false;
        activeTouchRef.current = null;
        hideRing();
      }
    };

    // ── 마우스(데스크톱) = Pointer Events ──────────────────────
    const onMouseDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !ctxRef.current) return;
      e.preventDefault();
      drawingRef.current = true;
      const p = pointAt(e.clientX, e.clientY);
      lastRef.current = p;
      strokeTo(p.x, p.y, 0);
      updateRing(p.x, p.y);
    };
    const onMouseMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const p = pointAt(e.clientX, e.clientY);
      if (drawingRef.current) {
        strokeTo(p.x, p.y, 0);
        updateRing(p.x, p.y);
        return;
      }
      // 호버 미리보기: 캔버스 위에 있을 때만
      const inside =
        p.x >= 0 &&
        p.y >= 0 &&
        p.x <= canvas.clientWidth &&
        p.y <= canvas.clientHeight;
      if (inside) updateRing(p.x, p.y);
      else hideRing();
    };
    const onMouseUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      drawingRef.current = false;
    };
    const onMouseLeave = () => {
      if (!drawingRef.current) hideRing();
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);
    canvas.addEventListener("pointerdown", onMouseDown);
    canvas.addEventListener("pointerleave", onMouseLeave);
    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
      canvas.removeEventListener("pointerdown", onMouseDown);
      canvas.removeEventListener("pointerleave", onMouseLeave);
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
    };
  }, []);

  const noDrag = (e: React.DragEvent) => e.preventDefault();

  return (
    <div
      className="flex h-full w-full select-none flex-col gap-2"
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
      onDragStart={noDrag}
    >
      {/* 툴바 */}
      <div className="flex select-none items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setTool("pen")}
            aria-pressed={tool === "pen"}
            className={`touch-none px-3 py-1.5 text-sm font-medium transition-colors ${
              tool === "pen"
                ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                : "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            }`}
          >
            ✏️ 펜
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            aria-pressed={tool === "eraser"}
            className={`touch-none border-l border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors dark:border-neutral-700 ${
              tool === "eraser"
                ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                : "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            }`}
          >
            🧽 지우개
          </button>
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          className="touch-none rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          전체 지우기
        </button>
      </div>

      {/* 지우개 크기 슬라이더 (지우개 모드에서만) */}
      {tool === "eraser" && (
        <div className="flex select-none items-center gap-2 text-sm text-neutral-500">
          <span className="whitespace-nowrap">지우개 크기</span>
          <input
            type="range"
            min={10}
            max={80}
            step={2}
            value={eraserSize}
            onChange={(e) => setEraserSize(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-neutral-700"
          />
          <span className="w-8 text-right tabular-nums">{eraserSize}</span>
        </div>
      )}

      {/* 캔버스 */}
      <div
        ref={containerRef}
        className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800"
      >
        <canvas
          ref={canvasRef}
          draggable={false}
          className="h-full w-full touch-none select-none"
          style={{ touchAction: "none" }}
          onDragStart={noDrag}
        />
        {/* 지우개 범위 원형 링 */}
        <div
          ref={ringRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-neutral-400/80 bg-neutral-400/10"
          style={{ display: "none", width: eraserSize, height: eraserSize }}
        />
      </div>
    </div>
  );
}
