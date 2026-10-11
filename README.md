# 🍯 기억왕 (Memory King)

**▶ Live site / 바로 열기:** https://persian32.github.io/memory-king (the app is in Korean)

**English summary**

Memory King is a voice note app for older adults who find it tiring to type on a phone. You press one button and speak; the note is saved in large text.

- **How it works:** The browser turns speech into text (Web Speech API, Korean). Simple rules sort each note into a category (passwords, hospital, shopping, family, personal), and spoken dates such as "next Monday" are turned into real dates. When the user moves a note to a different category, the app asks whether to learn that word for next time.
- **Privacy:** There is no server and no AI service. Notes are stored only in the phone's browser and never leave the device. A backup file can be exported by hand.
- **Design choices:** Large type and one main button. Nothing disappears unless the user deletes it; finished items are only dimmed. The app is added to the phone's home screen so it opens like a regular app.
- **My role:** I noticed the problem and decided what the app should do. The code was written with AI coding tools (Claude Code).
- **Status:** I built it for my mother. She used it often at first, but now she rarely opens it unless I remind her: she says even turning on her phone and tapping the app feels like too much. A forgetful senior colleague still uses it.
- **What it did not solve:** It removed the typing, but not the effort of reaching the tool. Lowering that effort, while leaving the user in control, is the question I want to study next.

---

**한국어 설명**

말 한마디로 기록을 남기는 모바일 웹앱. 어르신용으로 만들었다.

## 무엇을 하나

말하기 버튼을 누르고 말하면 → 브라우저가 받아쓰고 → 카테고리로 분류하고 → 큰 글씨로 저장한다.
날짜·시간을 말하면 실제 날짜로 계산해서 함께 저장한다("다음 주 월요일" → 8월 10일).

- 서버 없음. 열쇠 없음. 비용 없음.
- 기록은 그 폰의 브라우저 안에만 저장된다 (localStorage). 밖으로 안 나간다.
- 사용자가 지우기 전엔 안 사라진다. '다 했어요'는 흐려질 뿐 남는다.

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 화면과 스타일 |
| `app.js` | 마이크, 저장, 화면 그리기, 백업 |
| `classify.js` | **정리기** — 분류·날짜·시간. 나중에 갈아끼울 자리 |
| `Paperlogy-*.woff2` | 글꼴 (본문용·굵은글씨용 두 종, 합쳐 320KB) |
| `icon.png` `manifest.json` | 홈 화면 아이콘과 앱 이름 |

## 점검

```bash
node classify.js   # 분류·날짜·시간 규칙 자동 점검
```

## 쓰기 전에

- **크롬이나 사파리**로 열 것. 삼성 인터넷은 음성인식이 안 될 수 있다.
- **홈 화면에 추가**할 것. 아이폰 사파리는 홈 화면에 없는 사이트의 저장 데이터를 일주일 안 쓰면 지울 수 있다.
- 가끔 `⚙ 정리 → 백업 파일 내보내기`로 파일을 뽑아 폰 밖에 두면 폰을 바꿔도 옮길 수 있다.

## 그림

왕관은 남의 아이콘을 쓰지 않고 **코드로 직접 그렸다.** 제목 옆 왕관은 `index.html` 안의 인라인 SVG,
홈 화면 아이콘 `icon.png`는 같은 좌표로 그린 것이다. 그래서 라이선스 문제도, 받아올 파일도 없다.

## 글꼴

**Paperlogy** — © 2024 PT&, redesigned by Lee Juim. SIL Open Font License 1.1 (`OFL.txt`).

굵기가 따로 있는 글꼴이라 브라우저가 "굵게"를 흉내 낼 일이 없다. 굵기 하나뿐인 글꼴을
쓰면 획을 억지로 두껍게 그려서 뭉개진다.

woff2로 압축해 **두 종 합쳐 320KB**. 앞서 쓰던 5.4MB 글꼴보다 17배 가벼워 첫 화면이 바로 뜬다.
`font-display: swap`을 써서 글꼴을 받는 동안에도 화면은 즉시 뜨고, 다 받아지면 글씨만 바뀐다.
