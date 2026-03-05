// Main PDF Filling Service - combines Template Engine + AI
// Zero cost for known forms, AI only for creative fields

import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib'
import { templateEngine, CompanyData, TemplateEngine } from './template-engine'
import { AITextGenerator, AICostTracker } from './ai-generator'

export interface PDFFillResult {
  success: boolean
  pdfBytes?: Uint8Array
  filledFields: string[]
  skippedFields: string[]
  aiGeneratedFields: string[]
  costEstimate: number
  confidenceScore: number
  warnings: string[]
}

export class PDFFillingService {
  private templateEngine: TemplateEngine
  private aiGenerator: AITextGenerator
  private costTracker: AICostTracker

  constructor() {
    this.templateEngine = new TemplateEngine()
    this.aiGenerator = new AITextGenerator()
    this.costTracker = new AICostTracker()
  }

  /**
   * Main method: Fill PDF with company data
   */
  async fillPDF(
    pdfBuffer: Buffer,
    companyData: CompanyData,
    grantInfo: {
      title: string
      category: string
      requirements: string
      source: string
    }
  ): Promise<PDFFillResult> {
    const result: PDFFillResult = {
      success: false,
      filledFields: [],
      skippedFields: [],
      aiGeneratedFields: [],
      costEstimate: 0,
      confidenceScore: 0,
      warnings: []
    }

    try {
      // Load PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer)
      const form = pdfDoc.getForm()
      const fields = form.getFields()
      
      // Get field names
      const fieldNames = fields.map(f => f.getName())
      
      // Try to detect template
      const template = this.templateEngine.detectTemplate(fieldNames)
      
      if (template) {
        // Use template matching (FREE)
        console.log(`Template detected: ${template.source}_${template.formType}`)
        
        const filledData = this.templateEngine.fillForm(template, companyData)
        
        for (const [fieldName, value] of Object.entries(filledData)) {
          try {
            const field = form.getField(fieldName)
            
            if (field instanceof PDFTextField) {
              field.setText(value)
              result.filledFields.push(fieldName)
            } else if (field instanceof PDFCheckBox && value === 'true') {
              field.check()
              result.filledFields.push(fieldName)
            }
          } catch (e) {
            result.skippedFields.push(fieldName)
          }
        }
        
        result.confidenceScore = this.templateEngine.getConfidenceScore(template, fieldNames)
        
      } else {
        // Unknown form - use heuristics + AI
        console.log('Unknown form - using heuristics + AI')
        result.warnings.push('Nieznany formularz - używam heurystyk i AI')
        
        await this.fillWithHeuristics(fields, companyData, grantInfo, result)
      }
      
      // Handle creative fields with AI (if budget allows)
      const creativeFields = this.identifyCreativeFields(fields)
      
      if (creativeFields.length > 0 && this.costTracker.canAfford(5)) {
        await this.fillCreativeFields(
          creativeFields, 
          companyData, 
          grantInfo, 
          form, 
          result
        )
      }
      
      // Save PDF
      const pdfBytes = await pdfDoc.save()
      result.pdfBytes = pdfBytes
      result.success = true
      
    } catch (error) {
      console.error('PDF Filling Error:', error)
      result.warnings.push(`Błąd: ${error.message}`)
    }
    
    return result
  }

  /**
   * Heuristic filling for unknown forms
   */
  private async fillWithHeuristics(
    fields: any[],
    companyData: CompanyData,
    grantInfo: any,
    result: PDFFillResult
  ) {
    const fieldMappings: Record<string, keyof CompanyData> = {
      'nip': 'nip',
      'NIP': 'nip',
      'NIP_wnioskodawcy': 'nip',
      'regon': 'regon',
      'REGON': 'regon',
      'nazwa': 'companyName',
      'nazwa_firmy': 'companyName',
      'nazwa_podmiotu': 'companyName',
      'firma': 'companyName',
      'company': 'companyName',
      'adres': 'street',
      'ulica': 'street',
      'ulica_numer': 'street',
      'miasto': 'city',
      'miejscowosc': 'city',
      'kod': 'postalCode',
      'kod_pocztowy': 'postalCode',
      'email': 'email',
      'e_mail': 'email',
      'telefon': 'phone',
      'telefon_kontaktowy': 'phone',
    }
    
    for (const field of fields) {
      const name = field.getName().toLowerCase()
      
      // Find matching company data
      for (const [pattern, dataKey] of Object.entries(fieldMappings)) {
        if (name.includes(pattern.toLowerCase())) {
          const value = companyData[dataKey]
          if (value) {
            try {
              if (field instanceof PDFTextField) {
                field.setText(String(value))
                result.filledFields.push(field.getName())
              }
            } catch (e) {
              result.skippedFields.push(field.getName())
            }
            break
          }
        }
      }
    }
    
    result.confidenceScore = 0.4 // Lower confidence for heuristics
  }

  /**
   * Identify fields that need AI generation
   */
  private identifyCreativeFields(fields: any[]): any[] {
    const creativePatterns = [
      'opis', 'description', 'uzasadnienie', 'cel', 'cel_projektu',
      'innowacja', 'innowacyjnosc', 'wartosc', 'korzysci',
      'biznesplan', 'plan_biznesowy', 'analiza', 'rynek'
    ]
    
    return fields.filter(field => {
      const name = field.getName().toLowerCase()
      return creativePatterns.some(pattern => name.includes(pattern))
    })
  }

  /**
   * Fill creative fields using AI
   */
  private async fillCreativeFields(
    fields: any[],
    companyData: CompanyData,
    grantInfo: any,
    form: any,
    result: PDFFillResult
  ) {
    const aiGen = new AITextGenerator()
    
    for (const field of fields) {
      const name = field.getName().toLowerCase()
      
      // Determine field type
      let fieldType: any = 'project_description'
      
      if (name.includes('biznes') || name.includes('plan')) {
        fieldType = 'business_plan'
      } else if (name.includes('innowac')) {
        fieldType = 'innovation_description'
      } else if (name.includes('budzet') || name.includes('koszt')) {
        fieldType = 'budget_justification'
      }
      
      // Estimate cost
      const maxLength = field instanceof PDFTextField ? 
        field.getMaxLength() || 2000 : 2000
      const estimatedCost = aiGen.estimateCost(maxLength)
      
      // Check budget
      if (!this.costTracker.canAfford(estimatedCost)) {
        result.warnings.push(`Brak budżetu na AI dla pola: ${field.getName()}`)
        continue
      }
      
      // Generate text
      try {
        const text = await aiGen.generateProjectDescription({
          fieldType,
          companyData,
          grantContext: {
            title: grantInfo.title,
            category: grantInfo.category,
            requirements: grantInfo.requirements,
            maxLength
          },
          tone: 'formal'
        })
        
        if (field instanceof PDFTextField) {
          field.setText(text)
          result.aiGeneratedFields.push(field.getName())
          result.costEstimate += estimatedCost
          this.costTracker.trackCost(estimatedCost)
        }
        
      } catch (error) {
        result.warnings.push(`AI nie wygenerowało tekstu dla: ${field.getName()}`)
      }
    }
  }

  /**
   * Learn from user corrections
   */
  async learnFromCorrection(
    originalPDF: Buffer,
    correctedPDF: Buffer,
    companyData: CompanyData,
    grantSource: string
  ) {
    // Compare original vs corrected
    // Extract differences
    // Update template or create new
    
    console.log('Learning from user corrections...')
    // Implementation would compare PDFs and update templates
  }
}

// Singleton
export const pdfFillingService = new PDFFillingService()