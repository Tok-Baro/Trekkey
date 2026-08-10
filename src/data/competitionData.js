const HS_PORTAL_BASE_URL = "https://hsportal.hansung.ac.kr";

function hsPortalImage(path) {
  return `${HS_PORTAL_BASE_URL}${path}`;
}

function hsPortalView(id) {
  return `${HS_PORTAL_BASE_URL}/ko/program/all/view/${id}`;
}

function programDetail({ overview, goals, schedule, submit, criteria, note }) {
  return `
    <h2>프로그램 개요</h2>
    <p>${overview}</p>
    <h3>운영 목적</h3>
    <ul>${goals.map((item) => `<li>${item}</li>`).join("")}</ul>
    <h3>운영 일정</h3>
    <ul>${schedule.map((item) => `<li>${item}</li>`).join("")}</ul>
    <h3>제출 안내</h3>
    <ul>${submit.map((item) => `<li>${item}</li>`).join("")}</ul>
    <h3>심사 기준</h3>
    <ul>${criteria.map((item) => `<li>${item}</li>`).join("")}</ul>
    <p>${note}</p>
  `;
}

function fileMeta(id, name, size, extension) {
  return {
    id,
    name,
    size,
    type: "application/octet-stream",
    extension,
    uploadStatus: "metadata-ready",
    storageKey: `mock/${id}`,
    checksum: null,
    downloadUrl: null
  };
}

