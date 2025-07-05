// js/modules/ui.js
import { formatDisplayCurrency } from '../utils.js';
import { elements } from './dom.js';
import { appState } from './state.js';
/**
 * 1단계: 재무 분석 결과 페이지 전체를 렌더링합니다.
 */
export function renderFinancialResultsPage() {
    // 이전에 생성된 결과가 있다면 삭제
    if (document.getElementById('financial-results-wrapper')) {
        document.getElementById('financial-results-wrapper').remove();
    }

    // ★★★ 수정: PC에서 발생하는 레이아웃 깨짐 현상 해결 ★★★
    // 2개의 핵심 분석 카드를 상단에 배치하고, 미래 분석 테이블은 하단에 넓게 배치하는 구조로 변경
    const html = `
        <div id="financial-results-wrapper">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="card">
                    <h2 class="section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        현재 시점 분석
                    </h2>
                    <div class="mt-6 space-y-2" id="current-analysis-content">
                        </div>
                    <div class="mt-6 grid grid-cols-3 gap-4" id="diagnosis-content">
                        </div>
                    <div class="mt-6 pt-4 border-t border-slate-200">
                        <h3 class="text-sm font-semibold text-center text-slate-700 mb-2">금리 스트레스 테스트</h3>
                        <div class="text-xs space-y-1 text-center text-slate-500" id="stress-test-content">
                            </div>
                    </div>
                </div>

                <div class="card flex flex-col justify-around text-center">
                    <div id="summary-metrics-content">
                        </div>
                </div>
            </div>

            <div class="card">
                <h2 class="section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    미래 현금흐름 분석
                </h2>
                <div class="mt-4">
                    <div class="border-b border-gray-200">
                        <nav class="-mb-px flex gap-4 text-sm font-medium" aria-label="Tabs" id="financial-tabs">
                            </nav>
                    </div>
                    <div id="nominal-content" class="mt-4 table-container">
                        <table class="w-full text-sm text-left"><thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0"><tr><th class="px-3 py-2 text-center">년차</th><th class="px-3 py-2 text-right">월 실수령액</th><th class="px-3 py-2 text-right">월 소비액</th><th class="px-3 py-2 text-right">월 잉여금</th><th class="px-3 py-2 text-right">잉여금(현가)</th></tr></thead><tbody id="nominalCashflowSchedule"></tbody></table>
                    </div>
                    <div id="real-content" class="hidden mt-4 table-container">
                        <table class="w-full text-sm text-left"><thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0"><tr><th class="px-3 py-2 text-center">년차</th><th class="px-3 py-2 text-right">실질 연봉</th><th class="px-3 py-2 text-right">실체감 월상환액</th></tr></thead><tbody id="realValueSchedule"></tbody></table>
                    </div>
                    <div id="savings-content" class="hidden mt-4 table-container">
                        <table class="w-full text-sm text-left"><thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0"><tr><th class="px-3 py-2 text-center">년차</th><th class="px-3 py-2 text-right">월 적립액</th><th class="px-3 py-2 text-right">연 누적액</th></tr></thead><tbody id="savingsSchedule"></tbody></table>
                    </div>
                </div>
            </div>
        </div>
    `;

    elements.financialResultsContent.innerHTML = html;
    
    // HTML 생성 후 내용 채우기 및 이벤트 리스너 재설정
    fillFinancialResultsContent(appState.results, appState.displayUnit);
    updateDiagnosesUI(appState.results.dsr, appState.results.surplus);
    renderFutureTables(appState.rawData, appState.displayUnit);
    setupTabs();
}

function setupTabs() {
    const tabs = document.querySelectorAll('#financial-tabs .tab-button');
    const contents = document.querySelectorAll('#financial-results-wrapper .table-container');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(content => content.classList.add('hidden'));
            const activeContent = document.getElementById(tab.dataset.target);
            if (activeContent) {
                activeContent.classList.remove('hidden');
            }
        });
    });
}

/**
 * 2단계: 재무 분석 결과를 각 요소에 채워넣습니다.
 */
