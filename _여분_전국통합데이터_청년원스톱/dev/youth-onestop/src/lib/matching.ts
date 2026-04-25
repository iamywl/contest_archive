/**
 * 규칙 기반 청년 정책 매칭 엔진.
 *
 * 로컬 LLM 호출 없이 결정적 점수를 반환한다. 임베딩 기반 RAG 가 필요해지면
 * `/api/ai/match` 에 별도 엔드포인트를 둔다.
 */

import type { MatchScore, Policy, YouthProfile } from "./types";

function scoreRegion(policy: Policy, profile: YouthProfile): number {
  if (policy.region === "전국") return 1.0;
  return policy.region === profile.region ? 1.2 : 0.0;
}

function scoreAge(policy: Policy, profile: YouthProfile): number {
  if (profile.age < policy.ageMin || profile.age > policy.ageMax) return 0.0;
  return 1.0;
}

function scoreIncome(policy: Policy, profile: YouthProfile): number {
  return policy.incomeTier.includes(profile.income) ? 1.0 : 0.0;
}

function scoreHousing(policy: Policy, profile: YouthProfile): number {
  if (!policy.housing?.length) return 0.5;
  return policy.housing.includes(profile.housing) ? 1.0 : 0.0;
}

function scoreEmployment(policy: Policy, profile: YouthProfile): number {
  if (!policy.employment?.length) return 0.5;
  return policy.employment.includes(profile.employment) ? 1.0 : 0.0;
}

function scoreInterest(policy: Policy, profile: YouthProfile): number {
  if (!profile.interests?.length) return 0.3;
  return profile.interests.includes(policy.category) ? 1.0 : 0.2;
}

function daysUntil(deadline: string): number {
  const d = new Date(deadline).getTime();
  return Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24));
}

export function matchProfile(profile: YouthProfile, policies: Policy[]): MatchScore[] {
  return policies
    .map((policy) => {
      const reasons: string[] = [];
      const conflicts: string[] = [];

      const weights: Array<[string, number, number]> = [
        ["지역", scoreRegion(policy, profile), 1.2],
        ["연령", scoreAge(policy, profile), 1.5],
        ["소득", scoreIncome(policy, profile), 1.0],
        ["주거", scoreHousing(policy, profile), 0.8],
        ["고용", scoreEmployment(policy, profile), 0.8],
        ["관심", scoreInterest(policy, profile), 0.6],
      ];

      let weightedScore = 0;
      let weightSum = 0;
      for (const [label, s, w] of weights) {
        weightedScore += s * w;
        weightSum += w;
        if (s === 0) conflicts.push(`${label} 불일치`);
        else if (s >= 1.0) reasons.push(`${label} 적합`);
      }

      const base = weightedScore / weightSum;
      const d = daysUntil(policy.deadline);
      const urgencyBonus = d <= 30 && d >= 0 ? 0.05 : 0;
      const score = Math.max(0, Math.min(1, base + urgencyBonus));

      if (d <= 7 && d >= 0) reasons.push(`D-${d} 임박`);
      if (d < 0) conflicts.push("마감 경과");

      return { policy, score, reasons, conflicts };
    })
    .filter((m) => m.conflicts.length < 3)
    .sort((a, b) => b.score - a.score);
}

export function mostUrgent(policies: Policy[], withinDays: number = 14): Policy[] {
  return policies
    .filter((p) => {
      const d = daysUntil(p.deadline);
      return d >= 0 && d <= withinDays;
    })
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline));
}
