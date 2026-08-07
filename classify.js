// 정리기 (v1 규칙판)
// 약속: classify(텍스트, 카테고리목록) -> { category, content, date }
// 나중에 AI판으로 통째로 갈아끼울 자리. app.js는 이 약속만 보고 쓴다.

const FALLBACK = '기타';                       // 아무 데도 안 걸리면 여기로. 지울 수 없다
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 날짜·시간을 말했으면 "언제 무엇"이라는 뜻이므로 약속으로 본다
const TIME_WORDS = '오늘|내일|모레|글피|다음\\s?주|담\\s?주|이번\\s?주|주말|[월화수목금토일]요일|\\d+\\s?시|\\d+\\s?일|\\d+\\s?월|약속';

// 처음 켰을 때 들어가는 기본값. 위에 있는 것이 먼저 이긴다.
// 넓은 칸일수록 아래에 둔다 — 좁고 확실한 게 먼저 걸러지고, 남은 걸 '개인'이 받는 구조
const DEFAULT_CATEGORIES = [
  { name: '비밀번호', words: '비번|비밀번호|아이디|계정|암호|핀\\s?번호|공인인증|패스워드|보안카드' },
  { name: '병원', words: '병원|약국|진료|처방|주사|검진|치과|한의원|물리치료|약\\s?먹|혈압약|당뇨약|입원|수술' },
  { name: '마트', words: '마트|슈퍼|시장|장\\s?보|사와|사야|사기|사올|구매|세제|휴지|우유|계란|반찬|김치' },
  { name: '가족', words: '손주|손자|손녀|아들|딸|며느리|사위|생신|생일|제사|명절|엄마|아빠|어머니|아버지|남편|아내|동생|가족|친정|시댁' },
  { name: '개인', words: TIME_WORDS },   // 날짜·요일이 나오는데 위에 안 걸린 것 — 큰 가방
  { name: FALLBACK, words: '' },
];

// 사용자가 만든 이름에 특수문자가 들어가도 규칙이 안 깨지게 막는다
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function classify(text, categories = DEFAULT_CATEGORIES, now = new Date()) {
  const content = text.trim();
  const time = parseTime(content);
  // 시간만 말하면 오늘을 뜻한다. "5시에 가야 해"는 오늘 5시다
  const date = parseDate(content, now) || (time ? iso(startOfDay(now)) : null);

  for (const c of categories) {
    if (c.name === FALLBACK) continue;
    // 카테고리 이름 자체도 항상 키워드로 친다 -> 새로 만든 카테고리도 자동 분류된다
    const pattern = [c.words, esc(c.name)].filter(Boolean).join('|');
    if (new RegExp(pattern).test(content)) return { category: c.name, content, date, time };
  }
  return { category: FALLBACK, content, date, time };
}

// 시간은 계산할 일이 없다(알림 기능이 없으므로). 그래서 24시로 바꾸지 않고
// 말한 그대로 뽑아서 보여만 준다 — 오전/오후를 억지로 추측하지 않으려는 것
function parseTime(text) {
  const m = text.match(/(새벽|아침|오전|점심|낮|저녁|밤|오후)?\s?(\d{1,2})\s?시(\s?(반|\d{1,2}\s?분))?/);
  if (!m || /시간/.test(text.slice(m.index, m.index + m[0].length + 1))) return null;
  return m[0].replace(/\s+/g, ' ').trim();
}

// ── 배울 단어 후보 뽑기 ──────────────────────────────────
// 카테고리를 손으로 고쳤을 때 "어떤 말이 나오면 여기로 보낼까요?" 하고 보여줄 후보들.
// 형태소 분석기 없이 조사만 떼는 수준이다. 정확할 필요 없다 — 사람이 골라 주니까.

const PARTICLES = /(을|를|이|가|은|는|에서|에게|한테|까지|부터|으로|로|의|도|만|과|와|랑|에)$/;
const STOP = /^(합니다|해야|한다|해요|하기|하고|이다|있다|있어|없다|없어|같다|같아|가야|가서|그리고|그런데|다음|이번|우리|저기|여기)$/;

function wordCandidates(text, categories = DEFAULT_CATEGORIES) {
  const known = categories
    .map((c) => [c.words, esc(c.name)].filter(Boolean).join('|'))
    .filter(Boolean).join('|');
  const knownRe = new RegExp(known);

  const words = text.split(/\s+/)
    .map((w) => w.replace(/[.,!?"']/g, '').replace(PARTICLES, ''))
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !STOP.test(w) && !knownRe.test(w));

  return [...new Set(words)].slice(0, 5);   // 버튼이 너무 많으면 고르기 힘들다
}

// ── 날짜 알아내기 ────────────────────────────────────────
// 말한 그 순간을 기준으로 실제 날짜를 못 박는다. "다음 주"의 뜻이 나중에 변하면 안 되므로.

const DOW = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };   // 한 주는 월요일 시작

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());   // 시각은 버린다
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function parseDate(text, now = new Date()) {
  const today = startOfDay(now);
  let m;

  // 8월 20일
  if ((m = text.match(/(\d{1,2})\s?월\s?(\d{1,2})\s?일/))) {
    let d = new Date(today.getFullYear(), +m[1] - 1, +m[2]);
    if (d < today) d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());   // 이미 지났으면 내년
    return iso(d);
  }

  // 20일 (달은 안 말한 경우)
  if ((m = text.match(/(\d{1,2})\s?일/))) {
    let d = new Date(today.getFullYear(), today.getMonth(), +m[1]);
    if (d < today) d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());   // 이미 지났으면 다음 달
    return iso(d);
  }

  if ((m = text.match(/오늘|내일|모레|글피/))) {
    return iso(addDays(today, { 오늘: 0, 내일: 1, 모레: 2, 글피: 3 }[m[0]]));
  }

  // (다음 주 | 이번 주) 월요일  /  그냥 월요일
  if ((m = text.match(/(다음\s?주|담\s?주|이번\s?주)?\s*([월화수목금토일])요일/))) {
    const target = DOW[m[2]];
    if (!m[1]) {
      // 수식어 없이 요일만 -> 오늘 포함해서 다가오는 가장 가까운 그 요일
      const todayIdx = (today.getDay() + 6) % 7;
      return iso(addDays(today, (target - todayIdx + 7) % 7));
    }
    const weeks = m[1].includes('이번') ? 0 : 1;
    return iso(addDays(mondayOf(today), weeks * 7 + target));
  }

  // "다음 주"만 말했으면 다음 주 월요일
  if (/다음\s?주|담\s?주/.test(text)) return iso(addDays(mondayOf(today), 7));

  return null;
}

