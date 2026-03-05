import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { searchGrants } from '@/lib/search/meilisearch'
import { cache } from 'react'

// Cache for 5 minutes
const getGrants = cache(async (params: GrantSearchParams) => {
  const {
    page = 1,
    limit = 20,
    category,
    region,
    minAmount,
    maxAmount,
    targetGroup,
    status = 'ACTIVE',
    search,
    sortBy = 'deadline',
    sortOrder = 'asc'
  } = params

  const skip = (page - 1) * limit

  // Build where clause
  const where: any = {
    status,
  }

  if (category) where.category = category
  if (region) where.region = region
  if (targetGroup) where.targetGroup = { has: targetGroup }
  
  if (minAmount !== undefined || maxAmount !== undefined) {
    where.AND = []
    if (minAmount !== undefined) {
      where.AND.push({ amountMax: { gte: minAmount } })
    }
    if (maxAmount !== undefined) {
      where.AND.push({ amountMin: { lte: maxAmount } })
    }
  }

  // If search query provided, use Meilisearch
  if (search && search.length > 2) {
    const searchResults = await searchGrants(search, {
      filter: Object.entries(where)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k} = ${v}`)
        .join(' AND '),
      limit,
      offset: skip,
      sort: [`${sortBy}:${sortOrder}`]
    })

    return {
      grants: searchResults.hits,
      total: searchResults.totalHits,
      page,
      pages: Math.ceil(searchResults.totalHits / limit)
    }
  }

  // Otherwise use Prisma
  const [grants, total] = await Promise.all([
    prisma.grant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        amountMin: true,
        amountMax: true,
        deadline: true,
        status: true,
        category: true,
        region: true,
        sourceName: true,
        difficulty: true,
        updatedAt: true,
      }
    }),
    prisma.grant.count({ where })
  ])

  return {
    grants,
    total,
    page,
    pages: Math.ceil(total / limit)
  }
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params: GrantSearchParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      category: searchParams.get('category') || undefined,
      region: searchParams.get('region') || undefined,
      minAmount: searchParams.get('minAmount') ? 
        parseInt(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? 
        parseInt(searchParams.get('maxAmount')!) : undefined,
      targetGroup: searchParams.get('targetGroup') || undefined,
      status: (searchParams.get('status') as GrantStatus) || 'ACTIVE',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'deadline',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc'
    }

    const result = await getGrants(params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Grants API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grants', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// POST - Create new grant (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Auth check (implement your auth logic)
    // const session = await getServerSession(authOptions)
    // if (!session?.user || session.user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    
    // Validation
    if (!body.title || !body.amountMin || !body.amountMax || !body.deadline) {
      return NextResponse.json(
        { error: 'Missing required fields', fields: ['title', 'amountMin', 'amountMax', 'deadline'] },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36)

    const grant = await prisma.grant.create({
      data: {
        ...body,
        slug,
        status: body.status || 'UPCOMING'
      }
    })

    // Index in Meilisearch
    await indexGrant(grant)

    return NextResponse.json(grant, { status: 201 })
  } catch (error) {
    console.error('Create Grant Error:', error)
    return NextResponse.json(
      { error: 'Failed to create grant' },
      { status: 500 }
    )
  }
}

// Types
interface GrantSearchParams {
  page?: number
  limit?: number
  category?: string
  region?: string
  minAmount?: number
  maxAmount?: number
  targetGroup?: string
  status?: GrantStatus
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

type GrantStatus = 'ACTIVE' | 'CLOSED' | 'UPCOMING' | 'SUSPENDED'