"""양식 데이터 → PDF 생성 (ReportLab + Pretendard 한글 폰트)."""

from __future__ import annotations

import io
from datetime import datetime
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

FONTS_DIR = Path(__file__).parent / "fonts"

# 폰트 등록 (앱 시작 시 1회)
_FONT_REGISTERED = False


def _register_fonts() -> None:
    global _FONT_REGISTERED
    if _FONT_REGISTERED:
        return
    pdfmetrics.registerFont(TTFont("Pretendard", str(FONTS_DIR / "Pretendard-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("Pretendard-Bold", str(FONTS_DIR / "Pretendard-Bold.ttf")))
    _FONT_REGISTERED = True


# 양식별 한국어 메타
FORM_META = {
    "sanjae": {
        "title": "산업재해보상보험 요양급여 신청서",
        "subtitle": "Workers' Compensation Medical Care Application",
        "official_source": "근로복지공단 토탈서비스 (https://total.comwel.or.kr)",
        "law_basis": "「산업재해보상보험법」 제40조 · 제41조",
    },
    "wage_unpaid": {
        "title": "임 금 체 불 진 정 서",
        "subtitle": "Wage Theft Complaint",
        "official_source": "고용노동부 민원마당 (https://minwon.moel.go.kr)",
        "law_basis": "「근로기준법」 제43조 · 제36조",
    },
}


def _styles() -> dict[str, ParagraphStyle]:
    """문서용 스타일 (한글 폰트)."""
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Pretendard-Bold",
            fontSize=20,
            leading=26,
            alignment=1,  # center
            textColor=HexColor("#002C5F"),
            spaceAfter=4 * mm,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Pretendard",
            fontSize=10,
            leading=12,
            alignment=1,
            textColor=HexColor("#475569"),
            spaceAfter=8 * mm,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Pretendard-Bold",
            fontSize=12,
            leading=16,
            textColor=HexColor("#002C5F"),
            spaceBefore=4 * mm,
            spaceAfter=2 * mm,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Pretendard",
            fontSize=10,
            leading=15,
            textColor=HexColor("#0F172A"),
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName="Pretendard",
            fontSize=8,
            leading=11,
            textColor=HexColor("#94A3B8"),
        ),
        "warning": ParagraphStyle(
            "Warning",
            parent=base["Normal"],
            fontName="Pretendard-Bold",
            fontSize=9,
            leading=12,
            textColor=HexColor("#E63946"),
        ),
    }


def _build_field_table(fields_dict: dict, template_fields: dict) -> Table:
    """필드 테이블 생성 (라벨 / 값 2열)."""
    rows = [["항 목", "내 용"]]
    for key, spec in template_fields.items():
        label = spec.get("label_ko", key)
        value = fields_dict.get(key, "")
        if isinstance(value, int):
            value = f"{value:,} 원" if "won" in key else str(value)
        elif not value:
            value = "—"
        # 길이 자르기 (테이블 셀 너비 고려)
        label_p = Paragraph(label, _styles()["body"])
        value_p = Paragraph(str(value), _styles()["body"])
        rows.append([label_p, value_p])

    table = Table(rows, colWidths=[40 * mm, 130 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                # 헤더
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#002C5F")),
                ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#FFFFFF")),
                ("FONTNAME", (0, 0), (-1, 0), "Pretendard-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                # 본문
                ("BACKGROUND", (0, 1), (0, -1), HexColor("#F1F5F9")),
                ("FONTNAME", (0, 1), (-1, -1), "Pretendard"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("VALIGN", (0, 1), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 1), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
                # 격자
                ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
            ]
        )
    )
    return table


def render_pdf(
    form_data: dict,
    form_type: str = "sanjae",
    *,
    user_lang: str = "vi",
) -> bytes:
    """양식 데이터를 PDF로 렌더링.

    Args:
        form_data: form_mapper.generate_form()의 출력
        form_type: "sanjae" | "wage_unpaid"
        user_lang: 사용자 모국어 코드 (메타 표시용)

    Returns:
        PDF bytes
    """
    _register_fonts()

    from form_mapper import load_template  # noqa: PLC0415

    template = load_template(form_type)
    meta = FORM_META[form_type]
    style = _styles()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=meta["title"],
        author="WorkBuddy KR",
    )

    story = []

    # 헤더
    story.append(Paragraph(meta["title"], style["title"]))
    story.append(Paragraph(meta["subtitle"], style["subtitle"]))

    # 메타 정보
    story.append(Paragraph(f"법적 근거: {meta['law_basis']}", style["small"]))
    story.append(
        Paragraph(
            f"제출 대상: {meta['official_source']}",
            style["small"],
        )
    )
    story.append(
        Paragraph(
            f"작성 도구: WorkBuddy KR (사용자 모국어: {user_lang}) · "
            f"생성일시: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            style["small"],
        )
    )
    story.append(Spacer(1, 6 * mm))

    # 본문 테이블
    story.append(Paragraph("◆ 신청 내용", style["h2"]))
    table = _build_field_table(form_data, template["fields"])
    story.append(table)
    story.append(Spacer(1, 4 * mm))

    # 검수 안내
    review_notes = form_data.get("_review_notes", [])
    if review_notes:
        story.append(Paragraph("◆ 사용자 검수 필요 항목", style["h2"]))
        for note in review_notes:
            story.append(Paragraph(f"• {note}", style["warning"]))
        story.append(Spacer(1, 4 * mm))

    # 모킹 안내
    if form_data.get("_mock"):
        story.append(
            Paragraph(
                "※ 본 PDF는 WorkBuddy KR의 PoC 데모로 모킹 데이터로 생성되었습니다. "
                "실제 운영 시 Anthropic Claude API로 사용자 진술이 양식으로 자동 변환됩니다.",
                style["small"],
            )
        )

    # 푸터
    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            "이 서류는 외국인 근로자의 권리 행사를 돕는 「WorkBuddy KR」을 통해 자동 생성되었습니다. "
            "최종 제출 전 사용자가 반드시 내용을 검토해야 합니다. "
            "본 사업은 2026 현대오토에버 배리어프리 앱 개발 콘테스트 출품작입니다.",
            style["small"],
        )
    )

    doc.build(story)
    return buf.getvalue()


if __name__ == "__main__":
    # 단독 실행 테스트
    import sys

    sys.path.insert(0, str(Path(__file__).parent.parent))
    from ai_pipeline.form_mapper import generate_form  # type: ignore

    sample_text = (
        "제 이름은 응우옌 반 안이며, 베트남 사람입니다. "
        "2026년 7월 15일 오후 2시 30분에 안산 도금공장에서 "
        "프레스 작업 중 왼쪽 검지가 절단되었습니다."
    )
    form_data = generate_form(sample_text, "sanjae")
    pdf_bytes = render_pdf(form_data, "sanjae")

    out = Path(__file__).parent / "test_output.pdf"
    out.write_bytes(pdf_bytes)
    print(f"PDF 생성 완료: {out} ({len(pdf_bytes):,} bytes)")
