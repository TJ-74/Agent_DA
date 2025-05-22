import { NextResponse } from 'next/server';
import { ChatMessage } from '@/services/groq';
import { FileMetadata } from '@/services/firestore';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ChatRequest {
  messages: ChatMessage[];
  selectedFile: FileMetadata | null;
}

type MessageRole = 'user' | 'assistant' | 'system';

interface FormattedMessage {
  role: MessageRole;
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages, selectedFile }: ChatRequest = await request.json();
    const lastMessage = messages[messages.length - 1];

    // Format messages for the chat completion
    const formattedMessages: FormattedMessage[] = messages.map(msg => ({
      role: msg.isUser ? 'user' as const : 'assistant' as const,
      content: msg.text
    }));

    // If a file is selected, get its analysis from the backend
    let fileAnalysis = null;
    let analysisError = null;
    
    if (selectedFile?.r2Key) {
      try {
        const analysisResponse = await fetch(`${API_URL}/api/chat/analyze/${selectedFile.r2Key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: lastMessage.text,
          }),
        });

        if (!analysisResponse.ok) {
          const errorData = await analysisResponse.json().catch(() => null);
          throw new Error(
            errorData?.detail || 
            `Failed to analyze file: ${analysisResponse.status} ${analysisResponse.statusText}`
          );
        }

        fileAnalysis = await analysisResponse.json();
      } catch (error) {
        console.error('Error analyzing file:', error);
        analysisError = error instanceof Error ? error.message : 'Failed to analyze file';
      }
    }

    // Add system message with file context, analysis, and formatting instructions
    const systemMessage: FormattedMessage = {
      role: 'system' as const,
      content: `You are a Data Analysis Agent helping analyze ${selectedFile ? `the file "${selectedFile.filename}"` : 'data files'}. 
      
IMPORTANT FORMATTING INSTRUCTIONS:
1. Always present data and statistics in well-formatted Markdown tables.
2. Use tables for:
   - Numerical summaries (mean, median, etc.)
   - Categorical data distributions
   - Correlation matrices
   - Comparison of variables
   - Any data with 2+ columns that would be clearer in tabular format
3. Use proper Markdown table syntax with headers and aligned columns.
4. Include column headers that clearly describe the data.
5. For longer tables, consider grouping or summarizing to show the most relevant information.
6. Format percentages, decimal numbers, and other values consistently.

${
  fileAnalysis ? `
Here is the analysis of the file based on the user's query:
${JSON.stringify(fileAnalysis, null, 2)}

Please provide insights and answer the user's question based on this analysis. Remember to format appropriate data in tables even if the user didn't explicitly request tables.
` : analysisError ? `
Note: There was an error analyzing the file: ${analysisError}
Please proceed with the analysis based on the information available, but inform the user about the analysis error.
` : ''
}`
    };
    formattedMessages.unshift(systemMessage);

    // Get AI response
    const completion = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 0.9,
      stream: false,
    });

    return NextResponse.json({
      response: completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 