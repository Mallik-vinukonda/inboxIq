import { create, insert, search, remove } from '@orama/orama'
import { pluginEmbeddings } from '@orama/plugin-embeddings'
import { aiService } from './ai-service'
import { env } from '~/env'

// Email search schema
const emailSchema = {
  id: 'string',
  subject: 'string',
  body: 'string',
  snippet: 'string',
  from: 'string',
  to: 'string[]',
  sentAt: 'string',
  threadId: 'string',
  isRead: 'boolean',
  isImportant: 'boolean',
  isStarred: 'boolean',
  embeddings: 'vector[1536]', // Using same dimension as OpenAI for compatibility
} as const

// Create Orama database instance
let emailSearchDB: any = null

export async function initializeSearchDB() {
  if (emailSearchDB) return emailSearchDB

  emailSearchDB = await create({
    schema: emailSchema,
    // Note: We're not using the embeddings plugin since we're handling embeddings manually with Gemini
  })

  return emailSearchDB
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await aiService.generateEmbedding(text)
  } catch (error) {
    console.error('Error generating embedding:', error)
    return []
  }
}

export async function indexEmail(email: {
  id: string
  subject: string | null
  body: string | null
  snippet: string | null
  from: string
  to: string[]
  sentAt: Date | null
  threadId: string | null
  isRead: boolean
  isImportant: boolean
  isStarred: boolean
}) {
  const db = await initializeSearchDB()

  // Create searchable text content
  const searchableContent = [
    email.subject || '',
    email.body || email.snippet || '',
    email.from,
    ...email.to,
  ].join(' ')

  // Generate embedding
  const embeddings = await generateEmbedding(searchableContent)

  const document = {
    id: email.id,
    subject: email.subject || '',
    body: email.body || '',
    snippet: email.snippet || '',
    from: email.from,
    to: email.to,
    sentAt: email.sentAt?.toISOString() || '',
    threadId: email.threadId || '',
    isRead: email.isRead,
    isImportant: email.isImportant,
    isStarred: email.isStarred,
    embeddings,
  }

  await insert(db, document)
  return document
}

export async function searchEmails(query: string, options: {
  limit?: number
  threshold?: number
  includeVectorSearch?: boolean
} = {}) {
  const db = await initializeSearchDB()
  const { limit = 20, threshold = 0.8, includeVectorSearch = true } = options

  try {
    // Perform text search first
    const results = await search(db, {
      term: query,
      limit,
      threshold,
    })

    return results
  } catch (error) {
    console.error('Search error:', error)
    return { hits: [], count: 0 }
  }
}

export async function semanticSearch(query: string, limit = 10) {
  const db = await initializeSearchDB()

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    // For now, we'll do a simple text search since Gemini embeddings are mock
    // In production, you'd implement proper vector similarity search
    const results = await search(db, {
      term: query,
      limit,
    })

    return results
  } catch (error) {
    console.error('Semantic search error:', error)
    return { hits: [], count: 0 }
  }
}

export async function removeEmailFromIndex(emailId: string) {
  const db = await initializeSearchDB()
  
  try {
    await remove(db, emailId)
  } catch (error) {
    console.error('Error removing email from index:', error)
  }
}

export async function bulkIndexEmails(emails: Array<{
  id: string
  subject: string | null
  body: string | null
  snippet: string | null
  from: string
  to: string[]
  sentAt: Date | null
  threadId: string | null
  isRead: boolean
  isImportant: boolean
  isStarred: boolean
}>) {
  const db = await initializeSearchDB()

  for (const email of emails) {
    try {
      await indexEmail(email)
    } catch (error) {
      console.error(`Error indexing email ${email.id}:`, error)
    }
  }

  return true
}