export const contests = [
  {
    id: "CT-HS-13949",
    sourceUrl: hsPortalView("13949"),
    title: "2026 전공 역량 비교과 아이디어 공모전",
    department: "전공교육지원센터",
    owner: "권지현",
    status: "접수중",
    type: "개인/팀",
    applicationPeriod: "06.22 - 07.12",
    submissionDue: "08.07",
    awards: 6,
    teams: 31,
    submissions: 12,
    judges: 5,
    progress: 46,
    evaluationRounds: [
      {
        id: "CT-HS-13949-round-1",
        order: 1,
        name: "1차 서류평가",
        status: "평가중",
        targetType: "all-submissions",
        passRule: "top-n",
        passCount: 12,
        minScore: "",
        criteria: [
          { id: "problem", label: "문제 정의", max: 30 },
          { id: "feasibility", label: "운영 가능성", max: 30 },
          { id: "impact", label: "참여 효과", max: 25 },
          { id: "document", label: "문서 완성도", max: 15 }
        ]
      },
      {
        id: "CT-HS-13949-round-2",
        order: 2,
        name: "최종 발표평가",
        status: "준비중",
        targetType: "previous-passed",
        passRule: "final",
        passCount: "",
        minScore: "",
        criteria: [
          { id: "presentation", label: "발표 전달력", max: 30 },
          { id: "qa", label: "질의응답", max: 20 },
          { id: "prototype", label: "운영 모델 완성도", max: 35 },
          { id: "scalability", label: "확장 가능성", max: 15 }
        ]
      }
    ],
    posterUrl: hsPortalImage("/attachment/view/85889/2026+%EB%B9%84%EA%B5%90%EA%B3%BC+%EC%95%84%EC%9D%B4%EB%94%94%EC%96%B4+%EA%B3%B5%EB%AA%A8%EC%A0%84.png?ts=0"),
    summary: "전공 수업과 비교과 활동을 연결하는 프로그램 아이디어를 제안하고 실제 운영 모델까지 설계하는 공모전입니다.",
    target: "한성대학교 재학생 및 휴학생, 개인 또는 4인 이하 팀",
    applicationMethod: "공개 공고에서 팀 정보를 등록한 뒤 아이디어 제안서 PDF와 발표 자료를 제출합니다.",
    benefits: "총장상, 비교과 포인트, 우수 제안 시 부서 검토 및 시범 운영 연계",
    tags: "전공역량,비교과,아이디어,공모전",
    detailHtml: programDetail({
      overview:
        "한성대 전공 교육과 비교과 활동을 더 자연스럽게 잇기 위한 학생 제안형 공모전입니다. 문제 정의, 운영 대상, 기대 효과까지 하나의 실행 가능한 프로그램으로 구성해 제출합니다.",
      goals: ["전공별 학습 경험을 비교과 활동으로 확장", "학생 관점의 신규 프로그램 발굴", "우수 제안을 실제 운영 부서 검토 안건으로 전환"],
      schedule: ["참가 신청: 6.22 - 7.12", "제안서 제출: 8.07", "서류 심사 및 발표 심사: 8월 중", "수상작 공개 및 운영 검토: 9월 예정"],
      submit: ["프로그램 제안서 PDF", "5분 발표 자료", "선택 제출: 운영 예산표 또는 홍보 시안"],
      criteria: ["문제 정의의 구체성 30점", "운영 가능성 30점", "학생 참여 효과 25점", "발표 완성도 15점"],
      note: "우수 제안은 차기 학기 비교과 프로그램 기획 회의에서 파일럿 운영 여부를 검토합니다."
    })
  },
  {
    id: "CT-HS-13936",
    sourceUrl: hsPortalView("13936"),
    title: "2026-여름 AI리터러시와 미래역량 3차",
    department: "교육혁신처 학생성공센터",
    owner: "송민아",
    status: "접수중",
    type: "개인전",
    applicationPeriod: "06.22 - 07.06",
    submissionDue: "07.09",
    awards: 5,
    teams: 64,
    submissions: 18,
    judges: 4,
    progress: 39,
    posterUrl: hsPortalImage("/attachment/view/85734/%EC%83%9D%EC%84%B1+AI%2C+%EC%9D%BC%EC%83%81+%ED%99%9C%EC%9A%A9%EC%97%90%EC%84%9C+%EC%95%B1+%EC%A0%9C%EC%9E%91%EA%B9%8C%EC%A7%80+%ED%8F%AC%EC%8A%A4%ED%84%B0.png?ts=0"),
    summary: "AI 도구를 학습, 리서치, 프로젝트에 적용하는 실습형 비교과 프로그램입니다.",
    target: "AI 활용 역량을 키우고 싶은 한성대학교 재학생",
    applicationMethod: "신청 후 온라인 사전 과제와 오프라인 실습 결과물을 제출합니다.",
    benefits: "비교과 포인트, 이수증, 우수 실습작 포트폴리오 등록",
    tags: "AI,리터러시,미래역량,실습",
    detailHtml: programDetail({
      overview:
        "생성형 AI를 단순히 사용하는 수준을 넘어 과제 설계, 자료 조사, 결과 검증까지 안전하게 활용하는 방법을 다루는 여름 집중 프로그램입니다.",
      goals: ["AI 도구 활용 윤리와 검증 습관 형성", "전공 과제와 프로젝트에 적용 가능한 프롬프트 설계", "실습 결과물을 비교과 이력으로 관리"],
      schedule: ["참가 신청: 6.22 - 7.06", "오리엔테이션: 7.07", "실습 운영: 7.07 - 7.09", "결과물 제출: 7.09"],
      submit: ["AI 활용 계획서", "실습 결과물 PDF", "활용 과정 리플렉션 1부"],
      criteria: ["문제 해결 적합성 35점", "AI 활용 과정의 투명성 25점", "결과물 완성도 25점", "성찰 보고서 15점"],
      note: "제출물에는 개인정보와 외부 유료 자료 원문을 포함하지 않도록 안내합니다."
    })
  },
  {
    id: "CT-HS-13920",
    sourceUrl: hsPortalView("13920"),
    title: "26학년도 1학기 AI 협업 마스터 (AID 아카데미)",
    department: "AID 아카데미",
    owner: "임도현",
    status: "접수중",
    type: "개인전",
    applicationPeriod: "06.22 - 07.19",
    submissionDue: "07.22",
    awards: 4,
    teams: 42,
    submissions: 9,
    judges: 4,
    progress: 34,
    posterUrl: hsPortalImage("/attachment/view/86152/2026-1+AID%EC%95%84%EC%B9%B4%EB%8D%B0%EB%AF%B8%28AI+%ED%98%91%EC%97%85%EB%A7%88%EC%8A%A4%ED%84%B0%29+%289%29.png?ts=0"),
    summary: "AI와 협업해 문서, 데이터, 발표 산출물을 만드는 실무형 아카데미입니다.",
    target: "전공 무관 재학생, AI 협업 실무를 경험하고 싶은 학생",
    applicationMethod: "참가 신청 후 실습 과제 파일과 산출물 링크를 함께 제출합니다.",
    benefits: "이수증, 비교과 포인트, 우수 산출물 공개 리뷰",
    tags: "AI협업,AID,엑셀,실무",
    detailHtml: programDetail({
      overview:
        "AI를 업무 보조 도구로 다루며 자료 정리, 표 계산, 발표 구성까지 이어지는 실무형 워크숍입니다. 결과물은 관리자 검토 후 우수 사례로 축적됩니다.",
      goals: ["AI 기반 자료 정리 역량 강화", "엑셀 및 문서 자동화 흐름 이해", "직무형 포트폴리오 산출물 확보"],
      schedule: ["신청: 6.22 - 7.19", "워크숍 운영: 7.22", "결과물 제출: 7.22 18:00", "우수 산출물 선정: 7월 말"],
      submit: ["실습 결과 파일", "작업 과정 설명서", "최종 발표 요약본"],
      criteria: ["업무 문제 정의 25점", "도구 활용 정확성 30점", "산출물 완성도 30점", "확장 가능성 15점"],
      note: "모든 산출물은 목업 데이터 기준으로 관리되며 추후 백엔드 파일 저장소와 연결할 수 있도록 메타데이터를 남깁니다."
    })
  },
  {
    id: "CT-HS-13940",
    sourceUrl: hsPortalView("13940"),
    title: "[대플] 26-여름학기 기업탐방 3차 (인천항보안공사)",
    department: "대학일자리플러스센터",
    owner: "한예준",
    status: "접수중",
    type: "개인전",
    applicationPeriod: "06.19 - 07.10",
    submissionDue: "07.15",
    awards: 3,
    teams: 27,
    submissions: 6,
    judges: 3,
    progress: 31,
    posterUrl: hsPortalImage("/attachment/view/85754/%EB%B9%84%EA%B5%90%EA%B3%BC%ED%83%91%EC%9E%AC%EC%9A%A9.jpg?ts=0"),
    summary: "공공기관 현장을 방문하고 직무 이해 보고서를 제출하는 진로 탐색형 비교과입니다.",
    target: "공공기관, 항만, 보안 직무에 관심 있는 재학생",
    applicationMethod: "신청 후 탐방 참여 확인서와 직무 분석 보고서를 제출합니다.",
    benefits: "비교과 포인트, 진로상담 연계, 우수 보고서 피드백",
    tags: "대플,기업탐방,공공기관,진로",
    detailHtml: programDetail({
      overview:
        "인천항보안공사 탐방을 통해 공공기관 직무를 이해하고, 현장 질문과 직무 분석을 하나의 보고서로 정리하는 프로그램입니다.",
      goals: ["공공기관 직무 구조 이해", "현직자 질의응답 기반 진로 탐색", "탐방 경험을 제출물과 비교과 이력으로 연결"],
      schedule: ["신청: 6.19 - 7.10", "기업탐방: 7.15", "보고서 제출: 7.15 23:59", "운영 결과 정리: 7월 말"],
      submit: ["직무 분석 보고서", "탐방 소감문", "선택 제출: 개인 진로 액션 플랜"],
      criteria: ["직무 이해도 35점", "현장 질문의 구체성 20점", "진로 계획 연계성 30점", "문서 완성도 15점"],
      note: "현장 참여 확정 인원은 모집 상황과 기관 협의에 따라 조정될 수 있습니다."
    })
  },
  {
    id: "CT-HS-13934",
    sourceUrl: hsPortalView("13934"),
    title: "[대플] 2026 여름학기_ 합격사례로 완성하는 진로설계 프로젝트",
    department: "대학일자리플러스센터",
    owner: "최가은",
    status: "접수중",
    type: "개인전",
    applicationPeriod: "06.24 - 07.06",
    submissionDue: "07.08",
    awards: 4,
    teams: 35,
    submissions: 15,
    judges: 4,
    progress: 42,
    posterUrl: hsPortalImage("/attachment/view/85980/%ED%95%A9%EA%B2%A9%EC%82%AC%EB%A1%80%EB%A1%9C+%EC%99%84%EC%84%B1%ED%95%98%EB%8A%94+%EC%A7%84%EB%A1%9C%EC%84%A4%EA%B3%84+%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8++%286%29.png?ts=0"),
    summary: "선배 합격 사례를 바탕으로 직무 목표와 준비 전략을 정리하는 진로설계 프로젝트입니다.",
    target: "진로 방향과 지원 전략을 구체화하고 싶은 재학생",
    applicationMethod: "프로젝트 참여 후 개인 진로설계서와 액션 플랜을 제출합니다.",
    benefits: "진로 컨설팅, 비교과 포인트, 우수 설계서 피드백",
    tags: "진로설계,합격사례,대플,컨설팅",
    detailHtml: programDetail({
      overview:
        "실제 합격 사례를 분석해 나의 직무 목표, 필요 역량, 준비 일정을 구조화하는 단기 진로설계 프로그램입니다.",
      goals: ["직무별 준비 과정 이해", "합격 사례 기반 자기 진단", "방학 중 실행 가능한 액션 플랜 수립"],
      schedule: ["신청: 6.24 - 7.06", "특강 및 워크숍: 7.08", "진로설계서 제출: 7.08", "개별 피드백: 7월 중"],
      submit: ["개인 진로설계서", "직무 역량 체크리스트", "방학 실행 계획표"],
      criteria: ["목표 직무의 명확성 25점", "사례 분석의 충실도 25점", "실행 계획의 현실성 35점", "문서 구성 15점"],
      note: "제출 자료는 개인 상담과 비교과 이력 확인에만 활용되는 목업 흐름으로 구성했습니다."
    })
  },
  {
    id: "CT-HS-13953",
    sourceUrl: hsPortalView("13953"),
    title: "2026학년도 하계방학 심리상담 MD 연계 소모임",
    department: "학생상담센터",
    owner: "문서영",
    status: "접수중",
    type: "개인전",
    applicationPeriod: "06.29 - 07.10",
    submissionDue: "08.25",
    awards: 3,
    teams: 18,
    submissions: 0,
    judges: 2,
    progress: 24,
    posterUrl: hsPortalImage("/attachment/view/86093/2026_%EC%97%AC%EB%A6%84+%EB%B9%84%EA%B5%90%EA%B3%BC_%ED%8F%AC%EC%8A%A4%ED%84%B0%EC%B5%9C%EC%A2%85+%282%29.jpg?ts=0"),
    summary: "방학 기간 동안 심리상담과 또래 소모임을 연계해 자기 이해 활동을 기록하는 프로그램입니다.",
    target: "자기 이해와 관계 회복을 주제로 소모임에 참여하고 싶은 재학생",
    applicationMethod: "신청 후 소모임 참여 기록과 개인 성찰지를 제출합니다.",
    benefits: "비교과 포인트, 상담센터 프로그램 연계, 자기 이해 리포트",
    tags: "심리상담,소모임,자기이해,방학",
    detailHtml: programDetail({
      overview:
        "학생상담센터의 MD 연계 활동과 소모임을 통해 방학 중 정서 관리와 자기 이해를 돕는 프로그램입니다.",
      goals: ["건강한 자기 이해와 관계 회복 지원", "소모임 기반 지속 참여 유도", "상담 경험을 비교과 이력으로 정리"],
      schedule: ["신청: 6.29 - 7.10", "소모임 운영: 7.14 - 8.25", "성찰지 제출: 8.25", "운영 결과 확인: 8월 말"],
      submit: ["참여 기록지", "개인 성찰지", "만족도 설문"],
      criteria: ["참여 성실도 40점", "성찰의 깊이 35점", "소모임 기여도 15점", "제출 기한 준수 10점"],
      note: "상담 내용의 민감 정보는 제출물에 포함하지 않도록 안내합니다."
    })
  },
  {
    id: "CT-HS-13870",
    sourceUrl: hsPortalView("13870"),
    title: "[인재인증] 2026학년도 HS 한성인의 도전이야기",
    department: "교육혁신처 학생성공센터",
    owner: "박수빈",
    status: "심사중",
    type: "개인전",
    applicationPeriod: "06.01 - 06.30",
    submissionDue: "06.30",
    awards: 9,
    teams: 52,
    submissions: 45,
    judges: 6,
    progress: 74,
    evaluationRounds: [
      {
        id: "CT-HS-13870-round-1",
        order: 1,
        name: "1차 에세이 심사",
        status: "평가중",
        targetType: "all-submissions",
        passRule: "top-n",
        passCount: 20,
        minScore: "",
        criteria: [
          { id: "authenticity", label: "진정성", max: 35 },
          { id: "growth", label: "성장 서사", max: 30 },
          { id: "sharing", label: "공유 가치", max: 20 },
          { id: "expression", label: "표현 완성도", max: 15 }
        ]
      },
      {
        id: "CT-HS-13870-round-2",
        order: 2,
        name: "2차 영상 심사",
        status: "준비중",
        targetType: "previous-passed",
        passRule: "manual",
        passCount: 8,
        minScore: "",
        criteria: [
          { id: "storytelling", label: "스토리텔링", max: 30 },
          { id: "message", label: "메시지 전달", max: 30 },
          { id: "production", label: "영상 완성도", max: 25 },
          { id: "fit", label: "인재상 부합", max: 15 }
        ]
      }
    ],
    posterUrl: hsPortalImage("/attachment/view/85147/2026+%EB%8F%84%EC%A0%84%EC%9D%B4%EC%95%BC%EA%B8%B0.jpg?ts=0"),
    summary: "도전과 성취 경험을 에세이와 영상으로 정리해 공유하는 인재인증형 비교과 프로그램입니다.",
    target: "한성대학교 재학생, 휴학생, 수료생",
    applicationMethod: "에세이 양식 작성 후 제출하고, 예선 통과자는 숏폼 영상 산출물을 추가 제출합니다.",
    benefits: "HS 인재상, 장학성 시상금, 비교과 포인트, 학생성공 라운드 테이블 참여",
    tags: "인재인증,도전,성공경험,학생성공",
    detailHtml: programDetail({
      overview:
        "교내외 대학생활 전반에서 얻은 도전 경험과 실패를 통한 배움, 성취 경험을 학생의 언어로 공유하는 프로그램입니다.",
      goals: ["한성대 학생의 도전 경험 발굴", "성취와 실패 경험의 캠퍼스 공유", "수상자와 재학생 간 멘토링 연결"],
      schedule: ["에세이 접수: 6.01 - 6.30", "1차 심사: 7월 중", "2차 영상 제출: 예선 통과자 개별 안내", "최종 발표 및 간담회: 하반기"],
      submit: ["에세이 원고", "신청서", "예선 통과 시 1-3분 숏폼 영상"],
      criteria: ["도전 경험의 진정성 35점", "배움과 성장의 구체성 30점", "공유 가치 20점", "표현 완성도 15점"],
      note: "세부 일정은 제출 현황과 학사 일정에 따라 조정될 수 있습니다."
    })
  },
  {
    id: "CT-HS-13721",
    sourceUrl: hsPortalView("13721"),
    title: "[인재인증] 2026학년도 1학기 HSP(High Success Project)",
    department: "교육혁신처 학생성공센터",
    owner: "정이안",
    status: "심사중",
    type: "개인전",
    applicationPeriod: "06.01 - 06.30",
    submissionDue: "06.30",
    awards: 10,
    teams: 86,
    submissions: 74,
    judges: 7,
    progress: 81,
    posterUrl: hsPortalImage("/attachment/view/85767/2026+HPS+%ED%8F%AC%EC%8A%A4%ED%84%B0%28%EC%88%98%EC%A0%95%29.png?ts=0"),
    summary: "학기 중 학습과 성장 목표를 세우고 실행 결과를 인증하는 학생성공 프로젝트입니다.",
    target: "목표 기반 학습과 성장 기록을 남기고 싶은 재학생",
    applicationMethod: "목표 계획서, 실행 기록, 최종 성찰 보고서를 단계별로 제출합니다.",
    benefits: "인재인증 포인트, 우수 프로젝트 인증, 학생성공 사례집 수록",
    tags: "HSP,학생성공,성장기록,인재인증",
    detailHtml: programDetail({
      overview:
        "학기 초 세운 목표를 실행하고 결과를 정리해 학생성공 경험으로 인증하는 프로젝트형 비교과입니다.",
      goals: ["목표 설정과 실행 습관 형성", "학습 경험의 구조화", "학생성공 인증 자료 축적"],
      schedule: ["신청 및 계획서 제출: 6.01 - 6.30", "실행 기록 확인: 7월", "최종 보고서 검토: 8월", "인증 결과 안내: 8월 말"],
      submit: ["목표 계획서", "실행 기록표", "최종 성찰 보고서"],
      criteria: ["목표 명확성 25점", "실행 지속성 35점", "성과 근거 25점", "성찰 완성도 15점"],
      note: "HSP 단계별 제출물은 졸업요건 비교과 이력과 연결할 수 있는 형태로 관리합니다."
    })
  },
  {
    id: "CT-HS-13924",
    sourceUrl: hsPortalView("13924"),
    title: "2026-1학기 모두 다 Dream",
    department: "장애학생지원센터",
    owner: "오지우",
    status: "접수중",
    type: "개인전",
    applicationPeriod: "06.15 - 07.03",
    submissionDue: "07.03",
    awards: 4,
    teams: 24,
    submissions: 5,
    judges: 3,
    progress: 33,
    posterUrl: hsPortalImage("/attachment/view/85392/cover.jpg?ts=1781070583"),
    summary: "모두가 함께 배우는 캠퍼스 환경을 주제로 참여 경험과 개선 아이디어를 제출하는 프로그램입니다.",
    target: "포용적 캠퍼스 문화에 관심 있는 재학생",
    applicationMethod: "활동 참여 후 캠퍼스 개선 아이디어와 참여 소감문을 제출합니다.",
    benefits: "비교과 포인트, 우수 아이디어 공유, 센터 프로그램 연계",
    tags: "포용,캠퍼스,장애학생지원,아이디어",
    detailHtml: programDetail({
      overview:
        "학내 구성원이 서로의 학습 환경을 이해하고 더 나은 캠퍼스를 만들기 위한 개선 아이디어를 모으는 참여형 프로그램입니다.",
      goals: ["포용적 캠퍼스 문화 확산", "학생 관점의 개선 아이디어 수집", "지원센터 프로그램 참여 활성화"],
      schedule: ["신청: 6.15 - 7.03", "활동 참여: 6.15 - 7.03", "제출물 접수: 7.03", "우수 아이디어 검토: 7월 중"],
      submit: ["참여 소감문", "캠퍼스 개선 아이디어 카드", "선택 제출: 홍보 이미지"],
      criteria: ["문제 발견력 30점", "아이디어 실현 가능성 35점", "공감과 배려 관점 20점", "제출 완성도 15점"],
      note: "제출된 아이디어는 익명화 후 학내 개선 제안 자료로 활용할 수 있습니다."
    })
  },
  {
    id: "CT-HS-13939",
    sourceUrl: hsPortalView("13939"),
    title: "[대플] 2026 하반기 국정원(NIS) 채용설명회",
    department: "대학일자리플러스센터",
    owner: "강태오",
    status: "접수중",
    type: "개인전",
    applicationPeriod: "06.18 - 06.30",
    submissionDue: "07.13",
    awards: 3,
    teams: 44,
    submissions: 0,
    judges: 2,
    progress: 28,
    posterUrl: hsPortalImage("/attachment/view/85755/%EC%8A%A4%EB%A7%88%ED%8A%B8%ED%83%91%EC%9E%AC%EC%9A%A9%28%EC%B5%9C%EC%A2%85%29.jpg?ts=0"),
    summary: "채용설명회 참여 후 직무 이해도와 준비 계획을 제출하는 취업역량 프로그램입니다.",
    target: "공공안보, 데이터, 정보분석 직무에 관심 있는 재학생",
    applicationMethod: "설명회 신청 후 참여 확인과 직무 준비 계획서를 제출합니다.",
    benefits: "비교과 포인트, 채용 정보 제공, 진로 상담 연계",
    tags: "대플,채용설명회,NIS,취업",
    detailHtml: programDetail({
      overview:
        "국정원 하반기 채용설명회를 통해 직무 정보를 확인하고, 개인 준비 전략을 정리하는 취업역량 강화 프로그램입니다.",
      goals: ["공공안보 분야 직무 이해", "채용 절차와 준비 전략 정리", "취업 상담과 후속 관리 연결"],
      schedule: ["신청: 6.18 - 6.30", "설명회 운영: 7.13", "참여 확인 제출: 7.13", "후속 상담 신청: 7월 중"],
      submit: ["참여 확인서", "직무 준비 계획서", "질문 리스트"],
      criteria: ["참여 성실도 30점", "직무 이해도 35점", "준비 계획 구체성 25점", "제출 기한 준수 10점"],
      note: "채용 관련 세부 내용은 기관 안내 기준을 따르며, 본 서비스에서는 비교과 이력 관리 목업으로 처리합니다."
    })
  },
  {
    id: "CT-HS-13841",
    sourceUrl: hsPortalView("13841"),
    title: "2026 재학생 미디어 중독 예방 교육",
    department: "학생상담센터",
    owner: "윤채린",
    status: "수상확정",
    type: "개인전",
    applicationPeriod: "05.20 - 06.30",
    submissionDue: "06.30",
    awards: 3,
    teams: 128,
    submissions: 112,
    judges: 2,
    progress: 100,
    posterUrl: hsPortalImage("/attachment/view/84571/2026+%EB%AF%B8%EB%94%94%EC%96%B4%EC%A4%91%EB%8F%85+%EC%98%88%EB%B0%A9%EA%B5%90%EC%9C%A1+%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg?ts=0"),
    summary: "디지털 사용 습관을 점검하고 예방 교육 이수 결과를 제출하는 비교과 프로그램입니다.",
    target: "한성대학교 재학생 전체",
    applicationMethod: "교육 이수 후 체크리스트와 짧은 실천 계획서를 제출합니다.",
    benefits: "비교과 포인트, 이수 확인, 우수 실천 계획 선정",
    tags: "상담,미디어,예방교육,자기관리",
    detailHtml: programDetail({
      overview:
        "미디어 사용 습관을 돌아보고 건강한 디지털 생활 계획을 세우는 온라인 기반 예방 교육입니다.",
      goals: ["미디어 과의존 위험 신호 이해", "개인 사용 습관 점검", "건강한 디지털 생활 실천 계획 수립"],
      schedule: ["신청 및 이수: 5.20 - 6.30", "결과 제출: 6.30", "이수 확인: 7월 초", "우수 실천 계획 발표: 7월 중"],
      submit: ["교육 이수 확인", "자가 점검 체크리스트", "디지털 생활 실천 계획서"],
      criteria: ["이수 여부 40점", "자가 점검 충실도 25점", "실천 계획 구체성 25점", "제출 기한 준수 10점"],
      note: "교육 이수 데이터는 민감 정보를 제외하고 비교과 참여 이력만 저장하는 흐름으로 가정했습니다."
    })
  },
  {
    id: "CT-HS-13869",
    sourceUrl: hsPortalView("13869"),
    title: "[대플] 26-1 현직자 특강 3차",
    department: "대학일자리플러스센터",
    owner: "서예림",
    status: "수상확정",
    type: "개인전",
    applicationPeriod: "05.10 - 05.22",
    submissionDue: "05.22",
    awards: 3,
    teams: 39,
    submissions: 34,
    judges: 3,
    progress: 100,
    posterUrl: hsPortalImage("/attachment/view/84712/%EA%B8%88%EC%9C%B5%EA%B6%8C+%EC%A7%81%EB%AC%B4%ED%8A%B9%EA%B0%95_flash.jpg?ts=0"),
    summary: "금융권 현직자 특강을 듣고 직무 이해 보고서를 제출하는 취업역량 프로그램입니다.",
    target: "금융, 카드, 증권 직무에 관심 있는 재학생 및 졸업생",
    applicationMethod: "특강 참여 후 직무 이해 보고서와 개인 준비 계획을 제출합니다.",
    benefits: "비교과 포인트, 직무 정보 제공, 후속 상담 연계",
    tags: "직무특강,취업역량,금융,현직자",
    detailHtml: programDetail({
      overview:
        "금융권 현직자 선배의 직무 경험을 바탕으로 직무 이해와 취업 준비 방향을 정리하는 특강형 비교과입니다.",
      goals: ["금융권 직무 이해", "현직자 조언 기반 취업 준비 방향 수립", "직무별 준비 자료 축적"],
      schedule: ["특강 신청: 5월 중", "특강 운영: 5.22", "보고서 제출: 5.22", "만족도 확인 및 결과 정리: 5월 말"],
      submit: ["직무 이해 보고서", "취업 준비 체크리스트", "만족도 설문"],
      criteria: ["직무 이해도 40점", "보고서 충실도 30점", "개인 준비 계획 20점", "제출 기한 준수 10점"],
      note: "금융권 세부 직무별 제출물은 백엔드 연결 이후 파일 단위로 분리해 관리할 수 있습니다."
    })
  }
];

