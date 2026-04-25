/**
 * 청년원스톱 공통 도메인 타입.
 *
 * 개인정보 원칙: `YouthProfile` 은 모두 **범주형**만 다룬다. 주민번호·연소득 원값은 서버로 보내지 않는다.
 */

export type IncomeTier = "low" | "mid" | "high";
export type HousingStatus = "rent" | "own" | "dorm" | "family";
export type EmploymentStatus = "student" | "job_seeker" | "employed" | "freelancer" | "starter";
export type RegionCode = "서울" | "경기" | "인천" | "부산" | "대구" | "광주" | "대전" | "울산" | "세종" | "강원" | "충북" | "충남" | "전북" | "전남" | "경북" | "경남" | "제주";

export type YouthProfile = {
  age: number;
  region: RegionCode;
  income: IncomeTier;
  housing: HousingStatus;
  employment: EmploymentStatus;
  interests: string[]; // 예: 주거, 금융, 창업, 훈련
};

export type PolicyCategory = "주거" | "금융" | "취업" | "창업" | "교육" | "복지";

export type Policy = {
  id: string;
  source: "온통청년" | "고용24" | "LH" | "서민금융" | "HRD-Net";
  title: string;
  category: PolicyCategory;
  region: RegionCode | "전국";
  ageMin: number;
  ageMax: number;
  incomeTier: IncomeTier[];
  housing?: HousingStatus[];
  employment?: EmploymentStatus[];
  deadline: string; // YYYY-MM-DD
  summary: string;
  documents: string[];
  url?: string;
};

export type JobPost = {
  id: string;
  source: "고용24" | "HRD-Net" | "워크넷";
  title: string;
  company: string;
  region: RegionCode;
  category: "일자리" | "훈련";
  deadline: string;
  wage?: string;
  summary: string;
};

export type MatchScore = {
  policy: Policy;
  score: number;
  reasons: string[];
  conflicts: string[];
};

export type DraftRequest = {
  profile: YouthProfile;
  policyId: string;
  extraNote?: string;
};

export type DraftResponse = {
  backend: "ollama" | "template";
  title: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  warnings: string[];
};
