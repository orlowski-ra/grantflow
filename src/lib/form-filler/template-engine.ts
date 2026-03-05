// Template Matching Engine - zero AI cost for known forms
// Maps field names to company data

export interface CompanyData {
  nip: string
  regon: string
  companyName: string
  legalForm: string
  street: string
  city: string
  postalCode: string
  pkdCodes: string[]
  employeeCount: number
  annualRevenue: number
  email: string
  phone: string
  representativeName: string
  representativePosition: string
}

export interface FormTemplate {
  source: string // 'PARP', 'FEnIKS', etc.
  formType: string // 'wniosek_o_dotacje', 'formularz_kontaktowy'
  fieldMappings: Record<string, string> // pdfFieldName -> companyDataKey
  staticValues?: Record<string, string> // Always same values
  calculatedFields?: Record<string, (data: CompanyData) => string>
}

// TEMPLATES - pre-mapped for common forms
const KNOWN_TEMPLATES: FormTemplate[] = [
  {
    source: 'PARP',
    formType: 'wniosek_pożytki_publiczne',
    fieldMappings: {
      'nazwa_podmiotu': 'companyName',
      'nip': 'nip',
      'regon': 'regon',
      'adres_ulica': 'street',
      'adres_miasto': 'city',
      'adres_kod': 'postalCode',
      'email': 'email',
      'telefon': 'phone',
      'osoba_do_kontaktu': 'representativeName',
      'stanowisko': 'representativePosition',
    },
    calculatedFields: {
      'data_zlozenia': () => new Date().toISOString().split('T')[0],
      'kod_pkd_glowny': (data) => data.pkdCodes[0] || '',
      'liczba_pracownikow': (data) => data.employeeCount.toString(),
      'roczny_obrot': (data) => data.annualRevenue.toString(),
    }
  },
  {
    source: 'FEnIKS',
    formType: 'wniosek_innowacje',
    fieldMappings: {
      'nazwa_beneficjenta': 'companyName',
      'nip_beneficjenta': 'nip',
      'regon_beneficjenta': 'regon',
      'ulica': 'street',
      'miejscowosc': 'city',
      'kod_pocztowy': 'postalCode',
      'adres_email': 'email',
      'nr_telefonu': 'phone',
    },
    staticValues: {
      'kraj': 'Polska',
      'wojewodztwo': '', // Will be mapped from city
    }
  },
  {
    source: 'MAZOWIECKIE',
    formType: 'wniosek_rpo',
    fieldMappings: {
      'nazwa_wnioskodawcy': 'companyName',
      'nip_wnioskodawcy': 'nip',
      'regon_wnioskodawcy': 'regon',
      'adres': 'street',
      'miejscowosc': 'city',
      'kod': 'postalCode',
    }
  }
]

export class TemplateEngine {
  private templates: Map<string, FormTemplate>

  constructor() {
    this.templates = new Map()
    KNOWN_TEMPLATES.forEach(t => {
      this.templates.set(`${t.source}_${t.formType}`, t)
    })
  }

  /**
   * Auto-detect template from PDF field names
   */
  detectTemplate(fieldNames: string[]): FormTemplate | null {
    let bestMatch: FormTemplate | null = null
    let bestScore = 0

    for (const template of KNOWN_TEMPLATES) {
      const templateFields = Object.keys(template.fieldMappings)
      const matchingFields = templateFields.filter(f => 
        fieldNames.some(pdfField => 
          pdfField.toLowerCase().includes(f.toLowerCase()) ||
          f.toLowerCase().includes(pdfField.toLowerCase())
        )
      )
      
      const score = matchingFields.length / templateFields.length
      
      if (score > bestScore && score > 0.6) { // 60% threshold
        bestScore = score
        bestMatch = template
      }
    }

    return bestMatch
  }

  /**
   * Fill form using template
   */
  fillForm(template: FormTemplate, companyData: CompanyData): Record<string, string> {
    const result: Record<string, string> = {}

    // Map known fields
    for (const [pdfField, dataKey] of Object.entries(template.fieldMappings)) {
      const value = companyData[dataKey as keyof CompanyData]
      if (value !== undefined && value !== null) {
        result[pdfField] = String(value)
      }
    }

    // Add static values
    if (template.staticValues) {
      Object.assign(result, template.staticValues)
    }

    // Calculate dynamic fields
    if (template.calculatedFields) {
      for (const [field, calculator] of Object.entries(template.calculatedFields)) {
        result[field] = calculator(companyData)
      }
    }

    return result
  }

  /**
   * Learn new template from manual mapping
   */
  learnTemplate(
    source: string,
    formType: string,
    sampleMapping: Record<string, string>,
    companyData: CompanyData
  ): FormTemplate {
    // Infer mappings from sample
    const fieldMappings: Record<string, string> = {}
    
    for (const [pdfField, filledValue] of Object.entries(sampleMapping)) {
      // Find which company field matches the filled value
      for (const [companyKey, companyValue] of Object.entries(companyData)) {
        if (String(companyValue) === filledValue) {
          fieldMappings[pdfField] = companyKey
          break
        }
      }
    }

    const newTemplate: FormTemplate = {
      source,
      formType,
      fieldMappings,
      calculatedFields: {
        'data_wypelnienia': () => new Date().toISOString().split('T')[0]
      }
    }

    // Store in memory (could persist to DB)
    this.templates.set(`${source}_${formType}`, newTemplate)
    
    return newTemplate
  }

  /**
   * Get confidence score for filling
   */
  getConfidenceScore(
    template: FormTemplate, 
    fieldNames: string[]
  ): number {
    const templateFields = Object.keys(template.fieldMappings)
    const matched = templateFields.filter(f => 
      fieldNames.includes(f) || 
      fieldNames.some(pf => pf.toLowerCase() === f.toLowerCase())
    )
    
    return matched.length / fieldNames.length
  }
}

// Singleton instance
export const templateEngine = new TemplateEngine()