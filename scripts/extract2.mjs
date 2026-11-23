// 1회성 에셋 추출 스크립트 (본1-2 / 2학기).
// "약재 감별.pdf" 의 홀수 페이지(1,3,5..)에 박힌 사진 JPEG를 public/herbs/127.jpg.. 로 추출하고
// app/herbs2.ts 를 생성한다. 이름 페이지(짝수)는 136쪽부터 글자가 벡터 외곽선이라
// pdftotext로 읽히지 않으므로 이름은 아래에 PDF 순서대로 직접 적어 둔다.
//
// 필요 도구: poppler (pdfimages, pdfinfo)
// 이어서 "약재감별12종_구간목차_설명추가.pdf"(용토약·외용약 12종)의 사진도 뒤에 추가한다.
// 실행: node scripts/extract2.mjs "<약재 감별.pdf 경로>" "<약재감별12종_구간목차_설명추가.pdf 경로>"

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_IMG_DIR = join(ROOT, "public", "herbs");
const FIRST_ID = 127; // 1학기(1..126) 다음 번호부터

// PDF 순서 그대로 [한자, 한글]
const NAMES = [
  ["白殭蠶", "백강잠"],
  ["全蠍", "전갈"],
  ["蜈蚣", "오공"],
  ["蚯蚓", "구인"],
  ["決明子", "결명자"],
  ["石決明", "석결명"],
  ["牡蠣", "모려"],
  ["珍珠", "진주"],
  ["代赭石", "대자석"],
  ["白蒺藜", "백질려"],
  ["麝香", "사향"],
  ["氷片", "빙편"],
  ["石菖蒲", "석창포"],
  ["蘇合香", "소합향"],
  ["安息香", "안식향"],
  ["樟腦", "장뇌"],
  ["人蔘", "인삼"],
  ["黨蔘", "당삼"],
  ["黃芪", "황기"],
  ["白朮", "백출"],
  ["山藥", "산약"],
  ["白扁豆", "백편두"],
  ["甘草", "감초"],
  ["大棗", "대조"],
  ["蜂蜜", "봉밀"],
  ["鹿茸", "녹용"],
  ["鹿角", "녹각"],
  ["鹿角膠", "녹각교"],
  ["鹿角霜", "녹각상"],
  ["巴戟天", "파극천"],
  ["肉蓯蓉", "육종용"],
  ["仙茅", "선모"],
  ["淫羊藿", "음양곽"],
  ["胡蘆巴", "호로파"],
  ["杜仲", "두충"],
  ["續斷", "속단"],
  ["補骨脂", "보골지"],
  ["狗脊", "구척"],
  ["益智仁", "익지인"],
  ["骨碎補", "골쇄보"],
  ["冬蟲夏草", "동충하초"],
  ["胡桃仁", "호도인"],
  ["紫河車", "자하거"],
  ["菟絲子", "토사자"],
  ["沙苑蒺藜", "사원질려"],
  ["鎖陽", "쇄양"],
  ["韭子", "구자"],
  ["陽起石", "양기석"],
  ["海馬", "해마"],
  ["蛇床子", "사상자"],
  ["蛤蚧", "합개"],
  ["海狗腎", "해구신"],
  ["當歸", "당귀"],
  ["熟地黃", "숙지황"],
  ["白芍藥", "백작약"],
  ["何首烏", "하수오"],
  ["白何首烏", "백하수오"],
  ["阿膠", "아교"],
  ["龍眼肉", "용안육"],
  ["沙蔘", "사삼"],
  ["麥門冬", "맥문동"],
  ["天門冬", "천문동"],
  ["石斛", "석곡"],
  ["玉竹", "옥죽"],
  ["黃精", "황정"],
  ["百合", "백합"],
  ["枸杞子", "구기자"],
  ["桑椹子", "상심자"],
  ["旱蓮草", "한련초"],
  ["女貞子", "여정자"],
  ["龜板", "귀판"],
  ["鱉甲", "별갑"],
  ["黑芝麻", "흑지마"],
  ["楮實子", "저실자"],
  ["浮小麥", "부소맥"],
  ["麻黃根", "마황근"],
  ["糯稻根", "나도근"],
  ["訶子", "가자"],
  ["肉豆蔲", "육두구"],
  ["赤石脂", "적석지"],
  ["烏梅", "오매"],
  ["禹餘糧", "우여량"],
  ["石榴皮", "석류피"],
  ["椿皮", "춘피"],
  ["五倍子", "오배자"],
  ["五味子", "오미자"],
  ["蓮子肉", "연자육"],
  ["芡實", "검실"],
  ["山茱萸", "산수유"],
  ["金櫻子", "금앵자"],
  ["桑螵蛸", "상표초"],
  ["覆盆子", "복분자"],
  ["海螵蛸", "해표초"],
];

