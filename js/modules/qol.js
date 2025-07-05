import { elements } from './dom.js';
import { appState } from './state.js';
import { formatDisplayCurrency } from '../utils.js';
import { calculateNetIncomeData, getTaxFromBase } from './calculations.js';

// =================================================================
// 1. 데이터 및 설정값
// =================================================================
const QOL_DATA = {
    commute: {
        baseTime: 33,
        // ★★★ 수정: 대전시 평균 통근 교통비 기준점 추가 ★★★
        baseCost: 91000, 
        workDays: 21, 
        timeValueRatio: 0.33, 
        walkPremium: 1.2,
        weights: [ { limit: 20, weight: 0.8 }, { limit: 30, weight: 1.0 }, { limit: 45, weight: 1.5 }, { limit: 60, weight: 2.2 }, { limit: Infinity, weight: 3.0 }, ],
    },
    housing: { new: 250000, renovated: 100000, remodelPeriod: 120, },
    infra: {
        max_value: 300000,
        items: { '대중교통(지하철)': 80000, '대형쇼핑몰(백화점/아울렛)': 70000, '대형마트': 40000, '슬세권(편의점/카페)': 30000, '종합병원(상급)': 50000, '관공서/은행': 10000, '대규모 공원(녹지)': 60000, '수변공간(강/호수)': 80000, '문화시설(영화관/공연장)': 20000, '체육시설': 15000 }
    },
    view: {
        types: { '막힘': -50000, '도심': 20000, '단지 내': 30000, '트인 뷰': 60000, '공원/산': 80000, '강/호수': 150000 },
        openness: { '답답함': -40000, '일부 막힘': -20000, '좋음': 40000, '파노라마': 50000 },
        amenities: { '남향/채광우수': 30000, '넓은 동간거리': 10000 }
    },
    education: {
        stages: { '해당 없음': 0, '자녀 계획중': 0, '영유아': 0, '초등학생': 0, '중/고등학생': 0 },
        checklists: {
            '영유아': { '도보 5분 내 국공립 어린이집/유치원': 100000 },
            '초등학생': { '초품아 또는 안전한 도보 통학로': 180000 },
            '중/고등학생': { '우수 학원가 차량 15분 내 접근': 350000 }
        }
    }
};

let userOverrides = {};
let systemValues = {};


// =================================================================
// 2. 초기화 및 이벤트 리스너 설정
// =================================================================
export function initializeQoLPage() {
    userOverrides = {};
    setupEventListeners();
    populateUI();
    elements.commuteP2Div.classList.toggle('hidden', appState.inputs.borrowerCount !== 2);
    Object.keys(qolCalculators).forEach(key => qolCalculators[key]());
}

function populateUI() {
    elements.viewType.innerHTML = Object.keys(QOL_DATA.view.types).map(key => `<option value="${key}">${key}</option>`).join('');
    elements.viewOpenness.innerHTML = Object.keys(QOL_DATA.view.openness).map(key => `<option value="${key}">${key}</option>`).join('');
    elements.eduStage.innerHTML = Object.keys(QOL_DATA.education.stages).map(key => `<option value="${key}">${key}</option>`).join('');
    elements.infraChecklist.innerHTML = Object.keys(QOL_DATA.infra.items).map(key => createCheckboxHTML('infra-items', key, key)).join('');
    elements.amenityChecklist.innerHTML = Object.keys(QOL_DATA.view.amenities).map(key => createCheckboxHTML('amenity-items', key, key)).join('');
    updateEduChecklistVisibility();
}

function setupEventListeners() {
    const qolPage = document.getElementById('qol-analysis-page');
    if (!qolPage) return;

    const handleInteraction = (event) => {
        const sectionElement = event.target.closest('.qol-section');
        if (!sectionElement) return;

        if (event.target.id === 'qol-housing-type') {
            const isOld = event.target.value === 'old';
            elements.renoCost.parentElement.classList.toggle('hidden', !isOld);
        }
        if (event.target.id === 'qol-edu-stage') {
            updateEduChecklistVisibility();
        }

        const sectionKey = sectionElement.dataset.section;
        if (sectionKey && qolCalculators[sectionKey] && userOverrides[sectionKey] === undefined) {
            qolCalculators[sectionKey]();
        }
    };
    
    qolPage.addEventListener('change', handleInteraction);
    qolPage.addEventListener('input', handleInteraction);
}