// 자체 점검 — 터미널에서 `node classify.js` 실행하면 규칙이 안 깨졌는지 확인된다
if (typeof module !== 'undefined') {
  const cat = (text, expected) => {
    const got = classify(text).category;
    if (got !== expected) throw new Error(`분류: "${text}" -> ${got} (기대: ${expected})`);
  };

  // 좁은 칸이 넓은 칸('개인')보다 위에 있어야 이 넷이 개인으로 안 빨려 들어간다
  cat('화요일에 병원 열시', '병원');
  cat('내일 손주 온다', '가족');
  cat('내일 우유 사와', '마트');
  cat('은행 앱 비번 1234', '비밀번호');
  cat('다음 주 수요일 회의', '개인');       // 날짜만 있고 위에 안 걸림 -> 큰 가방
  cat('김치 담그기', '마트');
  cat('그냥 해본 말', '기타');
  if (classify('  공백 정리  ').content !== '공백 정리') throw new Error('공백 정리 실패');

  // 사용자가 만든 카테고리는 이름 자체가 키워드가 된다
  const mine = [{ name: '운동', words: '' }, ...DEFAULT_CATEGORIES];
  cat('운동 가야지', '기타');                                    // 목록에 없으면 기타
  if (classify('운동 가야지', mine).category !== '운동') throw new Error('새 카테고리 실패');
  // 이름에 특수문자가 있어도 안 터진다
  classify('아무 말', [{ name: '(중요)', words: '' }, ...DEFAULT_CATEGORIES]);

  // 날짜 — 2026-08-07(금) 기준. 이번 주 = 8/3~8/9, 다음 주 = 8/10~8/16
  const FRI = new Date(2026, 7, 7);
  const day = (text, expected) => {
    const got = parseDate(text, FRI);
    if (got !== expected) throw new Error(`날짜: "${text}" -> ${got} (기대: ${expected})`);
  };

  day('다음 주 월요일 학교', '2026-08-10');
  day('다음주에 보자', '2026-08-10');       // 요일 안 말하면 다음 주 월요일
  day('이번 주 월요일', '2026-08-03');      // 이미 지난 날도 그대로 (사실이므로)
  day('내일 병원', '2026-08-08');
  day('모레 약속', '2026-08-09');
  day('월요일에 학교', '2026-08-10');       // 수식어 없으면 다가오는 월요일
  day('금요일 회의', '2026-08-07');         // 오늘이 금요일 -> 오늘
  day('8월 20일 모임', '2026-08-20');
  day('3월 2일 입학', '2027-03-02');        // 이미 지났으면 내년
  day('20일에 만나기', '2026-08-20');
  day('3일에 만나기', '2026-09-03');        // 이미 지났으면 다음 달
  day('그냥 해본 말', null);

  // 시간 — 계산 안 하고 말한 그대로 뽑는다
  const time = (text, expected) => {
    const got = parseTime(text);
    if (got !== expected) throw new Error(`시간: "${text}" -> ${got} (기대: ${expected})`);
  };

  time('오후 5시 밭에 가야 합니다', '오후 5시');
  time('아침 8시 학교', '아침 8시');
  time('10시 30분 회의', '10시 30분');
  time('7시 반에 만나', '7시 반');
  time('10시간 걸려', null);              // '시간'은 시각이 아니다
  time('그냥 해본 말', null);

  // 시간만 말하면 오늘로 잡는다
  const r = classify('오후 5시 밭에 가야 합니다', DEFAULT_CATEGORIES, FRI);
  if (r.date !== '2026-08-07') throw new Error(`시간만 말했을 때 날짜: ${r.date}`);
  if (r.time !== '오후 5시') throw new Error(`시간 저장 실패: ${r.time}`);
  // 날짜를 같이 말했으면 그 날짜가 이긴다
  if (classify('내일 오후 5시', DEFAULT_CATEGORIES, FRI).date !== '2026-08-08') throw new Error('날짜 우선 실패');

  // 단어 후보 — 이미 아는 말(수요일)과 흔한 말(합니다)은 빼고 보여준다
  const got = wordCandidates('다음 주 수요일까지 생활 기록부 정리해야 합니다');
  const want = ['생활', '기록부'];
  if (!want.every((w) => got.includes(w))) throw new Error(`후보: ${got} 에 ${want} 없음`);
  if (got.includes('수요일')) throw new Error('이미 아는 말이 후보에 들어감');
  if (got.includes('합니다')) throw new Error('흔한 말이 후보에 들어감');
  if (got.length > 5) throw new Error('후보가 너무 많음');

  // 배운 단어가 실제로 먹히는지
  const learned = [{ name: '개인업무', words: '기록부' }, ...DEFAULT_CATEGORIES];
  if (classify('생활 기록부 정리', learned).category !== '개인업무') throw new Error('배운 단어 실패');

  console.log('정리기 점검 통과');
}
