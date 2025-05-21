import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not set' },
        { status: 500 }
      );
    }

    // Add system message to set context
    const systemMessage = {
      role: 'system' as const,
      content: `I am a Data Analysis Agent. I help analyze data files and answer questions about data analysis.

Key Capabilities:
- Analyze uploaded data files
- Generate insights and visualizations
- Answer data-related questions
- Provide statistical analysis
- Suggest data visualization approaches

I format responses with:
- Code blocks with language specification
- Tables for data presentation
- Clear headings for sections
- Bullet points for key findings

How can I help analyze your data today?`
    };

    const completion = await groq.chat.completions.create({
      messages: [systemMessage, ...messages],
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
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 