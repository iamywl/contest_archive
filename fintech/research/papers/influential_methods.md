# Influential / Foundational Papers by Method

본 문서는 RiskScope MVP가 활용하는 각 금융공학·행동재무·AI 기법에 대한 **단일 정전(canonical) 문헌**을 정리한다.
각 항목은 Google Scholar·JSTOR·Crossref·NBER·출판사 공식 DOI로 검증됨 (검증일: 2026-04-21).
제안서 본문에서 인용 시 하단 `references.md`의 `[P08]`~`[P19]` ID를 사용.

---

## [1] Modern Portfolio Theory (MPT)

**Citation (APA 7th)**: Markowitz, H. (1952). Portfolio selection. *The Journal of Finance*, *7*(1), 77–91. https://doi.org/10.2307/2975974
**Citations (approximate)**: ~60,000+ (Google Scholar, 2026-04)
**Why foundational**: Mean–variance 최적화 프레임워크를 수립한 논문으로 현대 포트폴리오 이론의 기원. 1990년 노벨경제학상 수상의 근거 연구이며, 이후의 CAPM(Sharpe 1964), Black–Litterman(1992), Factor model 등 거의 모든 주류 자산배분 이론이 이 논문을 출발점으로 삼는다.
**How RiskScope uses it**: 추천 엔진의 포트폴리오 스코어링은 기대수익–변동성 trade-off를 기반으로 사용자 프로필별 효율적 프론티어를 산출한다. 사용자의 위험허용도에 따른 접선 포트폴리오 가중치 계산에 직접 적용된다.
**Verified URL**: https://doi.org/10.2307/2975974

---

## [2] Monte Carlo Simulation in Finance

**Citation (APA 7th)**: Boyle, P. P. (1977). Options: A Monte Carlo approach. *Journal of Financial Economics*, *4*(3), 323–338. https://doi.org/10.1016/0304-405X(77)90005-8
**Citations (approximate)**: ~4,000+ (Google Scholar, 2026-04)
**Why foundational**: 금융공학에 몬테카를로 시뮬레이션을 처음 체계적으로 도입한 논문. 옵션·파생상품·리스크 측정에서 수치적 경로 생성 방법론의 원형을 제시했으며, 이후 Broadie–Glasserman(1996), Longstaff–Schwartz(2001) 등 실무 확장의 기반이 되었다.
**How RiskScope uses it**: 핵심 시뮬레이션 엔진의 이론적 근거. 5,000개 경로의 GBM 기반 자산가격 시뮬레이션으로 미래가치 분포를 산출하며, Boyle이 제안한 variance reduction·path generation 접근을 그대로 따른다.
**Verified URL**: https://doi.org/10.1016/0304-405X(77)90005-8

---

## [3] Geometric Brownian Motion / Black–Scholes Framework

**Citation (APA 7th)**: Black, F., & Scholes, M. (1973). The pricing of options and corporate liabilities. *Journal of Political Economy*, *81*(3), 637–654. https://doi.org/10.1086/260062
**Citations (approximate)**: ~50,000+ (Google Scholar, 2026-04)
**Why foundational**: 주가가 GBM (dS = μS dt + σS dW) 을 따른다는 가정하에 옵션가격의 폐쇄형 해를 유도한 논문. 1997년 노벨경제학상 수상. 이후 거의 모든 자산가격 시뮬레이션·파생상품 평가·리스크 관리의 기본 SDE로 채택된다.
**How RiskScope uses it**: 자산 가격 경로 생성에 GBM 이산화(Euler–Maruyama)를 사용한다. Black–Scholes가 제시한 drift/diffusion 파라미터화(μ, σ)를 기반으로 S&P500·KOSPI·채권·환율 등 모든 시뮬레이션 대상 자산의 확률과정을 모델링한다.
**Verified URL**: https://doi.org/10.1086/260062

---

## [4] Cholesky Decomposition for Correlated Returns (in Finance)

**Citation (APA 7th)**: Glasserman, P. (2003). *Monte Carlo methods in financial engineering* (Stochastic Modelling and Applied Probability, Vol. 53). Springer. https://doi.org/10.1007/978-0-387-21617-1
**Citations (approximate)**: ~9,000+ (Google Scholar, 2026-04)
**Why foundational**: 금융공학 분야 몬테카를로 방법론의 표준 레퍼런스. §2.3에서 Cholesky 분해를 통한 상관 정규난수 생성법을 체계적으로 정리했으며, 다변량 자산·환율·금리의 공분산 구조를 시뮬레이션에 반영하는 실무적 방법론으로 확립되었다. (Cholesky 본 원본(Commandant Cholesky, 사후 1924)은 수치해석 논문이며 금융에서는 Glasserman이 canonical.)
**How RiskScope uses it**: 자산 수익률과 USD/KRW 환율 간 상관관계를 반영하기 위해 2x2 공분산행렬의 Cholesky 분해를 수행하고, 독립 표준정규난수에 곱하여 상관구조를 보존한 상관난수를 생성한다. Glasserman §2.3.3의 절차를 그대로 구현.
**Verified URL**: https://link.springer.com/book/10.1007/978-0-387-21617-1

