'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calculator, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

interface BudgetItem {
  id: string
  name: string
  cost: number
  category: 'personnel' | 'equipment' | 'services' | 'travel' | 'other'
  eligible: boolean
  vatRate: number
}

interface BudgetCalculatorProps {
  grantRate: number // np. 50 = 50% dofinansowania
  maxGrantAmount: number
  minOwnContribution: number
  onBudgetChange?: (budget: BudgetSummary) => void
}

interface BudgetSummary {
  totalCost: number
  eligibleCost: number
  ineligibleCost: number
  grantAmount: number
  ownContribution: number
  vatAmount: number
  netAmount: number
  isValid: boolean
  errors: string[]
  warnings: string[]
}

const VAT_RATES = [0, 5, 8, 23]

export function BudgetCalculator({
  grantRate,
  maxGrantAmount,
  minOwnContribution,
  onBudgetChange
}: BudgetCalculatorProps) {
  const [items, setItems] = useState<BudgetItem[]>([
    { id: '1', name: 'Wynagrodzenia', cost: 0, category: 'personnel', eligible: true, vatRate: 0 },
    { id: '2', name: 'Sprzęt', cost: 0, category: 'equipment', eligible: true, vatRate: 23 },
    { id: '3', name: 'Usługi zewnętrzne', cost: 0, category: 'services', eligible: true, vatRate: 23 },
  ])

  const [summary, setSummary] = useState<BudgetSummary>({
    totalCost: 0,
    eligibleCost: 0,
    ineligibleCost: 0,
    grantAmount: 0,
    ownContribution: 0,
    vatAmount: 0,
    netAmount: 0,
    isValid: false,
    errors: [],
    warnings: []
  })

  const calculateBudget = useCallback((): BudgetSummary => {
    const errors: string[] = []
    const warnings: string[] = []

    let totalCost = 0
    let eligibleCost = 0
    let ineligibleCost = 0
    let vatAmount = 0

    items.forEach(item => {
      const netCost = item.cost / (1 + item.vatRate / 100)
      const vat = item.cost - netCost
      
      totalCost += item.cost
      vatAmount += vat

      if (item.eligible) {
        eligibleCost += item.cost
      } else {
        ineligibleCost += item.cost
      }
    })

    // Oblicz dofinansowanie (od kosztów kwalifikowalnych)
    let grantAmount = (eligibleCost * grantRate) / 100
    
    // Sprawdź maksymalną kwotę dofinansowania
    if (grantAmount > maxGrantAmount) {
      grantAmount = maxGrantAmount
      warnings.push(`Dofinansowanie ograniczone do maksymalnej kwoty ${maxGrantAmount.toLocaleString('pl-PL')} PLN`)
    }

    // Własny wkład
    const ownContribution = totalCost - grantAmount

    // Walidacja
    if (totalCost === 0) {
      errors.push('Budżet nie może być zerowy')
    }

    if (ownContribution < minOwnContribution) {
      errors.push(`Własny wkład musi wynosić minimum ${minOwnContribution.toLocaleString('pl-PL')} PLN (obecnie: ${ownContribution.toLocaleString('pl-PL')} PLN)`)
    }

    if (grantRate > 0 && eligibleCost === 0) {
      errors.push('Przy tym procencie dofinansowania wymagane są koszty kwalifikowalne')
    }

    // Ostrzeżenia
    if (items.some(i => i.category === 'personnel' && i.cost > totalCost * 0.5)) {
      warnings.push('Koszty osobowe przekraczają 50% budżetu - upewnij się, że jest to zgodne z wytycznymi grantu')
    }

    if (items.some(i => i.category === 'equipment' && i.cost > totalCost * 0.7)) {
      warnings.push('Koszty sprzętu przekraczają 70% budżetu - niektóre granty mają limity')
    }

    const isValid = errors.length === 0

    return {
      totalCost,
      eligibleCost,
      ineligibleCost,
      grantAmount,
      ownContribution,
      vatAmount,
      netAmount: totalCost - vatAmount,
      isValid,
      errors,
      warnings
    }
  }, [items, grantRate, maxGrantAmount, minOwnContribution])

  useEffect(() => {
    const newSummary = calculateBudget()
    setSummary(newSummary)
    onBudgetChange?.(newSummary)
  }, [calculateBudget, onBudgetChange])

  const updateItem = (id: string, updates: Partial<BudgetItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  const addItem = () => {
    const newId = (Math.max(...items.map(i => parseInt(i.id)), 0) + 1).toString()
    setItems([...items, {
      id: newId,
      name: 'Nowa pozycja',
      cost: 0,
      category: 'other',
      eligible: true,
      vatRate: 23
    }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id))
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pl-PL', { 
      style: 'currency', 
      currency: 'PLN',
      minimumFractionDigits: 2
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Kalkulator Budżetu Projektu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parametry grantu */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-sm text-muted-foreground">Stopa dofinansowania</Label>
              <p className="text-2xl font-bold">{grantRate}%</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Max dofinansowanie</Label>
              <p className="text-2xl font-bold">{formatCurrency(maxGrantAmount)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Min. wkład własny</Label>
              <p className="text-2xl font-bold">{formatCurrency(minOwnContribution)}</p>
            </div>
          </div>

          {/* Pozycje budżetowe */}
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                <div className="col-span-3">
                  <Label className="text-xs">Nazwa</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Kategoria</Label>
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(item.id, { category: e.target.value as BudgetItem['category'] })}
                    className="w-full h-9 px-2 border rounded text-sm"
                  >
                    <option value="personnel">Koszty osobowe</option>
                    <option value="equipment">Sprzęt</option>
                    <option value="services">Usługi</option>
                    <option value="travel">Podróże</option>
                    <option value="other">Inne</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Kwota brutto</Label>
                  <Input
                    type="number"
                    value={item.cost || ''}
                    onChange={(e) => updateItem(item.id, { cost: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">VAT</Label>
                  <select
                    value={item.vatRate}
                    onChange={(e) => updateItem(item.id, { vatRate: parseInt(e.target.value) })}
                    className="w-full h-9 px-2 border rounded text-sm"
                  >
                    {VAT_RATES.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Kwalifikowalne</Label>
                  <div className="flex items-center h-9">
                    <input
                      type="checkbox"
                      checked={item.eligible}
                      onChange={(e) => updateItem(item.id, { eligible: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="ml-2 text-sm">
                      {item.eligible ? 'Tak' : 'Nie'}
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="h-9 px-3 text-sm text-red-600 hover:bg-red-50 rounded border"
                    disabled={items.length <= 1}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={addItem}
              className="w-full py-2 text-sm text-primary border border-dashed border-primary rounded hover:bg-primary/5"
            >
              + Dodaj pozycję budżetową
            </button>
          </div>

          {/* Błędy i ostrzeżenia */}
          {summary.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {summary.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {summary.warnings.length > 0 && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <ul className="list-disc list-inside space-y-1">
                  {summary.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {summary.isValid && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Budżet jest poprawny i spełnia wymagania grantu.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Podsumowanie */}
      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Całkowity koszt:</span>
                <span className="font-medium">{formatCurrency(summary.totalCost)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Koszty kwalifikowalne:</span>
                <span className="font-medium text-green-600">{formatCurrency(summary.eligibleCost)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Koszty niekwalifikowalne:</span>
                <span className="font-medium text-orange-600">{formatCurrency(summary.ineligibleCost)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">W tym VAT:</span>
                <span className="font-medium">{formatCurrency(summary.vatAmount)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Dofinansowanie ({grantRate}%):</span>
                <span className="font-medium text-blue-600">{formatCurrency(summary.grantAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Wkład własny:</span>
                <span className="font-medium">{formatCurrency(summary.ownContribution)}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold bg-muted p-3 rounded">
                <span>Własny wkład (%):</span>
                <span>{summary.totalCost > 0 ? ((summary.ownContribution / summary.totalCost) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BudgetCalculator
