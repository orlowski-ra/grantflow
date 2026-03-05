// AI Text Generation - uses Kimi API (user has subscription)
// Only for fields that need creativity (descriptions, business plans)

import { CompanyData } from './template-engine'

interface AIGenerationRequest {
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

export class AITextGenerator {
  private apiUrl = 'https://api.kimi.com/coding/v1/chat/completions'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.KIMI_API_KEY || ''
  }

  /**
   * Generate project description based on company profile and grant requirements
   */
  async generateProjectDescription(
    request: AIGenerationRequest
  ): Promise<string> {
    const prompt = this.buildPrompt(request)
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'k2.5',
          messages: [
            {
              role: 'system',
              content: `Jesteś profesjonalnym konsultantem ds. dotacji UE. 
Piszesz wnioski o dofinansowanie dla polskich przedsiębiorstw.
Używaj języka formalnego, unikaj ogólników, konkretyzuj cele i korzyści.
Tekst musi być realistyczny i wykonalny - nie przesadzaj.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: request.grantContext.maxLength || 2000
        })
      })

      if (!response.ok) {
        throw new Error(`Kimi API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0].message.content

    } catch (error) {
      console.error('AI Generation failed:', error)
      // Fallback to template
      return this.generateFallbackDescription(request)
    }
  }

  /**
   * Generate multiple variants for A/B testing or user choice
   */
  async generateVariants(
    request: AIGenerationRequest,
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

  private buildPrompt(request: AIGenerationRequest): string {
    const { companyData, grantContext, fieldType } = request
    
    const baseContext = `
DANE FIRMY:
- Nazwa: ${companyData.companyName}
- Forma prawna: ${companyData.legalForm}
- PKD: ${companyData.pkdCodes.join(', ')}
- Liczba pracowników: ${companyData.employeeCount}
- Roczny obrót: ${companyData.annualRevenue} PLN
- Branża: ${this.inferIndustry(companyData.pkdCodes)}

KONTEKST GRANTU:
- Tytuł: ${grantContext.title}
- Kategoria: ${grantContext.category}
- Wymagania: ${grantContext.requirements}
`

    switch (fieldType) {
      case 'project_description':
        return `${baseContext}

Napisz OPIS PROJEKTU na wniosek o dotację (max 3000 znaków).

Struktura:
1. Cel główny projektu (konkretny, mierzalny)
2. Zakres prac (co zostanie zrobione)
3. Innowacyjność (co nowego wprowadza)
4. Oczekiwane rezultaty (mierzalne korzyści)
5. Harmonogram (krótko, etapy)

Ważne:
- Nie używaj ogólników ("rozwój firmy")
- Konkrety: liczby, procenty, nazwy produktów/usług
- Dopasuj do PKD firmy
- Pokaż, że projekt jest wykonalny finansowo i organizacyjnie`

      case 'business_plan':
        return `${baseContext}

Napisz fragment BIZNESPLANU: analizę rynku i strategię (max 2000 znaków).

Struktura:
1. Opis rynku docelowego (wielkość, trendy)
2. Analiza konkurencji (2-3 główni gracze)
3. Proponowane rozwiązanie (USP - unikalna wartość)
4. Model przychodów (skąd będą pieniądze po projekcie)
5. Ryzyka i ich mitigacja`

      case 'innovation_description':
        return `${baseContext}

Napisz opis INNOWACYJNOŚCI projektu (max 1500 znaków).

Odpowiedz na:
- Co jest nowego w stosunku do stanu techniki?
- Jakie problemy rozwiązuje?
- Dlaczego konkurencja tego nie robi?
- Jakie korzyści dla klientów/konsumentów?`

      case 'budget_justification':
        return `${baseContext}

Uzasadnij BUDŻET projektu (max 1000 znaków).

Dla każdej pozycji kosztowej wyjaśnij:
- Dlaczego ta kwota jest potrzebna?
- Skąd wzięte szacunki (ceny rynkowe, wyceny)?
- Jakie będzie wykorzystanie po zakończeniu projektu?`

      default:
        return baseContext
    }
  }

  private inferIndustry(pkdCodes: string[]): string {
    const pkdMap: Record<string, string> = {
      '62': 'IT/Programowanie',
      '46': 'Handel',
      '47': 'Handel detaliczny',
      '41': 'Budownictwo',
      '43': 'Budownictwo specjalistyczne',
      '69': 'Usługi prawne/księgowe',
      '73': 'Reklama/marketing',
      '85': 'Edukacja',
      '86': 'Opieka zdrowotna',
    }
    
    const section = pkdCodes[0]?.substring(0, 2)
    return pkdMap[section] || 'Przemysł/Usługi'
  }

  private generateFallbackDescription(request: AIGenerationRequest): string {
    // Simple template-based fallback when AI fails
    const { companyData, grantContext } = request
    
    return `Projekt "${grantContext.title}" realizowany przez ${companyData.companyName} 
ma na celu rozwój działalności w obszarze ${grantContext.category}. 

Dzięki dofinansowaniu firma planuje wdrożyć innowacyjne rozwiązania 
dopasowane do profilu działalności (PKD: ${companyData.pkdCodes.join(', ')}). 

Realizacja projektu przyczyni się do wzrostu konkurencyjności przedsiębiorstwa 
na rynku lokalnym i regionalnym.`
  }

  /**
   * Calculate cost estimate
   */
  estimateCost(textLength: number): number {
    // Kimi pricing: ~0.003 PLN per 1K tokens
    // 1 token ≈ 4 characters
    const tokens = textLength / 4
    const costPln = (tokens / 1000) * 0.003
    return Math.max(0.01, costPln) // Minimum 1 grosz
  }
}

// Usage tracker
export class AICostTracker {
  private monthlyBudget = 50 // PLN - max 50 zł miesięcznie na AI
  private currentSpend = 0

  canAfford(estimatedCost: number): boolean {
    return (this.currentSpend + estimatedCost) <= this.monthlyBudget
  }

  trackCost(cost: number) {
    this.currentSpend += cost
    console.log(`AI Cost: ${cost.toFixed(2)} PLN, Total: ${this.currentSpend.toFixed(2)} PLN`)
  }

  getRemainingBudget(): number {
    return this.monthlyBudget - this.currentSpend
  }
}