export const demoAccounts = {
  admin: {
    role: "admin",
    name: "공모전 관리자",
    email: "admin@trekkey.ac.kr",
    employeeId: "ADM-001"
  },
  participant: {
    role: "participant",
    name: "김하린",
    email: "harin.kim@campus.ac.kr",
    studentId: "20261234",
    major: "컴퓨터공학과"
  }
};

export const teams = [
  {
    id: "TM-HS-1001",
    contestId: "CT-HS-13949",
    name: "CoreBridge",
    leader: "김하린",
    members: 3,
    major: "컴퓨터공학과",
    roster: [
      { id: "MEMBER-1001-1", name: "김하린", studentId: "20261234", major: "컴퓨터공학과", role: "리더" },
      { id: "MEMBER-1001-2", name: "이준호", studentId: "20261890", major: "컴퓨터공학과", role: "팀원" },
      { id: "MEMBER-1001-3", name: "박서연", studentId: "20262045", major: "디지털콘텐츠전공", role: "팀원" }
    ],
    status: "승인",
    submitted: false,
    applicantId: "20261234",
    applicantEmail: "harin.kim@campus.ac.kr",
    phone: "010-1234-2026",
    motivation: "전공 수업에서 만든 프로젝트를 비교과 프로그램으로 확장해 보고 싶습니다.",
    createdAt: "06.24 10:12"
  },
  {
    id: "TM-HS-1002",
    contestId: "CT-HS-13949",
    name: "MajorLoop",
    leader: "이도윤",
    members: 4,
    major: "문헌정보전공",
    roster: [
      { id: "MEMBER-1002-1", name: "이도윤", studentId: "20251123", major: "문헌정보전공", role: "리더" },
      { id: "MEMBER-1002-2", name: "정하늘", studentId: "20251456", major: "문헌정보전공", role: "팀원" },
      { id: "MEMBER-1002-3", name: "김도경", studentId: "20260987", major: "컴퓨터공학과", role: "팀원" },
      { id: "MEMBER-1002-4", name: "한지민", studentId: "20262233", major: "경영학부", role: "팀원" }
    ],
    status: "검토중",
    submitted: false
  },
  {
    id: "TM-HS-1003",
    contestId: "CT-HS-13936",
    name: "PromptLab",
    leader: "한서연",
    members: 1,
    major: "AI응용학과",
    status: "승인",
    submitted: true
  },
  {
    id: "TM-HS-1004",
    contestId: "CT-HS-13920",
    name: "SheetPilot",
    leader: "장우진",
    members: 1,
    major: "경영학부",
    status: "승인",
    submitted: true
  },
  {
    id: "TM-HS-1005",
    contestId: "CT-HS-13940",
    name: "HarborNote",
    leader: "박민서",
    members: 1,
    major: "사회과학부",
    status: "보완요청",
    submitted: false
  },
  {
    id: "TM-HS-1006",
    contestId: "CT-HS-13934",
    name: "CareerMap",
    leader: "최유나",
    members: 1,
    major: "경제학과",
    status: "승인",
    submitted: true
  },
  {
    id: "TM-HS-1007",
    contestId: "CT-HS-13870",
    name: "BeyondMe",
    leader: "정시우",
    members: 1,
    major: "상상력인재학부",
    status: "승인",
    submitted: true
  },
  {
    id: "TM-HS-1008",
    contestId: "CT-HS-13870",
    name: "RetryStory",
    leader: "오하늘",
    members: 1,
    major: "글로벌패션산업학부",
    status: "보완요청",
    submitted: true
  },
  {
    id: "TM-HS-1009",
    contestId: "CT-HS-13721",
    name: "SuccessNote",
    leader: "문채원",
    members: 1,
    major: "IT공과대학",
    status: "승인",
    submitted: true
  },
  {
    id: "TM-HS-1010",
    contestId: "CT-HS-13924",
    name: "OpenCampus",
    leader: "강예린",
    members: 2,
    major: "크리에이티브인문학부",
    roster: [
      { id: "MEMBER-1010-1", name: "강예린", studentId: "20253321", major: "크리에이티브인문학부", role: "리더" },
      { id: "MEMBER-1010-2", name: "서지우", studentId: "20261777", major: "크리에이티브인문학부", role: "팀원" }
    ],
    status: "검토중",
    submitted: false
  },
  {
    id: "TM-HS-1011",
    contestId: "CT-HS-13841",
    name: "DigitalReset",
    leader: "노지후",
    members: 1,
    major: "융합보안학과",
    status: "승인",
    submitted: true
  },
  {
    id: "TM-HS-1012",
    contestId: "CT-HS-13869",
    name: "FinanceRoute",
    leader: "서민재",
    members: 1,
    major: "무역학과",
    status: "승인",
    submitted: true
  }
];

