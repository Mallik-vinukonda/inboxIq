// Mock AI service for testing when APIs are down
export class MockAIService {
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock responses based on prompt content
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return "Hello! I'm your AI assistant. How can I help you with your emails today?";
    }

    if (lowerPrompt.includes('email') || lowerPrompt.includes('compose')) {
      return "I'd be happy to help you compose an email. Please provide me with the details like recipient, subject, and the main points you'd like to include.";
    }

    if (lowerPrompt.includes('summary') || lowerPrompt.includes('summarize')) {
      return "Here's a summary of your emails: You have several important messages including project updates, meeting invitations, and client communications. The most urgent items appear to be the project deadline discussion and the client meeting scheduled for next week.";
    }

    if (lowerPrompt.includes('reply') || lowerPrompt.includes('respond')) {
      return "Thank you for your email. I've reviewed the information and will get back to you with a detailed response shortly. Please let me know if you have any urgent questions in the meantime.";
    }

    // Email summary generation
    if (lowerPrompt.includes('provide a concise summary') || lowerPrompt.includes('main purpose')) {
      const content = prompt.toLowerCase();
      
      if (content.includes('meeting') || content.includes('schedule')) {
        return `**Main Purpose:** Meeting coordination and scheduling request

**Key Points:**
• Requesting to schedule a meeting to discuss project progress
• Proposed time slots for next week
• Agenda items include budget review and timeline updates

**Action Items:**
• Respond with availability by Friday
• Prepare project status report for the meeting

**Tone/Urgency:** Professional and moderately urgent - response needed within 2-3 days`;
      }
      
      if (content.includes('project') || content.includes('update')) {
        return `**Main Purpose:** Project status update and next steps coordination

**Key Points:**
• Current project milestone completed successfully
• Timeline adjustments needed for upcoming deliverables
• Resource allocation concerns for next phase

**Action Items:**
• Review attached project timeline
• Approve additional resource requests
• Schedule follow-up meeting with stakeholders

**Tone/Urgency:** Professional and informative - moderate priority`;
      }
      
      if (content.includes('client') || content.includes('feedback')) {
        return `**Main Purpose:** Client feedback and revision requests

**Key Points:**
• Client has reviewed the latest deliverables
• Several revision requests and clarifications needed
• Overall positive feedback with minor adjustments

**Action Items:**
• Address specific revision points mentioned
• Provide updated timeline for changes
• Schedule client call to discuss details

**Tone/Urgency:** Professional and collaborative - timely response appreciated`;
      }
      
      // Generic summary for other emails
      return `**Main Purpose:** Business communication requiring attention and response

**Key Points:**
• Important information shared that requires review
• Several discussion points and questions raised
• Follow-up actions and next steps outlined

**Action Items:**
• Review the details provided
• Respond to questions and concerns raised
• Coordinate next steps as appropriate

**Tone/Urgency:** Professional and courteous - standard business priority`;
    }

    // Default response
    return "I understand your request. While I'm currently running in demo mode due to API limitations, I would normally help you with email composition, summarization, and analysis. Please try again later when the AI services are available.";
  }

  async generateChatResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      return this.generateText(lastMessage.content);
    }
    return "I'm here to help with your emails!";
  }

  async composeEmail(
    prompt: string,
    context?: string,
    tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional',
    length: 'short' | 'medium' | 'long' = 'medium'
  ): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract key information from the prompt and context
    const lowerPrompt = prompt.toLowerCase();
    const lowerContext = (context || '').toLowerCase();
    
    // Try to extract recipient and subject information
    let recipient = 'the recipient';
    let subject = 'Your Request';
    
    // Look for email addresses in context
    const emailMatch = context?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && emailMatch[1]) {
      recipient = emailMatch[1];
    }
    
    // Look for "To:" pattern
    const toMatch = context?.match(/To:\s*([^\n]+)/i);
    if (toMatch && toMatch[1]) {
      recipient = toMatch[1].trim();
    }
    
    // Look for "Subject:" pattern
    const subjectMatch = context?.match(/Subject:\s*([^\n]+)/i);
    if (subjectMatch && subjectMatch[1] && subjectMatch[1].trim()) {
      subject = subjectMatch[1].trim();
    } else if (lowerPrompt.includes('project')) {
      subject = 'Project Update';
    } else if (lowerPrompt.includes('meeting')) {
      subject = 'Meeting Follow-up';
    } else if (lowerPrompt.includes('follow')) {
      subject = 'Follow-up';
    }

    // Generate contextual content based on the prompt
    let bodyContent = '';
    
    if (lowerPrompt.includes('project') || lowerPrompt.includes('status') || lowerPrompt.includes('update')) {
      bodyContent = `I wanted to provide you with an update on our current project status. We've made significant progress and are on track to meet our upcoming milestones.

The development team has completed the initial phase and we're now moving into the testing and refinement stage. I'll keep you updated as we progress further.

Please let me know if you have any questions or would like to discuss any specific aspects of the project.`;
    } else if (lowerPrompt.includes('meeting') || lowerPrompt.includes('schedule')) {
      bodyContent = `I hope this email finds you well. I wanted to reach out regarding our upcoming meeting.

Could we schedule a time that works best for both of us? I'm available most days this week and would be happy to accommodate your schedule.

Please let me know what times work best for you, and I'll send over a calendar invitation.`;
    } else if (lowerPrompt.includes('follow') || lowerPrompt.includes('response')) {
      bodyContent = `Thank you for your previous email. I wanted to follow up on the points we discussed.

I've reviewed the information you provided and have prepared a response addressing your main concerns. I believe we can move forward with the next steps as planned.

Please let me know if you need any additional information or clarification.`;
    } else if (lowerPrompt.includes('thank') || lowerPrompt.includes('appreciation')) {
      bodyContent = `I wanted to take a moment to express my sincere appreciation for your recent work and collaboration.

Your contributions have been invaluable to our success, and I'm grateful for your dedication and professionalism.

Thank you again for everything you do. I look forward to continuing our productive partnership.`;
    } else {
      bodyContent = `I hope this email finds you well. I'm writing to address the matter we discussed and provide you with the information you requested.

Based on our conversation, I've prepared a comprehensive response that should address your main concerns and questions.

Please review the details and let me know if you need any additional information or clarification.`;
    }

    // Adjust tone
    let greeting = 'Dear';
    let closing = 'Best regards';
    
    if (tone === 'casual' || tone === 'friendly') {
      greeting = 'Hi';
      closing = tone === 'casual' ? 'Thanks' : 'Best';
    } else if (tone === 'formal') {
      greeting = 'Dear';
      closing = 'Sincerely';
    }

    // Adjust length
    if (length === 'short') {
      const firstParagraph = bodyContent.split('\n\n')[0];
      if (firstParagraph) {
        bodyContent = firstParagraph; // Take only first paragraph
      }
    } else if (length === 'long') {
      bodyContent += `\n\nI appreciate your time and attention to this matter. If you have any questions or concerns, please don't hesitate to reach out to me directly.

I look forward to hearing from you soon and continuing our collaboration.`;
    }

    return `Subject: ${subject}

${greeting} ${recipient === 'the recipient' ? 'Colleague' : recipient.split('@')[0]},

${bodyContent}

${closing},
[Your Name]`;
  }

  async summarizeEmails(
    emailsText: string,
    summaryType: 'brief' | 'detailed' | 'action_items' = 'brief'
  ): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (summaryType) {
      case 'brief':
        return "📧 Email Summary: You have 12 new emails including 3 urgent items, 5 project updates, and 4 general communications. Key topics: project deadlines, meeting schedules, and client feedback.";
      
      case 'detailed':
        return `📧 Detailed Email Summary:

**Urgent Items (3):**
- Project deadline extension request from client
- Meeting reschedule for tomorrow's presentation
- Budget approval needed for Q1 expenses

**Project Updates (5):**
- Development team progress report
- Design mockups ready for review
- Testing phase completion notification
- Client feedback on latest deliverables
- Resource allocation for next sprint

**General Communications (4):**
- Team lunch invitation
- Company newsletter
- Training session reminder
- Office maintenance notice`;

      case 'action_items':
        return `📋 Action Items from Emails:

**High Priority:**
- [ ] Respond to client deadline extension by EOD
- [ ] Confirm meeting reschedule with all attendees
- [ ] Submit budget approval request

**Medium Priority:**
- [ ] Review design mockups by Friday
- [ ] Schedule testing review meeting
- [ ] Provide feedback on deliverables

**Low Priority:**
- [ ] RSVP for team lunch
- [ ] Complete training session registration`;

      default:
        return "Email summary generated successfully.";
    }
  }

  async analyzeEmailSentiment(emailContent: string, subject: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    tone: string;
    key_emotions: string[];
    urgency: 'low' | 'medium' | 'high';
    summary: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simple keyword-based analysis for demo
    const content = (emailContent + subject).toLowerCase();
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    
    if (content.includes('urgent') || content.includes('asap') || content.includes('immediately')) {
      urgency = 'high';
    }
    
    if (content.includes('thank') || content.includes('great') || content.includes('excellent')) {
      sentiment = 'positive';
    } else if (content.includes('problem') || content.includes('issue') || content.includes('concern')) {
      sentiment = 'negative';
    }

    return {
      sentiment,
      confidence: 0.75,
      tone: sentiment === 'positive' ? 'Appreciative and professional' : 
            sentiment === 'negative' ? 'Concerned but professional' : 'Professional and neutral',
      key_emotions: sentiment === 'positive' ? ['gratitude', 'satisfaction'] :
                   sentiment === 'negative' ? ['concern', 'urgency'] : ['neutral', 'professional'],
      urgency,
      summary: `This email has a ${sentiment} sentiment with ${urgency} urgency. The tone appears professional and appropriate for business communication.`
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a simple hash-based mock embedding
    const hash = this.simpleHash(text);
    const embedding = new Array(1536).fill(0).map((_, i) => 
      Math.sin(hash + i) * 0.1
    );
    
    return embedding;
  }

  async generateContextualReply(
    originalEmail: {
      subject: string;
      body: string;
      senderName: string;
      senderEmail: string;
    },
    conversationHistory: Array<{
      subject: string;
      body: string;
      senderName: string;
      senderEmail: string;
      sentAt: Date;
    }>,
    recentHistory: Array<{
      subject: string;
      body: string;
      senderName: string;
      sentAt: Date;
    }>,
    tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional'
  ): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Analyze the conversation context for a more intelligent mock response
    const hasHistory = conversationHistory.length > 0 || recentHistory.length > 0;
    const originalContent = originalEmail.body.toLowerCase();
    const senderFirstName = originalEmail.senderName.split(' ')[0] || originalEmail.senderName;
    
    // Determine greeting based on tone and history
    let greeting = '';
    if (tone === 'casual') {
      greeting = hasHistory ? `Hi ${senderFirstName},` : `Hey ${senderFirstName},`;
    } else if (tone === 'friendly') {
      greeting = `Hi ${senderFirstName},`;
    } else if (tone === 'formal') {
      greeting = `Dear ${originalEmail.senderName},`;
    } else {
      greeting = `Hello ${senderFirstName},`;
    }

    // Generate contextual content based on email content and history
    let bodyContent = '';
    
    if (originalContent.includes('meeting') || originalContent.includes('schedule')) {
      bodyContent = hasHistory 
        ? `Thank you for following up on our meeting discussion. I've reviewed our previous conversations and I'm available for the times you mentioned.`
        : `Thank you for reaching out about scheduling a meeting. I'd be happy to find a time that works for both of us.`;
      
      bodyContent += `\n\nLet me check my calendar and get back to you with some available time slots. Would next week work better for you?`;
    } else if (originalContent.includes('project') || originalContent.includes('update')) {
      bodyContent = hasHistory
        ? `Thanks for the project update. Based on our ongoing discussions, this looks like great progress.`
        : `Thank you for the project update. I appreciate you keeping me informed of the progress.`;
      
      bodyContent += `\n\nI'll review the details and provide feedback by end of week. Please let me know if you need anything else in the meantime.`;
    } else if (originalContent.includes('question') || originalContent.includes('help')) {
      bodyContent = hasHistory
        ? `I'm happy to help with your question. Given our previous discussions, I think I understand what you're looking for.`
        : `Thank you for reaching out with your question. I'd be glad to help you with this.`;
      
      bodyContent += `\n\nLet me gather the information you need and I'll get back to you shortly with a comprehensive response.`;
    } else if (originalContent.includes('thank') || originalContent.includes('appreciate')) {
      bodyContent = `Thank you for your kind words! ${hasHistory ? 'It\'s been great working together on this.' : 'I appreciate the feedback.'}`;
      bodyContent += `\n\nI'm glad I could help, and please don't hesitate to reach out if you need anything else.`;
    } else {
      bodyContent = hasHistory
        ? `Thank you for your email. I've noted the points you've raised, and considering our previous discussions, I think we're on the right track.`
        : `Thank you for your email. I've carefully reviewed the information you've provided.`;
      
      bodyContent += `\n\nI'll address your points and get back to you with a detailed response soon.`;
    }

    // Add context reference if there's conversation history
    if (conversationHistory.length > 0) {
      bodyContent += `\n\nAs we discussed in our previous emails, I want to make sure we maintain the momentum on this topic.`;
    }

    // Determine closing based on tone
    let closing = '';
    if (tone === 'casual') {
      closing = 'Thanks,';
    } else if (tone === 'friendly') {
      closing = 'Best regards,';
    } else if (tone === 'formal') {
      closing = 'Sincerely,';
    } else {
      closing = 'Best regards,';
    }

    return `${greeting}

${bodyContent}

${closing}
[Your Name]

---
[This is a demo response generated by the mock AI service. In production, this would be a contextually intelligent reply based on the full conversation history and AI analysis.]`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

export const mockAIService = new MockAIService();