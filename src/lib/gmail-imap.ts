import Imap from 'imap'
import { simpleParser } from 'mailparser'
import nodemailer from 'nodemailer'

export interface GmailCredentials {
  email: string
  password: string // App password from Gmail
}

export interface EmailMessage {
  id: string
  messageId: string
  threadId: string
  subject: string
  body: string
  snippet: string
  from: { name?: string; address: string }
  to: Array<{ name?: string; address: string }>
  cc?: Array<{ name?: string; address: string }>
  bcc?: Array<{ name?: string; address: string }>
  sentAt: Date
  receivedAt: Date
  isRead: boolean
  isImportant: boolean
  isStarred: boolean
  isDraft: boolean
  folder: string
}

export interface SendEmailOptions {
  to: Array<{ name?: string; address: string }>
  cc?: Array<{ name?: string; address: string }>
  bcc?: Array<{ name?: string; address: string }>
  subject: string
  body: string
  isHtml?: boolean
}

class GmailImapClient {
  private credentials: GmailCredentials | null = null
  private imap: Imap | null = null
  private smtpTransporter: nodemailer.Transporter | null = null
  private isConnecting: boolean = false
  private isConnected: boolean = false

  // Test connection with credentials
  async testConnection(credentials: GmailCredentials): Promise<boolean> {
    return new Promise((resolve) => {
      const testImap = new Imap({
        user: credentials.email,
        password: credentials.password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 5000,
      })

      const timeout = setTimeout(() => {
        try { testImap.end() } catch (e) {}
        resolve(false)
      }, 15000)

      testImap.once('ready', () => {
        clearTimeout(timeout)
        testImap.end()
        resolve(true)
      })

      testImap.once('error', (err) => {
        clearTimeout(timeout)
        console.error('IMAP test failed:', err.message)
        resolve(false)
      })

      try {
        testImap.connect()
      } catch (error) {
        clearTimeout(timeout)
        resolve(false)
      }
    })
  }

