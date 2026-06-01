"use client";

import { useEffect, useRef, useState } from "react";
import { HERBS } from "./herbs";

type Phase = "setup" | "running" | "review";
type CountMode = "all" | "custom";

// Fisher–Yates 셔플 (원본 불변)
function shuffle(arr: number[]): number[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk(arr: number[], size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export default function Exam({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("setup");

  // 설정
  const [perRound, setPerRound] = useState(6);
  const [seconds, setSeconds] = useState(15);
  const [countMode, setCountMode] = useState<CountMode>("all");
  const [customCount, setCustomCount] = useState(20);

  // 출제 결과 (약재 인덱스의 라운드별 배열)
  const [rounds, setRounds] = useState<number[][]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [progress, setProgress] = useState(0); // 0~100 (%)

  const startRef = useRef(0);

  const startExam = () => {
    const safePerRound = Math.max(1, Math.floor(perRound) || 1);
    const total =
      countMode === "all"
        ? HERBS.length
        : Math.min(HERBS.length, Math.max(1, Math.floor(customCount) || 1));
    const picked = shuffle(HERBS.map((_, i) => i)).slice(0, total);
    setRounds(chunk(picked, safePerRound));
    setCurrentRound(0);
    setProgress(0);
    setPhase("running");
  };

  // 라운드 타이머: running 단계에서 currentRound가 바뀔 때마다 재시작
  useEffect(() => {
    if (phase !== "running") return;
    const duration = Math.max(1, Math.floor(seconds) || 1) * 1000;
    startRef.current = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed >= duration) {
        window.clearInterval(id);
        setProgress(0);
        setCurrentRound((r) => {
          if (r + 1 < rounds.length) return r + 1;
          setPhase("review");
          return r;
        });
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [phase, currentRound, rounds.length, seconds]);

  const skipRound = () => {
    setProgress(0);
    setCurrentRound((r) => {
      if (r + 1 < rounds.length) return r + 1;
      setPhase("review");
      return r;
    });
  };

  const totalRounds = rounds.length;
  const roundHerbs = (rounds[currentRound] ?? []).map((i) => HERBS[i]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/40 p-2 sm:p-4">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-base font-semibold">
            {phase === "setup"
              ? "시험 설정"
              : phase === "running"
                ? `시험 진행 · 라운드 ${currentRound + 1} / ${totalRounds}`
                : `복기 · 라운드 ${currentRound + 1} / ${totalRounds}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="시험 닫기"
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        {/* 진행 막대 (running 단계) */}
        {phase === "running" && (
          <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full bg-neutral-800 transition-[width] duration-75 ease-linear dark:bg-neutral-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* 본문 */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {phase === "setup" && (
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  한 라운드에 보여줄 이미지 개수
                </span>
                <input
                  type="number"
                  min={1}
                  value={perRound}
                  onChange={(e) => setPerRound(Number(e.target.value))}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">라운드별 타이머 (초)</span>
                <input
                  type="number"
                  min={1}
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value))}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">시험 약재 개수</span>
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="countMode"
                    className="h-4 w-4 accent-neutral-700"
                    checked={countMode === "all"}
                    onChange={() => setCountMode("all")}
                  />
                  전체 ({HERBS.length}개)
                </label>
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="countMode"
                    className="h-4 w-4 accent-neutral-700"
                    checked={countMode === "custom"}
                    onChange={() => setCountMode("custom")}
                  />
                  직접 입력
                  <input
                    type="number"
                    min={1}
                    max={HERBS.length}
                    value={customCount}
                    onChange={(e) => setCustomCount(Number(e.target.value))}
                    onFocus={() => setCountMode("custom")}
                    className="w-24 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  개
                </label>
              </div>

              <button
                type="button"
                onClick={startExam}
                disabled={perRound < 1 || seconds < 1}
                className="mt-2 rounded-md border border-neutral-800 bg-neutral-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-white"
              >
                시험 시작
              </button>
            </div>
          )}

          {phase === "running" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {roundHerbs.map((h) => (
                <div
                  key={h.id}
                  className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={h.img}
                    alt="약재 사진"
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          )}

          {phase === "review" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {roundHerbs.map((h) => (
                <div key={h.id} className="flex flex-col gap-1.5">
                  <div className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={h.img}
                      alt="약재 사진"
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold tracking-wide">
                      {h.hanja}
                    </div>
                    <div className="text-xs text-neutral-500">{h.korean}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 컨트롤 */}
        {phase === "running" && (
          <div className="flex items-center justify-between gap-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              종료
            </button>
            <button
              type="button"
              onClick={skipRound}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              다음 라운드 →
            </button>
          </div>
        )}

        {phase === "review" && (
          <div className="flex items-center justify-between gap-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setCurrentRound((r) => Math.max(0, r - 1))}
              disabled={currentRound === 0}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              ← 이전 라운드
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPhase("setup")}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                다시 시험
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                닫기
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                setCurrentRound((r) => Math.min(totalRounds - 1, r + 1))
              }
              disabled={currentRound >= totalRounds - 1}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              다음 라운드 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