function createCheckboxHTML(name, value, label) {
    return `<label class="checklist-label"><input type="checkbox" name="${name}" value="${value}" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"><span>${label}</span></label>`;
}

function updateEduChecklistVisibility() {
    const stage = elements.eduStage.value;
    const checklistData = QOL_DATA.education.checklists[stage];
    
    if (checklistData) {
        elements.eduChecklist.innerHTML = Object.keys(checklistData).map(key => createCheckboxHTML('edu-items', key, key)).join('');
        elements.eduChecklistArea.classList.remove('hidden');
    } else {
        elements.eduChecklistArea.classList.add('hidden');
        elements.eduChecklist.innerHTML = '';
    }
}


// =================================================================
// 4. 가치 계산 함수들 (Calculators)
// =================================================================
const qolCalculators = {
    // ★★★ 수정: 자세히 보기에 실제 계산식을 보여주는 로직 추가 ★★★
    commute: () => {
        const p1 = calculateSingleCommute(1);
        const p2 = appState.inputs.borrowerCount === 2 ? calculateSingleCommute(2) : { value: 0, commentary: '', details: '' };
        const totalValue = p1.value + p2.value;

        const commentary = `<p><strong>통근자 1:</strong> ${p1.commentary}</p>${p2.commentary ? `<p class="mt-2"><strong>통근자 2:</strong> ${p2.commentary}</p>` : ''}`;
        const details = `
            <p class='font-bold text-slate-700'>핵심 아이디어</p>
            <p>통근은 돈과 시간뿐 아니라 정신적/육체적 '피로도'를 소모하는 활동입니다. 이 피로도의 가치를 돈으로 환산합니다.</p>
            <p class='font-bold text-slate-700 mt-2'>계산 방식</p>
            <ol class='list-decimal list-inside text-sm space-y-1'>
                <li><strong>나의 시간당 가치 계산:</strong> 입력하신 연봉을 기준으로, 나의 1시간 노동이 얼마의 가치를 갖는지 계산합니다. (나의 시급)</li>
                <li><strong>기준 시간(33분) 대비 손익 계산:</strong> 통계청 조사 기준, 대전 직장인 평균 통근 시간(편도 33분)보다 얼마나 더 길거나 짧은지 비교하여 가치를 계산합니다.</li>
                <li><strong> 충청권 직장인의 평균 통근 거리는 왕복 31.6km(15.8km x 2), 연비 12km/L, 유가 1650원/L 적용 시 91,000원:</strong> 평균 교통비와 비교하여 가치를 계산합니다.</li>
                <li><strong>피로도 가중치 적용:</strong> 통근 시간이 길어질수록 피로도는 2배, 3배로 급격히 늘어납니다. 이 비례적인 피로도 증가를 '가중치'로 적용하여 현실성을 높였습니다.</li>
            </ol>
            <p class='font-bold text-slate-700 mt-2'>직접 수정 가이드</p>
            <p class='text-sm'>"나는 원래 출퇴근에 극심한 스트레스를 받는다" 등 통근에 유독 민감하다면 시스템 제안 가치보다 높게, 반대로 "나는 통근 시간에 책을 읽거나 운전을 즐긴다"면 더 낮은 값을 입력하세요.</p>
        `;
        renderSectionResult('commute', totalValue, commentary, details);
    },
    housing: () => {
        const type = elements.housingType.value;
        let value, commentary = '', details = '';
        if (type === 'old') {
            const renoCost = (parseFloat(elements.renoCost.value) || 0) * 10000;
            value = -renoCost / QOL_DATA.housing.remodelPeriod;
            commentary = `리모델링이 필요한 주택은 입주 후 추가 비용이 발생합니다.`;
            details = `
                <p class='font-bold text-slate-700'>핵심 아이디어</p>
                <p>리모델링 비용은 미래에 지출할 목돈으로, 이를 월세처럼 환산하여 현재 가치에 반영합니다.</p>
                <p class='font-bold text-slate-700 mt-2'>계산 방식</p>
                <p>입력하신 '예상 리모델링 총 비용'(${formatDisplayCurrency(renoCost, 'full')})을 향후 10년(120개월) 동안 매달 나눠내는 할부금처럼 계산하여 월 (-)가치로 반영합니다.</p>
                <p class='font-bold text-slate-700 mt-2'>직접 수정 가이드</p>
                <p class='text-sm'>"나는 인테리어 업계에 종사해서 아주 저렴하게 수리할 수 있다"면 마이너스(-) 값을 줄이거나, "오래된 집의 감성을 즐긴다"면 0에 가깝게 수정할 수 있습니다.</p>
            `;
        } else {
            value = QOL_DATA.housing[type] || 0;
            commentary = type === 'new' ? '신축 아파트는 향후 10년간 수리비 절감, 커뮤니티 시설 이용 등을 고려하여 높은 부가 가치를 가집니다.' : '리모델링 된 주택은 내부 거주 만족도는 높지만, 공용부 노후화 등 수리 가능성은 여전히 존재합니다.';
            details = `
                <p class='font-bold text-slate-700'>핵심 아이디어</p>
                <p>새 집의 가치는 '미래 비용 절감'과 '일상의 편리함'에서 나옵니다.</p>
                <p class='font-bold text-slate-700 mt-2'>계산 방식</p>
                <p>향후 10년간 발생할 수 있는 수리 비용을 아끼고, 최신 시설(커뮤니티, 시스템 등)을 이용하며 얻는 편리함을 종합하여 월 (+)가치로 환산했습니다.</p>
                <p class='font-bold text-slate-700 mt-2'>직접 수정 가이드</p>
                <p class='text-sm'>"나는 벌레나 소음에 극도로 민감해서 무조건 새 집이어야 한다" 와 같이 새 집이 주는 안정감에 큰 가치를 둔다면 더 높게 설정하세요.</p>
            `;
        }
        renderSectionResult('housing', value, commentary, details);
    },
    infra: () => {
        const checkedItems = [...elements.infraChecklist.querySelectorAll('input:checked')].map(el => el.value);
        const rawSum = checkedItems.reduce((sum, key) => sum + QOL_DATA.infra.items[key], 0);
        const value = Math.min(rawSum, QOL_DATA.infra.max_value);
        const commentary = checkedItems.length > 0 ? `선택하신 ${checkedItems.length}개 인프라는 시간 절약과 편의성 측면에서 높은 가치를 제공합니다.` : '주요 인프라가 부족할 경우, 생활 편의성이 다소 낮아 시간/비용 소모가 발생할 수 있습니다.';
        const details = `
            <p class='font-bold text-slate-700'>핵심 아이디어</p>
            <p>집 주변 인프라는 나의 '시간'과 '돈'을 직접적으로 아껴주는 자산입니다.</p>
            <p class='font-bold text-slate-700 mt-2'>계산 방식</p>
            <p>마트, 지하철역 등이 가까워 아낄 수 있는 교통비와 시간을 월 단위로 환산하고, '슬세권'의 편리함, 병원/공원의 안정감 등을 종합하여 가치로 계산합니다.<br>(최대 ${formatDisplayCurrency(QOL_DATA.infra.max_value, 'full')}까지 반영)</p>
            <p class='font-bold text-slate-700 mt-2'>직접 수정 가이드</p>
            <p class='text-sm'>"나는 자차가 없어 대중교통 의존도가 절대적이다" 등 특정 인프라의 중요도가 남들보다 높다면 더 높은 가치를 부여하세요.</p>
        `;
        renderSectionResult('infra', value, commentary, details);
    },
    view: () => {
        const baseViewValue = QOL_DATA.view.types[elements.viewType.value] || 0;
        const opennessValue = QOL_DATA.view.openness[elements.viewOpenness.value] || 0;
        const checkedAmenities = [...elements.amenityChecklist.querySelectorAll('input:checked')].map(el => el.value);
        const amenityValue = checkedAmenities.reduce((sum, key) => sum + (QOL_DATA.view.amenities[key] || 0), 0);
        const value = baseViewValue + opennessValue + amenityValue;
        
        const commentary = `매일 보는 풍경은 주거 만족도에 큰 영향을 줍니다.`;
        const details = `
            <p class='font-bold text-slate-700'>핵심 아이디어</p>
            <p>조망, 채광, 사생활 보호는 정서적 만족감을 결정하는 중요 요소입니다.</p>
            <p class='font-bold text-slate-700 mt-2'>계산 방식</p>
            <p><strong>[조망 종류] + [개방감] + [기타 환경]</strong>의 가치를 합산합니다.<br>
            - 조망: ${formatDisplayCurrency(baseViewValue, 'full')}<br>
            - 개방감: ${formatDisplayCurrency(opennessValue, 'full')}<br>
            - 기타(${checkedAmenities.length}개): ${formatDisplayCurrency(amenityValue, 'full')}</p>
            <p class='font-bold text-slate-700 mt-2'>직접 수정 가이드</p>
            <p class='text-sm'>"나는 재택근무를 해서 집에 머무는 시간이 길다" 또는 "뷰가 좋으면 우울감이 해소될 정도로 풍경을 중요하게 생각한다"면 가치를 과감하게 높여보세요.</p>
        `;
        renderSectionResult('view', value, commentary, details);
    },
    education: () => {
        const stage = elements.eduStage.value;
        const checkedItems = [...elements.eduChecklist.querySelectorAll('input:checked')].map(el => el.value);
        let value = 0, details = '자녀 단계에 맞는 교육 환경의 가치를 평가합니다.';

        if (QOL_DATA.education.checklists[stage] && checkedItems.length > 0) {
            value = checkedItems.reduce((sum, key) => sum + (QOL_DATA.education.checklists[stage][key] || 0), 0);
            details = `
                <p class='font-bold text-slate-700'>핵심 아이디어</p>
                <p>우수한 교육 환경은 자녀를 위해 기꺼이 지불할 용의가 있는 '교육 프리미엄'입니다.</p>
                <p class='font-bold text-slate-700 mt-2'>계산 방식</p>
                <p>선택하신 항목(${checkedItems.join(', ')})의 가치를 합산하여 반영합니다.<br>
                합계: ${formatDisplayCurrency(value, 'full')}</p>
                 <p class='font-bold text-slate-700 mt-2'>직접 수정 가이드</p>
                <p class='text-sm'>"나는 사교육보다 공교육을 신뢰한다"면 가치를 낮추거나, "이 목록에는 없지만, 우리 아이에게 꼭 필요한 학원이 근처에 있다"면 가치를 더 높게 수정할 수 있습니다.</p>
            `;
        }
        
        let commentary = '';
        if (stage === '해당 없음') commentary = '자녀 교육에 대한 고려가 없어, 이 항목의 가치는 0원으로 평가됩니다.';
        else if (stage === '자녀 계획중') commentary = '향후 자녀 계획이 있다면, 이 지역의 교육 환경이 미래의 장점이 될 수 있습니다. 현재 가치 평가는 0원입니다.';
        else commentary = `자녀의 '${stage}' 단계를 고려하여 교육 시설 접근성을 평가합니다.`;

        renderSectionResult('education', value, commentary, details);
    }
};