  // Connect to Gmail with credentials
  async connect(credentials: GmailCredentials): Promise<void> {
    // If already connected with same credentials, reuse connection
    if (this.isConnected && this.credentials?.email === credentials.email) {
      console.log('♻️ Reusing existing Gmail IMAP connection')
      return
    }

    // Clean up any existing connection
    this.disconnect()
    
    this.isConnecting = true
    this.credentials = credentials

    // Setup IMAP connection
    this.imap = new Imap({
      user: credentials.email,
      password: credentials.password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 15000,
      authTimeout: 10000,
      keepalive: true,
    })

    // Only setup SMTP transporter if we need to send emails
    // For sync operations, we only need IMAP
    if (!this.smtpTransporter) {
      this.smtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: credentials.email,
          pass: credentials.password,
        },
      })
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.isConnecting = false
        reject(new Error('Gmail connection timeout. Please check your credentials and internet connection.'))
      }, 20000)

      this.imap!.once('ready', () => {
        clearTimeout(timeout)
        console.log('✅ Gmail IMAP connected successfully')
        this.isConnected = true
        this.isConnecting = false
        resolve()
      })

      this.imap!.once('error', (err) => {
        clearTimeout(timeout)
        console.error('❌ Gmail IMAP connection error:', err)
        this.isConnected = false
        this.isConnecting = false
        
        let errorMessage = 'Gmail connection failed'
        if (err.message.includes('Invalid credentials') || err.message.includes('AUTHENTICATIONFAILED')) {
          errorMessage = 'Invalid Gmail credentials. Please check your email and app password.'
        } else if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to Gmail servers. Please check your internet connection.'
        }
        
        reject(new Error(errorMessage))
      })

      this.imap!.once('end', () => {
        console.log('📤 Gmail IMAP connection ended')
        this.isConnected = false
        this.isConnecting = false
      })

      try {
        this.imap!.connect()
      } catch (error) {
        clearTimeout(timeout)
        this.isConnecting = false
        reject(new Error(`Failed to connect to Gmail: ${error}`))
      }
    })
  }

  // Disconnect from Gmail
  disconnect(): void {
    if (this.imap) {
      try {
        this.imap.end()
      } catch (error) {
        console.error('Error disconnecting IMAP:', error)
      }
      this.imap = null
    }
    this.credentials = null
    this.smtpTransporter = null
    this.isConnected = false
    this.isConnecting = false
    console.log('📤 Gmail IMAP disconnected')
  }

  // Get recent emails from a folder
  async getRecentEmails(folder: string = 'INBOX', limit: number = 20): Promise<EmailMessage[]> {
    if (!this.imap || !this.isConnected) {
      throw new Error('Not connected to Gmail. Call connect() first.')
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox(folder, true, (err, box) => {
        if (err) {
          reject(new Error(`Failed to open ${folder}: ${err.message}`))
          return
        }

        console.log(`📧 Opened ${folder} with ${box.messages.total} total messages`)

        if (box.messages.total === 0) {
          resolve([])
          return
        }

        const fetchOptions = {
          bodies: '',
          struct: true,
          envelope: true,
          markSeen: false
        }

        // Get all messages and sort by UID (most recent first)
        this.imap!.search(['ALL'], (err, results) => {
          if (err) {
            reject(new Error(`Email search failed: ${err.message}`))
            return
          }

          if (!results || results.length === 0) {
            resolve([])
            return
          }

          // Sort UIDs in descending order and take the most recent
          const sortedResults = results.sort((a, b) => b - a).slice(0, limit)
          console.log(`🔄 Processing ${sortedResults.length} most recent emails`)
          
          this.processFetchResults(sortedResults, fetchOptions, resolve, reject, folder)
        })
      })
    })
  }

  // Get emails from a specific folder
  async getEmails(folder: string = 'INBOX', limit: number = 50): Promise<EmailMessage[]> {
    return this.getRecentEmails(folder, limit)
  }

  // Process fetch results
  private processFetchResults(
    results: number[], 
    fetchOptions: any, 
    resolve: (emails: EmailMessage[]) => void, 
    reject: (error: any) => void, 
    folder: string
  ): void {
    const emails: EmailMessage[] = []
    const fetch = this.imap!.fetch(results, fetchOptions)

    fetch.on('message', (msg, seqno) => {
      let emailData: any = {}

      msg.on('body', (stream, info) => {
        let buffer = ''
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8')
        })
        stream.once('end', async () => {
          try {
            const parsed = await simpleParser(buffer)
            emailData.parsed = parsed
          } catch (error) {
            console.error('Error parsing email:', error)
          }
        })
      })

      msg.once('attributes', (attrs) => {
        emailData.attrs = attrs
      })

      msg.once('end', () => {
        if (emailData.parsed && emailData.attrs) {
          const email = this.parseEmailMessage(emailData, folder)
          if (email) {
            emails.push(email)
          }
        }
      })
    })

    fetch.once('error', (err) => {
      console.error('Fetch error:', err)
      reject(new Error(`Failed to fetch emails: ${err.message}`))
    })

    fetch.once('end', () => {
      // Sort emails by received date descending
      emails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      resolve(emails)
    })
  }

  // Parse email message from IMAP data
  private parseEmailMessage(emailData: any, folder: string): EmailMessage | null {
    try {
      const { parsed, attrs } = emailData
      
      if (!parsed) return null

      const parseAddresses = (addresses: any[]) => {
        if (!addresses || !Array.isArray(addresses)) return []
        return addresses.map(addr => ({
          name: addr.name || undefined,
          address: addr.address || 'unknown@email.com'
        }))
      }

      const emailDate = parsed.date || attrs.date || new Date()
      const receivedDate = attrs.date || parsed.date || new Date()

      return {
        id: `${attrs.uid}`,
        messageId: parsed.messageId || `uid-${attrs.uid}-${emailDate.getTime()}@gmail.com`,
        threadId: parsed.references?.[0] || parsed.messageId || `thread-${attrs.uid}`,
        subject: parsed.subject || 'No Subject',
        body: parsed.html || parsed.text || '',
        snippet: (parsed.text || parsed.html || '').replace(/<[^>]*>/g, '').substring(0, 150),
        from: parsed.from?.value?.[0] ? {
          name: parsed.from.value[0].name,
          address: parsed.from.value[0].address
        } : { address: 'unknown@gmail.com' },
        to: parseAddresses(parsed.to?.value || []),
        cc: parseAddresses(parsed.cc?.value || []),
        bcc: parseAddresses(parsed.bcc?.value || []),
        sentAt: emailDate,
        receivedAt: receivedDate,
        isRead: attrs.flags.includes('\\Seen'),
        isImportant: attrs.flags.includes('\\Flagged') || attrs.flags.includes('\\Important'),
        isStarred: attrs.flags.includes('\\Flagged'),
        isDraft: folder.toLowerCase().includes('draft'),
        folder: folder
      }
    } catch (error) {
      console.error('Error parsing email message:', error)
      return null
    }
  }

  // Send email via SMTP
  async sendEmail(options: SendEmailOptions): Promise<{ id: string; messageId: string }> {
    if (!this.smtpTransporter || !this.credentials) {
      throw new Error('Not connected to Gmail. Call connect() first.')
    }

    const formatAddresses = (addresses: Array<{ name?: string; address: string }>) => {
      return addresses.map(addr => 
        addr.name ? `"${addr.name}" <${addr.address}>` : addr.address
      ).join(', ')
    }

    const mailOptions = {
      from: this.credentials.email,
      to: formatAddresses(options.to),
      cc: options.cc ? formatAddresses(options.cc) : undefined,
      bcc: options.bcc ? formatAddresses(options.bcc) : undefined,
      subject: options.subject,
      [options.isHtml !== false ? 'html' : 'text']: options.body,
    }

    try {
      const result = await this.smtpTransporter.sendMail(mailOptions)
      return {
        id: result.messageId,
        messageId: result.messageId
      }
    } catch (error) {
      console.error('Error sending email:', error)
      throw new Error(`Failed to send email: ${error}`)
    }
  }

  // Get folder list
  async getFolders(): Promise<string[]> {
    if (!this.imap || !this.isConnected) {
      throw new Error('Not connected to Gmail. Call connect() first.')
    }

    return new Promise((resolve, reject) => {
      this.imap!.getBoxes((err, boxes) => {
        if (err) {
          reject(new Error(`Failed to get folders: ${err.message}`))
          return
        }

        const folderNames: string[] = []
        const extractFolders = (boxObj: any, prefix = '') => {
          Object.keys(boxObj).forEach(key => {
            if (key === 'attribs' || key === 'delimiter' || key === 'children') return
            
            const fullName = prefix ? `${prefix}${boxObj.delimiter}${key}` : key
            folderNames.push(fullName)
            
            if (boxObj[key].children) {
              extractFolders(boxObj[key].children, fullName)
            }
          })
        }

        extractFolders(boxes)
        resolve(folderNames)
      })
    })
  }
}

export const gmailImapClient = new GmailImapClient()