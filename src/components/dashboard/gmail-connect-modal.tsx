'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Mail, Shield, Check } from 'lucide-react'

interface GmailConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function GmailConnectModal({ isOpen, onClose, onSuccess }: GmailConnectModalProps) {

  const handleGoogleSignIn = () => {
    // Redirect to our OAuth initiation endpoint
    window.location.href = '/api/auth/gmail'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-red-500" />
            Connect Gmail Account
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Securely connect your Gmail account using Google&apos;s official OAuth 2.0. 
              We never see or store your password.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Read and sync your inbox & sent emails</p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Send emails directly from InboxIQ</p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Auto-sync new emails every few minutes</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full h-11 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm flex items-center justify-center gap-3 rounded-lg text-sm font-medium transition-all"
            >
              {/* Google "G" logo inline SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400">
            You&apos;ll be redirected to Google to authorize access. 
            You can revoke access anytime from your Google Account settings.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}