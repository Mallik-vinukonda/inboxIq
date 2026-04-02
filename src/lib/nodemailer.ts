import nodemailer from 'nodemailer'
import { env } from '~/env'

export interface NodemailerEmail {
  to: Array<{ name?: string; address: string }>
  cc?: Array<{ name?: string; address: string }>
  bcc?: Array<{ name?: string; address: string }>
  subject: string
  body: string
  from?: { name?: string; address: string }
}

class NodemailerClient {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
      console.warn('Gmail SMTP credentials not configured')
      return
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
    })
  }

  async sendEmail(email: NodemailerEmail): Promise<{ id: string; success: boolean }> {
    if (!this.transporter) {
      throw new Error('Gmail SMTP not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env')
    }

    try {
      // Format addresses for Nodemailer
      const formatAddress = (addr: { name?: string; address: string }) => {
        return addr.name ? `"${addr.name}" <${addr.address}>` : addr.address
      }

      const formatAddresses = (addresses: Array<{ name?: string; address: string }>) => {
        return addresses.map(formatAddress).join(', ')
      }

      const from = email.from 
        ? formatAddress(email.from)
        : env.GMAIL_USER // Use the configured Gmail as default sender

      const mailOptions = {
        from,
        to: formatAddresses(email.to),
        cc: email.cc ? formatAddresses(email.cc) : undefined,
        bcc: email.bcc ? formatAddresses(email.bcc) : undefined,
        subject: email.subject,
        html: email.body,
      }

      const result = await this.transporter.sendMail(mailOptions)

      return {
        id: result.messageId || 'unknown',
        success: true,
      }
    } catch (error) {
      console.error('Failed to send email via Gmail SMTP:', error)
      throw new Error(`Failed to send email: ${error}`)
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false
    }

    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Gmail SMTP connection test failed:', error)
      return false
    }
  }

  // Get connection status
  isConfigured(): boolean {
    return this.transporter !== null
  }
}

export const nodemailerClient = new NodemailerClient()