---

## [5] Value-at-Risk (VaR) and Expected Shortfall

**Citation (APA 7th)**: Jorion, P. (2006). *Value at risk: The new benchmark for managing financial risk* (3rd ed.). McGraw-Hill.
**Citations (approximate)**: ~15,000+ (Google Scholar, 2026-04; 3판 기준)
**Why foundational**: VaR의 정의·추정방법(historical, parametric, Monte Carlo)·백테스팅·스트레스테스트까지 실무 리스크관리 전반을 통합한 표준 교과서. Basel II/III의 시장리스크 규제자본 산정 레퍼런스이며, 개별 논문보다 체계적 통합이 본 MVP의 P5/최악 통계량 구현에 더 직접적으로 부합한다.
**How RiskScope uses it**: 시뮬레이션된 5,000 경로의 미래가치 분포에서 5% 분위수(historical VaR 5%)와 하위 5% 평균(Expected Shortfall / CVaR)을 계산하여 "최악의 경우 원금 손실액"을 사용자에게 제시한다. Jorion §5(Measuring Risk)의 Monte Carlo VaR 방법론을 그대로 따른다.
**Verified URL**: https://merage.uci.edu/~jorion/var/ (저자 공식 페이지) · ISBN 9780071464956

---

## [6] Coherent Risk Measures (CVaR 이론적 정당화)

**Citation (APA 7th)**: Artzner, P., Delbaen, F., Eber, J.-M., & Heath, D. (1999). Coherent measures of risk. *Mathematical Finance*, *9*(3), 203–228. https://doi.org/10.1111/1467-9965.00068
**Citations (approximate)**: ~13,000+ (Google Scholar, 2026-04)
**Why foundational**: 리스크 측도가 만족해야 할 4가지 공리(monotonicity, sub-additivity, homogeneity, translation invariance)를 수립하고, VaR이 sub-additivity를 위배함을 증명. 이후 Rockafellar–Uryasev(2000)가 coherent하면서 최적화 가능한 CVaR를 제시하는 이론적 출발점이 되었다. Basel III의 ES(Expected Shortfall) 도입 근거.
**How RiskScope uses it**: P5 분위수(VaR)뿐 아니라 **하위 5% 평균(CVaR/ES)**을 함께 제시하는 이론적 근거. 포트폴리오 분산투자 시 리스크가 감소한다는 sub-additivity 속성이 사용자에게 "분산 추천"을 정당화하는 논리 기반이다.
**Verified URL**: https://doi.org/10.1111/1467-9965.00068

---

## [7] Lifecycle / Goal-Based Investing

**Citation (APA 7th)**: Merton, R. C. (1969). Lifetime portfolio selection under uncertainty: The continuous-time case. *The Review of Economics and Statistics*, *51*(3), 247–257. https://doi.org/10.2307/1926560
**Citations (approximate)**: ~10,000+ (Google Scholar, 2026-04)
**Why foundational**: 연속시간 생애주기 포트폴리오 선택 문제를 HJB 방정식으로 정식화하고 CRRA 효용하 최적 위험자산 비중(Merton share)의 폐쇄형 해를 유도. 이후 Bodie–Merton–Samuelson(1992, NBER w3954), Cocco–Gomes–Maenhout(2005) 등 현대 TDF(Target Date Fund)·로보어드바이저 투자시계 조정의 이론적 근거가 된다.
**How RiskScope uses it**: 은퇴계산기 및 horizon-aware 추천은 투자기간(T)이 길수록 위험자산 비중을 높이는 Merton의 결과를 따른다. 사용자의 남은 투자기간·인적자본(노동소득) 여력에 따라 주식/채권 비중을 동적으로 조정하는 로직의 이론적 기반.
**Verified URL**: https://doi.org/10.2307/1926560

---

## [8] Behavioral Finance — Prospect Theory, Loss Aversion

