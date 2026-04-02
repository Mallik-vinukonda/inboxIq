import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "~/components/dashboard/sidebar";
import { CommandBar } from "~/components/dashboard/command-bar";
import { EmailSyncProvider } from "~/components/dashboard/email-sync-provider";
import { EmailContextProvider } from "~/components/dashboard/email-context";
import { AIChat } from "~/components/dashboard/ai-chat";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <EmailContextProvider>
            {children}
            <AIChat />
          </EmailContextProvider>
        </main>
      </div>
      <CommandBar />
      <EmailSyncProvider />
    </div>
  );
}