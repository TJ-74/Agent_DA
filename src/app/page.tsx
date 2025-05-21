'use client';

import { useState, useEffect } from 'react';
import ChatMessage from '@/components/ChatMessage';
import DataUpload from '@/components/DataUpload';
import Visualization from '@/components/Visualization';
import Navbar from '@/components/Navbar';
import { useTheme } from '@/context/ThemeContext';
import { generateResponse, ChatMessage as ChatMessageType } from '@/services/groq';
import { AnalysisResult } from '@/services/api';

interface Message extends ChatMessageType {}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [visualizations, setVisualizations] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    setIsClient(true);
    // Initialize messages only on the client side
    setMessages([
      {
        text: "Welcome! I'm your Data Analyst Agent. How can I help you analyze your data today?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get AI response
      const response = await generateResponse([...messages, userMessage]);
      
      // Add AI response
      const aiMessage: Message = {
        text: response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      // Add error message
      const errorMessage: Message = {
        text: "I apologize, but I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (analysis: AnalysisResult) => {
    setAnalysisResult(analysis);
    
    // Add a message about the uploaded file
    const fileMessage: Message = {
      text: `File "${analysis.filename}" has been uploaded and analyzed:\n\n` +
            `- Total rows: ${analysis.total_rows}\n` +
            `- Total columns: ${analysis.total_columns}\n` +
            `- Numeric columns: ${Object.keys(analysis.numeric_columns || {}).length}\n` +
            `- Categorical columns: ${Object.keys(analysis.categorical_columns || {}).length}`,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, fileMessage]);

    // If there are correlations, add them to visualizations
    if (analysis.correlations?.top_correlations && analysis.correlations.top_correlations.length > 0) {
      const correlationViz = {
        type: 'correlation',
        data: analysis.correlations.correlation_matrix || {},
        title: 'Correlation Matrix',
        description: 'Correlation analysis between numeric columns'
      };
      setVisualizations(prev => [...prev, correlationViz]);
    }
  };

  const handleDatabaseConnect = (connectionString: string) => {
    // In a real app, this would attempt to connect to the database
    console.log('Connecting to database:', connectionString);
  };

  const handleApiImport = (apiUrl: string) => {
    // In a real app, this would fetch data from the API
    console.log('Importing from API:', apiUrl);
  };

  if (!isClient) {
    return null; // Return null on server-side to avoid hydration mismatch
  }

  return (
    <main className="min-h-screen" style={{ background: colors.background.primary }}>
      <Navbar />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="container mx-auto px-4 py-8 relative pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Chat and Input */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl shadow-2xl p-6 backdrop-blur-xl overflow-hidden" style={{ background: colors.background.card, border: `1px solid ${colors.border.light}` }}>
              <div 
                className="h-[500px] overflow-y-auto mb-4 space-y-4 pr-4 overflow-x-hidden"
                style={{ scrollbarWidth: 'thin' }}
              >
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    message={message.text}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                  />
                ))}
                {isLoading && (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-pulse flex space-x-2">
                      <div className="h-2 w-2 bg-current rounded-full"></div>
                      <div className="h-2 w-2 bg-current rounded-full"></div>
                      <div className="h-2 w-2 bg-current rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-4">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me to analyze your data..."
                  className="flex-1 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-200 placeholder-gray-400"
                  style={{
                    background: colors.background.input,
                    color: colors.text.primary,
                    border: `1px solid ${colors.border.light}`,
                  }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                    color: colors.text.primary,
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>

            {/* Visualizations Section */}
            {visualizations.length > 0 && (
              <div className="rounded-2xl shadow-2xl p-6 backdrop-blur-xl" style={{ background: colors.background.card, border: `1px solid ${colors.border.light}` }}>
                <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text.primary }}>
                  Analysis Results
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visualizations.map((viz, index) => (
                    <Visualization
                      key={index}
                      type={viz.type}
                      data={viz.data}
                      title={viz.title}
                      description={viz.description}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Data Upload */}
          <div className="lg:col-span-1">
            <DataUpload
              onFileUpload={handleFileUpload}
              onDatabaseConnect={handleDatabaseConnect}
              onApiImport={handleApiImport}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