**Citation (APA 7th)**: Kahneman, D., & Tversky, A. (1979). Prospect theory: An analysis of decision under risk. *Econometrica*, *47*(2), 263–291. https://doi.org/10.2307/1914185
**Citations (approximate)**: ~80,000+ (Google Scholar, 2026-04)
**Why foundational**: 기대효용이론에 대한 행동경제학의 대항 이론. 준거점 의존성(reference dependence), 손실회피(loss aversion, λ≈2.25), 확률가중(probability weighting)을 실험적으로 증명. 2002년 Kahneman 노벨경제학상 수상 근거. 모든 행동재무·고객 리스크 프로파일링 연구의 기점.
**How RiskScope uses it**: 사용자 프로필의 위험성향 차원은 표준 설문(MiFID II 적합성 원칙)에 prospect theory의 손실회피 계수 개념을 결합해 설계한다. 시뮬레이션 결과 시각화에서도 "최악 케이스(손실)"를 "최선 케이스(이익)"보다 강조하여 손실회피 성향의 정보 격차를 해소한다.
**Verified URL**: https://doi.org/10.2307/1914185

---

## [9] Robo-Advisor Evaluation

**Citation (APA 7th)**: D'Acunto, F., Prabhala, N., & Rossi, A. G. (2019). The promises and pitfalls of robo-advising. *The Review of Financial Studies*, *32*(5), 1983–2020. https://doi.org/10.1093/rfs/hhz014
**Citations (approximate)**: ~900+ (Google Scholar, 2026-04)
**Why foundational**: 실제 인도 증권사 로보어드바이저 도입 전후 개별 투자자 계좌 데이터(수십만 건)를 분석한 최초의 대규모 실증연구. 로보가 (1) 미분산 투자자에게는 분산 편익을 제공하지만 (2) 이미 10종목 이상 보유한 투자자에게는 편익이 없다는 heterogeneous treatment effect를 증명. 로보어드바이저 유효성 논쟁의 정전(canonical) 근거.
**How RiskScope uses it**: 추천 엔진이 "모든 사용자가 동일한 편익을 얻는다"는 과장을 피하고, **분산이 부족한 사용자에게 특히 효과적**이라는 연구 결과에 근거해 타겟 세그먼트를 설정. 제안서 §1 문제정의 및 §2 차별점에서 "초보 투자자·서학개미 집중투자자" 우선 타겟팅의 학술적 근거로 사용.
**Verified URL**: https://doi.org/10.1093/rfs/hhz014

---

## [10] Explainable AI in Finance — SHAP

**Citation (APA 7th)**: Lundberg, S. M., & Lee, S.-I. (2017). A unified approach to interpreting model predictions. In I. Guyon, U. von Luxburg, S. Bengio, H. Wallach, R. Fergus, S. Vishwanathan, & R. Garnett (Eds.), *Advances in Neural Information Processing Systems 30* (pp. 4765–4774). Curran Associates. https://papers.nips.cc/paper/7062-a-unified-approach-to-interpreting-model-predictions
**Citations (approximate)**: ~30,000+ (Google Scholar, 2026-04)
**Why foundational**: Shapley value(협력게임이론, Shapley 1953)를 기계학습 예측 해석에 통합한 프레임워크. LIME, DeepLIFT 등 6개 기존 방법을 단일 이론으로 포괄. local accuracy·missingness·consistency 3대 공리를 만족하는 유일한 additive feature attribution이 SHAP임을 증명. XAI 분야 최다 인용 논문.
**How RiskScope uses it**: 추천 엔진이 "왜 이 상품을 추천했는가"를 설명하는 XAI 워터폴 차트는 SHAP 값을 사용해 사용자 프로필 피처(나이·소득·위험성향·목표기간)별 기여도를 분해한다. 금융소비자보호법·MiFID II 적합성 설명의무 대응.
**Verified URL**: https://papers.nips.cc/paper/7062-a-unified-approach-to-interpreting-model-predictions · arXiv: https://arxiv.org/abs/1705.07874

---

## [11] Suitability / Mis-selling Theory

**Citation (APA 7th)**: Inderst, R., & Ottaviani, M. (2009). Misselling through agents. *American Economic Review*, *99*(3), 883–908. https://doi.org/10.1257/aer.99.3.883
**Citations (approximate)**: ~700+ (Google Scholar, 2026-04)
**Why foundational**: 판매대리인(브로커·PB)의 prospecting–advising 이중과제 구조에서 불완전판매(misselling)가 균형에서 발생하는 메커니즘을 이론화한 대표 논문. 수수료 투명성·커미션 구조·보상 체계가 misselling에 미치는 영향을 분석. 홍콩 ELS 사태 등 실제 불완전판매 규제 설계의 학술적 근거로 광범위하게 인용된다.
**How RiskScope uses it**: 3단계 최악 케이스 시나리오 고지("최악의 경우 원금의 X%를 잃을 수 있습니다") UI는 Inderst–Ottaviani가 제시한 "commission steepness가 misselling을 증가시킨다"는 결과의 반대 명제를 적용한다. 즉 투명한 worst-case 공시로 adviser–client 정보비대칭을 사전에 감소시킨다.
**Verified URL**: https://doi.org/10.1257/aer.99.3.883

