'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Calendar, Building2, Coins, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { formatAmount, formatDeadline, getStatusColor } from '@/lib/utils'
import { useFavorites } from '@/hooks/use-favorites'
import type { Grant } from '@/types/grant'

interface GrantCardProps {
  grant: Grant
  variant?: 'default' | 'compact' | 'featured'
  showActions?: boolean
}

export function GrantCard({ 
  grant, 
  variant = 'default',
  showActions = true 
}: GrantCardProps) {
  const { toast } = useToast()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [isLoading, setIsLoading] = useState(false)
  
  const isFav = isFavorite(grant.id)
  
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsLoading(true)
    try {
      await toggleFavorite(grant.id)
      toast({
        title: isFav ? 'Usunięto z ulubionych' : 'Dodano do ulubionych',
        duration: 2000
      })
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować ulubionych',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const statusColor = getStatusColor(grant.status)
  const deadlineSoon = grant.deadline && 
    new Date(grant.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
  
  if (variant === 'compact') {
    return (
      <Link 
        href={`/grants/${grant.slug}`}
        className="group flex items-start gap-4 p-4 rounded-lg border border-border bg-card 
                   hover:border-primary/50 hover:shadow-sm transition-all"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
              {grant.title}
            </h3>
            <Badge variant="secondary" className={statusColor}>
              {grant.status === 'ACTIVE' ? 'Otwarty' : 
               grant.status === 'CLOSED' ? 'Zamknięty' : 'Wkrótce'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {grant.shortDescription || grant.description?.substring(0, 100)}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="font-medium text-primary">
              do {formatAmount(grant.amountMax)} zł
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDeadline(grant.deadline)}
            </span>
          </div>
        </div>
      </Link>
    )
  }
  
  return (
    <article className={`group relative bg-card rounded-xl border border-border 
      hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 
      transition-all duration-200 overflow-hidden
      ${variant === 'featured' ? 'ring-2 ring-primary/20' : ''}`}>
      
      {/* Featured Badge */}
      {variant === 'featured' && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
      )}
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={statusColor}>
                {grant.status === 'ACTIVE' ? 'Otwarty nabór' : 
                 grant.status === 'CLOSED' ? 'Zakończony' : 'Wkrótce'}
              </Badge>
              {deadlineSoon && grant.status === 'ACTIVE' && (
                <Badge variant="destructive" className="animate-pulse">
                  Kończy się!
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {grant.category}
              </Badge>
            </div>
            
            <Link href={`/grants/${grant.slug}`}>
              <h3 className="text-xl font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {grant.title}
              </h3>
            </Link>
          </div>
          
          {showActions && (
            <Button
              variant="ghost"
              size="icon"
              className={`shrink-0 ${isFav ? 'text-red-500' : 'text-muted-foreground'}`}
              onClick={handleFavoriteClick}
              disabled={isLoading}
              aria-label={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
        
        {/* Description */}
        <p className="text-muted-foreground line-clamp-2 mb-4">
          {grant.shortDescription || grant.description}
        </p>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Dofinansowanie</p>
              <p className="font-semibold">
                {formatAmount(grant.amountMin)} - {formatAmount(grant.amountMax)} zł
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Deadline</p>
              <p className={`font-semibold ${deadlineSoon ? 'text-destructive' : ''}`}>
                {formatDeadline(grant.deadline)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Dla</p>
              <p className="font-semibold truncate">
                {grant.targetGroup?.slice(0, 2).join(', ') || 'MŚP'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              grant.difficulty <= 2 ? 'bg-green-500' :
              grant.difficulty === 3 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <div>
              <p className="text-muted-foreground text-xs">Trudność</p>
              <p className="font-semibold">
                {grant.difficulty === 1 ? 'Bardzo łatwy' :
                 grant.difficulty === 2 ? 'Łatwy' :
                 grant.difficulty === 3 ? 'Średni' :
                 grant.difficulty === 4 ? 'Trudny' : 'Bardzo trudny'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Source & Updated */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span>Źródło: {grant.sourceName}</span>
          <span>Aktualizacja: {new Date(grant.updatedAt).toLocaleDateString('pl-PL')}</span>
        </div>
        
        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link href={`/grants/${grant.slug}`} className="flex-1">
            <Button className="w-full group/btn">
              Sprawdź szczegóły
              <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
          
          {grant.status === 'ACTIVE' && (
            <Link href={`/grants/${grant.slug}/order`}>
              <Button variant="outline" className="shrink-0">
                Zamów za 200 zł
              </Button>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

// Loading skeleton
export function GrantCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6 rounded-xl border border-border space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-7 w-3/4" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  )
}