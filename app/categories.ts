// 약재 효능분류(목차). herb id 의 연속 범위로 매핑된다 (herbs.ts 순서 기준).
// 출처: 땡시야마.pdf 목차 (총 126개, 범위 경계는 herbs.ts 한글명과 대조 확인).
export type Category = {
  key: string;
  label: string;
  start: number; // herb id (포함)
  end: number; // herb id (포함)
};

export const CATEGORIES: Category[] = [
  { key: "hwaseup", label: "방향화습약 (方香化濕藥)", start: 1, end: 3 },
  { key: "isu-tejong", label: "이수삼습약·이수퇴종약 (利水滲濕藥·利水退腫藥)", start: 4, end: 10 },
  { key: "isu-tongnim", label: "이수삼습약·이뇨통림약 (利水滲濕藥·利尿通淋藥)", start: 11, end: 25 },
  { key: "onri", label: "온리약 (溫裏藥)", start: 26, end: 37 },
  { key: "igi", label: "이기약 (理氣藥)", start: 38, end: 55 },
  { key: "sosik", label: "소식약 (消食藥)", start: 56, end: 61 },
  { key: "guchung", label: "구충약 (驅蟲藥)", start: 62, end: 69 },
  { key: "jihyeol-suryeom", label: "지혈약·수렴지혈약 (止血藥·收斂止血藥)", start: 70, end: 73 },
  { key: "jihyeol-yanghyeol", label: "지혈약·양혈지혈약 (止血藥·凉血止血藥)", start: 74, end: 80 },
  { key: "jihyeol-hwaeo", label: "지혈약·화어지혈약 (止血藥·化瘀止血藥)", start: 81, end: 83 },
  { key: "jihyeol-ongyeong", label: "지혈약·온경지혈약 (止血藥·溫經止血藥)", start: 84, end: 84 },
  { key: "hwalhyeol", label: "활혈거어약 (活血祛瘀藥)", start: 85, end: 111 },
  { key: "hwadam-onhwa", label: "화담지해평천약·온화한담약 (化痰止咳平喘藥·溫化寒痰藥)", start: 112, end: 114 },
  { key: "anshin", label: "안신약 (安神藥)", start: 115, end: 124 },
  { key: "pyeonggan", label: "평간약·평간식풍약 (平肝藥·平肝息風藥)", start: 125, end: 126 },
];

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

// 해당 분류의 herb id 집합. 알 수 없는 key면 빈 집합.
export function categoryIds(key: string): Set<number> {
  const c = BY_KEY.get(key);
  if (!c) return new Set();
  const ids = new Set<number>();
  for (let id = c.start; id <= c.end; id++) ids.add(id);
  return ids;
}

// ── 닮은꼴 연습 세트 ───────────────────────────────────────────────
// 사진을 보고 헷갈리기 쉬운(비슷하게 생긴) 약재끼리 묶은 세트.
// herbs.ts 의 실제 사진을 콘택트시트로 보고 군집함. 모든 약재가 포함되지는 않음.
export type LookalikeSet = { key: string; label: string; ids: number[] };

export const LOOKALIKE_SETS: LookalikeSet[] = [
  { key: "set:corm", label: "흰 덩이뿌리 (반하·천남성·백부자)", ids: [112, 113, 114] },
  { key: "set:mineral", label: "광물·수지 사발류 (주사·자석·용골 등)", ids: [13, 104, 115, 116, 117, 118] },
  { key: "set:resin", label: "수지 알갱이 (유향·몰약)", ids: [86, 87] },
  { key: "set:rhizome", label: "노란 근경 절편 (강황·울금·아출 등)", ids: [85, 88, 89, 90, 91, 92] },
  { key: "set:peel", label: "귤껍질 (진피·청피)", ids: [38, 39] },
  { key: "set:citrus", label: "탱자 절편 (지실·지각)", ids: [40, 41] },
  { key: "set:thistle", label: "엉겅퀴 (대계·소계)", ids: [74, 75] },
  { key: "set:sprout", label: "낟알·싹 (맥아·곡아)", ids: [58, 59] },
  { key: "set:smallseed", label: "작은 씨앗류 (차전자·오수유·내복자 등)", ids: [11, 18, 21, 30, 33, 60, 109] },
  { key: "set:spice", label: "매운 향신 열매 (촉초·필발·정향·호초)", ids: [31, 32, 34, 37] },
  { key: "set:nut", label: "둥근 씨앗·견과 (초두구·초과·여지핵 등)", ids: [1, 2, 47, 65, 67] },
  { key: "set:green", label: "녹색 잎·전초 (패란·익모초·측백엽 등)", ids: [3, 19, 20, 23, 25, 70, 78, 84, 95, 102] },
];

const SET_BY_KEY = new Map(LOOKALIKE_SETS.map((s) => [s.key, s]));

// 분류 또는 닮은꼴 세트의 herb id 집합 (둘 다 처리). 알 수 없는 key면 빈 집합.
export function groupIds(key: string): Set<number> {
  const set = SET_BY_KEY.get(key);
  if (set) return new Set(set.ids);
  return categoryIds(key);
}

// 진행 표시용 짧은 라벨 (괄호 앞부분).
export function groupShortLabel(key: string): string {
  const set = SET_BY_KEY.get(key);
  const label = set?.label ?? BY_KEY.get(key)?.label ?? "";
  return label.split(" (")[0];
}

// 유효한 그룹 key 인지 (localStorage 검증용).
export function isGroupKey(key: string): boolean {
  return BY_KEY.has(key) || SET_BY_KEY.has(key);
}
