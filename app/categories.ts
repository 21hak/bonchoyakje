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

// ── 닮은꼴 세트 (외형 기준 20그룹) ─────────────────────────────────
// 출처: public/herb_visual_grouping.pdf — 126종을 생긴 모양으로 묶은 공식 분류집.
// 20개 그룹이 전체 126종을 빠짐없이 1회씩 분할하며, 각 그룹마다 구별 포인트(tip) 수록.
export type LookalikeSet = { key: string; label: string; ids: number[]; tip?: string };

export const LOOKALIKE_SETS: LookalikeSet[] = [
  { key: "set:powder", label: "가루·분말류", ids: [13, 117, 82, 15], tip: "활석·용골=흰색, 포황=노란색, 해금사=갈색 미세분말" },
  { key: "set:mineral", label: "광물·수지 덩어리", ids: [115, 116, 118, 104, 107], tip: "주사=적색, 자석=흑색, 호박=황갈 반투명, 자연동=금속광 황철석, 건칠=흑색 옻 덩어리" },
  { key: "set:resin", label: "수지 (유향·몰약)", ids: [86, 87], tip: "유향=황백~담황·반투명 / 몰약=적갈색·더 어둡고 불투명" },
  { key: "set:whiteroot", label: "흰색 뿌리·균핵 절편", ids: [4, 5, 6, 17, 71, 92, 85, 44], tip: "복령=전체 백색 / 저령=겉 흑갈·속 백색 / 택사·비해·삼릉=백색 절편 / 천궁=황백 울퉁불퉁" },
  { key: "set:yellowrhizome", label: "노란색 뿌리줄기 절편 (강황류)", ids: [90, 91, 89, 94, 88], tip: "강황·아출=황색 단면 / 울금=회갈~암갈 / 호장근=선황색 / 현호색=소형 황색 괴경" },
  { key: "set:brownroot", label: "갈색 뿌리·뿌리줄기 절편", ids: [26, 27, 28, 35, 42, 54, 76, 93, 80], tip: "부자·천오두=흑갈 절편 / 건강·고량강=생강류 / 양제근=고리 단면" },
  { key: "set:thinroot", label: "가늘고 긴 뿌리류", ids: [99, 83, 48, 121, 79, 55, 69], tip: "천초근=적갈 가는 뿌리 / 백모근=백색 / 원지=비틀린 관상 / 청목향=가는 흑갈 가지" },
  { key: "set:corm", label: "흰 괴경 (천남성과)", ids: [112, 113, 114], tip: "반하=소형 구형 / 천남성=대형 편평 원형 / 백부자=중간 원추형" },
  { key: "set:leaf", label: "줄기·잎 절편 (지상부 본초)", ids: [3, 23, 24, 25, 16, 19, 20, 70, 74, 75, 84, 78, 95, 102, 105], tip: "인진호=회백 솜털, 소계=백색 관모, 측백엽=비늘잎 / 익모초·택란·왕불유행=녹색 줄기절편이라 특히 혼동" },
  { key: "set:wood", label: "목재·줄기 토막", ids: [45, 50, 106, 14, 12], tip: "침향=흑갈 무거움 / 단향=담황 / 소목=적색 / 통초·목통=흰 심 있는 줄기" },
  { key: "set:vine", label: "목질 덩굴·버섯 절편", ids: [111, 124, 123], tip: "계혈등=붉은 진액 테 / 야교등=목질 덩굴 / 영지=버섯 갓 절편" },
  { key: "set:bark", label: "나무껍질 (수피)", ids: [29, 63, 72, 8, 122, 53], tip: "육계=계피 직사각 / 고련피=황색 층 / 종려피=흑갈 섬유 / 동과피=청회색 / 합환피=말린 띠 / 대복피=섬유질 과피" },
  { key: "set:citrus", label: "감귤류 과실·과피", ids: [40, 41, 46, 38, 39, 56], tip: "지실=작음(미성숙)·지각=큼(성숙) / 진피=주황·청피=녹색 / 산사=붉은 고리 / 천련자=황갈 단면" },
  { key: "set:bigseed", label: "큰 씨앗·종인(種仁)", ids: [1, 47, 62, 67, 65, 64, 96, 119, 120], tip: "여지핵=흑갈 윤기 / 빈랑자=대리석 무늬 단면 / 도인=납작 행인형 / 산조인=적갈 납작 / 백자인=담황백 / 사군자=흑색 능선" },
  { key: "set:smallseed", label: "작은 씨앗 무더기", ids: [11, 109, 66, 18, 21, 60, 30, 37, 33, 31, 9, 7, 36], tip: "차전자·충위자=흑색 미세 / 호초·필징가=구형 / 오수유·내복자=밀집 / 적소두=적색 콩 / 의이인=백색 / 소회향=긴 줄무늬" },
  { key: "set:grain", label: "곡물·발아 (맥아·곡아)", ids: [58, 59], tip: "맥아(보리)=길쭉·까끄라기 / 곡아(벼·조)=더 작고 통통" },
  { key: "set:flower", label: "꽃·꽃봉오리", ids: [52, 77, 103, 97, 34], tip: "매괴화=장미 봉오리 / 괴화=콩과 봉오리 / 능소화=나팔꽃 / 홍화=홍적색 실 / 정향=못 모양 봉오리" },
  { key: "set:fiber", label: "섬유·실 모양", ids: [10, 22], tip: "옥촉서예=옥수수 수염(갈색) / 등심초=골풀 속심(백색)" },
  { key: "set:animal", label: "동물성 약재", ids: [100, 101, 98, 61, 125], tip: "자충=납작 곤충 / 수질=거머리 흑색 띠 / 오령지=배설물 덩이 / 계내금=닭 모래주머니 막 / 영양각=뿔" },
  { key: "set:unique", label: "독특한 단독 형태", ids: [2, 43, 32, 51, 49, 73, 108, 110, 57, 68, 81, 126], tip: "초과=흑갈 큰 껍질 / 향부자=흑갈 방추 / 필발=막대 화수 / 시체=감 꼭지 / 해백=비늘줄기 / 우절=연뿌리 구멍 / 조각자=가시 / 권백=말린 부처손 / 신곡=발효 덩어리 / 무이=압착 떡 / 삼칠=울퉁불퉁 뿌리 / 천마=쪼글한 덩이줄기" },
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

// 닮은꼴 세트의 구별 포인트(tip). 분류이거나 없으면 undefined.
export function groupTip(key: string): string | undefined {
  return SET_BY_KEY.get(key)?.tip;
}

// 유효한 그룹 key 인지 (localStorage 검증용).
export function isGroupKey(key: string): boolean {
  return BY_KEY.has(key) || SET_BY_KEY.has(key);
}

// 외형 그룹 순서대로 나열한 전체 herb id (묶어 보기 정렬용). 1..126 전체를 1회씩 포함.
export const GROUPED_ORDER: number[] = LOOKALIKE_SETS.flatMap((s) => s.ids);