---

## [12] Financial Advice Quality / Cost Transparency

**Citation (APA 7th)**: Bergstresser, D., Chalmers, J. M. R., & Tufano, P. (2009). Assessing the costs and benefits of brokers in the mutual fund industry. *The Review of Financial Studies*, *22*(10), 4129–4156. https://doi.org/10.1093/rfs/hhn137
**Citations (approximate)**: ~1,400+ (Google Scholar, 2026-04)
**Why foundational**: 1996–2004년 미국 뮤추얼펀드 데이터로 broker-sold vs direct-sold 펀드의 위험조정수익·수수료·자산배분을 비교. broker를 통한 판매가 투자자에게 **distribution cost를 빼기 전에도** 낮은 risk-adjusted return을 제공함을 실증. 금융자문 수수료 투명성의 대표 실증연구로 DOL fiduciary rule·SEC Reg BI·핀테크 수수료 공개 요구의 학술적 근거.
**How RiskScope uses it**: 추천 상품의 총보수율(TER)·판매보수·환매수수료를 일괄 공시하는 "Cost Transparency Layer"는 Bergstresser et al.의 실증 결과 — 수수료 투명성이 없으면 투자자 후생이 감소한다 — 에 근거한다. 제안서 §2 차별점에서 "수수료 후벼파기" 기능의 근거로 사용.
**Verified URL**: https://doi.org/10.1093/rfs/hhn137

---

## Suggested integration (제안서 본문 배치)

| ID | Paper | 제안서 배치 위치 |
|---|---|---|
| [P08] Markowitz 1952 | MPT | §2.2 아키텍처 / 추천엔진 서브섹션 — 포트폴리오 스코어링 근거 |
| [P09] Boyle 1977 | Monte Carlo | §2.2 시뮬레이션 엔진 서브섹션 — 5,000 path 이론적 근거 |
| [P10] Black–Scholes 1973 | GBM/SDE | §2.2 시뮬레이션 엔진 — GBM 자산가격 모델 정당화 |
| [P11] Glasserman 2003 | Cholesky (finance) | §2.2 시뮬레이션 엔진 — 상관난수 생성법 (자산×환율 2x2) |
| [P12] Jorion 2006 | VaR/ES | §2.2 리스크 측정 서브섹션 — P5/worst-case 통계량 |
| [P13] Artzner et al. 1999 | Coherent risk | §2.2 리스크 측정 — CVaR/ES 선호의 이론적 정당화 |
| [P14] Merton 1969 | Lifecycle | §2.2 추천엔진 — 투자기간 반영 / §5 은퇴계산기 기능 |
| [P15] Kahneman–Tversky 1979 | Prospect theory | §1 문제인식 — 사용자 손실회피 성향 설명 / §2 UX 설계 |
| [P16] D'Acunto et al. 2019 | Robo evaluation | §1 문제인식 — 타겟 세그먼트 학술근거 / §5 기대효과 |
| [P17] Lundberg–Lee 2017 | SHAP | §2.2 XAI 서브섹션 — 추천 설명 워터폴 기술근거 |
| [P18] Inderst–Ottaviani 2009 | Misselling | §1 문제인식 — 불완전판매 이론근거 / §2 worst-case 고지 UX |
| [P19] Bergstresser et al. 2009 | Advice quality | §2 차별점 — Cost Transparency Layer 실증근거 |

---

## Verification status

- **VERIFIED (Crossref/DOI resolved, 2026-04-21)**: [1]–[12] 전원 DOI 또는 출판사 공식 링크에서 확인됨.
- **VERIFICATION FAILED**: 없음.
- **Note**: [4] Cholesky의 경우 André-Louis Cholesky 원본(사후 1924, *Bulletin géodésique*)은 수치해석 논문으로 금융 맥락에서 직접 인용 관행이 없어, 금융공학 표준 레퍼런스인 Glasserman(2003)을 canonical로 선정. [5] VaR의 경우 개별 논문(JP Morgan RiskMetrics 1994 technical document 등)보다 Jorion 교과서가 학계·실무 공용 canonical. 필요 시 Artzner 1999([6])와 함께 인용 가능.