function fillFinancialResultsContent(results, displayUnit) {
    // 현재 분석
    document.getElementById('current-analysis-content').innerHTML = `
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-md">
            <span class="text-sm font-medium text-slate-600">총 세전 연봉</span>
            <span class="font-semibold text-slate-800">${formatDisplayCurrency(results.totalAnnualIncome, displayUnit)}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-md">
            <span class="text-sm font-medium text-slate-600">월 실수령액 (합산)</span>
            <span class="font-bold text-slate-900">${formatDisplayCurrency(results.netMonthlyIncome, displayUnit)}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-md">
            <span class="text-sm font-medium text-slate-600">월 상환액 (PMT)</span>
            <span class="font-semibold text-slate-800">- ${formatDisplayCurrency(results.monthlyPayment, displayUnit)}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-slate-100 rounded-md">
            <span class="text-sm font-bold text-slate-700">첫 달 잉여 자금</span>
            <span class="font-bold text-slate-900">${formatDisplayCurrency(results.surplus, displayUnit)}</span>
        </div>
    `;
    
    // 스트레스 테스트
    document.getElementById('stress-test-content').innerHTML = `
        <p>금리 <b>+1%</b> 상승 시 월 상환액: <span class="font-semibold text-amber-600">${formatDisplayCurrency(results.stressPayment1, displayUnit)}</span></p>
        <p>금리 <b>+2%</b> 상승 시 월 상환액: <span class="font-semibold text-red-600">${formatDisplayCurrency(results.stressPayment2, displayUnit)}</span></p>
    `;

    // 종합 지표
    document.getElementById('summary-metrics-content').innerHTML = `
        <div>
            <h2 class="text-base font-semibold text-slate-700">총 생애 잉여자금 (현재가치)</h2>
            <p class="text-3xl font-bold text-indigo-600 mt-2">${formatDisplayCurrency(results.totalLifetimeSurplusPV, displayUnit)}</p>
        </div>
        <div class="pt-4 border-t">
            <h2 class="text-base font-semibold text-slate-700">총 누적 이자 (공제 후, 현재가치)</h2>
            <p class="text-2xl font-bold text-red-600 mt-2">${formatDisplayCurrency(results.totalInterestPV, displayUnit)}</p>
        </div>
        <div class="pt-4 border-t">
            <h2 class="text-base font-semibold text-slate-700">실질 이자 비용 (공제 후, vs 물가)</h2>
            <p class="text-2xl font-bold text-amber-600 mt-2">${formatDisplayCurrency(results.totalRealInterestPV, displayUnit)}</p>
        </div>
    `;

    // 탭
    document.getElementById('financial-tabs').innerHTML = `
        <button data-target="nominal-content" class="tab-button active whitespace-nowrap py-3 px-1 border-b-2">명목 현금흐름</button>
        <button data-target="real-content" class="tab-button whitespace-nowrap py-3 px-1 border-b-2 hover:text-gray-700 hover:border-gray-300">실체감 상환액</button>
        <button data-target="savings-content" class="tab-button whitespace-nowrap py-3 px-1 border-b-2 hover:text-gray-700 hover:border-gray-300">현재가치 적금</button>
    `;
}

/**
 * 3단계: 계산된 DSR과 잉여금을 바탕으로 진단 결과를 UI에 렌더링합니다.
 */
