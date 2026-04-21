"""음성 → 텍스트 변환 (Whisper STT).

키 부재 시 모킹 모드로 동작해 데모 가능성을 보장한다.
"""

from __future__ import annotations

import os
from pathlib import Path

# 모킹 데이터: 베트남어 산재 진술 시나리오
MOCK_TRANSCRIPTS = {
    "vi": (
        "Tôi tên là Nguyễn Văn An, người Việt Nam. "
        "Hôm nay là ngày 15 tháng 7 năm 2026, lúc 2 giờ 30 chiều. "
        "Tôi đang làm việc ở nhà máy mạ kim loại ở Ansan. "
        "Khi đang vận hành máy ép, thiết bị an toàn không hoạt động "
        "và tay trái của tôi bị kẹp vào khuôn ép. "
        "Ngón trỏ trái của tôi bị cắt đứt. "
        "Đồng nghiệp đã gọi cấp cứu 119 và đưa tôi đến bệnh viện. "
        "Ông chủ nói tôi đừng khai báo tai nạn lao động, "
        "ông ấy sẽ đưa tôi 2 triệu won."
    ),
    "ne": (
        "मेरो नाम बिक्रम राई हो, म नेपाली हुँ। "
        "म चार वर्षदेखि चुङ्चेओङ्नाम-दोको कृषि फर्ममा काम गर्दैछु। "
        "जनवरी देखि मार्च सम्म तीन महिनाको तलब, कुल ३८ लाख वोन तिरिएको छैन। "
        "मैले मालिकलाई आठ पटक भनेँ तर उनले 'अर्को महिना कुर' मात्र भन्छन्।"
    ),
    "ko": "(테스트 한국어 진술 모킹)",
}

MOCK_TRANSCRIPT_TRANSLATION_KO = {
    "vi": (
        "제 이름은 응우옌 반 안이며, 베트남 사람입니다. "
        "오늘은 2026년 7월 15일 오후 2시 30분입니다. "
        "저는 안산의 도금 공장에서 일하고 있었습니다. "
        "프레스 기계를 작동하던 중 안전장치가 작동하지 않아 "
        "왼손이 프레스 금형에 협착되었습니다. "
        "왼쪽 검지가 절단되었습니다. "
        "동료가 119에 신고하여 저를 병원으로 데려갔습니다. "
        "사장은 저에게 산재 신고를 하지 말라며 200만원을 주겠다고 했습니다."
    ),
    "ne": (
        "제 이름은 비크람 라이이며, 네팔 사람입니다. "
        "저는 4년 동안 충청남도의 농장에서 일하고 있습니다. "
        "1월부터 3월까지 3개월치 임금, 총 380만원을 받지 못했습니다. "
        "사장에게 8번 말했지만 '다음 달까지 기다리라'는 말만 합니다."
    ),
    "ko": "(테스트 한국어 진술 모킹)",
}


def is_mock_mode() -> bool:
    """API 키가 없으면 모킹 모드."""
    return not os.getenv("OPENAI_API_KEY")


def transcribe(audio_bytes: bytes | None, lang: str = "vi") -> dict:
    """음성을 모국어 텍스트로 변환.

    Returns:
        {"original_text": str, "translation_ko": str, "lang": str, "mock": bool}
    """
    if is_mock_mode() or audio_bytes is None:
        return {
            "original_text": MOCK_TRANSCRIPTS.get(lang, MOCK_TRANSCRIPTS["vi"]),
            "translation_ko": MOCK_TRANSCRIPT_TRANSLATION_KO.get(
                lang, MOCK_TRANSCRIPT_TRANSLATION_KO["vi"]
            ),
            "lang": lang,
            "mock": True,
        }

    # 실제 호출 (API 키 있는 경우)
    from openai import OpenAI

    client = OpenAI()
    response = client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.m4a", audio_bytes, "audio/m4a"),
        language=lang,
    )
    original = response.text

    # 한국어 번역도 함께 (Whisper translate)
    response_ko = client.audio.translations.create(
        model="whisper-1",
        file=("audio.m4a", audio_bytes, "audio/m4a"),
    )
    return {
        "original_text": original,
        "translation_ko": response_ko.text,
        "lang": lang,
        "mock": False,
    }


if __name__ == "__main__":
    result = transcribe(None, "vi")
    print(f"[{'MOCK' if result['mock'] else 'REAL'}] 언어: {result['lang']}")
    print(f"\n[원문]\n{result['original_text']}")
    print(f"\n[한국어 번역]\n{result['translation_ko']}")