export const submissions = [
  {
    id: "SB-HS-9101",
    contestId: "CT-HS-13949",
    team: "MajorLoop",
    title: "전공 프로젝트를 비교과 트랙으로 연결하는 운영안",
    files: 3,
    attachments: [
      fileMeta("FILE-HS-9101-1", "majorloop-program-proposal.pdf", 1840000, "pdf"),
      fileMeta("FILE-HS-9101-2", "majorloop-pitch-deck.pptx", 3920000, "pptx"),
      fileMeta("FILE-HS-9101-3", "majorloop-budget.xlsx", 642000, "xlsx")
    ],
    submittedAt: "07.05 18:22",
    hashReady: false,
    review: "대기"
  },
  {
    id: "SB-HS-9102",
    contestId: "CT-HS-13936",
    team: "PromptLab",
    title: "AI 학습 리서치 프롬프트 실습 결과",
    files: 2,
    attachments: [
      fileMeta("FILE-HS-9102-1", "promptlab-ai-literacy-result.pdf", 1280000, "pdf"),
      fileMeta("FILE-HS-9102-2", "promptlab-reflection.docx", 420000, "docx")
    ],
    submittedAt: "07.09 16:08",
    hashReady: false,
    review: "미배정"
  },
  {
    id: "SB-HS-9103",
    contestId: "CT-HS-13920",
    team: "SheetPilot",
    title: "AI 협업 기반 데이터 정리 자동화 산출물",
    files: 4,
    attachments: [
      fileMeta("FILE-HS-9103-1", "sheetpilot-workflow.pdf", 1640000, "pdf"),
      fileMeta("FILE-HS-9103-2", "sheetpilot-demo.xlsx", 1180000, "xlsx"),
      fileMeta("FILE-HS-9103-3", "sheetpilot-prompt-log.txt", 78000, "txt"),
      fileMeta("FILE-HS-9103-4", "sheetpilot-presentation.pptx", 2560000, "pptx")
    ],
    submittedAt: "07.22 17:42",
    hashReady: false,
    review: "접수완료"
  },
  {
    id: "SB-HS-9104",
    contestId: "CT-HS-13934",
    team: "CareerMap",
    title: "회계/재무 직무 합격사례 기반 진로설계서",
    files: 2,
    attachments: [
      fileMeta("FILE-HS-9104-1", "careermap-career-design.pdf", 980000, "pdf"),
      fileMeta("FILE-HS-9104-2", "careermap-action-plan.xlsx", 310000, "xlsx")
    ],
    submittedAt: "07.08 12:18",
    hashReady: true,
    review: "배정완료"
  },
  {
    id: "SB-HS-9105",
    contestId: "CT-HS-13870",
    team: "BeyondMe",
    title: "도전이야기 에세이: 첫 실패가 만든 프로젝트",
    files: 3,
    attachments: [
      fileMeta("FILE-HS-9105-1", "beyondme-essay.pdf", 720000, "pdf"),
      fileMeta("FILE-HS-9105-2", "beyondme-application.hwp", 246000, "hwp"),
      fileMeta("FILE-HS-9105-3", "beyondme-video-storyboard.pdf", 1340000, "pdf")
    ],
    submittedAt: "06.30 22:31",
    hashReady: true,
    review: "배정완료"
  },
  {
    id: "SB-HS-9106",
    contestId: "CT-HS-13870",
    team: "RetryStory",
    title: "도전이야기 에세이: 전공 전환과 회복",
    files: 2,
    attachments: [
      fileMeta("FILE-HS-9106-1", "retrystory-essay.pdf", 860000, "pdf"),
      fileMeta("FILE-HS-9106-2", "retrystory-consent.hwp", 180000, "hwp")
    ],
    submittedAt: "06.30 23:42",
    hashReady: true,
    review: "미배정"
  },
  {
    id: "SB-HS-9107",
    contestId: "CT-HS-13721",
    team: "SuccessNote",
    title: "HSP 목표 실행 기록 및 최종 성찰 보고서",
    files: 3,
    attachments: [
      fileMeta("FILE-HS-9107-1", "successnote-goal-plan.pdf", 540000, "pdf"),
      fileMeta("FILE-HS-9107-2", "successnote-log.xlsx", 380000, "xlsx"),
      fileMeta("FILE-HS-9107-3", "successnote-final-report.pdf", 1120000, "pdf")
    ],
    submittedAt: "06.30 19:27",
    hashReady: true,
    review: "배정완료"
  },
  {
    id: "SB-HS-9108",
    contestId: "CT-HS-13841",
    team: "DigitalReset",
    title: "미디어 사용 습관 점검 및 실천 계획",
    files: 2,
    attachments: [
      fileMeta("FILE-HS-9108-1", "digitalreset-checklist.pdf", 420000, "pdf"),
      fileMeta("FILE-HS-9108-2", "digitalreset-action-plan.docx", 210000, "docx")
    ],
    submittedAt: "06.30 15:03",
    hashReady: true,
    review: "수상후보"
  },
  {
    id: "SB-HS-9109",
    contestId: "CT-HS-13869",
    team: "FinanceRoute",
    title: "금융권 직무 이해 보고서",
    files: 2,
    attachments: [
      fileMeta("FILE-HS-9109-1", "financeroute-job-report.pdf", 930000, "pdf"),
      fileMeta("FILE-HS-9109-2", "financeroute-career-checklist.xlsx", 240000, "xlsx")
    ],
    submittedAt: "05.22 18:20",
    hashReady: true,
    review: "수상후보"
  }
];

