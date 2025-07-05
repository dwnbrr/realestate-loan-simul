/**
 * 애플리케이션에서 사용하는 모든 DOM 요소를 모아놓은 객체입니다.
 * 스크립트 로드 시점에 바로 요소를 찾아 할당하여, 다른 모듈에서 쉽게 접근할 수 있도록 합니다.
 */
export const elements = {
    // ===================================
    // 페이지 컨테이너 및 메인 버튼
    // ===================================
    financialInputPage: document.getElementById('financial-input-page'),
    financialResultsPage: document.getElementById('financial-results-page'),
    qolAnalysisPage: document.getElementById('qol-analysis-page'),

    calculateFinancialsButton: document.getElementById('calculate-financials-button'),
    recalculateButton: document.getElementById('recalculate'),
    analyzeQoLButton: document.getElementById('analyze-qol-button'),
    showFinalAnalysisButton: document.getElementById('show-final-analysis-button'),
    
    unitToggleButton: document.getElementById('unitToggle'),
    exportDataButton: document.getElementById('exportData'),

    // ===================================
    // 1. 재무 정보 입력 요소
    // ===================================
    borrowerCountSelect: document.getElementById('borrowerCount'),
    income2Section: document.getElementById('income2-section'),
    // (개별 입력 필드는 state.js에서 직접 getValue로 접근하므로 여기서는 불필요)

    // ===================================
    // 2. 재무 분석 결과 요소
    // ===================================
    financialResultsContent: document.getElementById('financial-results-content'), // 결과가 삽입될 컨테이너
    
    // 이 아래 요소들은 financialResultsContent 내부에 동적으로 생성될 예정
    // 따라서, 렌더링 시점에 다시 찾아야 할 수 있으므로 null일 수 있음을 인지.
    // UI.js에서 직접 생성하고 채우는 방식으로 변경하는 것이 더 안정적임.
    // 지금은 기존 구조를 유지하기 위해 그대로 둠.
    totalAnnualIncome: document.getElementById('totalAnnualIncome'),
    netMonthlyIncome: document.getElementById('netMonthlyIncome'),
    monthlyPayment: document.getElementById('monthlyPayment'),
    surplus: document.getElementById('surplus'),
    dsrDiagnosis: document.getElementById('dsrDiagnosis'),
    cashflowDiagnosis: document.getElementById('cashflowDiagnosis'),
    finalOpinion: document.getElementById('finalOpinion'),
    stressTest1: document.getElementById('stressTest1'),
    stressTest2: document.getElementById('stressTest2'),
    totalLifetimeSurplus: document.getElementById('totalLifetimeSurplus'),
    totalInterestPV: document.getElementById('totalInterestPV'),
    realInterestCostPV: document.getElementById('realInterestCostPV'),
    tabs: document.querySelectorAll('.tab-button'),
    nominalTableBody: document.getElementById('nominalCashflowSchedule'),
    realValueTableBody: document.getElementById('realValueSchedule'),
    savingsTableBody: document.getElementById('savingsSchedule'),

    // ===================================
    // 3. 삶의 질 (QoL) 분석 요소
    // ===================================

    // Commute Section
    commuteType1: document.getElementById('qol-commute-type1'),
    commuteTime1: document.getElementById('qol-commute-time1'),
    commuteCost1: document.getElementById('qol-commute-cost1'),
    commuteP2Div: document.getElementById('qol-commute-p2'),
    commuteType2: document.getElementById('qol-commute-type2'),
    commuteTime2: document.getElementById('qol-commute-time2'),
    commuteCost2: document.getElementById('qol-commute-cost2'),
    commuteCommentary: document.getElementById('qol-commute-commentary'),
    commuteResult: document.getElementById('qol-commute-result'),

    // Housing Section
    housingType: document.getElementById('qol-housing-type'),
    renoCost: document.getElementById('qol-reno-cost'),
    housingCommentary: document.getElementById('qol-housing-commentary'),
    housingResult: document.getElementById('qol-housing-result'),

    // Infrastructure Section
    infraChecklist: document.getElementById('qol-infra-checklist'),
    infraCommentary: document.getElementById('qol-infra-commentary'),
    infraResult: document.getElementById('qol-infra-result'),

    // View & Amenity Section
    viewType: document.getElementById('qol-view-type'),
    viewOpenness: document.getElementById('qol-view-openness'),
    amenityChecklist: document.getElementById('qol-amenity-checklist'),
    viewCommentary: document.getElementById('qol-view-commentary'),
    viewResult: document.getElementById('qol-view-result'),

    // ★★★ 수정: id를 HTML과 완전히 일치시킴 ★★★
    // Education Section
    eduStage: document.getElementById('qol-edu-stage'),
    eduChecklistArea: document.getElementById('qol-edu-checklist-area'),
    eduChecklist: document.getElementById('qol-edu-checklist'),
    educationCommentary: document.getElementById('qol-edu-commentary'),
    educationResult: document.getElementById('qol-edu-result'),
    // Final Summary Section
    finalSummarySection: document.getElementById('final-summary-section'),
};