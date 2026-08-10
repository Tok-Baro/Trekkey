# Trekkey Competition Admin

교내 대회 생성, 참가 신청, 팀 관리, 제출물 접수, 심사, 수상 확정을 다루는 대회관리 프론트엔드입니다.

## 실행

```bash
npm install
cp .env.example .env
npm run dev
```

기본 개발 서버는 `http://localhost:5173/`에서 열립니다.

## 환경 변수

| 변수 | 설명 | 로컬 기본값 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Spring Boot API 서버의 base URL. 마지막 `/`는 생략합니다. | `http://localhost:8080` |

Vercel에서는 프로젝트의 **Settings → Environment Variables**에 `VITE_API_BASE_URL`을 추가하고 실제 HTTPS 백엔드 주소를 입력합니다. `VITE_`로 시작하는 값은 브라우저 번들에 포함되므로 비밀번호, API 비밀키 같은 민감정보는 넣으면 안 됩니다.

프론트와 백엔드가 서로 다른 도메인이라면 백엔드 CORS에 Vercel 도메인을 허용하고, 인증 쿠키는 크로스 사이트 전송이 가능하도록 설정해야 합니다.

## Vercel 배포

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://백엔드-도메인` (`/api` 제외)

`vercel.json`에는 React Router의 직접 접속과 새로고침을 위한 SPA rewrite가 포함되어 있습니다.

## 화면

- 대시보드: 운영 지표, 단계별 흐름, 처리 항목
- 대회: 대회 목록, 상태 필터, 대회 설정 폼
- 신청/팀: 참가 신청 카드, 승인 상태, 팀 관리 정책
- 제출물: 제출물 접수함, 파일 조건, 해시 생성 준비 상태
- 심사: 심사위원 배정, 점수 기준, 진행률
- 수상 확정: 공동순위, 상격 편집, 보류, 발급 준비 체크리스트

## 상태 체계

상태 라벨은 도메인별로 아래 4개 축으로 구분됩니다. 같은 단어라도 축이 다르면 의미가 다르므로 새 상태를 추가할 때 이 표를 기준으로 합니다.

| 축 | 상태 흐름 | 설명 |
| --- | --- | --- |
| 대회 | 준비중 → 접수중 → 심사중 → 수상확정 | 대회 전체 생애주기 |
| 신청(팀) | 검토중 → 승인 / 보완요청 | 참가 신청 심사 결과. 보완요청은 참가자 수정 후 재검토 |
| 제출물(심사 배정) | 미배정 / 대기 → 배정완료 → 심사완료 | 제출물 단위 심사 배정·진행 상태 |
| 수상 | 수상후보 → 확정대기 / 보류 → 확정 | 결과 산출 후 수상 확정 절차 |

접수완료는 제출물 접수 자체의 완료 표시이며 심사 배정 축과는 별개입니다. 상태별 색·아이콘 매핑은 `src/components/common/CommonUi.jsx`(statusIcon)와 `src/data/competitionData.js`(statusTone)에서 관리합니다.

## 수상 운영 규칙

- 소수 둘째 자리까지 확정된 점수가 같으면 경기식 공동순위(`1, 2, 2, 4`)를 적용합니다.
- 예정 수상 인원의 경계에 동점자가 있으면 공동 순위자를 모두 포함합니다.
- 기본 상격 외에 특별상, 총장상, 사용자 정의 상격을 후보별로 지정할 수 있습니다.
- 확정 전 후보는 확정대기 또는 보류로 관리하며, 보류 후보가 있으면 전체 확정을 차단합니다.
- 확정된 수상은 참가자 화면에서 팀 공개 ID로 연결하고 발급된 Credential 검증 화면으로 이동합니다.

## 검증

```bash
npm test
npm run build
```
