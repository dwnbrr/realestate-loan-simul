// js/main.js

// ★★★ 오류 수정: initializeDOMElements 함수는 dom.js에 없으므로 import에서 제거합니다.
import { elements } from './modules/dom.js';
import { appState, collectInputs } from './modules/state.js';
import * as calc from './modules/calculations.js';
import { renderFinancialResultsPage } from './modules/ui.js';
import { initializeQoLPage, calculateAllQoL, showFinalAnalysis } from './modules/qol.js';

/**
 * 애플리케이션의 모든 이벤트 리스너를 설정합니다.
 */
function initializeEventListeners() {
    // 1단계 -> 2단계: 재무 분석하기 버튼
    elements.calculateFinancialsButton.addEventListener('click', () => {
        runFinancialSimulation();
    });
    
    // 2단계 -> 1단계: 입력값 수정 버튼
    elements.recalculateButton.addEventListener('click', () => {
        elements.financialResultsPage.classList.add('hidden');
        elements.financialInputPage.classList.remove('hidden');
        window.scrollTo(0, 0);
    });

    // 2단계 -> 3단계: 삶의 질 분석하기 버튼
    elements.analyzeQoLButton.addEventListener('click', () => {
        elements.financialResultsPage.classList.add('hidden');
        elements.qolAnalysisPage.classList.remove('hidden');
        initializeQoLPage();
        window.scrollTo(0, 0);
    });

    // 3단계 -> 최종 결과 보기 버튼
    elements.showFinalAnalysisButton.addEventListener('click', () => {
        const totalQoLValue = calculateAllQoL();
        showFinalAnalysis(appState, totalQoLValue);
        elements.finalSummarySection.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });

    // 공통 이벤트 리스너
    elements.borrowerCountSelect.addEventListener('change', handleBorrowerCountChange);

    elements.unitToggleButton.addEventListener('click', (e) => {
        appState.displayUnit = appState.displayUnit === 'manwon' ? 'full' : 'manwon';
        e.target.textContent = `단위 전환 (${appState.displayUnit === 'manwon' ? '원' : '만원'})`;
        if (!elements.financialResultsPage.classList.contains('hidden')) {
            runFinancialSimulation(false);
        }
    });

    elements.exportDataButton.addEventListener('click', exportData);
}

/**
 * 1단계: 재무 시뮬레이션을 실행하는 함수입니다.
 * @param {boolean} [shouldSwitchPage=true] - 실행 후 결과 페이지로 전환할지 여부
 */
function runFinancialSimulation(shouldSwitchPage = true) {
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

    // ★★★ 수정: managementCost를 surplus 계산에 포함하여 일관성 확보 ★★★
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
    
    if (shouldSwitchPage) {
        elements.financialInputPage.classList.add('hidden');
        elements.financialResultsPage.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
}

/**
 * 헬퍼 함수: 상환 인원 수에 따라 UI를 변경합니다.
 */
function handleBorrowerCountChange() {
    const isTwoBorrowers = elements.borrowerCountSelect.value === '2';
    elements.income2Section.classList.toggle('hidden', !isTwoBorrowers);
}

/**
 * 헬퍼 함수: 계산된 데이터를 CSV 형식으로 내보냅니다.
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

    const newWindow = window.open("", "_blank");
    newWindow.document.write(`<html lang="ko"><head><title>Raw Data</title><style>body{font-family:monospace; white-space:pre; padding: 1rem;} button{margin-bottom:1rem; padding: 5px 10px; border:1px solid #ccc; border-radius:4px; cursor:pointer;}</style></head><body><button id="downloadCsv">CSV 다운로드</button><hr>${csvContent.replace(/\n/g, '<br>')}
    <script>document.getElementById('downloadCsv').addEventListener('click', () => { const blob = new Blob([${JSON.stringify(csvContent)}], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", "financial_simulation_data.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); });<\/script></body></html>`);
}

/**
 * 애플리케이션 초기화 함수
 */
function init() {
    initializeEventListeners();
    handleBorrowerCountChange(); // 페이지 로드 시 초기 상태 설정
}

// 애플리케이션 시작!
init();