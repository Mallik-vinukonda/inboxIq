import { resendClient } from './resend'
import { env } from '~/env'

// Lazy load nodemailer only when needed
let nodemailerClient: any = null

const getNodemailerClient = async () => {
  if (!nodemailerClient) {
    const { nodemailerClient: client } = await import('./nodemailer')
    nodemailerClient = client
  }
  return nodemailerClient
}

export interface EmailMessage {
  to: Array<{ name?: string; address: string }>
  cc?: Array<{ name?: string; address: string }>
  bcc?: Array<{ name?: string; address: string }>
  subject: string
  body: string
  from?: { name?: string; address: string }
}

export type EmailProvider = 'resend' | 'gmail-smtp' | 'auto'

class EmailService {
  async sendEmail(
    email: EmailMessage, 
    provider: EmailProvider = 'auto'
  ): Promise<{ id: string; success: boolean; provider: string }> {
    
    // Auto-select provider based on configuration
    if (provider === 'auto') {
      if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
        provider = 'gmail-smtp'
      } else if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 'your-resend-api-key-here' && env.RESEND_API_KEY.startsWith('re_')) {
        provider = 'resend'
      } else {
        throw new Error('No email provider configured. Please set up Gmail SMTP or Resend.')
      }
    }

    try {
      let result: { id: string; success: boolean }

      switch (provider) {
        case 'resend':
          result = await resendClient.sendEmail(email)
          break
        
        case 'gmail-smtp':
          const client = await getNodemailerClient()
          result = await client.sendEmail(email)
          break
        
        default:
          throw new Error(`Unknown email provider: ${provider}`)
      }

      return {
        ...result,
        provider: provider as string,
      }
    } catch (error) {
      console.error(`Failed to send email via ${provider}:`, error)
      throw error
    }
  }

  async testConnection(provider: EmailProvider = 'auto'): Promise<{
    resend: boolean
    gmailSmtp: boolean
    recommended: string
  }> {
    const resendStatus = await resendClient.testConnection().catch(() => false)
    
    let gmailSmtpStatus = false
    try {
      if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
        const client = await getNodemailerClient()
        gmailSmtpStatus = await client.testConnection()
      }
    } catch (error) {
      gmailSmtpStatus = false
    }

    let recommended = 'none'
    if (gmailSmtpStatus) recommended = 'gmail-smtp'
    else if (resendStatus) recommended = 'resend'

    return {
      resend: resendStatus,
      gmailSmtp: gmailSmtpStatus,
      recommended,
    }
  }

  getConfigurationStatus(): {
    resend: boolean
    gmailSmtp: boolean
    hasAnyProvider: boolean
  } {
    const resendConfigured = !!(env.RESEND_API_KEY && 
      env.RESEND_API_KEY !== 'your-resend-api-key-here' && 
      env.RESEND_API_KEY.startsWith('re_'))
    const gmailSmtpConfigured = !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD)

    return {
      resend: resendConfigured,
      gmailSmtp: gmailSmtpConfigured,
      hasAnyProvider: resendConfigured || gmailSmtpConfigured,
    }
  }
}

export const emailService = new EmailService()