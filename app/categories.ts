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
