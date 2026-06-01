// 1회성 에셋 추출 스크립트.
// 두 PDF에서 사진(짝수 페이지의 박힌 JPEG)과 이름(홀수 페이지의 한자/한글 텍스트)을
// 추출해 public/herbs/*.jpg 와 app/herbs.ts 를 생성한다.
//
// 필요 도구: poppler (pdfimages, pdftotext)
// 실행: node scripts/extract.mjs

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const OUT_IMG_DIR = join(PUBLIC, "herbs");

// 처리할 PDF (순서대로 이어붙임)
const PDFS = [
  { file: "약재12주차까지.pdf", week: 12 },
  { file: "약재13주차.pdf", week: 13 },
];

// PDF 원문이 실습서 기준 표기와 다른 항목 보정. key = 약재 id, value = 올바른 한자.
// (재생성 시에도 유지되도록 여기서 덮어씀)
const HANJA_OVERRIDES = {
  15: "海金沙", // 해금사 (PDF: 海金砂)
  16: "石韋", // 석위 (PDF: 石葦)
  51: "柿蒂", // 시체 (PDF: 柿蔕)
  115: "朱砂", // 주사 (PDF: 朱沙)
};

function pdfPageCount(pdfPath) {
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const m = info.match(/Pages:\s+(\d+)/);
  if (!m) throw new Error(`페이지 수를 읽지 못함: ${pdfPath}`);
  return Number(m[1]);
}

// 한 PDF에서 이름 목록(홀수 페이지의 [한자, 한글]) 추출
function extractNames(pdfPath) {
  const txt = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" });
  const pages = txt.split("\f").map((p) => p.trim());
  // 마지막 빈 페이지 제거
  while (pages.length && pages[pages.length - 1] === "") pages.pop();

  const names = [];
  // 페이지 1 = 표지(index 0). 사진=짝수 페이지(2,4..), 이름=홀수 페이지(3,5..)
  for (let i = 2; i < pages.length; i += 2) {
    const lines = pages[i].split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error(`이름 페이지 형식 오류 (page ${i + 1}): ${JSON.stringify(pages[i])}`);
    }
    names.push({ hanja: lines[0], korean: lines[1] });
  }
  return names;
}

// 한 PDF의 짝수 페이지에서 사진 JPEG를 추출해 herbs/<id>.jpg 로 저장
function extractImage(pdfPath, page, id) {
  const prefix = join(OUT_IMG_DIR, `tmp_${id}`);
  execFileSync("pdfimages", ["-f", String(page), "-l", String(page), "-j", pdfPath, prefix]);
  const produced = `${prefix}-000.jpg`;
  if (!existsSync(produced)) {
    throw new Error(`사진 추출 실패 (page ${page}): ${produced} 없음`);
  }
  const finalName = String(id).padStart(3, "0") + ".jpg";
  renameSync(produced, join(OUT_IMG_DIR, finalName));
  return `/herbs/${finalName}`;
}

function main() {
  // 깨끗하게 다시 생성
  rmSync(OUT_IMG_DIR, { recursive: true, force: true });
  mkdirSync(OUT_IMG_DIR, { recursive: true });

  const herbs = [];
  let id = 0;

  for (const { file, week } of PDFS) {
    const pdfPath = join(PUBLIC, file);
    const pageCount = pdfPageCount(pdfPath);
    const names = extractNames(pdfPath);

    // 사진 페이지: 2,4,...  / 이름은 names[0],names[1],...
    let nameIdx = 0;
    for (let page = 2; page <= pageCount; page += 2, nameIdx++) {
      id += 1;
      const img = extractImage(pdfPath, page, id);
      const name = names[nameIdx];
      if (!name) throw new Error(`page ${page} 에 대응하는 이름 없음 (${file})`);
      const hanja = HANJA_OVERRIDES[id] ?? name.hanja;
      herbs.push({ id, img, hanja, korean: name.korean, week });
    }

    if (nameIdx !== names.length) {
      throw new Error(`${file}: 사진 수(${nameIdx})와 이름 수(${names.length}) 불일치`);
    }
    console.log(`${file}: ${nameIdx}개 추출`);
  }

  // app/herbs.ts 생성
  const lines = herbs.map(
    (h) =>
      `  { id: ${h.id}, img: ${JSON.stringify(h.img)}, hanja: ${JSON.stringify(
        h.hanja
      )}, korean: ${JSON.stringify(h.korean)}, week: ${h.week} },`
  );
  const ts = `// 이 파일은 scripts/extract.mjs 로 자동 생성됩니다. 직접 수정하지 마세요.
export type Herb = {
  id: number;
  img: string;
  hanja: string;
  korean: string;
  week: 12 | 13;
};

export const HERBS: Herb[] = [
${lines.join("\n")}
];
`;
  writeFileSync(join(ROOT, "app", "herbs.ts"), ts);

  console.log(`\n총 ${herbs.length}개 약재.`);
  console.log(`첫 항목: ${herbs[0].hanja}/${herbs[0].korean}`);
  console.log(`115번째: ${herbs[114].hanja}/${herbs[114].korean}`);
  console.log(`마지막: ${herbs[herbs.length - 1].hanja}/${herbs[herbs.length - 1].korean}`);
}

main();
