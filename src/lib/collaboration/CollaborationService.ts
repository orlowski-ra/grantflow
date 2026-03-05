// Multi-User Collaboration System for GrantFlow
// Real-time editing, permissions, and conflict resolution

import { prisma } from '@/lib/db'
import { createClient } from '@vercel/kv' // or Redis
import { WebSocket } from 'ws'

// Types
interface Collaborator {
  id: string
  orderId: string
  userId: string
  email: string
  role: CollaboratorRole
  permissions: Permission[]
  joinedAt: Date
  lastActiveAt: Date
}

type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'viewer'

type Permission = 
  | 'view' 
  | 'edit' 
  | 'comment' 
  | 'invite' 
  | 'delete' 
  | 'submit' 
  | 'manage_permissions'

interface DocumentLock {
  orderId: string
  section: string // 'budget', 'description', 'attachments'
  userId: string
  lockedAt: Date
  expiresAt: Date
}

interface EditOperation {
  id: string
  orderId: string
  userId: string
  section: string
  field: string
  oldValue: any
  newValue: any
  timestamp: Date
  type: 'insert' | 'update' | 'delete'
}

interface Comment {
  id: string
  orderId: string
  userId: string
  section: string
  field?: string
  content: string
  resolved: boolean
  createdAt: Date
  replies: CommentReply[]
}

interface CommentReply {
  id: string
  userId: string
  content: string
  createdAt: Date
}

// Permission Matrix
const ROLE_PERMISSIONS: Record<CollaboratorRole, Permission[]> = {
  owner: ['view', 'edit', 'comment', 'invite', 'delete', 'submit', 'manage_permissions'],
  admin: ['view', 'edit', 'comment', 'invite', 'delete', 'submit'],
  editor: ['view', 'edit', 'comment'],
  viewer: ['view', 'comment']
}

export class CollaborationService {
  private kv = createClient({ url: process.env.KV_URL })
  private locks: Map<string, DocumentLock> = new Map()
  private activeConnections: Map<string, WebSocket> = new Map()

