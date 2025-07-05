// js/modules/state.js
import { getValue } from '../utils.js';

/**
 * 애플리케이션의 전역 상태를 관리하는 객체입니다.
 */
export const appState = {
    displayUnit: 'manwon', // 'manwon' 또는 'full'
    inputs: {},
    results: {},
    rawData: [],
};

/**
 * 입력 페이지의 필드들로부터 값을 수집하여 appState.inputs에 저장합니다.
 */
export function collectInputs() {
    const borrowerCount = parseInt(document.getElementById('borrowerCount').value);

    appState.inputs = {
        borrowerCount,
        annualIncome1: getValue('annualIncome1', 10000),
        remainingYears1: getValue('remainingYears1'),
        annualIncome2: (borrowerCount === 2) ? getValue('annualIncome2', 10000) : 0,
        remainingYears2: (borrowerCount === 2) ? getValue('remainingYears2') : 0,
        
        housePrice: getValue('housePrice', 10000),
        cash: getValue('cash', 10000),
        
        livingCost: getValue('livingCost', 10000),
        managementCost: getValue('managementCost', 10000),
        otherLoanPayment: getValue('otherLoanPayment', 10000),
        
        loanTerm: getValue('loanTerm'),
        interestRate: getValue('interestRate') / 100,
        inflationRate: getValue('inflationRate') / 100,
        realSalaryGrowthRate: getValue('realSalaryGrowthRate') / 100,
    };
}