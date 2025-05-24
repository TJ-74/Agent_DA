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

function formatAnalysisResponse(analysis: any) {
  if (!analysis) return null;

  // Extract plot data if it exists
  const plotData = analysis.plot;
  
  // Remove the plot from the analysis to avoid double embedding
  const analysisWithoutPlot = { ...analysis };
  delete analysisWithoutPlot.plot;

  return {
    analysis: analysisWithoutPlot,
    plotData: plotData
  };
}

function cleanResponse(response: string): string {
  // Remove suggestions about using visualization tools
  const patterns = [
    /you can use.*?to create.*?plot/gi,
    /to visualize.*?plot.*?use/gi,
    /I('m| am) not capable of (directly )?(rendering|displaying|showing|creating).*?(plots?|graphs?|charts?|visualizations?)/gi,
    /to see the actual plot/gi,
    /using a data visualization tool/gi,
    /if you would like to visualize/gi,
    /recommend using/gi,
    /matplotlib|seaborn|plotly|visualization tool|library/gi
  ];

  let cleanedResponse = response;
  patterns.forEach(pattern => {
    cleanedResponse = cleanedResponse.replace(pattern, '');
  });

  // Clean up any double spaces or empty lines created by the replacements
  cleanedResponse = cleanedResponse.replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();

  return cleanedResponse;
}

// Function to determine if query needs data analysis using LLM
async function needsDataAnalysis(query: string, groq: Groq): Promise<boolean> {
  const systemMessage: FormattedMessage = {
    role: 'system' as const,
    content: `You are a query analyzer that determines if a user's question requires accessing or analyzing file data.
Return ONLY "true" or "false".

Return true if the query:
- Asks about file contents
- Requires reading data
- Needs statistical analysis
- Requests data visualization
- Requires data comparison
- Asks about specific values, rows, or columns
- Needs pattern analysis
- Requires any form of data processing

Return false if the query:
- Is a general greeting
- Asks about the agent's capabilities
- Is a general "how-to" question
- Is about the interface or system
- Doesn't require file access`
  };

  const userMessage: FormattedMessage = {
    role: 'user' as const,
    content: query
  };

  try {
    const completion = await groq.chat.completions.create({
      messages: [systemMessage, userMessage],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 10,
      stream: false,
    });

    const response = completion.choices[0]?.message?.content?.toLowerCase().trim();
    return response === 'true';
  } catch (error) {
    console.error('Error in needsDataAnalysis:', error);
    // If there's an error in determination, default to true for safety
    return true;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const { messages, selectedFile }: ChatRequest = await request.json();
    const lastMessage = messages[messages.length - 1];

    // Format messages for the chat completion
    const formattedMessages: FormattedMessage[] = messages.map(msg => ({
      role: msg.isUser ? 'user' as const : 'assistant' as const,
      content: msg.text
    }));

    // For general queries, use a simpler system message and faster model
    if (!selectedFile) {
      const systemMessage: FormattedMessage = {
        role: 'system',
        content: 'You are a helpful AI assistant. Provide clear and concise responses.'
      };
      formattedMessages.unshift(systemMessage);

      const completion = await groq.chat.completions.create({
        messages: formattedMessages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 512,
        top_p: 0.9,
        stream: true,
      });

      let response = '';
      for await (const chunk of completion) {
        if (chunk.choices[0]?.delta?.content) {
          response += chunk.choices[0].delta.content;
        }
      }

      console.log(`API Response Time (General Query): ${Date.now() - startTime}ms`);
      return NextResponse.json({ response });
    }

    // Only analyze data if the query requires it
    let fileAnalysis = null;
    let analysisError = null;
    let plotData = null;
    
    const requiresAnalysis = await needsDataAnalysis(lastMessage.text, groq);
    
    if (selectedFile?.r2Key && requiresAnalysis) {
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

        const rawAnalysis = await analysisResponse.json();
        const formattedResponse = formatAnalysisResponse(rawAnalysis);
        if (formattedResponse) {
          fileAnalysis = formattedResponse.analysis;
          plotData = formattedResponse.plotData;
        }
      } catch (error) {
        console.error('Error analyzing file:', error);
        analysisError = error instanceof Error ? error.message : 'Failed to analyze file';
      }
    }

    // Add system message with appropriate context
    const systemMessage: FormattedMessage = {
      role: 'system',
      content: `You are a Data Analysis Agent helping analyze the file "${selectedFile.filename}". 

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. For data visualization:
   - NEVER mention that you can't display plots or images
   - NEVER suggest using any visualization tools or libraries
   - NEVER provide code for creating plots
   - NEVER create ASCII art representations of plots
   - DO describe what the data shows in natural language
   - The visualization will be handled automatically by the system

2. When plots are present:
   - Simply describe the insights from the data
   - Focus on patterns, trends, and notable observations
   - Use precise numbers and statistics
   - Let the interactive visualization speak for itself

3. For data presentation:
   - Use Markdown tables for numerical summaries
   - Format numbers consistently (2 decimal places)
   - Use thousands separators for large numbers
   - Show percentages with 1 decimal place

${
  fileAnalysis ? `
Here is the analysis of the file based on the user's query:
${JSON.stringify(fileAnalysis, null, 2)}
${plotData ? '\nNote: An interactive visualization will be displayed automatically with your response.' : ''}

Focus on describing the insights from the data. The visualization system will handle the plot display.
` : analysisError ? `
Note: There was an error analyzing the file: ${analysisError}
Please inform the user about the analysis error and provide guidance on how to proceed.
` : ''
}`
    };
    formattedMessages.unshift(systemMessage);

    const completion = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.9,
      stream: true,
    });

    let response = '';
    for await (const chunk of completion) {
      if (chunk.choices[0]?.delta?.content) {
        response += chunk.choices[0].delta.content;
      }
    }

    if (!response) {
      response = 'I apologize, but I was unable to generate a response.';
    }
    
    if (plotData) {
      response = cleanResponse(response);
    }

    console.log(`API Response Time (Data Analysis): ${Date.now() - startTime}ms`);
    return NextResponse.json({
      response,
      plotData: plotData ? {
        type: "plot",
        data: plotData.data,
        plotType: plotData.plot_type
      } : null
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    console.log(`API Error Response Time: ${Date.now() - startTime}ms`);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 