// 12종 PDF: [사진 페이지, 한자, 한글] (1·10쪽은 목차, 이름은 사진 다음 페이지)
const EXTRA = [
  [2, "瓜蒂", "과체"],
  [4, "常山", "상산"],
  [6, "膽礬", "담반"],
  [8, "藜蘆", "여로"],
  [11, "硫黃", "유황"],
  [13, "雄黃", "웅황"],
  [15, "鉛丹", "연단"],
  [17, "硼砂", "붕사"],
  [19, "斑蝥", "반모"],
  [21, "露蜂房", "노봉방"],
  [23, "大風子", "대풍자"],
  [25, "木槿皮", "목근피"],
];

// pdfPath 의 page 쪽 사진을 herbs/<id>.jpg 로 저장
function extractImage(pdfPath, page, id) {
  const prefix = join(OUT_IMG_DIR, `tmp_${id}`);
  execFileSync("pdfimages", ["-f", String(page), "-l", String(page), "-j", pdfPath, prefix]);
  const produced = `${prefix}-000.jpg`;
  if (!existsSync(produced)) throw new Error(`사진 추출 실패 (${pdfPath} page ${page})`);
  const finalName = `${id}.jpg`;
  renameSync(produced, join(OUT_IMG_DIR, finalName));
  return `/herbs/${finalName}`;
}

function main() {
  const [pdfPath, extraPdfPath] = process.argv.slice(2);
  for (const p of [pdfPath, extraPdfPath]) {
    if (!p || !existsSync(p)) throw new Error(`PDF 경로 2개를 인자로 주세요: ${p}`);
  }

  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const pageCount = Number(info.match(/Pages:\s+(\d+)/)[1]);
  if (pageCount !== NAMES.length * 2) {
    throw new Error(`페이지 수(${pageCount})가 이름 수(${NAMES.length})x2 와 다름`);
  }

  mkdirSync(OUT_IMG_DIR, { recursive: true });
  const herbs = NAMES.map(([hanja, korean], i) => {
    const id = FIRST_ID + i;
    const page = i * 2 + 1; // 사진 = 홀수 페이지
    return { id, img: extractImage(pdfPath, page, id), hanja: hanja.normalize("NFC"), korean };
  });
  EXTRA.forEach(([page, hanja, korean], i) => {
    const id = FIRST_ID + NAMES.length + i;
    herbs.push({ id, img: extractImage(extraPdfPath, page, id), hanja, korean });
  });
  // 섬수: PDF에 없어 사진(public/herbs/232.jpg)을 따로 넣음. 목록 순서대로 안식향 뒤에 끼움
  // (id는 맨 뒤 번호라 기존 즐겨찾기 id가 밀리지 않음).
  const after = herbs.findIndex((h) => h.korean === "안식향");
  herbs.splice(after + 1, 0, { id: 232, img: "/herbs/232.jpg", hanja: "蟾酥", korean: "섬수" });

  const lines = herbs.map(
    (h) =>
      `  { id: ${h.id}, img: ${JSON.stringify(h.img)}, hanja: ${JSON.stringify(
        h.hanja
      )}, korean: ${JSON.stringify(h.korean)}, semester: 2 },`
  );
  const ts = `// 이 파일은 scripts/extract2.mjs 로 자동 생성됩니다. 직접 수정하지 마세요.
import type { Herb } from "./herbs";

export const HERBS_2: Herb[] = [
${lines.join("\n")}
];
`;
  writeFileSync(join(ROOT, "app", "herbs2.ts"), ts);
  console.log(`총 ${herbs.length}개`);
}

main();
