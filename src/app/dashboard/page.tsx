'use client'

import React, { useState } from "react";
import { EmailList } from "~/components/dashboard/email-list";
import { EmailView } from "~/components/dashboard/email-view";
import { WelcomeScreen } from "~/components/dashboard/welcome-screen";
import { useEmailContext } from "~/components/dashboard/email-context";
import { api } from "~/trpc/react";

function DashboardContent() {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const { setSelectedEmail, setEmailContext } = useEmailContext();

  // Check if user has connected accounts
  const { data: accounts, isLoading: isLoadingAccounts } = api.account.getAccounts.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const hasAccounts = accounts && accounts.length > 0;

  // Get the selected email data
  const { data: selectedEmail } = api.account.getEmailById.useQuery(
    { emailId: selectedEmailId! },
    { enabled: !!selectedEmailId }
  );

  // Update email context when email changes
  React.useEffect(() => {
    if (selectedEmail) {
      setSelectedEmail(selectedEmail);
      const context = `Subject: ${selectedEmail.subject || 'No Subject'}
From: ${selectedEmail.addresses?.find((a: any) => a.type === 'from')?.address || 'Unknown'}
Date: ${selectedEmail.sentAt ? new Date(selectedEmail.sentAt).toLocaleDateString() : 'Unknown'}
Content: ${selectedEmail.body || selectedEmail.bodySnippet || 'No content'}`;
      setEmailContext(context);
    }
  }, [selectedEmail, setSelectedEmail, setEmailContext]);

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  // Show welcome screen only when no accounts are connected
  if (!isLoadingAccounts && !hasAccounts) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex h-full">
      {/* Email List Panel */}
      <div className="w-[380px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
        <EmailList
          selectedEmailId={selectedEmailId}
          onEmailSelect={handleEmailSelect}
        />
      </div>

      {/* Email View Panel */}
      <div className="flex-1 bg-white dark:bg-gray-800 min-w-0">
        {selectedEmail ? (
          <EmailView 
            email={selectedEmail} 
            folder="inbox" 
            onClose={() => setSelectedEmailId(null)} 
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Select an email to read</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Choose an email from the list on the left to view its contents here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />
}