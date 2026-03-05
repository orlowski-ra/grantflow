import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { pdfFillingService } from '@/lib/form-filler/pdf-service'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { mkdir } from 'fs/promises'

// Temp directory for file processing
const TEMP_DIR = join(process.cwd(), 'tmp', 'pdf-processing')

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get order ID from form data
    const formData = await request.formData()
    const orderId = formData.get('orderId') as string
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // Verify order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
        status: { in: ['DOCS_REQUIRED', 'IN_PROGRESS'] }
      },
      include: {
        grant: true,
        user: {
          select: {
            companyName: true,
            nip: true,
            regon: true,
            street: true,
            city: true,
            postalCode: true,
            pkdCodes: true,
            employeeCount: true,
            annualRevenue: true,
            email: true,
            phone: true,
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found or invalid status' }, { status: 404 })
    }

    // Check if user has uploaded their documents
    if (!order.uploadedDocuments || (order.uploadedDocuments as any[]).length === 0) {
      return NextResponse.json({ 
        error: 'Please upload your company documents first',
        code: 'DOCS_REQUIRED'
      }, { status: 400 })
    }

    // Get grant template PDF
    const grantTemplatePath = join(process.cwd(), 'templates', 'grants', `${order.grant.source}.pdf`)
    
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await readFile(grantTemplatePath)
    } catch (e) {
      // If no template, try to get from grant record
      if (!order.grant.documents || !(order.grant.documents as any).template) {
        return NextResponse.json({ 
          error: 'Form template not available for this grant',
          code: 'TEMPLATE_MISSING'
        }, { status: 404 })
      }
      
      // Download template from URL
      const templateUrl = (order.grant.documents as any).template
      const response = await fetch(templateUrl)
      pdfBuffer = Buffer.from(await response.arrayBuffer())
    }

    // Prepare company data
    const companyData = {
      nip: order.user.nip || '',
      regon: order.user.regon || '',
      companyName: order.user.companyName || '',
      legalForm: 'Sp. z o.o.', // Could be stored in user profile
      street: order.user.street || '',
      city: order.user.city || '',
      postalCode: order.user.postalCode || '',
      pkdCodes: order.user.pkdCodes || [],
      employeeCount: order.user.employeeCount || 0,
      annualRevenue: order.user.annualRevenue || 0,
      email: order.user.email || '',
      phone: '', // Add to user profile
      representativeName: '', // Add to user profile
      representativePosition: '' // Add to user profile
    }

    // Fill PDF
    const result = await pdfFillingService.fillPDF(
      pdfBuffer,
      companyData,
      {
        title: order.grant.title,
        category: order.grant.category,
        requirements: order.grant.requirements || '',
        source: order.grant.source
      }
    )

    if (!result.success || !result.pdfBytes) {
      return NextResponse.json({ 
        error: 'Failed to fill PDF',
        warnings: result.warnings,
        code: 'FILL_FAILED'
      }, { status: 500 })
    }

    // Save filled PDF
    const fileId = uuidv4()
    const outputDir = join(process.cwd(), 'uploads', 'filled-forms', session.user.id)
    await mkdir(outputDir, { recursive: true })
    
    const outputPath = join(outputDir, `${orderId}_${fileId}.pdf`)
    await writeFile(outputPath, result.pdfBytes)

    // Update order with generated document
    const generatedDocs = order.generatedDocuments as any[] || []
    generatedDocs.push({
      type: 'filled_form',
      path: outputPath,
      createdAt: new Date().toISOString(),
      confidence: result.confidenceScore,
      aiCost: result.costEstimate
    })

    await prisma.order.update({
      where: { id: orderId },
      data: {
        generatedDocuments: generatedDocs,
        status: 'IN_PROGRESS'
      }
    })

    // Return filled PDF for download
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/orders/${orderId}/download/${fileId}`,
      filledFields: result.filledFields,
      aiGeneratedFields: result.aiGeneratedFields,
      confidenceScore: result.confidenceScore,
      costEstimate: result.costEstimate,
      warnings: result.warnings
    })

  } catch (error) {
    console.error('Auto-fill error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// GET - Check auto-fill status/capabilities
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const grantId = searchParams.get('grantId')
  
  if (!grantId) {
    return NextResponse.json({ error: 'Grant ID required' }, { status: 400 })
  }
  
  const grant = await prisma.grant.findUnique({
    where: { id: grantId },
    select: {
      source: true,
      documents: true
    }
  })
  
  if (!grant) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  }
  
  // Check if we have template
  const hasTemplate = !!grant.documents && !!(grant.documents as any).template
  
  // Known sources have better support
  const knownSources = ['PARP', 'FEnIKS', 'MAZOWIECKIE', 'SLASKIE']
  const isKnownSource = knownSources.includes(grant.source)
  
  return NextResponse.json({
    canAutoFill: hasTemplate || isKnownSource,
    hasTemplate,
    isKnownSource,
    estimatedCost: isKnownSource ? 0 : 0.2, // PLN
    estimatedConfidence: isKnownSource ? 0.85 : 0.6
  })
}