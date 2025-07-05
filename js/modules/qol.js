import { elements } from './dom.js';
import { appState } from './state.js';
import { formatDisplayCurrency } from '../utils.js';
import { calculateNetIncomeData, getTaxFromBase } from './calculations.js';

// =================================================================
// 1. 데이터 및 설정값 (대전광역시 기준 최종 조정)
// =================================================================
const QOL_DATA = {
    commute: {
        baseTime: 32.6, // 충청권 평균 통근시간 (2024 통계청)
        baseCarCost: 73000, // 자차 기준 월 평균 연료비
        workDays: 20,
    },
    housing: {
        new: 300000,
        renovated: 150000,
        remodelPeriod: 120,
    },
    infra: {
        max_value: 400000,
        items: {
            '대중교통(단일노선)': 60000,
            '대중교통(환승역)': 120000,
            '대형쇼핑몰(백화점/아울렛)': 60000,
            '대형마트': 40000,
            '슬세권(편의점/카페)': 30000,
            '종합병원(상급)': 50000,
            '관공서/은행': 10000,
            '대규모 공원(녹지)': 70000,
            '문화시설(영화관/공연장)': 20000,
            '체육시설': 15000,
        }
    },
    view: {
        types: { '막힘': -70000, '도심': 30000, '단지 내': 15000, '트인 뷰': 60000, '공원/산': 80000, '갑천 등 국가하천': 150000 },
        openness: { '답답함': -40000, '일부 막힘': -15000, '좋음': 40000, '파노라마': 70000 },
        amenities: { '남향/채광우수': 30000, '넓은 동간거리': 15000 }
    },
    education: {
        stages: { '해당 없음': 0, '자녀 계획중': 0, '영유아': 0, '초등학생': 0, '중/고등학생': 0 },
        checklists: {
            '영유아': { '도보 5분 내 국공립 어린이집/유치원': 100000 },
            '초등학생': { '초품아 또는 안전한 도보 통학로': 180000 },
            '중/고등학생': {
                '우수 학원가 차량 15분 내 접근': 250000,
                '둔산동 학원가 도보 10분 내 접근': 400000
            }
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
    commute: () => {
        const p1 = calculateSingleCommute(1);
        const p2 = appState.inputs.borrowerCount === 2 ? calculateSingleCommute(2) : { value: 0, commentary: '' };
        const totalValue = p1.value + p2.value;
        const commentary = `<p><strong>통근자 1:</strong> ${p1.commentary}</p>${p2.commentary ? `<p class="mt-2"><strong>통근자 2:</strong> ${p2.commentary}</p>` : ''}`;
        const details = `
            <p class='font-bold text-slate-700'>통근 가치 산정 상세 기준 (대전광역시)</p>
            <p class="mt-1 text-xs"><b>핵심 아이디어</b>: 통근은 <b>'그림자 노동(Shadow Work)'</b>이라는 개념을 적용, 기준값 대비 나의 시간과 비용이 얼마나 절약되거나 소모되는지를 계산합니다.</p>
            <ul class="text-xs space-y-1 mt-2">
                <li><b>시간 가치</b>: 충청권 평균 통근시간(<b>32.6분</b>)의 가치와 나의 통근시간 가치를 비교하여, 그 차액을 산출합니다. 시간이 절약되면 <b>+</b>가치, 더 소요되면 <b>-</b>가치가 됩니다.
                    <ul class="list-disc list-inside pl-2 text-slate-500">
                        <li><b>피로도 가중치</b>: 통근 시간을 구간별로 나누어 각기 다른 가중치를 적용하고 합산합니다. (예: 50분 = 30분*0.7 + 15분*1.0 + 5분*1.2)</li>
                        <li>~ 30분: <b>70%</b>, 30~45분: <b>100%</b>, 45~60분: <b>120%</b>, 60분 초과: <b>150%</b></li>
                    </ul>
                </li>
                <li><b>비용 가치</b>: 대전 평균 자차 연료비(<b>월 73,000원</b>)와 나의 실제 연료비를 비교하여, 그 차액을 산출합니다. 연료비가 절약되면 <b>+</b>가치, 더 소요되면 <b>-</b>가치가 됩니다.</li>
                <li><b>출처</b>: <a href="https://kostat.go.kr/board.es?mid=a10301010000&bid=246&list_no=434303&act=view" target="_blank" class="text-indigo-600 hover:underline">통계청 '2024년 통근 근로자 이동 특성 분석'</a>, <a href="https://www.opinet.co.kr/user/dopospdrg/dopOsPdrgSelect.do" target="_blank" class="text-indigo-600 hover:underline">한국석유공사 Opinet</a></li>
            </ul>
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
                 <p class='font-bold text-slate-700'>주택 상태 가치 산정 기준 (대전광역시)</p>
                 <p class="mt-1 text-xs">리모델링 비용을 향후 10년(평균 거주 기간 및 주요 설비 내구연한 고려)의 월 할부금 형태로 환산하여 비용(-)으로 처리합니다.</p>
            `;
        } else {
            value = QOL_DATA.housing[type] || 0;
            commentary = type === 'new' ? '신축 아파트는 향후 10년간 수리비 절감, 커뮤니티 시설 이용 등을 고려하여 높은 부가 가치를 가집니다.' : '리모델링 된 주택은 내부 거주 만족도는 높지만, 공용부 노후화 등 수리 가능성은 여전히 존재합니다.';
            details = `
                <p class='font-bold text-slate-700'>주택 상태 가치 산정 기준</p>
                <p class="mt-1 text-xs"><b>핵심 아이디어</b>: 아파트의 가치는 물리적 요인 외에도 다양한 특성이 결합되어 결정된다는 <b>'헤도닉 가격 모형'</b>에 기반합니다. 신축 아파트의 높은 가치는 이러한 특성들의 총합을 월 가치로 환산한 것입니다.</p>
                <ul class="text-xs space-y-1 mt-2">
                    <li><b>주요 가치 구성 요소</b>:
                        <ul class="list-disc list-inside pl-2 text-slate-500">
                            <li><b>에너지 효율성</b>: 강화된 단열/차음 기준으로 인한 <b>냉난방비 및 관리비 절감 효과</b>.</li>
                            <li><b>최신 평면 설계</b>: 4베이, 팬트리, 드레스룸 등 <b>공간 활용도 극대화</b>에 따른 주거 만족도 증가.</li>
                            <li><b>고품질 커뮤니티</b>: 피트니스, 골프연습장, 라운지 등 <b>외부 시설 이용 비용 절감 및 시간 절약 효과</b>.</li>
                            <li><b>낮은 유지보수 비용</b>: 입주 후 최소 10년간 주요 설비 교체나 수리 비용이 발생하지 않는 것에 대한 <b>미래 비용 절감 효과</b>.</li>
                        </ul>
                    </li>
                    <li><b>참고 자료</b>: 주택산업연구원 '아파트 특성별 가격 결정 모형 연구' (1998) 보고서에서 제시된 아파트 가치 평가 방법론을 적용하여 산출했습니다.</li>
                </ul>
            `;
        }
        renderSectionResult('housing', value, commentary, details);
    },
    infra: () => {
        const checkedItems = [...elements.infraChecklist.querySelectorAll('input:checked')].map(el => el.value);
        let rawSum = checkedItems.reduce((sum, key) => {
            if (key === '대중교통(환승역)' && checkedItems.includes('대중교통(단일노선)')) {
                return sum;
            }
            return sum + QOL_DATA.infra.items[key];
        }, 0);

        if (checkedItems.includes('대중교통(환승역)')) {
            rawSum -= QOL_DATA.infra.items['대중교통(단일노선)'];
            rawSum += QOL_DATA.infra.items['대중교통(환승역)'];
        }

        const value = Math.min(rawSum, QOL_DATA.infra.max_value);
        const commentary = checkedItems.length > 0 ? `선택하신 ${checkedItems.length}개 인프라는 시간 절약과 편의성 측면에서 높은 가치를 제공합니다.` : '주요 인프라가 부족할 경우, 생활 편의성이 다소 낮아 시간/비용 소모가 발생할 수 있습니다.';
        const details = `
            <p class='font-bold text-slate-700'>인프라 가치 산정 기준 (대전광역시)</p>
            <p class="mt-1 text-xs">대전의 도시 구조와 실제 아파트 가격에 영향을 미치는 핵심 인프라의 가중치를 재조정했습니다. 각 가치는 해당 인프라 접근성에 따른 실제 주택 가격 프리미엄을 월세 가치로 역산한 값입니다.</p>
            <ul class="text-xs space-y-1 mt-2">
                <li><b>환승역 정보</b>: 대전 도시철도 2호선(트램)은 1호선과 <b>서대전네거리역, 대동역, 정부청사역, 유성온천역, 대전역</b>에서 환승이 계획되어 있습니다.</li>
                <li><b>참고 자료</b>: <a href="https://realty.daum.net/home/apt/danjis/366" target="_blank" class="text-indigo-600 hover:underline">다음 부동산 - 대전 지역 단지별 시세 정보</a></li>
            </ul>
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
            <p class='font-bold text-slate-700'>조망 가치 산정 기준</p>
            <p class="mt-1 text-xs">쾌적한 조망은 정서적 안정감을 제공하며, 이는 실제 가격에 반영되는 중요한 자산입니다.</p>
            <ul class="text-xs space-y-1 mt-2">
                <li><b>강/호수 조망</b>: <b>갑천, 유등천 등 국가하천급의 영구 조망</b>에 한정하여 높은 가치를 부여합니다.</li>
                <li><b>참고 자료</b>: KB부동산 '한강 조망권 아파트 가치 분석 리포트', 주택산업연구원 '주거 만족도 결정 요인 연구'</li>
            </ul>
        `;
        renderSectionResult('view', value, commentary, details);
    },
    education: () => {
        const stage = elements.eduStage.value;
        const checkedItems = [...elements.eduChecklist.querySelectorAll('input:checked')].map(el => el.value);
        let value = 0;

        if (QOL_DATA.education.checklists[stage] && checkedItems.length > 0) {
            value = checkedItems.reduce((sum, key) => {
                 if (key === '둔산동 학원가 도보 10분 내 접근' && checkedItems.includes('우수 학원가 차량 15분 내 접근')) {
                    return sum;
                 }
                return sum + (QOL_DATA.education.checklists[stage][key] || 0);
            }, 0);
            if(checkedItems.includes('둔산동 학원가 도보 10분 내 접근')) {
                 value -= QOL_DATA.education.checklists[stage]['우수 학원가 차량 15분 내 접근'];
                 value += QOL_DATA.education.checklists[stage]['둔산동 학원가 도보 10분 내 접근'];
            }
        }
        
        const details = `
            <p class='font-bold text-slate-700'>교육 가치 산정 기준 (대전광역시)</p>
            <p class="mt-1 text-xs">대전은 다른 지역에 비해 <b>둔산동 학원가</b>의 위상이 절대적입니다. 해당 지역 내 아파트(크로바, 목련 등)와 비학군지 아파트의 가격 차이는 약 30~50%에 달하며, 이를 월 가치로 환산하여 반영했습니다.</p>
            <p class="text-xs mt-2"><b>참고 자료</b>: <a href="http://buking.kr/rank.php?m=mm&si=대전&gu=서구&dong=둔산동" target="_blank" class="text-indigo-600 hover:underline">부킹 - 대전 서구 둔산동 아파트 매매가 랭킹</a></p>
        `;
        
        let commentary = '';
        if (stage === '해당 없음') commentary = '자녀 교육에 대한 고려가 없어, 이 항목의 가치는 0원으로 평가됩니다.';
        else if (stage === '자녀 계획중') commentary = '향후 자녀 계획이 있다면, 이 지역의 교육 환경이 미래의 장점이 될 수 있습니다. 현재 가치 평가는 0원입니다.';
        else commentary = `자녀의 '${stage}' 단계를 고려하여 교육 시설 접근성을 평가합니다.`;

        renderSectionResult('education', value, commentary, details);
    }
};

/**
 * [수정된 함수] 구간별 가중치를 누적 합산하는 방식으로 계산 엔진을 전면 수정
 * @param {number} personIndex - 통근자 인덱스 (1 또는 2)
 * @returns {object} { value, commentary }
 */
function calculateSingleCommute(personIndex) {
    const timeInput = document.getElementById(`qol-commute-time${personIndex}`);
    const costInput = document.getElementById(`qol-commute-cost${personIndex}`);

    if (!timeInput || !costInput) return { value: 0, commentary: '' };

    const time = parseFloat(timeInput.value) || 0;
    const cost = parseFloat(costInput.value) || 0;
    const income = appState.inputs[`annualIncome${personIndex}`];

    if (time === 0 && cost === 0) {
        return { value: 0, commentary: '통근이 발생하지 않습니다.' };
    }
    
    // 1. 시급 계산 (법정 근로시간 기준)
    const hourlyWage = income / 2080;
    const perMinuteWage = hourlyWage / 60;

    /**
     * [신규 로직] 통근 시간을 구간별로 나누어 가중치를 적용한 '가중 분(weighted minutes)'을 계산
     * @param {number} totalMinutes - 총 편도 통근 시간
     * @returns {number} 피로도 가중치가 적용된 총 분
     */
    const getTieredWeightedMinutes = (totalMinutes) => {
        let weightedMinutes = 0;
        let remainingMinutes = totalMinutes;

        // 60분 초과 구간 (가중치 1.5)
        if (remainingMinutes > 60) {
            weightedMinutes += (remainingMinutes - 60) * 1.5;
            remainingMinutes = 60;
        }
        // 45분 초과 ~ 60분 구간 (가중치 1.2)
        if (remainingMinutes > 45) {
            weightedMinutes += (remainingMinutes - 45) * 1.2;
            remainingMinutes = 45;
        }
        // 30분 초과 ~ 45분 구간 (가중치 1.0)
        if (remainingMinutes > 30) {
            weightedMinutes += (remainingMinutes - 30) * 1.0;
            remainingMinutes = 30;
        }
        // 0 ~ 30분 구간 (가중치 0.7)
        if (remainingMinutes > 0) {
            weightedMinutes += remainingMinutes * 0.7;
        }
        return weightedMinutes;
    };

    // 2. 시간 가치 계산
    const baseWeightedMinutes = getTieredWeightedMinutes(QOL_DATA.commute.baseTime);
    const currentWeightedMinutes = getTieredWeightedMinutes(time);
    
    const diffWeightedMinutes = baseWeightedMinutes - currentWeightedMinutes;

    const timeValue = diffWeightedMinutes * perMinuteWage * 2 * QOL_DATA.commute.workDays;

    // 3. 비용 가치 계산
    const costValue = QOL_DATA.commute.baseCarCost - cost;

    // 4. 최종 가치 합산
    const finalValue = timeValue + costValue;

    const commentary = `시간 절약 가치: ${formatDisplayCurrency(timeValue, 'full')}, 비용 절약 가치: ${formatDisplayCurrency(costValue, 'full')}`;
    
    return { value: finalValue, commentary };
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

export function renderFinalAnalysis(state, totalQoLValue) {
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
                <p class="text-4xl sm:text-5xl font-bold text-indigo-600 my-4">${formatDisplayCurrency(perceivedMonthlyCost, 'full')}</p>
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
            <div class="mt-8 flex justify-center gap-4">
                <button id="go-back-to-financial-button" class="px-6 py-3 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm">1. 재무 수정</button>
                <button id="go-back-to-qol-button" class="px-6 py-3 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm">2. 삶의 질 수정</button>
            </div>
        </div>
    `;

    elements.finalSummaryContent.innerHTML = summaryHTML;
}