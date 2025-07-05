/**
 * 숫자를 한국식 통화 형식(세 자리마다 쉼표)으로 변환합니다.
 * @param {number} num - 변환할 숫자
 * @returns {string} 포맷팅된 문자열
 */
export const formatCurrency = (num) => {
    return num.toLocaleString('ko-KR');
};

/**
 * 설정된 단위(만원/원)에 따라 숫자를 통화 형식으로 변환합니다.
 * @param {number} num - 변환할 숫자
 * @param {string} displayUnit - 표시 단위 ('manwon' 또는 'full')
 * @returns {string} 단위가 포함된 포맷팅된 문자열
 */
export const formatDisplayCurrency = (num, displayUnit) => {
    if (displayUnit === 'manwon') {
        return formatCurrency(Math.round(num / 10000)) + ' 만원';
    }
    return formatCurrency(Math.round(num)) + ' 원';
};

/**
 * HTML input 요소에서 숫자 값을 가져옵니다.
 * 입력값이 없으면 placeholder 값을 사용합니다.
 * @param {string} id - input 요소의 ID
 * @param {number} [unitMultiplier=1] - 값에 곱해줄 단위 승수 (예: 만원 단위를 원으로 바꿀 때 10000)
 * @returns {number} 숫자 값
 */
export function getValue(id, unitMultiplier = 1) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Element with ID "${id}" not found.`);
        return 0;
    }
    const rawValue = element.value ? element.value : element.placeholder;
    const numericValue = parseFloat(rawValue) || 0;
    return numericValue * unitMultiplier;
}