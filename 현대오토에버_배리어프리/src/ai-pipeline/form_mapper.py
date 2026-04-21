"""한국어 진술 → 공식 양식 매핑 (Claude Sonnet 4.6).

키 부재 시 모킹 모드: 진술에서 키워드 매칭으로 양식 채움.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "templates"


def load_template(form_type: str) -> dict:
    """공식 양식 템플릿 로드."""
    path = TEMPLATES_DIR / f"{form_type}_form.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def is_mock_mode() -> bool:
    return not os.getenv("ANTHROPIC_API_KEY")


def _mock_fill_sanjae(translation_ko: str) -> dict:
    """모킹: 키워드 매칭으로 산재 양식 채움."""
    text = translation_ko
    return {
        "applicant_name_ko": "응우옌 반 안" if "응우옌" in text else "[확인필요]",
        "applicant_name_native": "Nguyễn Văn An",
        "applicant_nationality": "베트남" if "베트남" in text else "[확인필요]",
        "applicant_visa": "E-9",
        "applicant_phone": "[확인필요 — 사용자 추가 입력]",
        "employer_name": "(주)○○도금" if "도금" in text else "[확인필요]",
        "employer_address": "경기도 안산시" if "안산" in text else "[확인필요]",
        "employer_business_no": "[확인필요]",
        "occurred_at": "2026-07-15 14:30" if "2026" in text and "7" in text else "[확인필요]",
        "occurred_location": "사업장 내 도금 작업장",
        "incident_description": (
            "2026년 7월 15일 오후 2시 30분경, 신청인은 안산 소재 도금 사업장 내에서 "
            "프레스 작업을 수행하던 중, 안전장치가 작동하지 않은 상태에서 좌측 손이 "
            "프레스 금형에 협착되어 좌측 제2지(검지)가 절단되는 재해를 입었음. "
            "사고 직후 동료 근로자가 119에 신고하여 응급 의료기관으로 이송됨."
        ),
        "incident_cause": "프레스 안전장치 미작동 및 안전교육 미실시로 추정됨",
        "injury_part": "좌측 제2지(검지) 절단",
        "injury_diagnosis": "수지 절단상 (확정 진단명은 의료기관 진단서 참조)",
        "treatment_hospital": "[확인필요 — 응급 이송 병원명]",
        "evidence_summary": "사고 현장 사진·영상, GPS 위치, SHA-256 위변조 방지 해시 첨부",
        "witnesses": (
            "사고 현장에 동료 근로자가 있었으며 119 신고 진술 가능. "
            "또한 사업주가 산재 신고 회유(공상 처리 200만원 제안) 사실에 대한 진술 보강 필요."
        ),
        "_review_notes": [
            "사용자 검수 필요 항목: 응급 이송 병원명, 사업자등록번호, 본인 연락처",
            "사업주 회유 내용은 별도 진술서 추가 작성 권장",
        ],
    }


def _mock_fill_wage_unpaid(translation_ko: str) -> dict:
    """모킹: 키워드 매칭으로 임금체불 양식 채움."""
    text = translation_ko
    return {
        "applicant_name_ko": "비크람 라이",
        "applicant_name_native": "Bikram Rai",
        "applicant_nationality": "네팔" if "네팔" in text else "[확인필요]",
        "applicant_visa": "E-9",
        "applicant_phone": "[확인필요]",
        "employer_name": "○○농장" if "농장" in text else "[확인필요]",
        "employer_representative": "[확인필요]",
        "employer_address": "충청남도" if "충청" in text else "[확인필요]",
        "employment_start": "2022-08-01",
        "employment_end": "",
        "wage_unpaid_period_start": "2026-01-01",
        "wage_unpaid_period_end": "2026-03-31",
        "wage_unpaid_amount_won": 3800000,
        "wage_unpaid_breakdown": (
            "2026년 1월 임금 1,200,000원 / "
            "2026년 2월 임금 1,300,000원 / "
            "2026년 3월 임금 1,300,000원 = 합계 3,800,000원"
        ),
        "evidence_summary": "근로계약서, 통장 미입금 거래내역, 카카오톡 임금 독촉 메시지(8회), 출퇴근 GPS 기록",
        "complaint_request": (
            "위 체불 임금 3,800,000원의 즉시 지급 및 근로기준법 제43조(임금 지급) "
            "및 제36조(금품 청산) 위반에 대한 적절한 행정조치를 요청합니다."
        ),
        "_review_notes": [
            "체불 금액 세부 내역은 사용자 통장 거래내역으로 검증 필요",
            "사업주 대표자명 추가 확인 필요",
        ],
    }


def generate_form(translation_ko: str, form_type: str = "sanjae") -> dict:
    """한국어 진술 → 공식 양식 자동 작성.

    Returns: 양식 필드별 한국어 작성된 값 (dict)
    """
    template = load_template(form_type)

    if is_mock_mode():
        if form_type == "sanjae":
            filled = _mock_fill_sanjae(translation_ko)
        elif form_type == "wage_unpaid":
            filled = _mock_fill_wage_unpaid(translation_ko)
        else:
            raise ValueError(f"Unknown form_type: {form_type}")
        filled["_mock"] = True
        return filled

    # 실제 호출 (API 키 있는 경우)
    from anthropic import Anthropic

    client = Anthropic()
    fields_spec = json.dumps(template["fields"], ensure_ascii=False, indent=2)
    examples = json.dumps(template["writing_examples"], ensure_ascii=False, indent=2)

    prompt = f"""당신은 한국 노동법·산재보험법 전문가입니다.
다음 외국인 근로자의 한국어 진술을 근로복지공단 공식 양식의 각 필드에 정확히 매핑하세요.

원칙:
1. 법률 용어는 정확하게 사용 (예: "협착", "산업재해보상보험법" 등)
2. 빠진 정보는 절대 지어내지 말고 "[확인필요]" 또는 구체적 안내로 표기
3. 진술에 명시되지 않은 시간·장소·인명은 추정 금지

[공식 양식 필드 명세]
{fields_spec}

[작성 예시]
{examples}

[사용자 진술 (한국어)]
{translation_ko}

출력 형식: JSON object only. 각 필드명을 key로, 작성된 한국어 값을 value로.
필요 시 "_review_notes" key에 사용자 검수 필요 항목 리스트 추가."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    # JSON 추출
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        filled = json.loads(match.group())
    else:
        filled = {"error": "JSON 파싱 실패", "raw": text}
    filled["_mock"] = False
    return filled


if __name__ == "__main__":
    sample = (
        "제 이름은 응우옌 반 안이며, 베트남 사람입니다. "
        "오늘은 2026년 7월 15일 오후 2시 30분입니다. "
        "저는 안산의 도금 공장에서 일하고 있었습니다. "
        "프레스 작업 중 안전장치가 작동하지 않아 왼쪽 검지가 절단되었습니다."
    )
    result = generate_form(sample, "sanjae")
    print(json.dumps(result, ensure_ascii=False, indent=2))
