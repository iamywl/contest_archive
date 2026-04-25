"""사진 제보 저장 · 리포트 생성 (Mock).

데모에서는 실제 MinIO / S3 업로드 대신 로컬 `./uploads/` 에 저장하고,
지자체 리포트는 텍스트로 직렬화한다.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


@dataclass
class Report:
    """사진 제보 1건."""

    report_id: str
    filename: str
    category: str
    lat: float
    lon: float
    description: str
    created_at: str
    image_hash: str


def save_report(
    image_bytes: bytes,
    filename: str,
    category: str,
    lat: float,
    lon: float,
    description: str,
) -> Report:
    """제보 저장 + 리포트 생성.

    Args:
        image_bytes: 업로드 이미지 바이너리.
        filename: 원본 파일명.
        category: "curb" | "stairs" | "construction" | "elevator_broken" 등.
        lat, lon: 위치.
        description: 사용자 설명.

    Returns:
        생성된 `Report` 객체.
    """
    sha = hashlib.sha256(image_bytes).hexdigest()[:12]
    created = datetime.now(timezone.utc).isoformat()
    rid = f"R-{sha}"

    # 이미지 저장 (해시 기반 파일명)
    safe_name = f"{rid}-{Path(filename).name}"
    out_img = UPLOAD_DIR / safe_name
    out_img.write_bytes(image_bytes)

    report = Report(
        report_id=rid,
        filename=safe_name,
        category=category,
        lat=lat,
        lon=lon,
        description=description,
        created_at=created,
        image_hash=sha,
    )

    # 메타 JSON 저장 (지자체 리포트 원본)
    meta_path = UPLOAD_DIR / f"{rid}.json"
    meta_path.write_text(json.dumps(asdict(report), ensure_ascii=False, indent=2))
    return report


def render_municipal_report(report: Report) -> str:
    """지자체 리포트 텍스트 렌더링 (Mock)."""
    return (
        f"[휠체어맵 제보 #{report.report_id}]\n"
        f"접수일시: {report.created_at}\n"
        f"분류: {report.category}\n"
        f"위치: ({report.lat:.6f}, {report.lon:.6f})\n"
        f"내용: {report.description}\n"
        f"첨부: {report.filename}\n"
        f"---\n"
        f"본 리포트는 시설관리공단 담당자에게 자동 발송될 예정입니다 (Mock).\n"
    )