function calculateSingleCommute(personIndex) {
    const time = parseFloat(document.getElementById(`qol-commute-time${personIndex}`).value) || 0;
    const cost = parseFloat(document.getElementById(`qol-commute-cost${personIndex}`).value) || 0;
    const type = document.getElementById(`qol-commute-type${personIndex}`).value;
    const income = appState.inputs[`annualIncome${personIndex}`];

    if (time === 0) {
        return { value: 0, commentary: '통근이 발생하지 않습니다.', details: '0원' };
    }
    
    // 시간 가치 계산
    const hourlyWage = income / 2086;
    const commuteHourlyValue = hourlyWage * QOL_DATA.commute.timeValueRatio;
    let weightedTime = 0, remainingTime = time, lastLimit = 0;
    for (const tier of QOL_DATA.commute.weights) {
        const timeInTier = Math.min(remainingTime, tier.limit - lastLimit);
        weightedTime += timeInTier * tier.weight;
        remainingTime -= timeInTier;
        lastLimit = tier.limit;
        if (remainingTime <= 0) break;
    }
    let baseWeightedTime = 0;
    remainingTime = QOL_DATA.commute.baseTime;
    lastLimit = 0;
    for (const tier of QOL_DATA.commute.weights) {
        const timeInTier = Math.min(remainingTime, tier.limit - lastLimit);
        baseWeightedTime += timeInTier * tier.weight;
        remainingTime -= timeInTier;
        lastLimit = tier.limit;
        if (remainingTime <= 0) break;
    }
    const monthlyTimeDiff = (baseWeightedTime - weightedTime) * 2 * QOL_DATA.commute.workDays;
    let monthlyTimeValue = (monthlyTimeDiff / 60) * commuteHourlyValue;
    
    let commentary = `편도 ${time}분, 월 교통비 ${formatDisplayCurrency(cost, 'full')} 기준.`;
    if (type === 'walk') {
        monthlyTimeValue *= QOL_DATA.commute.walkPremium;
        commentary = `도보 ${time}분 기준. 쾌적함과 건강 증진 효과를 고려하여 가치를 높게 평가합니다.`;
    }

    // ★★★ 수정: 교통비 가치 계산 로직 추가 ★★★
    const costValue = QOL_DATA.commute.baseCost - cost;
    const finalValue = monthlyTimeValue + costValue;

    const details = `
        <span class='text-blue-600'>(시간 가치 ${formatDisplayCurrency(monthlyTimeValue, 'full')})</span> + 
        <span class='text-green-600'>(교통비 절감 ${formatDisplayCurrency(costValue, 'full')})</span>
        = ${formatDisplayCurrency(finalValue, 'full')}
    `;

    return { value: finalValue, commentary, details };
}


