import { elements } from './modules/dom.js';
import { appState, collectInputs } from './modules/state.js';
import * as calc from './modules/calculations.js';
import { renderFinancialResultsPage } from './modules/ui.js';
import { initializeQoLPage, calculateAllQoL, renderFinalAnalysis } from './modules/qol.js';

// =================================================================
// 1. 페이지 관리 및 네비게이션
// =================================================================

const pages = document.querySelectorAll('.page-content');
const navButtons = document.querySelectorAll('.nav-button');

/**
 * [수정된 함수]
 * 페이지 ID에 따라 올바른 네비게이션 버튼을 활성화합니다.
 * @param {string} pageId - 표시할 페이지의 ID
 */
function showPage(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    navButtons.forEach(button => button.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // pageId로부터 올바른 navId를 찾아 활성화합니다.
    let navId;
    if (pageId.startsWith('financial')) {
        navId = 'nav-financial';
    } else if (pageId.startsWith('qol')) {
        navId = 'nav-qol';
    } else if (pageId.startsWith('final')) {
        navId = 'nav-final';
    }

    const targetNavButton = document.getElementById(navId);
    if (targetNavButton) {
        targetNavButton.classList.add('active');
    }
}

function initializeNavigation() {
    navButtons.forEach(button => {
        const pageKey = button.id.replace('nav-', '');
        button.addEventListener('click', () => navigate(pageKey));
    });
}

/**
 * [수정된 함수]
 * pageKey에 따라 정확한 페이지 ID를 찾아 이동합니다.
 * @param {string} pageKey - 이동할 페이지를 나타내는 키
 */
function navigate(pageKey) {
    // pageKey에 따라 정확한 페이지 ID를 매핑합니다.
    let targetPageId;
    if (pageKey === 'financial') {
        targetPageId = 'financial-input-page';
    } else if (pageKey === 'qol' || pageKey === 'qol-analysis') { // 상단 네비, 페이지 내 버튼 클릭 모두 처리
        targetPageId = 'qol-analysis-page';
    } else if (pageKey === 'final' || pageKey === 'final-analysis') { // 상단 네비, 페이지 내 버튼 클릭 모두 처리
        targetPageId = 'final-analysis-page';
    } else {
        console.error('알 수 없는 페이지 키:', pageKey);
        return;
    }

    // 재무 분석이 선행되어야 하는 페이지 이동을 막는 조건
    if (pageKey.includes('qol') || pageKey.includes('final')) {
        if (Object.keys(appState.results).length === 0) {
            alert('먼저 1단계 재무 분석을 실행해주세요.');
            showPage('financial-input-page');
            return;
        }
    }
    
    // 페이지별 초기화 및 최종 분석 실행
    if (pageKey.includes('qol') && !document.getElementById('qol-analysis-page').dataset.initialized) {
        initializeQoLPage();
        document.getElementById('qol-analysis-page').dataset.initialized = 'true';
    }
    
    if (pageKey.includes('final')) {
        const totalQoLValue = calculateAllQoL();
        renderFinalAnalysis(appState, totalQoLValue);
    }

    showPage(targetPageId);
    window.scrollTo(0, 0);
}


// =================================================================
// 2. 핵심 로직 실행
// =================================================================

function runFinancialSimulation() {
    collectInputs();
    
    const i = appState.inputs;
    let totalAnnualIncome, netMonthlyIncome;
    if (i.borrowerCount === 1) {
        totalAnnualIncome = i.annualIncome1;
        netMonthlyIncome = calc.calculateNetIncomeData(totalAnnualIncome).netMonthly;
    } else {
        totalAnnualIncome = i.annualIncome1 + i.annualIncome2;
        netMonthlyIncome = calc.calculateNetIncomeData(i.annualIncome1).netMonthly + calc.calculateNetIncomeData(i.annualIncome2).netMonthly;
    }
    const loanPrincipal = i.housePrice - i.cash;
    const monthlyRate = i.interestRate / 12;
    const nper = i.loanTerm * 12;
    const monthlyPayment = calc.calculatePMT(monthlyRate, nper, loanPrincipal);
    const surplus = netMonthlyIncome - monthlyPayment - i.otherLoanPayment - i.livingCost - i.managementCost;
    const dsr = totalAnnualIncome > 0 ? ((monthlyPayment + i.otherLoanPayment) * 12) / totalAnnualIncome : 0;
    const stressRate1 = i.interestRate + 0.01;
    const stressPayment1 = loanPrincipal > 0 ? calc.calculatePMT(stressRate1 / 12, nper, loanPrincipal) : 0;
    const stressRate2 = i.interestRate + 0.02;
    const stressPayment2 = loanPrincipal > 0 ? calc.calculatePMT(stressRate2 / 12, nper, loanPrincipal) : 0;
    const futureAnalysisResults = calc.generateFutureAnalysis(i);
    
    appState.results = {
        totalAnnualIncome, netMonthlyIncome, monthlyPayment, surplus, dsr,
        stressPayment1, stressPayment2,
        ...futureAnalysisResults
    };
    
    renderFinancialResultsPage();
    showPage('financial-results-page');
    window.scrollTo(0, 0);
}


// =================================================================
// 3. 초기화 및 이벤트 리스너
// =================================================================

function initializeEventListeners() {
    elements.calculateFinancialsButton.addEventListener('click', runFinancialSimulation);
    
    // 페이지 이동 버튼 리스너 (navigate 함수가 수정되어 이제 정상 작동)
    elements.goToQolButton.addEventListener('click', () => navigate('qol-analysis'));
    elements.goToFinalAnalysisButton.addEventListener('click', () => navigate('final-analysis'));

    elements.finalSummaryContent.addEventListener('click', (e) => {
        if (e.target.id === 'go-back-to-financial-button') {
            navigate('financial');
        } else if (e.target.id === 'go-back-to-qol-button') {
            navigate('qol-analysis');
        }
    });

    elements.borrowerCountSelect.addEventListener('change', () => {
        const isTwoBorrowers = elements.borrowerCountSelect.value === '2';
        elements.income2Section.classList.toggle('hidden', !isTwoBorrowers);
    });

    elements.unitToggleButton.addEventListener('click', (e) => {
        appState.displayUnit = appState.displayUnit === 'manwon' ? 'full' : 'manwon';
        e.target.textContent = `단위 전환 (${appState.displayUnit === 'manwon' ? '원' : '만원'})`;
        if (document.getElementById('financial-results-page').classList.contains('active')) {
            renderFinancialResultsPage();
        }
    });

    elements.exportDataButton.addEventListener('click', exportData);
}

/**
 * [수정된 함수]
 * 데이터를 새 창에 표시하는 대신, CSV 파일로 직접 다운로드합니다.
 */
function exportData() {
    if (!appState.rawData || appState.rawData.length === 0) {
        alert('먼저 재무 분석을 실행해주세요.');
        return;
    }
    const headers = ["년차", "월 실수령액(명목)", "월 소비액(상승)", "월 잉여금(명목)", "월 잉여금(현재가치)", "실질 총 연봉(현재가치)", "실체감 월상환액(현재가치)", "월 적립액(현재가치)", "연 누적액(현재가치)"];
    let csvContent = "\uFEFF" + headers.join(',') + '\n';
    
    appState.rawData.forEach(row => {
        const values = [
            row.year, Math.round(row.futureNetMonthlyIncome), Math.round(row.futureMonthlyConsumption),
            Math.round(row.monthlySurplus), Math.round(row.monthlySurplusPV), Math.round(row.futureRealTotalSalary),
            Math.round(row.presentValueOfRealMonthlyPayment), Math.round(row.monthlySavingsPV), Math.round(row.cumulativePrincipalPV)
        ];
        csvContent += values.join(',') + '\n';
    });

    // 새 창 대신 직접 다운로드 링크를 생성하고 클릭합니다.
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "financial_simulation_data.csv");
    document.body.appendChild(link); // Firefox 브라우저 호환성을 위해 추가
    link.click();
    document.body.removeChild(link); // 사용한 링크 요소 제거
}

function init() {
    initializeEventListeners();
    initializeNavigation();
    showPage('financial-input-page');
}

init();