"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HERBS } from "./herbs";
import Exam from "./Exam";

const STORAGE_KEY = "bonchoyakje:state";
const SWIPE_THRESHOLD = 50;

const HERB_IDS = new Set(HERBS.map((h) => h.id));

type SavedState = {
  order: number[];
  shuffled: boolean;
  showAnswer: boolean;
  pos: number;
  favorites: number[];
  favoritesOnly: boolean;
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

  // 목록 오버레이 (휘발성 UI 상태 — localStorage 저장 안 함)
  const [listOpen, setListOpen] = useState(false);
  const [listTab, setListTab] = useState<"all" | "fav">("all");
  const [query, setQuery] = useState("");
  const [examOpen, setExamOpen] = useState(false);

  // 카드 전환 애니메이션
  const [dir, setDir] = useState<1 | -1>(1);
  const [animTick, setAnimTick] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

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
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // 저장 실패는 무시
    }
  }, [mounted, order, shuffled, showAnswer, pos, favorites, favoritesOnly]);

  // 활성 덱: 즐겨찾기만 보기면 즐겨찾기한 약재로 필터
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const activeOrder = useMemo(
    () =>
      favoritesOnly
        ? order.filter((i) => favSet.has(HERBS[i].id))
        : order,
    [favoritesOnly, order, favSet]
  );

  const len = activeOrder.length;
  // 순환 인덱스 (pos가 음수/초과여도 안전)
  const idx = len ? ((pos % len) + len) % len : 0;
  const herb = len ? HERBS[activeOrder[idx]] : null;
  const isFav = herb ? favSet.has(herb.id) : false;

  // 목록 검색 결과 (원래 HERBS 순서 유지)
  const listResults = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    return HERBS.filter((h) => {
      if (listTab === "fav" && !favSet.has(h.id)) return false;
      if (!q) return true;
      return (
        h.korean.toLowerCase().replace(/\s+/g, "").includes(q) ||
        h.hanja.toLowerCase().includes(q)
      );
    });
  }, [query, listTab, favSet]);

  // 이동 (순환). pos는 그대로 증감하고 표시 시 모듈러로 순환.
  const go = useCallback(
    (delta: number) => {
      if (len === 0) return;
      setDir(delta > 0 ? 1 : -1);
      setAnimTick((t) => t + 1);
      setPos((p) => p + delta);
      setRevealed(showAnswer);
    },
    [len, showAnswer]
  );
  const goPrev = useCallback(() => go(-1), [go]);
  const goNext = useCallback(() => go(1), [go]);

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
  }, [listOpen, goNext, goPrev, toggleFavorite, herb]);

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

  const onToggleShowAnswer = (checked: boolean) => {
    setShowAnswer(checked);
    setRevealed(checked);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    // 오른쪽으로 스와이프(dx>0) → 다음, 왼쪽으로 스와이프 → 이전
    suppressClickRef.current = true; // 스와이프 뒤 합성 click 무시
    if (dx > 0) goNext();
    else goPrev();
  };
  // 사진 좌/우 절반 탭 → 이전/다음 (스와이프와 동일 방향)
  const onImageClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left > rect.width / 2) goNext();
    else goPrev();
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">약재 한자 퀴즈</h1>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-neutral-700"
              checked={showAnswer}
              onChange={(e) => onToggleShowAnswer(e.target.checked)}
            />
            정답 미리보기
          </label>
          <button
            type="button"
            onClick={() => setExamOpen(true)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
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
          <button
            type="button"
            onClick={toggleFavoritesOnly}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              favoritesOnly
                ? "border-amber-500 bg-amber-400 text-neutral-900"
                : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            }`}
          >
            ★ 즐겨찾기만 ({favorites.length})
          </button>
          <button
            type="button"
            onClick={doShuffle}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              shuffled
                ? "border-neutral-800 bg-neutral-800 text-white"
                : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            }`}
          >
            셔플
          </button>
          <button
            type="button"
            onClick={doReset}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            기본
          </button>
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
              {favoritesOnly ? " · 즐겨찾기" : shuffled ? " · 섞임" : ""}
            </span>
          </div>

          {/* 사진 (스와이프/탭 영역) + 별 버튼 */}
          <div
            className="relative flex aspect-4/3 w-full cursor-pointer select-none items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={onImageClick}
          >
            {/* 슬라이드되는 이미지 레이어 (key로 매 이동마다 애니메이션 재생) */}
            <div
              key={animTick}
              className={`h-full w-full ${
                dir === 1 ? "slide-in-right" : "slide-in-left"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={herb.img}
                alt="약재 사진"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (herb) toggleFavorite(herb.id);
              }}
              aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              aria-pressed={isFav}
              className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-2xl shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-neutral-900/70 dark:hover:bg-neutral-900"
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
        // 즐겨찾기만 보기인데 즐겨찾기가 없을 때
        <div className="mt-10 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-neutral-500">즐겨찾기한 약재가 없습니다.</p>
          <button
            type="button"
            onClick={toggleFavoritesOnly}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            전체 보기로 전환
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

            {/* 검색 */}
            <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="한글 또는 한자로 검색…"
                autoFocus
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
              />
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
      {examOpen && <Exam onClose={() => setExamOpen(false)} />}
    </main>
  );
}
