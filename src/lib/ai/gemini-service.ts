// Gemini AI Service - używa klucza użytkownika
// Zastępuje Kimi API

import { CompanyData } from '@/lib/form-filler/template-engine'

interface GeminiGenerationRequest {
  fieldType: 'project_description' | 'business_plan' | 'innovation_description' | 'budget_justification'
  companyData: CompanyData
  grantContext: {
    title: string
    category: string
    requirements: string
    maxLength?: number
  }
  tone: 'formal' | 'professional' | 'enthusiastic'
}

export class GeminiTextGenerator {
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || ''
  }

  /**
   * Generate text using Gemini API
   */
  async generateProjectDescription(
    request: GeminiGenerationRequest
  ): Promise<string> {
    const prompt = this.buildPrompt(request)
    
    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: request.grantContext.maxLength || 2048,
            topP: 0.8,
            topK: 40
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Gemini API error: ${error.error?.message || response.status}`)
      }

      const data = await response.json()
      return data.candidates[0].content.parts[0].text

    } catch (error) {
      console.error('Gemini Generation failed:', error)
      return this.generateFallbackDescription(request)
    }
  }

  /**
   * Generate multiple variants
   */
  async generateVariants(
    request: GeminiGenerationRequest,
    count: number = 3
  ): Promise<string[]> {
    const variants: string[] = []
    
    for (let i = 0; i < count; i++) {
      const variantRequest = {
        ...request,
        tone: i === 0 ? 'formal' : i === 1 ? 'professional' : 'enthusiastic'
      }
      
      const text = await this.generateProjectDescription(variantRequest)
      variants.push(text)
    }
    
    return variants
  }

  private buildPrompt(request: GeminiGenerationRequest): string {
    const { companyData, grantContext, fieldType } = request
    
    const baseContext = `
DANE FIRMY:
- Nazwa: ${companyData.companyName}
- Forma prawna: ${companyData.legalForm}
- PKD: ${companyData.pkdCodes?.join(', ') || 'nie podano'}
- Liczba pracowników: ${companyData.employeeCount || 'nie podano'}
- Roczny obrót: ${companyData.annualRevenue ? companyData.annualRevenue + ' PLN' : 'nie podano'}

KONTEKST GRANTU:
- Tytuł: ${grantContext.title}
- Kategoria: ${grantContext.category}
- Wymagania: ${grantContext.requirements}
`

    switch (fieldType) {
      case 'project_description':
        return `${baseContext}

Napisz OPIS PROJEKTU na wniosek o dotację (maksymalnie ${grantContext.maxLength || 3000} znaków).

Struktura odpowiedzi:
1. Cel główny projektu - konkretny, mierzalny cel
2. Zakres prac - szczegółowo co zostanie zrobione
3. Innowacyjność - co nowego wprowadza projekt
4. Oczekiwane rezultaty - mierzalne korzyści (liczby, procenty)
5. Harmonogram realizacji - krótko, główne etapy

Ważne wskazówki:
- Używaj konkretów, unikaj ogólników typu "rozwój firmy"
- Dostosuj treść do kodów PKD firmy
- Pokaż, że projekt jest realistyczny i wykonalny
- Podkreśl korzyści dla klientów/pracowników
- Napisz w języku polskim, styl formalny

Odpowiedź powinna być gotowa do wklejenia do wniosku.`

      case 'business_plan':
        return `${baseContext}

Napisz fragment BIZNESPLANU: analizę rynku i strategię (maksymalnie ${grantContext.maxLength || 2000} znaków).

Struktura:
1. Opis rynku docelowego - wielkość, trendy, potencjał wzrostu
2. Analiza konkurencji - 2-3 główni konkurenci, ich mocne i słabe strony
3. Proponowane rozwiązanie - USP (unikalna wartość sprzedażowa)
4. Model przychodów - skąd będą pieniądze po zakończeniu projektu
5. Główne ryzyka i sposoby ich minimalizacji

Napisz w języku polskim, styl formalny, konkretnie.`

      case 'innovation_description':
        return `${baseContext}

Napisz opis INNOWACYJNOŚCI projektu (maksymalnie ${grantContext.maxLength || 1500} znaków).

Odpowiedz na pytania:
- Co jest nowego w stosunku do obecnego stanu techniki?
- Jakie konkretne problemy rozwiązuje to rozwiązanie?
- Dlaczego konkurencja nie oferuje czegoś podobnego?
- Jakie wymierne korzyści przyniesie klientom/konsumentom?

Napisz w języku polskim, przekonująco, ale realistycznie.`

      case 'budget_justification':
        return `${baseContext}

Uzasadnij BUDŻET projektu (maksymalnie ${grantContext.maxLength || 1000} znaków).

Dla każdej pozycji kosztowej wyjaśnij:
- Dlaczego ta kwota jest niezbędna do realizacji projektu?
- Skąd pochodzą szacunki (ceny rynkowe, wyceny dostawców)?
- Jakie będzie wykorzystanie zakupionych zasobów po zakończeniu projektu?

Napisz w języku polskim, zwięźle.`

      default:
        return baseContext
    }
  }

  private generateFallbackDescription(request: GeminiGenerationRequest): string {
    const { companyData, grantContext } = request
    
    return `Projekt "${grantContext.title}" realizowany przez ${companyData.companyName} 
ma na celu rozwój działalności w obszarze ${grantContext.category}. 

Dzięki dofinansowaniu firma planuje wdrożyć innowacyjne rozwiązania 
dopasowane do profilu działalności. 

Realizacja projektu przyczyni się do wzrostu konkurencyjności przedsiębiorstwa 
na rynku lokalnym i regionalnym.`
  }

  /**
   * Calculate cost estimate (Gemini is cheaper than Kimi)
   */
  estimateCost(textLength: number): number {
    // Gemini pricing: ~$0.00025 per 1K characters for input
    // Output: ~$0.0005 per 1K characters
    // Average: let's estimate ~$0.0005 per 1K characters total
    const costUsd = (textLength / 1000) * 0.0005
    const costPln = costUsd * 4 // ~4 PLN per USD
    return Math.max(0.01, costPln) // Minimum 1 grosz
  }
}

// Usage tracker
export class AICostTracker {
  private monthlyBudget = 30 // PLN - niższy budżet bo Gemini jest tańszy
  private currentSpend = 0

  canAfford(estimatedCost: number): boolean {
    return (this.currentSpend + estimatedCost) <= this.monthlyBudget
  }

  trackCost(cost: number) {
    this.currentSpend += cost
    console.log(`AI Cost: ${cost.toFixed(4)} PLN, Total: ${this.currentSpend.toFixed(4)} PLN`)
  }

  getRemainingBudget(): number {
    return this.monthlyBudget - this.currentSpend
  }
}

// Singleton
export const geminiGenerator = new GeminiTextGenerator()