  /**
   * Add collaborator to order
   */
  async addCollaborator(
    orderId: string,
    invitedBy: string,
    email: string,
    role: CollaboratorRole = 'editor'
  ): Promise<Collaborator> {
    // Check if inviter has permission
    const inviter = await this.getCollaborator(orderId, invitedBy)
    if (!inviter || !this.hasPermission(inviter, 'invite')) {
      throw new Error('Brak uprawnień do zapraszania użytkowników')
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    
    if (!existingUser) {
      // Create invitation for new user
      await this.createInvitation(orderId, email, role, invitedBy)
      throw new Error('Użytkownik nie ma konta. Wysłano zaproszenie rejestracyjne.')
    }

    // Check if already collaborator
    const existing = await prisma.collaborator.findFirst({
      where: { orderId, userId: existingUser.id }
    })

    if (existing) {
      throw new Error('Użytkownik już jest współpracownikiem tego wniosku')
    }

    // Add collaborator
    const collaborator = await prisma.collaborator.create({
      data: {
        orderId,
        userId: existingUser.id,
        role,
        joinedAt: new Date(),
        lastActiveAt: new Date()
      },
      include: {
        user: { select: { email: true } }
      }
    })

    // Send notification
    await this.sendNotification(existingUser.id, {
      type: 'COLLABORATOR_ADDED',
      title: 'Dodano Cię do wniosku',
      message: `Zostałeś dodany jako ${role} do wniosku ${orderId}`,
      link: `/orders/${orderId}`
    })

    // Log activity
    await this.logActivity(orderId, invitedBy, 'COLLABORATOR_ADDED', {
      addedUser: existingUser.id,
      role
    })

    return {
      id: collaborator.id,
      orderId: collaborator.orderId,
      userId: collaborator.userId,
      email: collaborator.user.email,
      role: collaborator.role as CollaboratorRole,
      permissions: ROLE_PERMISSIONS[collaborator.role as CollaboratorRole],
      joinedAt: collaborator.joinedAt,
      lastActiveAt: collaborator.lastActiveAt
    }
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(
    orderId: string,
    removedBy: string,
    userIdToRemove: string
  ): Promise<void> {
    const remover = await this.getCollaborator(orderId, removedBy)
    
    // Can remove if: owner, admin, or self
    const canRemove = 
      this.hasPermission(remover, 'manage_permissions') ||
      removedBy === userIdToRemove

    if (!canRemove) {
      throw new Error('Brak uprawnień do usuwania użytkowników')
    }

    // Cannot remove owner
    const target = await this.getCollaborator(orderId, userIdToRemove)
    if (target?.role === 'owner') {
      throw new Error('Nie można usunąć właściciela wniosku')
    }

    await prisma.collaborator.deleteMany({
      where: { orderId, userId: userIdToRemove }
    })

    await this.logActivity(orderId, removedBy, 'COLLABORATOR_REMOVED', {
      removedUser: userIdToRemove
    })
  }

  /**
   * Change collaborator role
   */
  async changeRole(
    orderId: string,
    changedBy: string,
    userId: string,
    newRole: CollaboratorRole
  ): Promise<void> {
    const changer = await this.getCollaborator(orderId, changedBy)
    
    if (!this.hasPermission(changer, 'manage_permissions')) {
      throw new Error('Brak uprawnień do zmiany ról')
    }

    // Cannot demote owner
    const target = await this.getCollaborator(orderId, userId)
    if (target?.role === 'owner' && newRole !== 'owner') {
      throw new Error('Nie można zmienić roli właściciela')
    }

    await prisma.collaborator.updateMany({
      where: { orderId, userId },
      data: { role: newRole }
    })

    await this.logActivity(orderId, changedBy, 'ROLE_CHANGED', {
      targetUser: userId,
      newRole
    })
  }

  /**
   * Lock section for editing (optimistic locking)
   */
  async acquireLock(
    orderId: string,
    userId: string,
    section: string,
    ttl: number = 300 // 5 minutes
  ): Promise<boolean> {
    const lockKey = `${orderId}:${section}`
    const existingLock = this.locks.get(lockKey)

    // Check if section is already locked by someone else
    if (existingLock && existingLock.userId !== userId) {
      if (existingLock.expiresAt > new Date()) {
        return false // Section is locked
      }
    }

    // Acquire lock
    const lock: DocumentLock = {
      orderId,
      section,
      userId,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000)
    }

    this.locks.set(lockKey, lock)

    // Store in Redis for persistence across servers
    await this.kv.setex(lockKey, ttl, JSON.stringify(lock))

    // Notify other users
    await this.broadcast(orderId, {
      type: 'LOCK_ACQUIRED',
      section,
      userId,
      expiresAt: lock.expiresAt
    })

    return true
  }

  /**
   * Release lock
   */
  async releaseLock(orderId: string, userId: string, section: string): Promise<void> {
    const lockKey = `${orderId}:${section}`
    const lock = this.locks.get(lockKey)

    if (lock && lock.userId === userId) {
      this.locks.delete(lockKey)
      await this.kv.del(lockKey)

      await this.broadcast(orderId, {
        type: 'LOCK_RELEASED',
        section,
        userId
      })
    }
  }

  /**
   * Save edit operation
   */
  async saveEdit(
    orderId: string,
    userId: string,
    section: string,
    field: string,
    oldValue: any,
    newValue: any
  ): Promise<EditOperation> {
    // Verify lock
    const lockKey = `${orderId}:${section}`
    const lock = this.locks.get(lockKey)

    if (!lock || lock.userId !== userId) {
      throw new Error('Sekcja nie jest zablokowana przez Ciebie')
    }

    // Create operation
    const operation: EditOperation = {
      id: crypto.randomUUID(),
      orderId,
      userId,
      section,
      field,
      oldValue,
      newValue,
      timestamp: new Date(),
      type: this.detectOperationType(oldValue, newValue)
    }

    // Store in database
    await prisma.editHistory.create({
      data: {
        orderId,
        userId,
        section,
        field,
        oldValue: JSON.stringify(oldValue),
        newValue: JSON.stringify(newValue),
        timestamp: operation.timestamp
      }
    })

    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        [section]: newValue,
        updatedAt: new Date()
      }
    })

    // Broadcast to other users
    await this.broadcast(orderId, {
      type: 'EDIT',
      operation
    })

    // Extend lock
    await this.acquireLock(orderId, userId, section, 300)

    return operation
  }

  /**
   * Add comment
   */
  async addComment(
    orderId: string,
    userId: string,
    section: string,
    content: string,
    field?: string
  ): Promise<Comment> {
    const collaborator = await this.getCollaborator(orderId, userId)
    
    if (!this.hasPermission(collaborator, 'comment')) {
      throw new Error('Brak uprawnień do komentowania')
    }

    const comment = await prisma.comment.create({
      data: {
        orderId,
        userId,
        section,
        field,
        content,
        resolved: false
      },
      include: {
        user: { select: { email: true, name: true } }
      }
    })

    // Notify collaborators
    await this.notifyCollaborators(orderId, userId, {
      type: 'NEW_COMMENT',
      title: 'Nowy komentarz',
      message: `${comment.user.name || comment.user.email} dodał komentarz`,
      link: `/orders/${orderId}?section=${section}`
    })

    return {
      id: comment.id,
      orderId: comment.orderId,
      userId: comment.userId,
      section: comment.section,
      field: comment.field || undefined,
      content: comment.content,
      resolved: comment.resolved,
      createdAt: comment.createdAt,
      replies: []
    }
  }

  /**
   * Get edit history
   */
  async getEditHistory(orderId: string, section?: string): Promise<EditOperation[]> {
    const where: any = { orderId }
    if (section) where.section = section

    const history = await prisma.editHistory.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        user: { select: { email: true, name: true } }
      }
    })

    return history.map(h => ({
      id: h.id,
      orderId: h.orderId,
      userId: h.userId,
      section: h.section,
      field: h.field,
      oldValue: JSON.parse(h.oldValue),
      newValue: JSON.parse(h.newValue),
      timestamp: h.timestamp,
      type: 'update' // Simplified for now
    }))
  }

  /**
   * Get active collaborators
   */
  async getActiveCollaborators(orderId: string): Promise<Collaborator[]> {
    const collaborators = await prisma.collaborator.findMany({
      where: { orderId },
      include: {
        user: { select: { email: true, name: true } }
      }
    })

    return collaborators.map(c => ({
      id: c.id,
      orderId: c.orderId,
      userId: c.userId,
      email: c.user.email,
      role: c.role as CollaboratorRole,
      permissions: ROLE_PERMISSIONS[c.role as CollaboratorRole],
      joinedAt: c.joinedAt,
      lastActiveAt: c.lastActiveAt
    }))
  }

  // Helper methods
  private async getCollaborator(orderId: string, userId: string): Promise<Collaborator | null> {
    const collab = await prisma.collaborator.findFirst({
      where: { orderId, userId },
      include: { user: { select: { email: true } } }
    })

    if (!collab) return null

    return {
      id: collab.id,
      orderId: collab.orderId,
      userId: collab.userId,
      email: collab.user.email,
      role: collab.role as CollaboratorRole,
      permissions: ROLE_PERMISSIONS[collab.role as CollaboratorRole],
      joinedAt: collab.joinedAt,
      lastActiveAt: collab.lastActiveAt
    }
  }

  private hasPermission(collaborator: Collaborator | null, permission: Permission): boolean {
    if (!collaborator) return false
    return collaborator.permissions.includes(permission)
  }

  private async createInvitation(
    orderId: string,
    email: string,
    role: CollaboratorRole,
    invitedBy: string
  ): Promise<void> {
    await prisma.invitation.create({
      data: {
        orderId,
        email,
        role,
        invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    // TODO: Send email invitation
  }

  private async sendNotification(userId: string, notification: any): Promise<void> {
    await prisma.notification.create({
      data: {
        userId,
        ...notification
      }
    })
  }

  private async notifyCollaborators(
    orderId: string,
    exceptUserId: string,
    notification: any
  ): Promise<void> {
    const collaborators = await prisma.collaborator.findMany({
      where: { orderId, userId: { not: exceptUserId } }
    })

    for (const collab of collaborators) {
      await this.sendNotification(collab.userId, notification)
    }
  }

  private async logActivity(
    orderId: string,
    userId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    await prisma.activityLog.create({
      data: {
        orderId,
        userId,
        action,
        metadata
      }
    })
  }

  private async broadcast(orderId: string, message: any): Promise<void> {
    // WebSocket broadcast implementation
    // TODO: Implement WebSocket server
  }

  private detectOperationType(oldValue: any, newValue: any): 'insert' | 'update' | 'delete' {
    if (oldValue === null || oldValue === undefined) return 'insert'
    if (newValue === null || newValue === undefined) return 'delete'
    return 'update'
  }
}

// Export singleton
export const collaborationService = new CollaborationService()