// =================================================================
// 5. 렌더링 및 최종 분석 함수들
// =================================================================
function renderSectionResult(key, value, commentary, details) {
    systemValues[key] = value;
    const finalValue = userOverrides[key] !== undefined ? userOverrides[key] : value;
    
    const resultBox = elements[`${key}Result`];
    const commentaryBox = elements[`${key}Commentary`];
    
    if (commentaryBox) commentaryBox.innerHTML = commentary;
    
    const formattedValue = formatDisplayCurrency(finalValue, 'full');
    const valueClass = finalValue >= 0 ? 'positive' : 'negative';
    const isOverridden = userOverrides[key] !== undefined;

    if (resultBox) {
        resultBox.innerHTML = `
            <div class="flex-grow">
                <div class="flex items-center gap-2">
                    <span class="label">월 예상 가치</span>
                    ${isOverridden ? '<span class="text-xs text-amber-600 font-bold">[수동입력]</span>' : ''}
                </div>
                <span class="value ${valueClass}">${finalValue >= 0 ? '+' : ''}${formattedValue}</span>
                <div class="mt-2">
                    <button class="details-toggle text-xs text-indigo-600 font-semibold">[자세히 보기]</button>
                </div>
                <div class="details-content hidden mt-2 p-3 bg-white rounded-md border text-sm">
                    ${details}
                </div>
            </div>
            <div class="flex-shrink-0">
                <button class="edit-button" data-key="${key}" title="직접 평가하기">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-500 hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                </button>
            </div>
        `;
        resultBox.querySelector('.edit-button').addEventListener('click', (e) => {
             e.stopPropagation();
             handleEdit(key);
        });
        resultBox.querySelector('.details-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            const content = resultBox.querySelector('.details-content');
            content.classList.toggle('hidden');
            e.target.textContent = content.classList.contains('hidden') ? '[자세히 보기]' : '[숨기기]';
        });
    }
}

