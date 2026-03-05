import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Przelewy24 } from '@/lib/payments/p24'
import { OpenBankingService } from '@/lib/payments/openbanking'

const createOrderSchema = z.object({
  grantId: z.string().uuid(),
  paymentMethod: z.enum(['P24', 'OPEN_BANKING', 'BLIK']),
  successUrl: z.string().url(),
  failureUrl: z.string().url()
})

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Validation
    const body = await request.json()
    const validated = createOrderSchema.safeParse(body)
    
    if (!validated.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validated.error.errors,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { grantId, paymentMethod, successUrl, failureUrl } = validated.data

    // Check if grant exists and is active
    const grant = await prisma.grant.findFirst({
      where: { 
        id: grantId,
        status: 'ACTIVE',
        deadline: { gt: new Date() }
      }
    })

    if (!grant) {
      return NextResponse.json(
        { error: 'Grant not found or inactive', code: 'GRANT_UNAVAILABLE' },
        { status: 404 }
      )
    }

    // Check for duplicate pending orders
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        grantId,
        status: { in: ['PENDING_PAYMENT', 'DOCS_REQUIRED', 'IN_PROGRESS'] }
      }
    })

    if (existingOrder) {
      return NextResponse.json(
        { 
          error: 'Order already exists for this grant',
          orderId: existingOrder.id,
          code: 'DUPLICATE_ORDER'
        },
        { status: 409 }
      )
    }

    // Create order
    const orderNumber = await generateOrderNumber()
    
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        grantId,
        status: 'PENDING_PAYMENT',
        amount: 20000, // 200 PLN in grosze
        currency: 'PLN',
        paymentMethod,
        paymentStatus: 'PENDING'
      },
      include: {
        grant: {
          select: {
            title: true,
            amountMax: true
          }
        },
        user: {
          select: {
            email: true,
            companyName: true
          }
        }
      }
    })

    // Initialize payment based on method
    let paymentData: any

    if (paymentMethod === 'P24') {
      const p24 = new Przelewy24({
        merchantId: process.env.PRZELEWY24_MERCHANT_ID!,
        apiKey: process.env.PRZELEWY24_API_KEY!,
        crc: process.env.PRZELEWY24_CRC!,
        sandbox: process.env.NODE_ENV !== 'production'
      })

      const session = await p24.registerTransaction({
        sessionId: order.id,
        amount: order.amount,
        currency: order.currency,
        description: `GrantFlow - ${grant.title.substring(0, 50)}`,
        email: order.user.email!,
        urlReturn: successUrl,
        urlStatus: `${process.env.NEXTAUTH_URL}/api/payments/webhook`,
        timeLimit: 15 // 15 minutes to pay
      })

      paymentData = {
        token: session.token,
        url: session.url
      }

    } else if (paymentMethod === 'OPEN_BANKING') {
      const ob = new OpenBankingService()
      
      const paymentSession = await ob.createPayment({
        amount: order.amount / 100, // Convert to PLN
        currency: order.currency,
        description: `GrantFlow Order ${orderNumber}`,
        orderId: order.id,
        successUrl,
        failureUrl
      })

      paymentData = {
        paymentId: paymentSession.paymentId,
        authorizationUrl: paymentSession.authorizationUrl,
        banks: paymentSession.availableBanks // List of supported banks
      }
    }

    // Update order with payment ID
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        paymentId: paymentData.token || paymentData.paymentId
      }
    })

    // Send confirmation email
    await sendOrderConfirmationEmail(order)

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.amount,
      currency: order.currency,
      payment: paymentData,
      status: order.status
    }, { status: 201 })

  } catch (error) {
    console.error('Order Creation Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// GET - List user's orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    const where: any = { userId: session.user.id }
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          grant: {
            select: {
              title: true,
              slug: true,
              deadline: true,
              amountMax: true
            }
          }
        }
      }),
      prisma.order.count({ where })
    ])

    return NextResponse.json({
      orders,
      total,
      page,
      pages: Math.ceil(total / limit)
    })

  } catch (error) {
    console.error('List Orders Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// Helper functions
async function generateOrderNumber(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  
  // Get count of orders this month
  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(date.getFullYear(), date.getMonth(), 1)
      }
    }
  })
  
  const sequence = String(count + 1).padStart(4, '0')
  return `GF-${year}${month}-${sequence}`
}

async function sendOrderConfirmationEmail(order: any) {
  // Implementation using your email service
  console.log(`Sending order confirmation for ${order.orderNumber} to ${order.user.email}`)
}