# Trekkey UI/UX 리디자인 계획 — 애플/토스 스타일

컬러는 현재 teal(#0f8b8d) 유지. 타이포·여백·라운드·그림자·모션을 정제해 "가볍고, 크고, 부드러운" 느낌으로 전환한다.

## 현재 상태 진단

코드 분석 결과 (src/styles/ 기준, 총 ~5,400줄 SCSS):

| 항목 | 현재 | 문제 | 목표 |
| --- | --- | --- | --- |
| 폰트 | Pretendard Variable | 문제 없음 (토스와 동일 계열) | 유지 |
| 굵기 | 800×50회, 900×40회 지배적 | 과도하게 무거움. 토스/애플은 500~700 | 400/500/600/700 4단계 |
| 크기 | 12~13px이 82회로 지배적 | 밀도 과다, 답답함 | 본문 15px 기준 상향 |
| 라운드 | 8px×75회, 999px×32회 | 각진 인상 | 카드 16~20px, 컨트롤 10~12px |
| 그림자 | border + 얇은 그림자 병행 | 선이 많아 복잡 | 선 줄이고 확산형 소프트 섀도 |
| 컬러 | teal/blue/purple/amber/green/red 6색 + 카드 hover 그라데이션 | 색이 너무 많아 산만 | teal 1 + 시맨틱 3(성공/경고/오류), 그라데이션 제거 |
| 모션 | ease-out(0.16,1,0.3,1), 8개 keyframes | 기반 양호 | press scale, spring 추가 |

강점: 디자인 토큰이 `base.module.scss` 한 곳에 이미 정리되어 있어 토큰만 바꿔도 전체가 바뀌는 구조. 리스크가 낮다.

## 디자인 원칙 (토스 + 애플 공통분모)

1. **타이포가 위계를 만든다** — 색/굵기 남발 대신 크기 대비(28→17→15→13)로 위계 표현
2. **여백이 구분선이다** — border 대신 여백과 배경색 차이로 영역 구분
3. **색은 행동에만** — 컬러는 CTA·상태에만, 나머지는 그레이스케일
4. **눌리는 느낌** — 모든 인터랙티브 요소에 press 피드백(scale 0.97 + opacity)
5. **화면당 목적 하나** — 한 화면에서 강조(primary 버튼)는 1개

## Phase 1 — 토큰 정비 (base.module.scss, 반나절)

가장 효과 대비 비용이 낮은 단계. 이것만으로 인상의 60%가 바뀐다.

```scss
:root {
  /* 그레이 — 토스 grey 스케일 방식, 파란기 살짝 */
  --grey-900: #191f28;  /* ink-950 대체 */
  --grey-700: #333d4b;
  --grey-600: #4e5968;
  --grey-500: #6b7684;
  --grey-400: #8b95a1;
  --grey-200: #e5e8eb;  /* line 대체 */
  --grey-100: #f2f4f6;  /* surface-soft 대체 */
  --grey-50:  #f9fafb;

  /* 포인트 — teal 유지, soft 톤 재조정 */
  --teal: #0f8b8d;
  --teal-strong: #0b6e70;
  --teal-soft: rgba(15, 139, 141, 0.08);   /* 불투명 → 투명 틴트로 */

  /* 라운드 스케일 */
  --radius-sm: 10px;   /* 인풋, 작은 버튼 */
  --radius-md: 14px;   /* 버튼, 셀 */
  --radius-lg: 18px;   /* 카드 */
  --radius-xl: 24px;   /* 모달, 시트 */

  /* 그림자 — 경계선 대신 공중부양 */
  --shadow: 0 1px 3px rgba(25, 31, 40, 0.04), 0 4px 12px rgba(25, 31, 40, 0.04);
  --shadow-hover: 0 4px 8px rgba(25, 31, 40, 0.06), 0 12px 28px rgba(25, 31, 40, 0.10);
  --shadow-float: 0 8px 16px rgba(25, 31, 40, 0.08), 0 24px 56px rgba(25, 31, 40, 0.16);

  /* 모션 */
  --spring: cubic-bezier(0.34, 1.3, 0.64, 1);  /* 살짝 튀는 스프링 */
}
body { font-size: 15px; line-height: 1.5; letter-spacing: -0.01em; }
```

일괄 치환 규칙: `font-weight: 900|850` → 700, `800` → 700(제목)/600(라벨), `700` → 600. 12px 이하 본문 → 13px 이상.

## Phase 2 — 코어 컴포넌트 (1일)

**버튼**: 높이 48px(primary)/40px(secondary), radius-md, teal 채움 + 흰 글씨 600. hover는 밝기 변화 대신 `filter: brightness(1.05)`, active는 `transform: scale(0.97)` + 120ms. secondary는 grey-100 배경 무테두리(토스식).

**인풋/셀렉트**: 테두리 제거 → grey-100 배경 채움형, radius-sm, focus 시 흰 배경 + teal 2px 링. placeholder grey-400.

**상태 배지**: 현재 6색 → 4톤으로 축소. 배경은 8% 투명 틴트, 글자 600, radius 999px 유지. `statusTone`(competitionData.js) 매핑 수정.

**카드(management-card 등)**: `border: 1px` 제거 → 흰 배경 + --shadow, radius-lg, hover 그라데이션 전부 제거 → `--shadow-hover` + `translateY(-2px)`만. 내부 패딩 20→24px.

**모달**: radius-xl, 스크림 `rgba(25,31,40,0.4)` + `backdrop-filter: blur(4px)`(애플식), 진입 spring.

## Phase 3 — 레이아웃/밀도 (1일)

섹션 간 간격 24→32px, 카드 그리드 gap 16→20px. 페이지 타이틀 28px/700 + 서브텍스트 15px/grey-500 조합으로 통일(토스 화면 헤더 패턴). 사이드바(shell-foundation): 배경 흰색, 그림자 축소, 활성 항목은 teal-soft 필 + radius-md. 테이블/리스트 행 높이 44px 이상(애플 터치 타깃), 짝수행 줄무늬 대신 hover 배경만.

## Phase 4 — 모션/인터랙션 (반나절)

전 버튼·카드에 press 피드백 공통 믹스인 적용. 페이지 진입은 기존 `pageEnter` 유지하되 이동거리 12→8px로 절제. 위저드 스텝 전환에 spring. `prefers-reduced-motion` 분기는 기존 motion-responsive.module.scss에 이미 있으므로 유지.

## Phase 5 — 화면별 패스 (2~3일)

우선순위 순: ① 대시보드(첫인상) → ② 대회 목록/카드 → ③ 대회 생성 위저드(wizard-steps를 토스식 상단 프로그레스 바로) → ④ 제출물/심사 테이블 → ⑤ 수상 확정 → ⑥ 공개 페이지·참가자 포털(외부 노출이므로 마지막에 꼼꼼히).

각 화면에서 확인할 것: primary 버튼 1개 원칙, 12px 텍스트 잔존 여부, border 잔존 여부, 색 사용이 상태 표현인지 장식인지.

## Phase 6 — 검증 (반나절)

- 전 화면 스크린샷 before/after 비교 (.playwright-cli 활용 가능)
- 대비 검사: grey-500 이상만 본문 사용, teal 버튼 흰 글씨 대비 4.5:1 확인
- focus-visible 링 전 컨트롤 동작 확인
- 모바일 뷰포트(375px)에서 터치 타깃 44px 확인

## 순서 요약

| 단계 | 작업 | 예상 | 효과 |
| --- | --- | --- | --- |
| 1 | 토큰 정비 | 0.5일 | ★★★★★ |
| 2 | 코어 컴포넌트 | 1일 | ★★★★ |
| 3 | 레이아웃/밀도 | 1일 | ★★★ |
| 4 | 모션 | 0.5일 | ★★★ |
| 5 | 화면별 패스 | 2~3일 | ★★★★ |
| 6 | 검증 | 0.5일 | — |

총 5.5~6.5일. Phase 1~2만 해도 체감 변화가 크므로, 1~2 적용 후 스크린샷으로 방향 확인 뒤 3 이후 진행 권장.

## 적용 현황 (2026-07-13 기준)

| Phase | 상태 | 비고 |
| --- | --- | --- |
| 1 토큰 정비 | ✅ 완료 | `base.module.scss`에 grey/teal/radius/shadow/spring 토큰 반영, body 15px |
| 2 코어 컴포넌트 | ✅ 완료 | 버튼/인풋/배지/카드/모달 리디자인 반영 |
| 3 레이아웃·밀도 | ✅ 완료 | 섹션 간격·그리드 gap·헤더 타이포·사이드바 정비 |
| 4 모션 | ✅ 완료 | press 피드백·spring 전환 적용 |
| 5 화면별 패스 | ✅ 완료 | 아래 상세 |
| 6 검증 | ✅ 완료(스크린샷 제외) | `npx vite build` 성공, 대비/포커스/토큰 확인 |

### Phase 5 화면별 변경 요약
- **대시보드(DashboardPage)**: 작업 큐의 blue/purple 장식 그라데이션을 teal 단일 강조로 통일(우선처리 배지·아이콘·액션 버튼 포함). 하드코딩 `#fff` → `var(--surface)`.
- **대회 목록(ContestsPage)**: detailPanel 그라데이션 제거→흰 배경, 탭 세그먼트 컨트롤 border 제거·`#eef2f4`→`--grey-100`, 상세 헤더 "편집"을 secondary로 강등(탭 CTA와의 primary 중복 해소).
- **대회 생성 위저드(forms.module.scss)**: `.wizard-steps`를 토스식으로 재구성 — 회색 박스 배경·테두리 제거, 하단 밑줄 인디케이터(inactive `--grey-200`, active `--teal`)로 진행 표시 명확화. round-card blue 그라데이션·segmented-control 등 하드코딩 hex 토큰화.
- **제출물/심사(SubmissionsPage·JudgingPage)**: 화면당 primary 1개 원칙 적용 — "해시 생성"·"심사위원 추가"를 secondary로 강등. round-tabs/judge-card/judge-avatar/진행 링의 blue·purple 장식을 teal로.
- **팀·수상(TeamsPage·AwardsPage)**: primary 1개 원칙 이미 충족(변경 없음/최소).
- **공개·참가자·로그인·심사(public-review, auth-participant, ParticipantPortal)**: 포스터/히어로 그라데이션의 blue·purple → teal 틴트, engagement/deadline/avatar 장식 색을 teal·neutral로, 하드코딩 hex(`#f8f9fb`, `#eef2f4`, `#fbfcff`, `#101828` 등) 토큰화, focus outline을 teal 계열로. login-side/participant-avatar 아이콘 purple→teal.
- **참가자 포털 5개 탭 마무리(ParticipantPortal, 2026-07-13)**: 탭 네비(사이드바)를 관리자 패턴으로 통일 — 활성 탭 `--teal-soft` 필 + `--radius-md` + `--teal-strong` 600, 비활성 `--grey-600`, 그라데이션·inset 바 제거. 잔존 하드코딩 hex 25곳 토큰화(`#fbfcff/#fbfcfd`→`--grey-50`, `#1a2433`→`--grey-900`, `#465264`→`--grey-600`, 칩 `#eef2f4/#f5f7fa`→`--grey-100`, carousel fallback `#edf5f4/#edf8f6` 그라데이션→`--teal-soft`; 흰 글씨 `#fff`·deadline urgent/today 상태색만 보존). 카드류(portalPanel/recordRow/submission·team·result·notificationCard/sidebarFooter) border 제거→`--surface`+`--shadow`+`--radius-lg`, recordRow hover `--shadow-hover`+translateY(-2px). 내부 스탯/노트 타일(infoGrid·submissionMeta·noticeBox·fileList·popover)은 borderless 그레이 필로 정리. 배지 10px→11px. sidebarLogout를 Phase 2 secondary(grey-100 무테두리)로. 클릭형(recordRow·contestCardLink·탭 버튼)에 press 피드백(active scale 0.98, 120ms). auth-participant의 참가자 패널/카드도 border 8px→`--radius-lg`+shadow, `#f7f8fa`→`--grey-50` 정리.

### Phase 6 검증 결과
- **빌드**: `npx vite build` 성공(1733 모듈, CSS ~122KB). 오류 없음.
- **대비**: 본문에 `--grey-400`(#8b95a1) 사용 없음 — 남은 grey-400은 input placeholder 1곳뿐(정상). 위저드 inactive 라벨은 `--grey-500`로 상향.
- **focus-visible**: `base.module.scss`에 전역 `:focus-visible { outline: 2px solid var(--teal) }` 유지 확인.
- **정적 서빙 확인**: 프로덕션 빌드 정적 서버 root/CSS 모두 HTTP 200, teal 토큰 존재, 빌드 CSS 내 잔여 blue 장식 없음.

### 잔여 이슈 / 의도적 보류
- **dev 서버·스크린샷 건너뜀**: 마운트 FS 권한 문제(`EPERM: unlink node_modules/.vite/...`)로 `vite dev` 기동 불가. 프로덕션 빌드+정적 서빙으로 대체 검증. 로컬(비마운트) 환경에서 재시도 권장.
- **의도적 컬러 유지**: `status-badge.info`(blue)·`심사중/배정완료`(purple) 등은 상태 표현이므로 컬러 유지. deadline urgent/today의 주황·빨강 램프도 상태 의미로 보존.
- **번들 크기 경고**: JS 913KB(>500KB) — 기존 이슈, 이번 리디자인 범위 밖(code-split 별도 과제).
