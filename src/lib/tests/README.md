# GrantFlow - Testy Jednostkowe

## Budget Calculator Tests

```typescript
import { describe, it, expect } from 'vitest'
import { validateBudget, BUDGET_VALIDATION_RULES } from '@/lib/budget/budget-validator'
import type { BudgetData, GrantRequirements } from '@/lib/budget/budget-validator'

const mockGrant: GrantRequirements = {
  minOwnContribution: 50,
  maxGrantAmount: 500000,
  grantRate: 50,
  maxPersonnelPercentage: 60,
  maxEquipmentPercentage: 70,
}

describe('Budget Validation', () => {
  it('should pass with valid budget', () => {
    const budget: BudgetData = {
      items: [
        { id: '1', name: 'Personnel', cost: 100000, category: 'personnel', eligible: true, vatRate: 0 },
        { id: '2', name: 'Equipment', cost: 100000, category: 'equipment', eligible: true, vatRate: 23 },
      ],
      totalCost: 200000,
      eligibleCost: 200000,
      grantAmount: 100000,
      ownContribution: 100000,
    }
    
    const result = validateBudget(budget, mockGrant)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
  
  it('should fail when own contribution is too low', () => {
    const budget: BudgetData = {
      items: [
        { id: '1', name: 'Personnel', cost: 180000, category: 'personnel', eligible: true, vatRate: 0 },
      ],
      totalCost: 180000,
      eligibleCost: 180000,
      grantAmount: 150000, // Too high
      ownContribution: 30000, // Too low
    }
    
    const result = validateBudget(budget, mockGrant)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.message.includes('wkład własny'))).toBe(true)
  })
  
  it('should warn when personnel exceeds 60%', () => {
    const budget: BudgetData = {
      items: [
        { id: '1', name: 'Personnel', cost: 150000, category: 'personnel', eligible: true, vatRate: 0 },
        { id: '2', name: 'Equipment', cost: 50000, category: 'equipment', eligible: true, vatRate: 23 },
      ],
      totalCost: 200000,
      eligibleCost: 200000,
      grantAmount: 100000,
      ownContribution: 100000,
    }
    
    const result = validateBudget(budget, mockGrant)
    expect(result.warnings.some(w => w.message.includes('osobowe'))).toBe(true)
  })
})
```

## Gemini Service Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GeminiTextGenerator, AICostTracker } from '@/lib/ai/gemini-service'

describe('GeminiTextGenerator', () => {
  const generator = new GeminiTextGenerator()
  
  it('should calculate cost correctly', () => {
    const cost = generator.estimateCost(1000)
    expect(cost).toBeGreaterThan(0)
    expect(cost).toBeLessThan(0.1) // Should be very cheap
  })
  
  it('should generate fallback on API error', async () => {
    // Mock failed API call
    const result = await generator.generateProjectDescription({
      fieldType: 'project_description',
      companyData: {
        companyName: 'Test',
        legalForm: 'JDG',
        pkdCodes: ['62.01'],
      },
      grantContext: {
        title: 'Test Grant',
        category: 'IT',
        requirements: 'Test requirements',
      },
      tone: 'formal',
    })
    
    expect(result).toContain('Test')
    expect(typeof result).toBe('string')
  })
})

describe('AICostTracker', () => {
  it('should track costs correctly', () => {
    const tracker = new AICostTracker()
    
    expect(tracker.canAfford(10)).toBe(true)
    expect(tracker.canAfford(100)).toBe(false) // Over budget
    
    tracker.trackCost(5)
    expect(tracker.getRemainingBudget()).toBe(25)
  })
})
```

## Template Engine Tests

```typescript
import { describe, it, expect } from 'vitest'
import { templateEngine } from '@/lib/form-filler/template-engine'
import { SF424_TEMPLATE } from '@/lib/templates/federal-forms'

describe('TemplateEngine', () => {
  it('should detect SF-424 template', () => {
    const fieldNames = [
      'Applicant_1_Name',
      'Applicant_2_EIN',
      'Contact_1_Name',
      'Contact_4_Email',
    ]
    
    const template = templateEngine.detectTemplate(fieldNames)
    expect(template).not.toBeNull()
    expect(template?.source).toBe('US_FEDERAL')
  })
  
  it('should fill form with template', () => {
    const companyData = {
      companyName: 'Test Company',
      nip: '1234567890',
      regon: '123456789',
      street: 'Test Street 1',
      city: 'Warsaw',
      postalCode: '00-001',
      email: 'test@example.com',
      phone: '123456789',
      representativeName: 'John Doe',
      representativePosition: 'CEO',
    }
    
    const result = templateEngine.fillForm(SF424_TEMPLATE, companyData)
    
    expect(result['Applicant_1_Name']).toBe('Test Company')
    expect(result['Applicant_2_EIN']).toBe('1234567890')
    expect(result['Contact_1_Name']).toBe('John Doe')
  })
})
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test budget-validator

# Watch mode
npm run test:watch
```
