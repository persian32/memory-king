// 화면·저장·마이크 담당. 정리기(classify)가 무엇으로 바뀌든 이 파일은 안 바뀐다.

const KEY = 'kkambak_notes';
const CAT_KEY = 'kkambak_cats';
const $ = (id) => document.getElementById(id);

let notes = JSON.parse(localStorage.getItem(KEY) || '[]');
// 기본값은 복사해서 쓴다. 이름을 바꿀 때 원본이 같이 바뀌면 안 되므로
let cats = JSON.parse(localStorage.getItem(CAT_KEY) || 'null') || DEFAULT_CATEGORIES.map((c) => ({ ...c }));

let filter = '전체';
let query = '';           // 검색어
let openId = null;        // 펼쳐진 기록 하나
let learn = null;         // 카테고리를 방금 고친 기록의 id — 단어를 배울지 물어본다
let editingCats = false;  // 카테고리 정리 화면이 펼쳐졌는지

// 저장 공간이 가득 차면 브라우저가 예외를 던지는데, 그냥 두면 조용히 실패한다.
// 화면에는 기록이 보이는데 새로고침하면 사라지는 상황이 되므로 반드시 알려야 한다
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    alert('저장 공간이 가득 찼어요.\n\n⚙ 정리 → 💾 백업 파일 내보내기로\n파일을 뽑아 두신 다음,\n끝난 기록을 지워 주세요.');
    return false;
  }
}

const save = () => write(KEY, notes);
const saveCats = () => write(CAT_KEY, cats);

// 저장은 실제 날짜로, 표시는 볼 때마다 다시 계산한다. 그래야 시간이 지나도 안 헷갈린다
function dateLabel(ymd) {
  const d = new Date(ymd + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);

  if (diff === 0) return '오늘';
  if (diff === 1) return '내일';
  if (diff === 2) return '모레';
  const 날 = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return diff < 0 ? `지남 · ${날}` : `${날} (${DAY_NAMES[d.getDay()]})`;
}

// ── 화면 그리기 ──────────────────────────────────────────
function render() {
  const chips = ['전체', ...cats.map((c) => c.name)].map((name) => {
    const b = document.createElement('button');
    b.textContent = name;
    b.className = name === filter ? 'on' : '';
    b.onclick = () => { filter = name; openId = null; learn = null; render(); };
    return b;
  });

  const gear = document.createElement('button');
  gear.textContent = '⚙ 정리';
  gear.className = 'gear' + (editingCats ? ' on' : '');
  gear.onclick = () => { editingCats = !editingCats; render(); };
  chips.push(gear);

  $('filters').replaceChildren(...chips);
  renderCatPanel();

  const q = query.toLowerCase();
  const shown = notes
    .filter((n) => (filter === '전체' || n.category === filter) &&
                   (!q || n.content.toLowerCase().includes(q)))
    .reverse()                                    // 새 것이 위로
    .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));   // 끝난 것은 아래로

  $('empty').hidden = shown.length > 0;
  $('empty').innerHTML = notes.length === 0
    ? '아직 기록이 없어요.<br>위 버튼을 누르고 말해 보세요.'
    : (query ? `'${query}'가 든 기록이 없어요.` : `'${filter}'에 담긴 기록이 없어요.`);
  $('list').replaceChildren(...shown.map(noteRow));
}

function noteRow(note) {
  const li = document.createElement('li');
  if (note.done) li.className = 'done';

  const btn = document.createElement('button');
  btn.className = 'note';
  btn.innerHTML = '<span class="head"><span class="cat"></span><span class="badge"></span></span><span class="text"></span>';
  btn.querySelector('.cat').textContent = note.category;
  btn.querySelector('.badge').textContent =
    [note.date && dateLabel(note.date), note.time].filter(Boolean).join(' · ');
  btn.querySelector('.text').textContent = note.content;
  btn.onclick = () => {
    openId = openId === note.id ? null : note.id;
    learn = null;
    render();
  };

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.hidden = openId !== note.id;
  panel.innerHTML = '<p>카테고리 바꾸기</p><div class="cats"></div>' +
                    '<div class="learn"></div>' +
                    '<button class="done-btn"></button><button class="del">🗑 지우기</button>';

  panel.querySelector('.cats').replaceChildren(...cats.map((c) => {
    const b = document.createElement('button');
    b.textContent = c.name;
    b.className = c.name === note.category ? 'on' : '';
    b.onclick = () => {
      if (c.name === note.category) return;
      note.category = c.name;
      learn = note.id;      // 바꾼 직후에만 단어를 배울지 물어본다
      save();
      render();
    };
    return b;
  }));

  if (learn === note.id) renderLearn(panel.querySelector('.learn'), note);

  const doneBtn = panel.querySelector('.done-btn');
  doneBtn.textContent = note.done ? '↩ 아직이에요' : '✓ 다 했어요';
  doneBtn.onclick = () => { note.done = !note.done; save(); render(); };

  // 실수로 지우는 걸 막는다 — 기록은 본인이 지우기 전엔 안 사라져야 하므로
  panel.querySelector('.del').onclick = () => {
    if (!confirm(`"${note.content}"\n\n정말 지울까요?`)) return;
    notes = notes.filter((n) => n.id !== note.id);
    openId = null;
    save();
    render();
  };

  li.append(btn, panel);
  return li;
}

