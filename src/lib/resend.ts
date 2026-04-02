import { Resend } from 'resend'
import { env } from '~/env'

export interface ResendEmail {
  to: Array<{ name?: string; address: string }>
  cc?: Array<{ name?: string; address: string }>
  bcc?: Array<{ name?: string; address: string }>
  subject: string
  body: string
  from?: { name?: string; address: string }
}

class ResendClient {
  private resend: Resend | null = null

  constructor() {
    if (env.RESEND_API_KEY && env.RESEND_API_KEY.startsWith('re_')) {
      this.resend = new Resend(env.RESEND_API_KEY)
    }
  }

  async sendEmail(email: ResendEmail): Promise<{ id: string; success: boolean }> {
    if (!this.resend) {
      throw new Error('Resend not configured. Please set RESEND_API_KEY in .env')
    }

    try {
      // Format addresses for Resend
      const formatAddress = (addr: { name?: string; address: string }) => {
        return addr.name ? `${addr.name} <${addr.address}>` : addr.address
      }

      const to = email.to.map(formatAddress)
      const cc = email.cc?.map(formatAddress)
      const bcc = email.bcc?.map(formatAddress)
      
      // Use a default from address if not provided
      const from = email.from 
        ? formatAddress(email.from)
        : 'AI Email Client <onboarding@resend.dev>' // Using Resend's default verified domain

      const result = await this.resend.emails.send({
        from,
        to,
        cc,
        bcc,
        subject: email.subject,
        html: email.body,
      })

      if (result.error) {
        console.error('Resend error:', result.error)
        throw new Error(`Resend error: ${result.error.message}`)
      }

      return {
        id: result.data?.id || 'unknown',
        success: true,
      }
    } catch (error) {
      console.error('Failed to send email via Resend:', error)
      throw new Error(`Failed to send email: ${error}`)
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.resend) {
      return false
    }

    try {
      // Try to send a test email to verify the API key works
      const result = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: ['delivered@resend.dev'],
        subject: 'Test Connection',
        html: 'This is a test email to verify Resend connection.',
      })

      // Even if the email fails due to domain verification, 
      // a valid API key will return a proper error structure
      return result.error?.message !== 'Invalid API key'
    } catch (error) {
      console.error('Resend connection test failed:', error)
      return false
    }
  }
}

export const resendClient = new ResendClient()