function updateDiagnosesUI(dsr, surplus) {
    const diagnosisContent = document.getElementById('diagnosis-content');
    if (!diagnosisContent) return;

    let dsrBoxHTML, cashflowBoxHTML, finalOpinionHTML;

    // DSR 진단
    if (dsr > 0.4) dsrBoxHTML = `<div class="p-3 rounded-lg text-center status-danger"><span class="font-bold">DSR 초과</span><p class="text-xs font-normal mt-1">대출 불가</p></div>`;
    else if (dsr > 0.35) dsrBoxHTML = `<div class="p-3 rounded-lg text-center status-danger"><span class="font-bold">DSR 위험</span><p class="text-xs font-normal mt-1">상환 부담 높음</p></div>`;
    else if (dsr > 0.3) dsrBoxHTML = `<div class="p-3 rounded-lg text-center status-warning"><span class="font-bold">DSR 주의</span><p class="text-xs font-normal mt-1">관리가능 수준</p></div>`;
    else dsrBoxHTML = `<div class="p-3 rounded-lg text-center status-safe"><span class="font-bold">DSR 안정</span><p class="text-xs font-normal mt-1">매우 양호</p></div>`;

    // 현금흐름 진단
    if (surplus < 0) cashflowBoxHTML = `<div class="p-3 rounded-lg text-center status-danger"><span class="font-bold">적자 발생</span><p class="text-xs font-normal mt-1">매우 위험</p></div>`;
    else if (surplus < 500000) cashflowBoxHTML = `<div class="p-3 rounded-lg text-center status-warning"><span class="font-bold">잉여금 부족</span><p class="text-xs font-normal mt-1">생활 빠듯함</p></div>`;
    else cashflowBoxHTML = `<div class="p-3 rounded-lg text-center status-safe"><span class="font-bold">현금흐름 양호</span><p class="text-xs font-normal mt-1">안정적</p></div>`;

    // 최종 의견
    if (dsr > 0.4 || surplus < 0) finalOpinionHTML = `<div class="p-3 rounded-lg text-center status-danger font-bold"><span class="font-bold">재검토 필요</span><p class="text-xs font-normal mt-1">대출/소비 축소</p></div>`;
    else if (dsr > 0.35 || surplus < 500000) finalOpinionHTML = `<div class="p-3 rounded-lg text-center status-warning font-bold"><span class="font-bold">신중한 접근</span><p class="text-xs font-normal mt-1">비상자금 필수</p></div>`;
    else finalOpinionHTML = `<div class="p-3 rounded-lg text-center status-safe font-bold"><span class="font-bold">계획 실행 가능</span><p class="text-xs font-normal mt-1">긍정적인 계획</p></div>`;
    
    diagnosisContent.innerHTML = dsrBoxHTML + cashflowBoxHTML + finalOpinionHTML;
}

/**
 * 4단계: 미래 분석 결과를 테이블에 렌더링합니다.
 */
function renderFutureTables(rawData, displayUnit) {
    const nominalTableBody = document.getElementById('nominalCashflowSchedule');
    const realValueTableBody = document.getElementById('realValueSchedule');
    const savingsTableBody = document.getElementById('savingsSchedule');
    
    if(!nominalTableBody || !realValueTableBody || !savingsTableBody) return;

    nominalTableBody.innerHTML = '';
    realValueTableBody.innerHTML = '';
    savingsTableBody.innerHTML = '';

    rawData.forEach(row => {
        nominalTableBody.innerHTML += `
            <tr class="${row.rowClass}">
                <td data-label="년차">${row.year}</td>
                <td data-label="월 실수령액">${formatDisplayCurrency(row.futureNetMonthlyIncome, displayUnit)}</td>
                <td data-label="월 소비액" class="text-orange-500">${formatDisplayCurrency(row.futureMonthlyConsumption, displayUnit)}</td>
                <td data-label="월 잉여금" class="font-semibold ${row.monthlySurplus >= 0 ? 'text-blue-600' : 'text-red-600'}">${formatDisplayCurrency(row.monthlySurplus, displayUnit)}</td>
                <td data-label="잉여금(현가)" class="font-semibold text-teal-600">${formatDisplayCurrency(row.monthlySurplusPV, displayUnit)}</td>
            </tr>`;
        
        realValueTableBody.innerHTML += `
            <tr class="${row.rowClass}">
                <td data-label="년차">${row.year}</td>
                <td data-label="실질 연봉">${formatDisplayCurrency(row.futureRealTotalSalary, displayUnit)}</td>
                <td data-label="실체감 월상환액" class="font-bold text-indigo-600">${formatDisplayCurrency(row.presentValueOfRealMonthlyPayment, displayUnit)}</td>
            </tr>`;

        savingsTableBody.innerHTML += `
            <tr class="${row.rowClass}">
                <td data-label="년차">${row.year}</td>
                <td data-label="월 적립액">${formatDisplayCurrency(row.monthlySavingsPV, displayUnit)}</td>
                <td data-label="연 누적액" class="font-bold text-green-600">${formatDisplayCurrency(row.cumulativePrincipalPV, displayUnit)}</td>
            </tr>`;
    });
}