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
    let plotData = null;
    
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

    // Add system message with file context, analysis, and formatting instructions
    const systemMessage: FormattedMessage = {
      role: 'system' as const,
      content: `You are a Data Analysis Agent helping analyze ${selectedFile ? `the file "${selectedFile.filename}"` : 'data files'}. 

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

    // Get AI response
    const completion = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 0.9,
      stream: false,
    });

    let response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
    
    // Clean the response if we have plot data
    if (plotData) {
      response = cleanResponse(response);
    }

    // Return both the cleaned response and plot data
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 