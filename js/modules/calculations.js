// js/modules/calculations.js
import { appState } from './state.js';

/**
 * 대출의 월 상환 원리금을 계산합니다. (PMT)
 */
export function calculatePMT(rate, nper, pv) {
    if (nper <= 0 || pv <= 0) return 0;
    if (rate <= 0) return pv / nper;
    return (pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}
export function createFullAmortization(principal, monthlyRate, nper, monthlyPayment) {
    let schedule = [];
    let balance = principal;
    if (principal <= 0 || nper <= 0) return schedule;
    for (let i = 0; i < nper; i++) {
        const interest = balance * monthlyRate;
        const principalPaid = monthlyPayment - interest;
        schedule.push({ interest, principalPaid });
        balance -= principalPaid;
    }
    return schedule;
}

// ★★★ 수정: 외부에서 사용할 수 있도록 export 추가 ★★★
export function getTaxFromBase(taxBase) {
    if (taxBase <= 14000000) return taxBase * 0.06;
    if (taxBase <= 50000000) return 840000 + (taxBase - 14000000) * 0.15;
    if (taxBase <= 88000000) return 6240000 + (taxBase - 50000000) * 0.24;
    if (taxBase <= 150000000) return 15360000 + (taxBase - 88000000) * 0.35;
    if (taxBase <= 300000000) return 37060000 + (taxBase - 150000000) * 0.38;
    if (taxBase <= 500000000) return 94060000 + (taxBase - 300000000) * 0.40;
    if (taxBase <= 1000000000) return 174060000 + (taxBase - 500000000) * 0.42;
    return 384060000 + (taxBase - 1000000000) * 0.45;
}

// ★★★ 수정: 외부에서 사용할 수 있도록 export 추가 ★★★
export function calculateNetIncomeData(grossAnnualSalary) {
    if (grossAnnualSalary <= 0) return { netMonthly: 0, taxBase: 0 };
    const pension = Math.min(grossAnnualSalary * 0.045, 590000 * 12 * 0.045);
    const healthInsurance = grossAnnualSalary * 0.03545;
    const longTermCare = healthInsurance * 0.1295;
    const employmentInsurance = grossAnnualSalary * 0.009;
    const totalInsurance = pension + healthInsurance + longTermCare + employmentInsurance;
    let earnedIncomeDeduction = 0;
    if (grossAnnualSalary <= 5000000) earnedIncomeDeduction = grossAnnualSalary * 0.7;
    else if (grossAnnualSalary <= 15000000) earnedIncomeDeduction = 3500000 + (grossAnnualSalary - 5000000) * 0.4;
    else if (grossAnnualSalary <= 45000000) earnedIncomeDeduction = 7500000 + (grossAnnualSalary - 15000000) * 0.15;
    else if (grossAnnualSalary <= 100000000) earnedIncomeDeduction = 12000000 + (grossAnnualSalary - 45000000) * 0.05;
    else earnedIncomeDeduction = 14750000 + (grossAnnualSalary - 100000000) * 0.02;
    const taxBase = Math.max(0, grossAnnualSalary - totalInsurance - earnedIncomeDeduction - 1500000);
    const incomeTax = getTaxFromBase(taxBase);
    const localIncomeTax = incomeTax * 0.1;
    const totalTax = incomeTax + localIncomeTax;
    const netAnnualSalary = grossAnnualSalary - totalInsurance - totalTax;
    return { netMonthly: netAnnualSalary / 12, taxBase: taxBase };
}

/**
 * 미래 현금흐름을 연도별로 시뮬레이션합니다.
 */
export function generateFutureAnalysis(inputs) {
    const { 
        loanTerm, realSalaryGrowthRate, inflationRate, 
        annualIncome1, annualIncome2, borrowerCount, 
        livingCost, otherLoanPayment, managementCost,
        remainingYears1, remainingYears2, interestRate
    } = inputs;

    const loanPrincipal = inputs.housePrice - inputs.cash;
    const monthlyRate = interestRate / 12;
    const nper = loanTerm * 12;
    const monthlyPayment = calculatePMT(monthlyRate, nper, loanPrincipal);
    const fullSchedule = createFullAmortization(loanPrincipal, monthlyRate, nper, monthlyPayment);

    const simulationYears = Math.max(loanTerm, remainingYears1, (borrowerCount === 2 ? remainingYears2 : 0));
    if (simulationYears <= 0) {
        return { totalLifetimeSurplusPV: 0, totalInterestPV: 0, totalRealInterestPV: 0 };
    }
    
    const nominalSalaryGrowthRate = (1 + realSalaryGrowthRate) * (1 + inflationRate) - 1;
    let totalLifetimeSurplusPV = 0;
    let totalInterestPV = 0;
    let totalRealInterestPV = 0;
    let cumulativePrincipalPV = 0;
    appState.rawData = [];

    let peakSalaryBase1 = null, peakSalaryBase2 = null;
    if (remainingYears1 > 5) {
        const prePeakGrowthFactor1 = Math.pow(1 + nominalSalaryGrowthRate, remainingYears1 - 5 - 1);
        peakSalaryBase1 = (annualIncome1 * prePeakGrowthFactor1) * 0.7;
    }
    if (borrowerCount === 2 && remainingYears2 > 5) {
        const prePeakGrowthFactor2 = Math.pow(1 + nominalSalaryGrowthRate, remainingYears2 - 5 - 1);
        peakSalaryBase2 = (annualIncome2 * prePeakGrowthFactor2) * 0.7;
    }

    let turnaroundPointFound = false;
    for (let year = 1; year <= simulationYears; year++) {
        const nominalGrowthFactor = Math.pow(1 + nominalSalaryGrowthRate, year - 1);
        const realGrowthFactor = Math.pow(1 + realSalaryGrowthRate, year - 1);
        let futureNominalIncome1 = 0;
        if (year <= remainingYears1) {
            futureNominalIncome1 = (peakSalaryBase1 !== null && year > remainingYears1 - 5)
                ? peakSalaryBase1 * Math.pow(1 + inflationRate, year - (remainingYears1 - 5))
                : annualIncome1 * nominalGrowthFactor;
        }
        let futureNominalIncome2 = 0;
        if (borrowerCount === 2 && year <= remainingYears2) {
            futureNominalIncome2 = (peakSalaryBase2 !== null && year > remainingYears2 - 5)
                ? peakSalaryBase2 * Math.pow(1 + inflationRate, year - (remainingYears2 - 5))
                : annualIncome2 * nominalGrowthFactor;
        }
        const baseRealTotalSalary = ((year <= remainingYears1) ? annualIncome1 : 0) + ((borrowerCount === 2 && year <= remainingYears2) ? annualIncome2 : 0);
        const futureRealTotalSalary = baseRealTotalSalary * realGrowthFactor;
        const futureNetMonthlyIncome = calculateNetIncomeData(futureNominalIncome1).netMonthly + (borrowerCount === 2 ? calculateNetIncomeData(futureNominalIncome2).netMonthly : 0);
        const futureMonthlyConsumption = livingCost * Math.pow(1 + inflationRate, year - 1);
        const futureMonthlyManagementCost = managementCost * Math.pow(1 + inflationRate, year - 1);
        const currentMonthlyPayment = (year <= loanTerm) ? monthlyPayment : 0;
        const monthlySurplus = futureNetMonthlyIncome - currentMonthlyPayment - otherLoanPayment - futureMonthlyConsumption - futureMonthlyManagementCost;
        const presentValueFactor = Math.pow(1 + inflationRate, year);
        const monthlySurplusPV = monthlySurplus / presentValueFactor;
        totalLifetimeSurplusPV += monthlySurplusPV * 12;
        const startMonth = (year - 1) * 12;
        const endMonth = year * 12;
        const yearSchedule = (year <= loanTerm) ? fullSchedule.slice(startMonth, endMonth) : [];
        const annualInterest = yearSchedule.reduce((acc, monthData) => acc + monthData.interest, 0);
        const annualPrincipal = (year <= loanTerm) ? (currentMonthlyPayment * 12 - annualInterest) : 0;
        let taxRefund = 0;
        if (annualInterest > 0) {
            if (borrowerCount === 1) {
                const { taxBase } = calculateNetIncomeData(futureNominalIncome1);
                const taxRate = taxBase > 0 ? getTaxFromBase(taxBase) / taxBase : 0.06;
                taxRefund = annualInterest * taxRate;
            } else {
                const interestPerPerson = annualInterest / 2;
                const { taxBase: taxBase1 } = calculateNetIncomeData(futureNominalIncome1);
                const { taxBase: taxBase2 } = calculateNetIncomeData(futureNominalIncome2);
                const taxRate1 = taxBase1 > 0 ? getTaxFromBase(taxBase1) / taxBase1 : 0.06;
                const taxRate2 = taxBase2 > 0 ? getTaxFromBase(taxBase2) / taxBase2 : 0.06;
                taxRefund = (interestPerPerson * taxRate1) + (interestPerPerson * taxRate2);
            }
        }
        const netAnnualInterest = annualInterest - taxRefund;
        const netAnnualInterestPV = netAnnualInterest / presentValueFactor;
        totalInterestPV += netAnnualInterestPV;

        let realInterestCostForYear = 0;
        if (interestRate > 0) {
            const realInterestRate = interestRate - inflationRate;
            if (realInterestRate > 0) {
                realInterestCostForYear = netAnnualInterestPV * (realInterestRate / interestRate);
            }
        }
        totalRealInterestPV += realInterestCostForYear;
        
        const monthlyRealPaymentAfterDeduction = currentMonthlyPayment - (taxRefund / 12);
        const presentValueOfRealMonthlyPayment = monthlyRealPaymentAfterDeduction / presentValueFactor;
        const presentValueOfAnnualPrincipal = annualPrincipal / presentValueFactor;
        cumulativePrincipalPV += presentValueOfAnnualPrincipal;

        let rowClass = '';
        if (!turnaroundPointFound && monthlySurplus > 0) {
            rowClass = 'turnaround-point';
            turnaroundPointFound = true;
        } else if ((year > remainingYears1 && borrowerCount === 1) || (year > remainingYears1 && year > remainingYears2 && borrowerCount === 2)) {
            rowClass = 'retirement-point';
        }
        
        appState.rawData.push({
            year,
            futureNetMonthlyIncome,
            futureMonthlyConsumption,
            monthlySurplus,
            monthlySurplusPV,
            futureRealTotalSalary,
            presentValueOfRealMonthlyPayment,
            monthlySavingsPV: presentValueOfAnnualPrincipal / 12,
            cumulativePrincipalPV: cumulativePrincipalPV,
            rowClass,
        });
    }

    return { totalLifetimeSurplusPV, totalInterestPV, totalRealInterestPV };
}