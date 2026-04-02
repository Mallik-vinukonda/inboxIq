'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import { ScrollArea } from '~/components/ui/scroll-area'
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  User,
  Mail,
  Star,
  Archive,
  Zap
} from 'lucide-react'
import { api } from '~/trpc/react'
import { useDebounce } from '~/hooks/use-debounce'

interface SearchResult {
  id: string
  subject: string
  snippet: string
  from: string
  to: string[]
  sentAt: string
  isRead: boolean
  isImportant: boolean
  isStarred: boolean
  score?: number
}

interface AdvancedSearchProps {
  isOpen: boolean
  onClose: () => void
  onSelectEmail: (emailId: string) => void
}

export function AdvancedSearch({ isOpen, onClose, onSelectEmail }: AdvancedSearchProps) {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'text' | 'semantic'>('text')
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    hasAttachments: false,
    isUnread: false,
    isStarred: false,
    dateRange: '',
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  const searchEmails = api.account.searchEmails.useQuery(
    {
      query: debouncedQuery,
      limit: 20,
    },
    {
      enabled: debouncedQuery.length > 0,
    }
  )

  // Handle search results with useEffect
  useEffect(() => {
    if (searchEmails.data) {
      setResults(searchEmails.data.map((email: any) => ({
        id: email.id,
        subject: email.subject || 'No Subject',
        snippet: email.bodySnippet || email.body?.substring(0, 150) || '',
        from: email.addresses?.find((addr: any) => addr.type === 'from')?.address || '',
        to: email.addresses?.filter((addr: any) => addr.type === 'to').map((addr: any) => addr.address) || [],
        sentAt: email.sentAt?.toISOString() || '',
        isRead: email.isRead,
        isImportant: email.isImportant,
        isStarred: email.isStarred,
      })))
      setIsSearching(false)
    }
    if (searchEmails.error) {
      console.error('Search error:', searchEmails.error)
      setIsSearching(false)
    }
  }, [searchEmails.data, searchEmails.error])

  const performSearch = useCallback(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
  }, [debouncedQuery])

  useEffect(() => {
    performSearch()
  }, [debouncedQuery])

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setFilters({
      from: '',
      to: '',
      hasAttachments: false,
      isUnread: false,
      isStarred: false,
      dateRange: '',
    })
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-4xl max-h-[80vh] mx-4 flex flex-col overflow-hidden">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5" />
              <span>Advanced Search</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Search Input */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search emails, people, or ask a question..."
                className="pl-10"
                autoFocus
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={searchType === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('text')}
              >
                Text
              </Button>
              <Button
                variant={searchType === 'semantic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('semantic')}
              >
                <Zap className="w-4 h-4 mr-1" />
                AI
              </Button>
            </div>
          </div>

          {/* Search Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setQuery(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + 'has:attachment ')}
            >
              <Filter className="w-4 h-4 mr-1" />
              Has Attachments
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setQuery(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + 'newer_than:1d ')}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Last 24h
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setQuery(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + 'from: ')}
            >
              <User className="w-4 h-4 mr-1" />
              From...
            </Button>
            {query && (
              <Button variant="ghost" size="sm" onClick={clearSearch}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
          <div className="h-full">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">
                    {searchType === 'semantic' ? 'AI is searching...' : 'Searching...'}
                  </span>
                </div>
              </div>
            )}

            {!isSearching && results.length === 0 && query && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-gray-600 max-w-md">
                  Try adjusting your search terms or using different keywords.
                  {searchType === 'text' && ' You can also try AI search for semantic results.'}
                </p>
              </div>
            )}

            {!isSearching && results.length === 0 && !query && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Search your emails</h3>
                <p className="text-gray-600 max-w-md">
                  Use keywords, names, or ask questions like "emails about the project" or "when is my flight?"
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="divide-y">
                {results.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => onSelectEmail(result.id)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {result.isStarred && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                          {result.isImportant && (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                        </div>
                        <span className={`font-medium truncate ${!result.isRead ? 'font-semibold' : ''}`}>
                          {result.from}
                        </span>
                        {result.score && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(result.score * 100)}% match
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(result.sentAt)}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <h3 className={`text-sm truncate ${!result.isRead ? 'font-semibold' : 'font-medium'}`}>
                        {result.subject}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {result.snippet}
                    </p>

                    {result.to.length > 0 && (
                      <div className="mt-2 flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          To: {result.to.slice(0, 2).join(', ')}
                          {result.to.length > 2 && ` +${result.to.length - 2} more`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{results.length} results found</span>
                <div className="flex items-center space-x-2">
                  <span>Search powered by</span>
                  {searchType === 'semantic' ? (
                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                      <Zap className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Text</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}