export const judgingAssignments = [
  {
    id: "JG-HS-01",
    contestId: "CT-HS-13949",
    name: "유다현",
    role: "전공교육지원센터",
    assigned: 8,
    completed: 3,
    avgScore: 84.2
  },
  {
    id: "JG-HS-02",
    contestId: "CT-HS-13949",
    name: "권오준",
    role: "전임교원",
    assigned: 8,
    completed: 2,
    avgScore: 81.6
  },
  {
    id: "JG-HS-03",
    contestId: "CT-HS-13936",
    name: "임하늘",
    role: "AI 교육 멘토",
    assigned: 12,
    completed: 7,
    avgScore: 88.1
  },
  {
    id: "JG-HS-04",
    contestId: "CT-HS-13920",
    name: "정우석",
    role: "AID 아카데미",
    assigned: 9,
    completed: 4,
    avgScore: 86.8
  },
  {
    id: "JG-HS-05",
    contestId: "CT-HS-13934",
    name: "오세린",
    role: "대학일자리플러스센터",
    assigned: 10,
    completed: 10,
    avgScore: 87.4
  },
  {
    id: "JG-HS-06",
    contestId: "CT-HS-13870",
    name: "강예린",
    role: "학생성공센터",
    assigned: 15,
    completed: 10,
    avgScore: 90.5
  },
  {
    id: "JG-HS-07",
    contestId: "CT-HS-13870",
    name: "박도겸",
    role: "외부 심사위원",
    assigned: 15,
    completed: 8,
    avgScore: 86.9
  },
  {
    id: "JG-HS-08",
    contestId: "CT-HS-13721",
    name: "문지수",
    role: "교육혁신처",
    assigned: 20,
    completed: 18,
    avgScore: 88.7
  },
  {
    id: "JG-HS-09",
    contestId: "CT-HS-13841",
    name: "윤소민",
    role: "학생상담센터",
    assigned: 18,
    completed: 18,
    avgScore: 91.2
  },
  {
    id: "JG-HS-10",
    contestId: "CT-HS-13869",
    name: "이태준",
    role: "대학일자리플러스센터",
    assigned: 12,
    completed: 12,
    avgScore: 89.6
  }
];