function handleEdit(key) {
    const currentValue = userOverrides[key] !== undefined ? userOverrides[key] : systemValues[key];
    const userInput = prompt(`'${key}' 항목의 가치를 직접 입력하세요 (단위: 원).\n시스템 계산값: ${currentValue.toLocaleString('ko-KR')} 원\n\n취소하거나 빈 값으로 두면 시스템 계산값으로 복원됩니다.`, currentValue);

    if (userInput === null) return;

    if (userInput.trim() === '') {
        delete userOverrides[key];
    } else {
        const numericValue = parseInt(userInput, 10);
        if (!isNaN(numericValue)) {
            userOverrides[key] = numericValue;
        } else {
            alert('유효한 숫자를 입력해주세요.');
            return;
        }
    }
    qolCalculators[key]();
}

export function calculateAllQoL() {
    let totalValue = 0;
    for (const key in systemValues) {
        totalValue += userOverrides[key] !== undefined ? userOverrides[key] : systemValues[key];
    }
    return totalValue;
}

export function showFinalAnalysis(state, totalQoLValue) {
    const { inputs } = state;

    const loanPrincipal = inputs.housePrice - inputs.cash;
    const monthlyInterest = loanPrincipal * (inputs.interestRate / 12);
    
    let taxRefundOnInterest = 0;
    if (monthlyInterest > 0) {
        if (inputs.borrowerCount === 1) {
            const { taxBase } = calculateNetIncomeData(inputs.annualIncome1);
            const taxRate = taxBase > 0 ? getTaxFromBase(taxBase) / taxBase : 0.06;
            taxRefundOnInterest = monthlyInterest * taxRate;
        } else {
            const interestPerPerson = monthlyInterest / 2;
            const { taxBase: taxBase1 } = calculateNetIncomeData(inputs.annualIncome1);
            const { taxBase: taxBase2 } = calculateNetIncomeData(inputs.annualIncome2);
            const taxRate1 = taxBase1 > 0 ? getTaxFromBase(taxBase1) / taxBase1 : 0.06;
            const taxRate2 = taxBase2 > 0 ? getTaxFromBase(taxBase2) / taxBase2 : 0.06;
            taxRefundOnInterest = (interestPerPerson * taxRate1) + (interestPerPerson * taxRate2);
        }
    }
    const effectiveMonthlyInterest = monthlyInterest - taxRefundOnInterest;

    const perceivedMonthlyCost = effectiveMonthlyInterest - totalQoLValue;

    const summaryHTML = `
        <div class="card bg-slate-50 border border-slate-200">
            <h2 class="section-title text-indigo-700">📊 최종 종합 분석</h2>
            <div class="mt-4 text-center">
                <p class="text-slate-600">이 집의 최종 '체감 월 주거비용'은 다음과 같습니다.</p>
                <p class="text-5xl font-bold text-indigo-600 my-4">${formatDisplayCurrency(perceivedMonthlyCost, 'full')}</p>
                 <p class="text-sm text-slate-500">(실효 월 이자 - '삶의 질' 가치)</p>
            </div>
            <table class="w-full mt-6 text-sm">
                <tbody class="divide-y divide-slate-200">
                    <tr class="py-2"><td class="py-2">1️⃣ 실효 월 이자 (세금혜택 반영)</td><td class="text-right font-semibold text-red-600">${formatDisplayCurrency(effectiveMonthlyInterest, 'full')}</td></tr>
                    <tr class="py-2"><td class="py-2">2️⃣ '삶의 질' 부가 가치</td><td class="text-right font-semibold text-blue-600">- ${formatDisplayCurrency(totalQoLValue, 'full')}</td></tr>
                </tbody>
                <tfoot class="border-t-2 border-slate-300">
                    <tr><td class="pt-2 font-bold">최종 체감 월 주거비용</td><td class="pt-2 text-right font-bold text-indigo-700 text-lg">${formatDisplayCurrency(perceivedMonthlyCost, 'full')}</td></tr>
                </tfoot>
            </table>
            <div class="commentary-box mt-6 bg-white">
                <p class="font-bold">💡 결론 코멘트</p>
                <p class="mt-2">이 집을 소유함으로써 매달 부담해야 하는 <strong class="text-red-600">실질적인 이자 비용</strong>은 약 <strong>${formatDisplayCurrency(effectiveMonthlyInterest, 'manwon')}</strong>입니다.</p>
                <p class="mt-2">하지만 이 집이 제공하는 통근, 환경, 인프라 등의 <strong class="text-blue-600">'삶의 질' 가치</strong>가 월 <strong>${formatDisplayCurrency(totalQoLValue, 'manwon')}</strong>만큼의 만족을 주어 이자 부담을 상쇄합니다.</p>
                <p class="mt-4 font-bold">따라서, 당신이 느끼는 최종적인 '체감 월 주거비용'은 <strong class="text-indigo-700">${formatDisplayCurrency(perceivedMonthlyCost, 'manwon')}</strong>입니다.</p>
                <p class="mt-2 text-sm text-slate-600">※ 이 값이 0에 가깝거나 마이너스(-)라면, 이자 부담을 넘어선 큰 만족감을 주는 매우 합리적인 선택임을 의미합니다.</p>
            </div>
        </div>
    `;

    elements.finalSummarySection.innerHTML = summaryHTML;
    elements.finalSummarySection.classList.remove('hidden');
    elements.showFinalAnalysisButton.classList.add('hidden');
}