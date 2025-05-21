export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export async function generateResponse(messages: ChatMessage[]): Promise<string> {
  try {
    // Format messages for the chat completion
    const formattedMessages = messages.map(msg => ({
      role: msg.isUser ? 'user' as const : 'assistant' as const,
      content: msg.text
    }));

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: formattedMessages }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate response');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error generating response:', error);
    return 'I apologize, but there was an error processing your request.';
  }
} 