# Indie Arcade

설치 없이 브라우저에서 바로 즐기는 인디 게임 모음. 빌드 도구도, 서버도 없는 정적 사이트라 GitHub Pages 에 그대로 올라간다.

총 30종. 오리지널 **ECHO** 기획서: [GAME_DESIGN.md](GAME_DESIGN.md)

| 분류 | 게임 |
|------|------|
| 액션 (9) | ECHO(오리지널), 날개짓, 공룡 런, 탑 쌓기, 탄막 피하기, 길 건너기, 동굴 비행, 점프 점프, 과일 받기 |
| 클래식 (5) | 테트리스, 스네이크, 벽돌깨기, 우주 침공, 퐁 |
| 퍼즐 (5) | 2048, 지뢰찾기, 짝 맞추기, 15 퍼즐, 불 끄기 |
| 반사신경 (4) | 과녁 맞히기, 두더지 잡기, 반응속도, 1 to 25 |
| 두뇌 (5) | 색깔 말하기, 사이먼, 타자 연습, 암산 러시, 숫자 야구 |
| 보드 (2) | 틱택토, 사목 (AI 상대 연승) |

## 유저 데이터 저장 (무료)
- 모든 기록(최고 점수, 플레이 수, 닉네임, 레벨)은 먼저 브라우저 `localStorage` 에 저장된다.
- 프로필 → **클라우드 저장** 에 `gist` 권한만 있는 GitHub 토큰을 넣으면, 유저 **본인 계정의 비공개 Gist** (`indie-arcade-save`) 에 동기화된다. 기기가 여러 대여도 기록이 합쳐진다.
- 토큰은 그 유저의 브라우저에만 저장되고, CSP 로 `api.github.com` 외의 곳으로는 요청을 보낼 수 없게 막아 두었다.

## 로컬 실행
```bash
python3 -m http.server 8931
```
그다음 http://localhost:8931 을 연다.

## 테스트
```bash
node test/selfcheck.mjs
```

## 게임 추가
`games/` 에 `{ id, title, category, tagline, blurb, better: 'high'|'low', unit, glyph, accent, howto, mount(el, api) }` 형태의 모듈을 만들고 `games/index.js` 에 추가한다. 게임이 끝나면 `api.end(score)` 를 호출한다 (패배처럼 기록이 없으면 `null`).
캔버스 게임은 `games/util.js` 의 `canvasGame()` 이 입력·루프·시작/종료 화면을 대신 처리하므로 `reset / step / draw` 만 쓰면 된다.