// ── 고친 걸 기억하기 ─────────────────────────────────────
// 사용자가 이미 하고 있는 행동(카테고리 손으로 바꾸기)에 얹는다. 따로 설정하러 갈 일이 없다
function renderLearn(box, note) {
  const words = wordCandidates(note.content, cats);
  if (!words.length) return;

  const p = document.createElement('p');
  p.innerHTML = `앞으로 어떤 말이 나오면 <b>'${note.category}'</b>로 보낼까요?<br><small>안 골라도 됩니다</small>`;

  const row = document.createElement('div');
  row.className = 'cats';
  row.append(...words.map((w) => {
    const b = document.createElement('button');
    b.textContent = w;
    b.onclick = () => learnWord(note.category, w);
    return b;
  }));

  box.replaceChildren(p, row);
}

function learnWord(catName, word) {
  const c = cats.find((x) => x.name === catName);
  c.words = c.words ? `${c.words}|${esc(word)}` : esc(word);
  learn = null;
  saveCats(); render();
}

// ── 카테고리 정리 ────────────────────────────────────────
function renderCatPanel() {
  const box = $('catPanel');
  box.hidden = !editingCats;
  if (!editingCats) return;

  const iconBtn = (label, title, onclick, disabled) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.disabled = !!disabled;
    b.onclick = onclick;
    return b;
  };

  const rows = cats.map((c, i) => {
    const row = document.createElement('div');
    row.className = 'catrow';

    const name = document.createElement('span');
    name.textContent = c.name;
    row.append(name);

    if (c.name === FALLBACK) {
      const fixed = document.createElement('span');
      fixed.className = 'fixed';
      fixed.textContent = '항상 맨 아래';   // 갈 곳 없는 기록을 받아주는 자리라 남겨둔다
      row.append(fixed);
      return row;
    }

    row.append(
      iconBtn('↑', '위로', () => moveCat(c, -1), i === 0),
      iconBtn('↓', '아래로', () => moveCat(c, 1), cats[i + 1].name === FALLBACK),
      iconBtn('✏', '이름 바꾸기', () => renameCat(c)),
      iconBtn('🗑', '지우기', () => deleteCat(c)),
    );
    row.lastChild.className = 'danger';
    return row;
  });

  const add = document.createElement('button');
  add.className = 'add';
  add.textContent = '＋ 카테고리 만들기';
  add.onclick = addCat;
  box.replaceChildren(...rows, add);

  // 백업 — 이 앱은 폰 안에만 저장한다. 폰을 바꾸면 사라지므로 내보낼 길이 있어야 한다
  const backup = document.createElement('button');
  backup.className = 'add';
  backup.textContent = '💾 백업 파일 내보내기';
  backup.onclick = exportBackup;

  const restore = document.createElement('button');
  restore.className = 'add';
  restore.textContent = '📂 백업 파일 불러오기';
  restore.onclick = importBackup;
  box.append(backup, restore);

  const doneCount = notes.filter((n) => n.done).length;
  if (doneCount) {
    const clear = document.createElement('button');
    clear.className = 'add danger';
    clear.textContent = `🗑 끝난 것 ${doneCount}개 지우기`;
    clear.onclick = () => {
      if (!confirm(`'다 했어요'로 표시한 기록 ${doneCount}개를 지울까요?\n\n되돌릴 수 없습니다.`)) return;
      notes = notes.filter((n) => !n.done);
      save(); render();
    };
    box.append(clear);
  }
}