export const reviewScores = [
  {
    contestId: "CT-HS-13934",
    judgeName: "오세린",
    submissionId: "SB-HS-9104",
    scores: { creativity: 25, completion: 28, impact: 23, delivery: 13 },
    submittedAt: "07.08 15:24"
  },
  {
    contestId: "CT-HS-13870",
    judgeName: "강예린",
    submissionId: "SB-HS-9105",
    scores: { creativity: 29, completion: 27, impact: 24, delivery: 14 },
    submittedAt: "07.01 10:18"
  },
  {
    contestId: "CT-HS-13870",
    judgeName: "강예린",
    submissionId: "SB-HS-9106",
    scores: { creativity: 26, completion: 25, impact: 22, delivery: 12 },
    submittedAt: "07.01 10:42"
  },
  {
    contestId: "CT-HS-13870",
    judgeName: "박도겸",
    submissionId: "SB-HS-9105",
    scores: { creativity: 28, completion: 26, impact: 24, delivery: 13 },
    submittedAt: "07.01 13:05"
  },
  {
    contestId: "CT-HS-13721",
    judgeName: "문지수",
    submissionId: "SB-HS-9107",
    scores: { creativity: 27, completion: 29, impact: 23, delivery: 13 },
    submittedAt: "07.02 09:36"
  },
  {
    contestId: "CT-HS-13841",
    judgeName: "윤소민",
    submissionId: "SB-HS-9108",
    scores: { creativity: 24, completion: 30, impact: 25, delivery: 13 },
    submittedAt: "07.01 11:22"
  },
  {
    contestId: "CT-HS-13869",
    judgeName: "이태준",
    submissionId: "SB-HS-9109",
    scores: { creativity: 25, completion: 28, impact: 24, delivery: 12 },
    submittedAt: "05.23 14:12"
  }
];

