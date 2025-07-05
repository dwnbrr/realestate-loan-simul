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

function showPage(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    navButtons.forEach(button => button.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

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

function navigate(pageKey) {
    let targetPageId;
    if (pageKey === 'financial') {
        targetPageId = 'financial-input-page';
    } else if (pageKey === 'qol' || pageKey === 'qol-analysis') {
        targetPageId = 'qol-analysis-page';
    } else if (pageKey === 'final' || pageKey === 'final-analysis') {
        targetPageId = 'final-analysis-page';
    } else {
        console.error('알 수 없는 페이지 키:', pageKey);
        return;
    }

    if (pageKey.includes('qol') || pageKey.includes('final')) {
        if (Object.keys(appState.results).length === 0) {
            alert('먼저 1단계 재무 분석을 실행해주세요.');
            showPage('financial-input-page');
            return;
        }
    }
    
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

    // QoL 페이지의 통근자 수도 업데이트
    if(elements.commuteP2Div) {
        elements.commuteP2Div.classList.toggle('hidden', i.borrowerCount !== 2);
    }
    
    renderFinancialResultsPage();
    showPage('financial-results-page');
    window.scrollTo(0, 0);
}


// =================================================================
// 3. 초기화 및 이벤트 리스너
// =================================================================

function initializeEventListeners() {
    elements.calculateFinancialsButton.addEventListener('click', runFinancialSimulation);
    
    elements.goToQolButton.addEventListener('click', () => navigate('qol-analysis'));
    elements.goToFinalAnalysisButton.addEventListener('click', () => navigate('final-analysis'));

    elements.finalSummaryContent.addEventListener('click', (e) => {
        if (e.target.id === 'go-back-to-financial-button') {
            navigate('financial');
        } else if (e.target.id === 'go-back-to-qol-button') {
            navigate('qol-analysis');
        }
    });

    /**
     * [수정된 부분]
     * 상환 인원 변경 시, 재무정보 페이지의 2인 소득란과
     * 삶의 질 페이지의 2인 통근란을 모두 제어하도록 수정
     */
    elements.borrowerCountSelect.addEventListener('change', () => {
        const isTwoBorrowers = elements.borrowerCountSelect.value === '2';
        elements.income2Section.classList.toggle('hidden', !isTwoBorrowers);
        if(elements.commuteP2Div) {
            elements.commuteP2Div.classList.toggle('hidden', !isTwoBorrowers);
        }
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

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "financial_simulation_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function init() {
    initializeEventListeners();
    initializeNavigation();
    showPage('financial-input-page');
}

init();