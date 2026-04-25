"use client";

/**
 * 청년 프로파일 입력 폼 — 로컬 스토리지 저장, PII 원값 수집 없음.
 */

import { useState } from "react";
import type {
  EmploymentStatus,
  HousingStatus,
  IncomeTier,
  PolicyCategory,
  RegionCode,
  YouthProfile,
} from "@/lib/types";

const REGIONS: RegionCode[] = [
  "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산",
  "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const CATEGORIES: PolicyCategory[] = ["주거", "금융", "취업", "창업", "교육", "복지"];

type Props = {
  value: YouthProfile;
  onChange: (next: YouthProfile) => void;
  onSubmit: () => void;
};

export function ProfileForm({ value, onChange, onSubmit }: Props) {
  const [localInterests, setLocalInterests] = useState<string[]>(value.interests);

  const updateInterest = (cat: PolicyCategory, on: boolean) => {
    const next = on ? [...localInterests, cat] : localInterests.filter((x) => x !== cat);
    setLocalInterests(next);
    onChange({ ...value, interests: next });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-5 rounded-xl border border-slate-700 bg-slate-900/60 p-6"
    >
      <h2 className="text-lg font-semibold">내 조건 (범주형만 저장)</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">나이</span>
          <input
            type="number"
            min={15}
            max={50}
            value={value.age}
            onChange={(e) => onChange({ ...value, age: Number(e.target.value) })}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">지역</span>
          <select
            value={value.region}
            onChange={(e) => onChange({ ...value, region: e.target.value as RegionCode })}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">소득 구간 (원값 미수집)</span>
          <select
            value={value.income}
            onChange={(e) => onChange({ ...value, income: e.target.value as IncomeTier })}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="low">저소득</option>
            <option value="mid">중간소득</option>
            <option value="high">고소득</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">주거</span>
          <select
            value={value.housing}
            onChange={(e) => onChange({ ...value, housing: e.target.value as HousingStatus })}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="rent">월세·전세</option>
            <option value="own">자가</option>
            <option value="dorm">기숙사</option>
            <option value="family">가족과 거주</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-slate-300">고용 상태</span>
          <select
            value={value.employment}
            onChange={(e) => onChange({ ...value, employment: e.target.value as EmploymentStatus })}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="student">학생</option>
            <option value="job_seeker">구직자</option>
            <option value="employed">재직자</option>
            <option value="freelancer">프리랜서</option>
            <option value="starter">창업자</option>
          </select>
        </label>
      </div>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="text-sm text-slate-300">관심 분야</legend>
        {CATEGORIES.map((cat) => {
          const on = localInterests.includes(cat);
          return (
            <label
              key={cat}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${
                on
                  ? "border-blue-500 bg-blue-600/20 text-blue-200"
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={(e) => updateInterest(cat, e.target.checked)}
              />
              {cat}
            </label>
          );
        })}
      </fieldset>

      <button
        type="submit"
        className="mt-2 inline-flex w-fit rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
      >
        📊 Top 20 매칭 보기
      </button>
    </form>
  );
}