export const awardCandidates = [
  {
    id: "AW-HS-0001",
    rank: 1,
    contestId: "CT-HS-13870",
    awardType: "SPECIAL",
    prize: "특별상",
    teamId: "TM-HS-1007",
    team: "BeyondMe",
    score: 93.8,
    members: 1,
    status: "확정대기",
    certificateNo: "2026-HS-001"
  },
  {
    id: "AW-HS-0002",
    rank: 2,
    contestId: "CT-HS-13870",
    awardType: "PRESIDENT_AWARD",
    prize: "총장상",
    teamId: "TM-HS-1008",
    team: "RetryStory",
    score: 85.4,
    members: 1,
    status: "확정대기",
    certificateNo: "2026-HS-002"
  },
  {
    id: "AW-HS-0003",
    rank: 1,
    contestId: "CT-HS-13721",
    awardType: "EXCELLENCE",
    prize: "최우수상",
    teamId: "TM-HS-1009",
    team: "SuccessNote",
    score: 91.9,
    members: 1,
    status: "확정대기",
    certificateNo: "2026-HSP-001"
  },
  {
    id: "AW-HS-0004",
    rank: 1,
    contestId: "CT-HS-13841",
    awardType: "MERIT",
    prize: "우수상",
    teamId: "TM-HS-1011",
    team: "DigitalReset",
    score: 92.1,
    members: 1,
    status: "확정",
    certificateNo: "2026-CC-001"
  },
  {
    id: "AW-HS-0005",
    rank: 1,
    contestId: "CT-HS-13869",
    awardType: "CUSTOM",
    customPrize: "우수 보고서",
    prize: "우수 보고서",
    teamId: "TM-HS-1012",
    team: "FinanceRoute",
    score: 89.4,
    members: 1,
    status: "확정",
    certificateNo: "2026-JOB-001"
  },
  {
    id: "AW-HS-0006",
    rank: 1,
    contestId: "CT-HS-13949",
    awardType: "GRAND_PRIZE",
    prize: "대상",
    teamId: "TM-HS-1002",
    team: "MajorLoop",
    score: 84.6,
    members: 4,
    status: "보류",
    certificateNo: "2026-MC-001"
  }
];

export const timeline = [
  { label: "대회 생성", value: "준비중", count: 0 },
  { label: "참가 접수", value: "접수중", count: 7 },
  { label: "제출 접수", value: "제출중", count: 5 },
  { label: "심사", value: "심사중", count: 2 },
  { label: "수상 확정", value: "완료", count: 2 }
];

export const statusTone = {
  준비중: "neutral",
  접수중: "info",
  심사중: "warning",
  수상확정: "success",
  승인: "success",
  보완요청: "danger",
  검토중: "warning",
  배정완료: "info",
  심사완료: "success",
  수상후보: "success",
  미배정: "danger",
  접수완료: "neutral",
  대기: "neutral",
  확정대기: "warning",
  확정: "success",
  보류: "danger",
  "발급 준비": "warning",
  "배치 포함": "info",
  "블록체인 기록 완료": "success",
  폐기: "danger",
  취소: "danger",
  대체: "warning"
};