// ── 백업 ─────────────────────────────────────────────────
function exportBackup() {
  const today = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify({ notes, cats }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `기억왕-백업-${today}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
      let data;
      // 남이 준 파일일 수도 있으니 모양을 확인하고 받는다
      try { data = JSON.parse(reader.result); } catch { return alert('백업 파일이 아닌 것 같아요.'); }
      if (!Array.isArray(data?.notes) || !Array.isArray(data?.cats)) return alert('백업 파일이 아닌 것 같아요.');
      if (!data.cats.some((c) => c.name === FALLBACK)) return alert(`'${FALLBACK}' 칸이 없는 파일이라 불러올 수 없어요.`);

      if (!confirm(`기록 ${data.notes.length}개를 불러옵니다.\n\n지금 폰에 있는 기록 ${notes.length}개는 지워지고 파일 내용으로 바뀝니다.`)) return;

      notes = data.notes;
      cats = data.cats;
      filter = '전체';
      openId = null;
      save(); saveCats(); render();
      alert('불러왔어요.');
    };
    reader.readAsText(file);
  };
  input.click();
}

// 위에 있는 카테고리가 먼저 이긴다. 순서가 곧 우선순위다
function moveCat(c, dir) {
  const i = cats.indexOf(c);
  const j = i + dir;
  if (j < 0 || cats[j].name === FALLBACK) return;
  [cats[i], cats[j]] = [cats[j], cats[i]];
  saveCats(); render();
}

const askName = (message, now = '') => (prompt(message, now) || '').trim();

function renameCat(c) {
  const name = askName('새 이름을 적어 주세요', c.name);
  if (!name || name === c.name) return;
  if (cats.some((x) => x.name === name)) return alert('같은 이름이 이미 있어요.');

  notes.forEach((n) => { if (n.category === c.name) n.category = name; });
  if (filter === c.name) filter = name;
  c.name = name;   // 키워드(words)는 그대로 따라오므로 자동 분류가 안 깨진다
  save(); saveCats(); render();
}

function deleteCat(c) {
  const count = notes.filter((n) => n.category === c.name).length;
  const msg = `'${c.name}' 카테고리를 지울까요?` +
              (count ? `\n\n안에 있던 기록 ${count}개는 '${FALLBACK}'로 옮겨집니다.` : '');
  if (!confirm(msg)) return;

  notes.forEach((n) => { if (n.category === c.name) n.category = FALLBACK; });
  cats = cats.filter((x) => x !== c);
  if (filter === c.name) filter = '전체';
  save(); saveCats(); render();
}

function addCat() {
  const name = askName('새 카테고리 이름을 적어 주세요');
  if (!name) return;
  if (cats.some((x) => x.name === name)) return alert('같은 이름이 이미 있어요.');

  cats.splice(cats.findIndex((x) => x.name === FALLBACK), 0, { name, words: '' });
  saveCats(); render();
}

// ── 검색 ─────────────────────────────────────────────────
// 분류가 틀려도 찾을 수 있게 하는 안전망
$('search').oninput = (e) => {
  query = e.target.value.trim();
  openId = null;
  learn = null;
  render();
};

// ── 마이크 ───────────────────────────────────────────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SR) {
  $('mic').disabled = true;
  $('status').textContent = '이 브라우저는 음성 입력이 안 돼요. 크롬이나 사파리로 열어 주세요.';
} else {
  const rec = new SR();
  rec.lang = 'ko-KR';
  rec.interimResults = false;
  let listening = false;

  $('mic').onclick = () => listening ? rec.stop() : rec.start();

  rec.onstart = () => {
    listening = true;
    $('mic').textContent = '⏹ 다 말했어요';
    $('mic').classList.add('listening');
    $('status').textContent = '듣고 있어요…';
  };

  rec.onresult = (e) => {
    const text = e.results[0][0].transcript.trim();
    if (!text) return;
    notes.push({ id: String(Date.now()), ...classify(text, cats), ts: Date.now() });
    // 저장에 실패했으면 화면에도 안 남긴다 — 저장된 척하는 게 제일 나쁘다
    if (!save()) { notes.pop(); return; }
    // 방금 저장한 게 안 보이면 안 되니까 화면을 원래대로 되돌린다
    filter = '전체';
    query = '';
    $('search').value = '';
    openId = null;
    learn = null;
    editingCats = false;
    render();
    $('status').textContent = '저장했어요';
  };

  // 원인별 안내. 괄호 안 영문은 문제 생겼을 때 원인을 찾기 위한 것
  const ERRORS = {
    'not-allowed': '마이크 사용을 허용해 주세요.',
    'service-not-allowed': '마이크 사용을 허용해 주세요.',
    'no-speech': '소리가 안 들렸어요. 다시 눌러 주세요.',
    'audio-capture': '마이크를 찾을 수 없어요.',
    'network': '인터넷 연결을 확인해 주세요.',
  };

  rec.onerror = (e) => {
    $('status').textContent = (ERRORS[e.error] || '잘 못 들었어요. 다시 눌러 주세요.') + ` (${e.error})`;
  };

  rec.onend = () => {
    listening = false;
    $('mic').textContent = '🎤 말하기';
    $('mic').classList.remove('listening');
  };
}

render();
