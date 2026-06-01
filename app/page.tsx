"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HERBS } from "./herbs";
import {
  CATEGORIES,
  LOOKALIKE_SETS,
  groupIds,
  groupShortLabel,
  isGroupKey,
} from "./categories";
import Exam from "./Exam";

const STORAGE_KEY = "bonchoyakje:state";

// 순환 모듈러 (음수 안전)
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

const HERB_IDS = new Set(HERBS.map((h) => h.id));

type SavedState = {
  order: number[];
  shuffled: boolean;
  showAnswer: boolean;
  pos: number;
  favorites: number[];
  favoritesOnly: boolean;
  category: string;
};

function defaultOrder(): number[] {
  return HERBS.map((_, i) => i);
}

// Fisher–Yates 셔플 (원본 불변)
function shuffle(arr: number[]): number[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<SavedState>;
    // order 유효성 검사: 길이/내용이 현재 HERBS와 일치해야 함
    if (
      !Array.isArray(s.order) ||
      s.order.length !== HERBS.length ||
      !s.order.every((n) => Number.isInteger(n) && n >= 0 && n < HERBS.length)
    ) {
      return null;
    }
    // 즐겨찾기: 유효한 약재 id만 통과
    const favorites = Array.isArray(s.favorites)
      ? s.favorites.filter((n) => Number.isInteger(n) && HERB_IDS.has(n))
      : [];
    return {
      order: s.order,
      shuffled: Boolean(s.shuffled),
      showAnswer: Boolean(s.showAnswer),
      pos: Number.isInteger(s.pos) ? (s.pos as number) : 0,
      favorites,
      favoritesOnly: Boolean(s.favoritesOnly),
      category:
        typeof s.category === "string" && isGroupKey(s.category)
          ? s.category
          : "",
    };
  } catch {
    return null;
  }
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<number[]>(defaultOrder);
  const [shuffled, setShuffled] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [category, setCategory] = useState<string>(""); // ""=전체

  // 목록 오버레이 (휘발성 UI 상태 — localStorage 저장 안 함)
  const [listOpen, setListOpen] = useState(false);
  const [listTab, setListTab] = useState<"all" | "fav">("all");
  const [query, setQuery] = useState("");
  const [listCategory, setListCategory] = useState<string>(""); // ""=전체
  const [examOpen, setExamOpen] = useState(false);

  // Carousel 드래그 상태
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const widthRef = useRef(0);
  const draggingRef = useRef(false);
  const pendingRef = useRef(0); // transitionEnd 시 커밋할 방향

  // 모든 사진 프리로드 (전환 시 흰 깜빡임 방지)
  useEffect(() => {
    HERBS.forEach((h) => {
      const im = new window.Image();
      im.src = h.img;
    });
  }, []);

  // 최초 마운트 시 localStorage 로드
  useEffect(() => {
    const s = loadState();
    if (s) {
      setOrder(s.order);
      setShuffled(s.shuffled);
      setShowAnswer(s.showAnswer);
      setPos(s.pos);
      setRevealed(s.showAnswer);
      setFavorites(s.favorites);
      setFavoritesOnly(s.favoritesOnly);
      setCategory(s.category);
    }
    setMounted(true);
  }, []);

  // 상태 변경 시 저장 (마운트 이후에만)
  useEffect(() => {
    if (!mounted) return;
    const s: SavedState = {
      order,
      shuffled,
      showAnswer,
      pos,
      favorites,
      favoritesOnly,
      category,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // 저장 실패는 무시
    }
  }, [mounted, order, shuffled, showAnswer, pos, favorites, favoritesOnly, category]);

  // 활성 덱: 분류 + 즐겨찾기만 보기 필터를 합성
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const catSet = useMemo(() => (category ? groupIds(category) : null), [category]);
  const catShort = useMemo(() => groupShortLabel(category), [category]);
  const activeOrder = useMemo(
    () =>
      order.filter(
        (i) =>
          (!favoritesOnly || favSet.has(HERBS[i].id)) &&
          (!catSet || catSet.has(HERBS[i].id))
      ),
    [favoritesOnly, order, favSet, catSet]
  );

  const len = activeOrder.length;
  // 순환 인덱스 (pos가 음수/초과여도 안전)
  const idx = len ? ((pos % len) + len) % len : 0;
  const herb = len ? HERBS[activeOrder[idx]] : null;
  const isFav = herb ? favSet.has(herb.id) : false;

  // 목록 검색 결과 (원래 HERBS 순서 유지)
  const listCatSet = useMemo(
    () => (listCategory ? groupIds(listCategory) : null),
    [listCategory]
  );
  const listResults = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    return HERBS.filter((h) => {
      if (listTab === "fav" && !favSet.has(h.id)) return false;
      if (listCatSet && !listCatSet.has(h.id)) return false;
      if (!q) return true;
      return (
        h.korean.toLowerCase().replace(/\s+/g, "").includes(q) ||
        h.hanja.toLowerCase().includes(q)
      );
    });
  }, [query, listTab, favSet, listCatSet]);

  // Carousel 전환: 다음(+1)이면 다음 슬라이드(+W)를 중앙으로 → 그룹 -W로 애니메이션.
  // delta 0 = 제자리 스냅백. transitionEnd 에서 pos 커밋 + dragX 리셋(깜빡임/점프 없음).
  const animateTo = useCallback(
    (delta: number) => {
      if (animating || len === 0) return;
      if (delta === 0) {
        if (dragX === 0) return; // 움직임 없으면 아무것도 안 함
        pendingRef.current = 0;
        setAnimating(true);
        setDragX(0);
        return;
      }
      const W = containerRef.current?.offsetWidth ?? 0;
      pendingRef.current = delta;
      setAnimating(true);
      setDragX(delta > 0 ? -W : W);
    },
    [animating, len, dragX]
  );
  const goPrev = useCallback(() => animateTo(-1), [animateTo]);
  const goNext = useCallback(() => animateTo(1), [animateTo]);

  const onCarouselTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== "transform") return;
    const delta = pendingRef.current;
    pendingRef.current = 0;
    if (delta !== 0) {
      setPos((p) => p + delta);
      setRevealed(showAnswer);
    }
    setAnimating(false);
    setDragX(0);
  };

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // 특정 약재로 이동 (목록에서 선택)
  const jumpToHerb = useCallback(
    (id: number) => {
      // 즐겨찾기만 보기인데 대상이 즐겨찾기가 아니면 전체 보기로 전환
      const fo = favoritesOnly && favSet.has(id);
      const deck = fo ? order.filter((i) => favSet.has(HERBS[i].id)) : order;
      const target = deck.findIndex((i) => HERBS[i].id === id);
      setFavoritesOnly(fo);
      setPos(target >= 0 ? target : 0);
      setRevealed(showAnswer);
      setListOpen(false);
    },
    [favoritesOnly, favSet, order, showAnswer]
  );

  // 키보드: ← → 이동, f 즐겨찾기 토글 (목록 열림 중엔 Esc만)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (examOpen) return; // 시험 모달이 열려 있으면 carousel 조작 막기
      if (listOpen) {
        if (e.key === "Escape") setListOpen(false);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "f" || e.key === "F") {
        if (herb) toggleFavorite(herb.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [examOpen, listOpen, goNext, goPrev, toggleFavorite, herb]);

  const doShuffle = () => {
    setOrder((o) => shuffle(o));
    setShuffled(true);
    setPos(0);
    setRevealed(showAnswer);
  };

  const doReset = () => {
    setOrder(defaultOrder());
    setShuffled(false);
    setPos(0);
    setRevealed(showAnswer);
  };

  const toggleFavoritesOnly = () => {
    setFavoritesOnly((v) => !v);
    setPos(0);
    setRevealed(showAnswer);
  };

  const onChangeCategory = (key: string) => {
    setCategory(key);
    setPos(0);
    setRevealed(showAnswer);
  };

  const onToggleShowAnswer = (checked: boolean) => {
    setShowAnswer(checked);
    setRevealed(checked);
  };

  // Carousel 드래그 (Pointer 이벤트 = 마우스 + 터치 통합)
  const onPointerDown = (e: React.PointerEvent) => {
    if (animating || len === 0) return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    widthRef.current = containerRef.current?.offsetWidth ?? 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setDragX(e.clientX - startXRef.current);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // 이미 해제됐을 수 있음
    }
    const dx = e.clientX - startXRef.current;
    const W = widthRef.current || 1;
    const threshold = Math.max(40, W * 0.18);
    // 오른쪽으로 끌면(dx>0) 이전, 왼쪽으로 끌면 다음
    if (dx >= threshold) animateTo(-1);
    else if (dx <= -threshold) animateTo(1);
    else animateTo(0); // 부족하면 제자리 복귀
  };

  // 하이드레이션 불일치 방지: 마운트 전에는 최소 골격만
  if (!mounted) {
    return (
      <main className="flex min-h-full items-center justify-center p-6">
        <p className="text-sm text-neutral-400">불러오는 중…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 px-4 py-5">
      {/* 상단 바 */}
      <header className="flex flex-col gap-3">
        {/* 1행: 제목 + 주요 액션 */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">약재 한자 퀴즈</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExamOpen(true)}
              className="rounded-md border border-neutral-800 bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-white"
            >
              시험
            </button>
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              목록
            </button>
          </div>
        </div>

        {/* 2행: 컨트롤 바 (탐색/필터 | 보기) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
          {/* 좌측: 필터 */}
          <select
            value={category}
            onChange={(e) => onChangeCategory(e.target.value)}
            aria-label="분류 / 세트 필터"
            className="max-w-52 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-neutral-100 focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            <option value="">전체 보기</option>
            <optgroup label="닮은꼴 세트">
              {LOOKALIKE_SETS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="효능 분류">
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="button"
            onClick={toggleFavoritesOnly}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              favoritesOnly
                ? "border-amber-500 bg-amber-400 text-neutral-900"
                : "border-neutral-300 bg-white hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            }`}
          >
            ★ 즐겨찾기만 ({favorites.length})
          </button>

          {/* 구분선 + 우측: 보기 컨트롤 (남는 공간 오른쪽 정렬) */}
          <div className="ml-auto flex items-center gap-3">
            {/* 기본 | 셔플 세그먼트 */}
            <div className="flex overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700">
              <button
                type="button"
                onClick={doReset}
                aria-pressed={!shuffled}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  !shuffled
                    ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                    : "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                }`}
              >
                기본
              </button>
              <button
                type="button"
                onClick={doShuffle}
                aria-pressed={shuffled}
                className={`border-l border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors dark:border-neutral-700 ${
                  shuffled
                    ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                    : "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                }`}
              >
                셔플
              </button>
            </div>
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-neutral-700"
                checked={showAnswer}
                onChange={(e) => onToggleShowAnswer(e.target.checked)}
              />
              정답 미리보기
            </label>
          </div>
        </div>
      </header>

      {herb ? (
        <>
          {/* 진행도 */}
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>
              {idx + 1} / {len}
            </span>
            <span>
              {herb.week}주차
              {catShort ? ` · ${catShort}` : ""}
              {favoritesOnly ? " · 즐겨찾기" : shuffled ? " · 섞임" : ""}
            </span>
          </div>

          {/* 사진 Carousel (드래그/스와이프) + 별 버튼 */}
          <div
            ref={containerRef}
            className="relative aspect-4/3 w-full select-none overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800"
            style={{ touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* 슬라이드 그룹: 이전/현재/다음 3장만 렌더, 모듈러로 순환 */}
            <div
              className="absolute inset-0"
              style={{
                transform: `translateX(${dragX}px)`,
                transition: animating ? "transform 0.25s ease-out" : "none",
              }}
              onTransitionEnd={onCarouselTransitionEnd}
            >
              {[-1, 0, 1].map((slot) => {
                const slotHerb = HERBS[activeOrder[mod(pos + slot, len)]];
                return (
                  // key를 절대 위치(pos+slot)로 → 전환 커밋 후에도 같은 요소가 유지되어
                  // 중앙 이미지의 src 교체(이전 이미지 반짝임)가 일어나지 않음
                  <div
                    key={pos + slot}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: `translateX(${slot * 100}%)` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slotHerb.img}
                      alt={slot === 0 ? "약재 사진" : ""}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (herb) toggleFavorite(herb.id);
              }}
              aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              aria-pressed={isFav}
              className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-2xl shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-neutral-900/70 dark:hover:bg-neutral-900"
            >
              <span className={isFav ? "text-amber-400" : "text-neutral-300"}>
                {isFav ? "★" : "☆"}
              </span>
            </button>
          </div>

          {/* 이름 영역 (클릭/터치로 토글) */}
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-5 text-center transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            aria-label={revealed ? "정답 숨기기" : "정답 보기"}
          >
            {revealed ? (
              <>
                <span className="text-4xl font-semibold tracking-wide sm:text-5xl">
                  {herb.hanja}
                </span>
                <span className="text-base text-neutral-500">{herb.korean}</span>
              </>
            ) : (
              <span className="text-sm text-neutral-400">탭하여 정답 보기</span>
            )}
          </button>

          {/* 이전 / 다음 버튼 (순환) */}
          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={goPrev}
              className="flex-1 rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              ← 이전
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex-1 rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              다음 →
            </button>
          </div>
        </>
      ) : (
        // 필터(분류·즐겨찾기) 결과가 비었을 때
        <div className="mt-10 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-neutral-500">조건에 맞는 약재가 없습니다.</p>
          <button
            type="button"
            onClick={() => {
              setFavoritesOnly(false);
              setCategory("");
              setPos(0);
              setRevealed(showAnswer);
            }}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            필터 초기화
          </button>
        </div>
      )}

      {/* 목록 오버레이 */}
      {listOpen && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/40 p-2 sm:p-4">
          <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            {/* 헤더: 탭 + 닫기 */}
            <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setListTab("all")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    listTab === "all"
                      ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  전체 ({HERBS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setListTab("fav")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    listTab === "fav"
                      ? "bg-amber-400 text-neutral-900"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  ★ 즐겨찾기 ({favorites.length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setListOpen(false)}
                aria-label="목록 닫기"
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            {/* 검색 + 분류 필터 */}
            <div className="flex flex-col gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="한글 또는 한자로 검색…"
                autoFocus
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <select
                value={listCategory}
                onChange={(e) => setListCategory(e.target.value)}
                aria-label="분류 / 세트 필터"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">전체 분류</option>
                <optgroup label="닮은꼴 세트">
                  {LOOKALIKE_SETS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="효능 분류">
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* 결과 목록 */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {listResults.length === 0 ? (
                <p className="p-8 text-center text-sm text-neutral-400">
                  {listTab === "fav" && favorites.length === 0
                    ? "즐겨찾기한 약재가 없습니다."
                    : "검색 결과가 없습니다."}
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {listResults.map((h) => {
                    const fav = favSet.has(h.id);
                    return (
                      <li key={h.id} className="flex items-center gap-3 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => jumpToHerb(h.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={h.img}
                            alt=""
                            loading="lazy"
                            className="h-12 w-12 flex-none rounded-md border border-neutral-200 object-cover dark:border-neutral-800"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-lg font-semibold">
                              {h.hanja}
                            </span>
                            <span className="block truncate text-sm text-neutral-500">
                              {h.korean} · {h.week}주차
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(h.id)}
                          aria-label={fav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                          aria-pressed={fav}
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-md text-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <span className={fav ? "text-amber-400" : "text-neutral-300"}>
                            {fav ? "★" : "☆"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 시험 오버레이 */}
      {examOpen && (
        <Exam onClose={() => setExamOpen(false)} favorites={favorites} />
      )}
    </main>
  );
}
