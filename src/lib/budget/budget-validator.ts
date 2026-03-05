// Budget Validation Engine
// Validates budget against grant requirements

export interface BudgetValidationRule {
  id: string
  name: string
  description: string
  validate: (budget: BudgetData, grant: GrantRequirements) => ValidationResult
  severity: 'error' | 'warning' | 'info'
}

export interface BudgetData {
  items: BudgetItem[]
  totalCost: number
  eligibleCost: number
  grantAmount: number
  ownContribution: number
}

export interface BudgetItem {
  id: string
  name: string
  cost: number
  category: string
  eligible: boolean
  vatRate: number
}

export interface GrantRequirements {
  minOwnContribution: number // percentage
  maxGrantAmount: number
  grantRate: number // percentage
  eligibleCategories?: string[]
  ineligibleCategories?: string[]
  maxPersonnelPercentage?: number
  maxEquipmentPercentage?: number
  minProjectDuration?: number // months
  maxProjectDuration?: number // months
}

export interface ValidationResult {
  passed: boolean
  message: string
  details?: string
  affectedItems?: string[]
}

export interface BudgetValidationReport {
  isValid: boolean
  errors: ValidationResult[]
  warnings: ValidationResult[]
  info: ValidationResult[]
  summary: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
  }
}

// Validation Rules
export const BUDGET_VALIDATION_RULES: BudgetValidationRule[] = [
  {
    id: 'OWN_CONTRIBUTION_MIN',
    name: 'Minimalny wkład własny',
    description: 'Sprawdza czy wkład własny spełnia wymagania',
    severity: 'error',
    validate: (budget, grant) => {
      const ownContributionPercent = (budget.ownContribution / budget.totalCost) * 100
      const minRequired = grant.minOwnContribution
      
      if (ownContributionPercent < minRequired) {
        return {
          passed: false,
          message: `Wkład własny (${ownContributionPercent.toFixed(1)}%) jest poniżej wymaganego minimum (${minRequired}%)`,
          details: `Wymagany wkład: ${(budget.totalCost * minRequired / 100).toLocaleString('pl-PL')} PLN, obecny: ${budget.ownContribution.toLocaleString('pl-PL')} PLN`
        }
      }
      
      return {
        passed: true,
        message: `Wkład własny (${ownContributionPercent.toFixed(1)}%) spełnia wymagania`
      }
    }
  },
  
  {
    id: 'MAX_GRANT_AMOUNT',
    name: 'Maksymalna kwota dofinansowania',
    description: 'Sprawdza czy dofinansowanie nie przekracza limitu',
    severity: 'error',
    validate: (budget, grant) => {
      if (budget.grantAmount > grant.maxGrantAmount) {
        return {
          passed: false,
          message: `Dofinansowanie przekracza maksymalny limit`,
          details: `Limit: ${grant.maxGrantAmount.toLocaleString('pl-PL')} PLN, obecnie: ${budget.grantAmount.toLocaleString('pl-PL')} PLN`
        }
      }
      
      return {
        passed: true,
        message: `Kwota dofinansowania (${budget.grantAmount.toLocaleString('pl-PL')} PLN) jest w limicie`
      }
    }
  },
  
  {
    id: 'PERSONNEL_PERCENTAGE',
    name: 'Limit kosztów osobowych',
    description: 'Sprawdza czy koszty osobowe nie przekraczają limitu',
    severity: 'warning',
    validate: (budget, grant) => {
      if (!grant.maxPersonnelPercentage) return { passed: true, message: 'Brak limitu kosztów osobowych' }
      
      const personnelCost = budget.items
        .filter(i => i.category === 'personnel')
        .reduce((sum, i) => sum + i.cost, 0)
      
      const personnelPercent = (personnelCost / budget.totalCost) * 100
      
      if (personnelPercent > grant.maxPersonnelPercentage) {
        return {
          passed: false,
          message: `Koszty osobowe (${personnelPercent.toFixed(1)}%) przekraczają limit (${grant.maxPersonnelPercentage}%)`,
          affectedItems: budget.items.filter(i => i.category === 'personnel').map(i => i.id)
        }
      }
      
      return {
        passed: true,
        message: `Koszty osobowe (${personnelPercent.toFixed(1)}%) są w limicie`
      }
    }
  },
  
  {
    id: 'EQUIPMENT_PERCENTAGE',
    name: 'Limit kosztów sprzętu',
    description: 'Sprawdza czy koszty sprzętu nie przekraczają limitu',
    severity: 'warning',
    validate: (budget, grant) => {
      if (!grant.maxEquipmentPercentage) return { passed: true, message: 'Brak limitu kosztów sprzętu' }
      
      const equipmentCost = budget.items
        .filter(i => i.category === 'equipment')
        .reduce((sum, i) => sum + i.cost, 0)
      
      const equipmentPercent = (equipmentCost / budget.totalCost) * 100
      
      if (equipmentPercent > grant.maxEquipmentPercentage) {
        return {
          passed: false,
          message: `Koszty sprzętu (${equipmentPercent.toFixed(1)}%) przekraczają limit (${grant.maxEquipmentPercentage}%)`,
          affectedItems: budget.items.filter(i => i.category === 'equipment').map(i => i.id)
        }
      }
      
      return {
        passed: true,
        message: `Koszty sprzętu (${equipmentPercent.toFixed(1)}%) są w limicie`
      }
    }
  },
  
  {
    id: 'ELIGIBLE_CATEGORIES',
    name: 'Kategorie kwalifikowalne',
    description: 'Sprawdza czy wszystkie pozycje są z kategorii kwalifikowalnych',
    severity: 'error',
    validate: (budget, grant) => {
      if (!grant.eligibleCategories || grant.eligibleCategories.length === 0) {
        return { passed: true, message: 'Brak ograniczeń kategorii' }
      }
      
      const ineligibleItems = budget.items.filter(
        i => !grant.eligibleCategories?.includes(i.category)
      )
      
      if (ineligibleItems.length > 0) {
        return {
          passed: false,
          message: `${ineligibleItems.length} pozycji z niekwalifikowalnych kategorii`,
          details: `Kwalifikowalne: ${grant.eligibleCategories.join(', ')}`,
          affectedItems: ineligibleItems.map(i => i.id)
        }
      }
      
      return {
        passed: true,
        message: 'Wszystkie kategorie są kwalifikowalne'
      }
    }
  },
  
  {
    id: 'POSITIVE_BUDGET',
    name: 'Budżet większy od zera',
    description: 'Sprawdza czy budżet ma wartość dodatnią',
    severity: 'error',
    validate: (budget) => {
      if (budget.totalCost <= 0) {
        return {
          passed: false,
          message: 'Budżet musi być większy od zera'
        }
      }
      
      return {
        passed: true,
        message: `Budżet: ${budget.totalCost.toLocaleString('pl-PL')} PLN`
      }
    }
  },
  
  {
    id: 'VAT_INCLUDED',
    name: 'VAT w budżecie',
    description: 'Sprawdza czy VAT jest uwzględniony',
    severity: 'info',
    validate: (budget) => {
      const hasVAT = budget.items.some(i => i.vatRate > 0)
      
      if (!hasVAT) {
        return {
          passed: true,
          message: 'Brak VAT w budżecie - upewnij się, że ceny są netto',
          details: 'Niektóre granty wymagają podania cen brutto z VAT'
        }
      }
      
      const vatAmount = budget.items.reduce((sum, i) => {
        const net = i.cost / (1 + i.vatRate / 100)
        return sum + (i.cost - net)
      }, 0)
      
      return {
        passed: true,
        message: `VAT w budżecie: ${vatAmount.toLocaleString('pl-PL')} PLN`
      }
    }
  }
]

// Main validation function
export function validateBudget(
  budget: BudgetData,
  grant: GrantRequirements
): BudgetValidationReport {
  const errors: ValidationResult[] = []
  const warnings: ValidationResult[] = []
  const info: ValidationResult[] = []
  
  let passedChecks = 0
  let failedChecks = 0
  
  for (const rule of BUDGET_VALIDATION_RULES) {
    const result = rule.validate(budget, grant)
    
    if (result.passed) {
      passedChecks++
      if (rule.severity === 'info') {
        info.push(result)
      }
    } else {
      failedChecks++
      if (rule.severity === 'error') {
        errors.push(result)
      } else if (rule.severity === 'warning') {
        warnings.push(result)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    summary: {
      totalChecks: BUDGET_VALIDATION_RULES.length,
      passedChecks,
      failedChecks
    }
  }
}

// Quick validation check
export function isBudgetValid(budget: BudgetData, grant: GrantRequirements): boolean {
  return validateBudget(budget, grant).isValid
}

export default validateBudget
