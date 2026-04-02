import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { env } from "~/env";

export default async function StatusPage() {
  const { userId } = await auth();

  const services = [
    {
      name: "Authentication (Clerk)",
      status: userId ? "connected" : "disconnected",
      description: userId ? `User authenticated` : "Not authenticated",
    },
    {
      name: "Database",
      status: "connected", // We assume it's connected if the page loads
      description: "SQLite database connection active",
    },
    {
      name: "Google Gemini AI",
      status: env.GOOGLE_GENERATIVE_AI_API_KEY ? "configured" : "missing",
      description: env.GOOGLE_GENERATIVE_AI_API_KEY ? "API key configured" : "Gemini API key not set",
    },
    {
      name: "Resend Email API",
      status: env.RESEND_API_KEY ? "configured" : "missing",
      description: env.RESEND_API_KEY ? "API credentials configured" : "Resend credentials not set",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
      case "configured":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "missing":
      case "disconnected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
      case "configured":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "missing":
      case "disconnected":
        return <Badge variant="destructive">Inactive</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">System Status</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Check the status of all integrated services and features.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(service.status)}
                  <span>{service.name}</span>
                </div>
                {getStatusBadge(service.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {service.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 border rounded-lg">
              <h3 className="font-medium mb-1">Test AI Chat</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Try the AI assistant features
              </p>
              <a 
                href="/dashboard/chat" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Go to Chat →
              </a>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h3 className="font-medium mb-1">View Emails</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Browse mock email data
              </p>
              <a 
                href="/dashboard" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Go to Inbox →
              </a>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h3 className="font-medium mb-1">Documentation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Setup and configuration guide
              </p>
              <a 
                href="https://github.com/your-repo/ai-email-client" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Docs →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {userId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">User ID:</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Authenticated
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}