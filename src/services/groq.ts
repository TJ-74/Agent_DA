import { FileMetadata } from './firestore';

export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp?: Date;
}

interface ChatContext {
  messages: ChatMessage[];
  selectedFile?: FileMetadata | null;
}

export async function generateResponse(context: ChatContext): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: context.messages,
        selectedFile: context.selectedFile,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
} 