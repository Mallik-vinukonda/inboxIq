'use client'

import React, { useState } from "react";
import { EmailList } from "~/components/dashboard/email-list";
import { EmailView } from "~/components/dashboard/email-view";
import { WelcomeScreen } from "~/components/dashboard/welcome-screen";
import { useEmailContext } from "~/components/dashboard/email-context";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

function TrashContent() {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const { setSelectedEmail, setEmailContext } = useEmailContext();

  // Get accounts for empty trash functionality and checking connection
  const { data: accounts, isLoading: isLoadingAccounts } = api.account.getAccounts.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const hasAccounts = accounts && accounts.length > 0;

  // Empty trash mutation
  const emptyTrashMutation = api.account.emptyTrash.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedEmailId(null);
      window.location.reload(); // Refresh the page to update the email list
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEmptyTrash = () => {
    if (!accounts?.[0]) {
      toast.error('No email account found');
      return;
    }

    if (confirm('Permanently delete all emails in trash? This action cannot be undone.')) {
      emptyTrashMutation.mutate({ accountId: accounts[0].id });
    }
  };

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
      <div className="w-[380px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Trash</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmptyTrash}
              disabled={emptyTrashMutation.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Empty Trash
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <EmailList
            selectedEmailId={selectedEmailId}
            onEmailSelect={handleEmailSelect}
            folder="trash"
          />
        </div>
      </div>
      <div className="flex-1 bg-white dark:bg-gray-800 min-w-0">
        {selectedEmail ? (
          <EmailView email={selectedEmail} folder="trash" />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Trash2 className="w-10 h-10 text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Select an email to read</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
                Choose an email from the list on the left to view its contents here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrashPage() {
  return <TrashContent />
}