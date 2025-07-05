/**
 * 애플리케이션에서 사용하는 모든 DOM 요소를 모아놓은 객체입니다.
 */
export const elements = {
    // ===================================
    // 페이지 컨테이너 및 메인 버튼
    // ===================================
    financialInputPage: document.getElementById('financial-input-page'),
    financialResultsPage: document.getElementById('financial-results-page'),
    qolAnalysisPage: document.getElementById('qol-analysis-page'),
    finalAnalysisPage: document.getElementById('final-analysis-page'),

    calculateFinancialsButton: document.getElementById('calculate-financials-button'),
    goToQolButton: document.getElementById('go-to-qol-button'),
    goToFinalAnalysisButton: document.getElementById('go-to-final-analysis-button'),
    
    unitToggleButton: document.getElementById('unitToggle'),
    exportDataButton: document.getElementById('exportData'),

    // ===================================
    // 1. 재무 정보 입력 요소
    // ===================================
    borrowerCountSelect: document.getElementById('borrowerCount'),
    income2Section: document.getElementById('income2-section'),

    // ===================================
    // 2. 재무 분석 결과 요소
    // ===================================
    financialResultsContent: document.getElementById('financial-results-content'),
    
    // ===================================
    // 3. 삶의 질 (QoL) 분석 요소
    // ===================================
    commuteP2Div: document.getElementById('qol-commute-p2'),
    commuteCommentary: document.getElementById('qol-commute-commentary'),
    commuteResult: document.getElementById('qol-commute-result'),
    
    housingType: document.getElementById('qol-housing-type'),
    renoCost: document.getElementById('qol-reno-cost'),
    housingCommentary: document.getElementById('qol-housing-commentary'),
    housingResult: document.getElementById('qol-housing-result'),

    infraChecklist: document.getElementById('qol-infra-checklist'),
    infraCommentary: document.getElementById('qol-infra-commentary'),
    infraResult: document.getElementById('qol-infra-result'),

    viewType: document.getElementById('qol-view-type'),
    viewOpenness: document.getElementById('qol-view-openness'),
    amenityChecklist: document.getElementById('qol-amenity-checklist'),
    viewCommentary: document.getElementById('qol-view-commentary'),
    viewResult: document.getElementById('qol-view-result'),

    eduStage: document.getElementById('qol-edu-stage'),
    eduChecklistArea: document.getElementById('qol-edu-checklist-area'),
    eduChecklist: document.getElementById('qol-edu-checklist'),
    educationCommentary: document.getElementById('qol-edu-commentary'),
    educationResult: document.getElementById('qol-edu-result'),
    
    // Final Summary Section
    finalSummaryContent: document.getElementById('final-summary-content'),
};