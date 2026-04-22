# 모두대화 (Talk For All) — Streamlit PoC

AAC 심볼 그리드 + 한국어 예측 문장 + 4채널(음성·자막·심볼·수어) 동시 출력 PoC.

## 구동

```bash
cd src/talkforall
pip install -e .            # 또는 uv sync
# LLM 사용 시
ollama serve &
ollama pull gemma3:27b-instruct-q4_K_M
# PoC 기동
streamlit run app.py
```

Ollama 미구동 시에는 자동으로 mock 분기(단순 이어붙이기 + "요" 어미)로 동작합니다.

## 라이선스

- ARASAAC 픽토그램: CC BY-NC-SA 4.0 (https://arasaac.org/)
- KSL 참고: 국립국어원 한국수어사전 (https://sldict.korean.go.kr/)
