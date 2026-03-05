import { NextRequest, NextResponse } from 'next/server'
import { validateBudget, BudgetData, GrantRequirements } from '@/lib/budget/budget-validator'
import { prisma } from '@/lib/db'

// POST /api/budget/validate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { budget, grantId }: { budget: BudgetData; grantId: string } = body
    
    // Validation
    if (!budget || !grantId) {
      return NextResponse.json(
        { error: 'Missing required fields: budget, grantId' },
        { status: 400 }
      )
    }
    
    // Fetch grant requirements
    const grant = await prisma.grant.findUnique({
      where: { id: grantId },
      select: {
        id: true,
        title: true,
        amountMin: true,
        amountMax: true,
        fundingRate: true,
      }
    })
    
    if (!grant) {
      return NextResponse.json(
        { error: 'Grant not found' },
        { status: 404 }
      )
    }
    
    // Build grant requirements
    const grantRequirements: GrantRequirements = {
      minOwnContribution: 100 - (grant.fundingRate || 50), // If 50% funded, 50% own
      maxGrantAmount: grant.amountMax,
      grantRate: grant.fundingRate || 50,
      // These would ideally come from grant-specific config
      maxPersonnelPercentage: 60,
      maxEquipmentPercentage: 70,
    }
    
    // Validate budget
    const validationReport = validateBudget(budget, grantRequirements)
    
    return NextResponse.json({
      success: true,
      validation: validationReport,
      grant: {
        id: grant.id,
        title: grant.title,
        requirements: grantRequirements,
      }
    })
    
  } catch (error) {
    console.error('Budget validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate budget', details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/budget/rules/:grantId
export async function GET(
  request: NextRequest,
  { params }: { params: { grantId: string } }
) {
  try {
    const grant = await prisma.grant.findUnique({
      where: { id: params.grantId },
      select: {
        id: true,
        title: true,
        fundingRate: true,
        amountMax: true,
      }
    })
    
    if (!grant) {
      return NextResponse.json(
        { error: 'Grant not found' },
        { status: 404 }
      )
    }
    
    // Return default validation rules for this grant type
    const rules = {
      minOwnContribution: 100 - (grant.fundingRate || 50),
      maxGrantAmount: grant.amountMax,
      grantRate: grant.fundingRate || 50,
      maxPersonnelPercentage: 60,
      maxEquipmentPercentage: 70,
      eligibleCategories: ['personnel', 'equipment', 'services', 'travel'],
    }
    
    return NextResponse.json({
      grant,
      rules,
    })
    
  } catch (error) {
    console.error('Get budget rules error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget rules' },
      { status: 500 }
    )
  }
}
