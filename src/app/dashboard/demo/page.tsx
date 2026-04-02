import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { 
  Mail, 
  Zap, 
  Search, 
  MessageSquare, 
  Star, 
  Archive,
  Send,
  Bot,
  Brain,
  Sparkles
} from "lucide-react";

export default function DemoPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Email Client Demo</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Explore all the advanced features of our AI-powered email client.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Email Composition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <span>AI Email Composition</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Let AI help you write professional emails with smart suggestions and auto-completion.
            </p>
            <div className="space-y-2">
              <Badge variant="secondary">Rich Text Editor</Badge>
              <Badge variant="secondary">AI Assistance</Badge>
              <Badge variant="secondary">Multiple Tones</Badge>
            </div>
            <Button className="w-full mt-4" size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Try Compose
            </Button>
          </CardContent>
        </Card>

        {/* Semantic Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-green-500" />
              <span>Semantic Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Find emails using natural language queries powered by vector embeddings.
            </p>
            <div className="space-y-2">
              <Badge variant="secondary">Vector Search</Badge>
              <Badge variant="secondary">Natural Language</Badge>
              <Badge variant="secondary">Orama Integration</Badge>
            </div>
            <Button className="w-full mt-4" size="sm" variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Try Search
            </Button>
          </CardContent>
        </Card>

        {/* AI Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <span>AI Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Chat with AI about your emails using Retrieval Augmented Generation (RAG).
            </p>
            <div className="space-y-2">
              <Badge variant="secondary">RAG Technology</Badge>
              <Badge variant="secondary">Context Aware</Badge>
              <Badge variant="secondary">OpenAI GPT</Badge>
            </div>
            <Button className="w-full mt-4" size="sm" variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              Try Chat
            </Button>
          </CardContent>
        </Card>

        {/* Email Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-orange-500" />
              <span>Unified Inbox</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage multiple email accounts from Gmail, Outlook, and more in one place.
            </p>
            <div className="space-y-2">
              <Badge variant="secondary">Multi-Account</Badge>
              <Badge variant="secondary">Real-time Sync</Badge>
              <Badge variant="secondary">Thread Management</Badge>
            </div>
            <Button className="w-full mt-4" size="sm" variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              View Inbox
            </Button>
          </CardContent>
        </Card>

        {/* Advanced AI Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-pink-500" />
              <span>Smart Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Email summarization, sentiment analysis, and intelligent insights.
            </p>
            <div className="space-y-2">
              <Badge variant="secondary">Sentiment Analysis</Badge>
              <Badge variant="secondary">Email Summaries</Badge>
              <Badge variant="secondary">Action Items</Badge>
            </div>
            <Button className="w-full mt-4" size="sm" variant="outline">
              <Brain className="w-4 h-4 mr-2" />
              Try Analysis
            </Button>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span>Productivity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Keyboard shortcuts, command palette, and workflow optimizations.
            </p>
            <div className="space-y-2">
              <Badge variant="secondary">Cmd+K Palette</Badge>
              <Badge variant="secondary">Shortcuts</Badge>
              <Badge variant="secondary">Dark Mode</Badge>
            </div>
            <Button className="w-full mt-4" size="sm" variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Try Shortcuts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Demo Scenarios */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Demo Scenarios</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>🎯 Scenario 1: Smart Email Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Click "Compose" in the sidebar</li>
                <li>Add recipients and subject</li>
                <li>Click "AI Assist" to get help writing</li>
                <li>Choose tone and length preferences</li>
                <li>Watch AI generate professional content</li>
                <li>Edit and send your email</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🔍 Scenario 2: Semantic Email Search</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Click "Search" in the sidebar</li>
                <li>Switch to "AI" search mode</li>
                <li>Ask natural questions like "emails about meetings"</li>
                <li>See semantically relevant results</li>
                <li>Click on emails to view details</li>
                <li>Use filters to refine results</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🤖 Scenario 3: AI Email Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to "AI Chat" page</li>
                <li>Ask questions about your emails</li>
                <li>Try: "What meetings do I have this week?"</li>
                <li>Ask for email summaries</li>
                <li>Get help with email management</li>
                <li>Receive contextual AI responses</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⚡ Scenario 4: Productivity Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Press Cmd+K (or Ctrl+K) for command palette</li>
                <li>Navigate quickly between folders</li>
                <li>Toggle dark/light theme</li>
                <li>Use keyboard shortcuts for actions</li>
                <li>Star important emails</li>
                <li>Archive or delete in bulk</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Technical Features */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Technical Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Frontend</h3>
              <div className="space-y-1 text-sm">
                <Badge variant="outline">Next.js 14</Badge>
                <Badge variant="outline">TypeScript</Badge>
                <Badge variant="outline">Tailwind CSS</Badge>
                <Badge variant="outline">shadcn/ui</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Backend</h3>
              <div className="space-y-1 text-sm">
                <Badge variant="outline">tRPC</Badge>
                <Badge variant="outline">Prisma ORM</Badge>
                <Badge variant="outline">PostgreSQL</Badge>
                <Badge variant="outline">Webhooks</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">AI & Search</h3>
              <div className="space-y-1 text-sm">
                <Badge variant="outline">OpenAI GPT</Badge>
                <Badge variant="outline">Orama Search</Badge>
                <Badge variant="outline">Vector Embeddings</Badge>
                <Badge variant="outline">RAG</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Integration</h3>
              <div className="space-y-1 text-sm">
                <Badge variant="outline">Clerk Auth</Badge>
                <Badge variant="outline">Orengo API</Badge>
                <Badge variant="outline">TipTap Editor</Badge>
                <Badge variant="outline">Real-time Sync</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to Experience AI Email?</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Connect your email account and start using AI-powered email management today.
        </p>
        <div className="flex justify-center space-x-4">
          <Button size="lg">
            <Mail className="w-4 h-4 mr-2" />
            Connect Account
          </Button>
          <Button variant="outline" size="lg">
            <MessageSquare className="w-4 h-4 mr-2" />
            Try AI Chat
          </Button>
        </div>
      </div>
    </div>
  );
}