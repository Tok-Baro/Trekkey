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
| `VITE_AUTH_API_BASE_URL` | 선택값. 로그인·refresh·logout을 보낼 동일 출처 인증 프록시 URL | 개발 환경에서는 `VITE_API_BASE_URL`, 프로덕션에서는 현재 프론트 origin |

Vercel에서는 프로젝트의 **Settings → Environment Variables**에 `VITE_API_BASE_URL`을 추가하고 실제 HTTPS 백엔드 주소를 입력합니다. `VITE_`로 시작하는 값은 브라우저 번들에 포함되므로 비밀번호, API 비밀키 같은 민감정보는 넣으면 안 됩니다.

일반 API는 EC2로 직접 요청하지만 인증 3개 경로는 `vercel.json`의
동일 출처 rewrite를 사용합니다. refresh cookie를 Vercel origin의
first-party HttpOnly 쿠키로 유지하므로 새로고침 후에도 세션을 복구할 수
있고, 대용량 제출 파일은 Vercel 프록시를 통과하지 않습니다.

## Vercel 배포

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://백엔드-도메인` (`/api` 제외)

`vercel.json`에는 인증 API 외부 origin rewrite가 SPA rewrite보다 먼저
정의되어 있습니다. 순서를 바꾸면 `/api/auth/**`가 `index.html`로
처리되므로 유지해야 합니다.

## 화면

- 10분 공학경진대회 발표: `/pitch`에서 평가 배점에 맞춘 10장 PT, 10분 타이머, 발표자 노트, 140초 실사용 데모 실행
- 5분 심사 시연: `/demo`에서 문제 정의→실제 발급 E2E→운영 검증→Proof 재계산→프라이버시→정량 결과를 단계별 발표
- 기술 검증 실험실: `/tamper-lab`에서 정상·변조·취소·정정 상태 비교, 실제 SHA-256·Merkle Proof 재계산, 브라우저 벤치마크
- 운영 Proof 모드: `/tamper-lab?mode=live&credential={publicId}`에서 공개 Credential의 leaf와 Merkle Root를 브라우저가 독립 재계산
- 정량 검증 리포트: `/evidence-report`에서 1·10·100·500·1,000개 배치 실측과 CSV 원시 결과 다운로드
- 외부 검증 리포트: `/verify/{publicId}`에서 인쇄·PDF 저장, 외부 사용 판단, Tamper Lab 재계산 연결
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

Tamper Lab의 시나리오 모드는 결정적 fixture만 사용하며 실제 개인정보를 포함하지 않습니다.
Credential 원문을 브라우저에서 정규화하고 SHA-256, Trekkey V1 leaf,
OpenZeppelin 호환 Merkle Proof를 다시 계산합니다. 발급 취소·정정 상태는
암호학적 무결성과 구분된 수명주기 fixture로 재생합니다.

Merkle Proof는 배치 포함과 무결성을 확인하는 기술이며 영지식증명은
아닙니다. 현실 활동의 사실 여부는 발급을 승인한 기관이 책임지고,
Trekkey와 공개 원장은 승인 후 변조 여부와 현재 효력을 검증합니다.

운영 Proof 모드는 공개 검증 API가 제공하는 `issuerId`, `credentialIdHash`,
`schemaVersionHash`, `contentHash`, `fileManifestHash`, `leafHash`, Merkle proof를
사용합니다. 개인정보가 포함된 canonical 원문은 브라우저로 내려받지 않고,
공개 hash tuple로 leaf와 Root 포함 여부를 독립 재계산합니다.

관리자 검증 원장의 `5분 시연` 버튼은 `ANCHORED` Credential의 공개 ID만
시연 화면에 전달합니다. 취소·정정의 정식 운영 UX는 이번 심사 시연 범위에서
제외하고 향후 구현 항목으로 표시합니다.

10분 발표 웹은 `/pitch?credential={publicId}`로 열면 운영 Credential, 공개 검증,
Tamper Lab 링크에 같은 공개 ID를 전달합니다. 발표 대본과 리허설 체크리스트는
[`docs/engineering-competition-pitch-10min.md`](docs/engineering-competition-pitch-10min.md)에 있습니다.
