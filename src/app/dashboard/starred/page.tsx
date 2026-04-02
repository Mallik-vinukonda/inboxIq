'use client'

import React, { useState } from "react";
import { EmailList } from "~/components/dashboard/email-list";
import { EmailView } from "~/components/dashboard/email-view";
import { WelcomeScreen } from "~/components/dashboard/welcome-screen";
import { useEmailContext } from "~/components/dashboard/email-context";
import { api } from "~/trpc/react";

function StarredContent() {
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
    <div className="flex h-full relative">
      <div className="w-[380px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
        <EmailList
          selectedEmailId={selectedEmailId}
          onEmailSelect={handleEmailSelect}
          folder="starred"
        />
      </div>
      <div className="flex-1 bg-white dark:bg-gray-800 min-w-0">
        {selectedEmail ? (
          <EmailView email={selectedEmail} folder="starred" />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <svg className="w-10 h-10 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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

export default function StarredPage() {
  return <StarredContent />
}