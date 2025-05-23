'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChatMessage from '@/components/ChatMessage';
import DataUpload from '@/components/DataUpload';
import Visualization from '@/components/Visualization';
import Navbar from '@/components/Navbar';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useFile } from '@/context/FileContext';
import { generateResponse, ChatMessage as ChatMessageType, ChatResponse } from '@/services/groq';
import { AnalysisResult } from '@/services/api';
import { FileMetadata } from '@/services/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { Options } from 'react-markdown';

interface SuggestedQuestion {
  text: string;
  action: () => void;
}

interface Message extends ChatMessageType {
  suggestedQuestions?: string[];
  plotData?: any;
}

// Add this CSS at the top of the file after imports
const markdownStyles = {
  message: `
    prose 
    prose-invert 
    max-w-none 
    prose-p:text-gray-200 
    prose-headings:text-white 
    prose-strong:text-white
    prose-code:text-blue-300
    prose-pre:bg-gray-800
    prose-pre:border
    prose-pre:border-gray-700
    prose-pre:rounded-lg
    prose-blockquote:border-l-4
    prose-blockquote:border-gray-500
    prose-blockquote:pl-4
    prose-blockquote:italic
    prose-li:text-gray-200
  `,
  table: `
    min-w-full 
    border-collapse 
    my-4
    rounded-lg
    overflow-hidden
  `,
  tableHeader: `
    px-4 
    py-2 
    text-left 
    text-sm 
    font-semibold 
    border-b 
    border-gray-700
  `,
  tableCell: `
    px-4 
    py-2 
    text-sm 
    border-b 
    border-gray-700/50
  `
};

// Add this CSS at the top after the markdownStyles
const layoutStyles = {
  sidebar: `
    fixed 
    right-0 
    top-0 
    h-screen 
    w-[400px]
    overflow-y-auto
    border-l
    z-20
  `,
  main: `
    fixed 
    left-0 
    top-0 
    h-screen 
    right-[400px]
    overflow-y-auto
    z-10
  `,
};

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [visualizations, setVisualizations] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [savedFiles, setSavedFiles] = useState<FileMetadata[]>([]);
  const { colors, theme, setTheme } = useTheme();
  const { user, loading, logout } = useAuth();
  const { selectedFile, setSelectedFile } = useFile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Restore selected file from URL
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    if (fileId && savedFiles) {
      const file = savedFiles.find((f: FileMetadata) => f.id === fileId);
      if (file) {
        setSelectedFile(file);
      }
    }
  }, [searchParams, savedFiles, setSelectedFile]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    scrollToBottom();

    try {
      // Get AI response with file context
      const data = await generateResponse({
        messages: [...messages, userMessage],
        selectedFile: selectedFile,
      });
      
      // Add AI response with plot data
      const aiMessage: Message = {
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        plotData: data.plotData,
        suggestedQuestions: generateSuggestedQuestions(data.response, selectedFile),
      };
      setMessages(prev => [...prev, aiMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Error getting response:', error);
      // Add error message
      const errorMessage: Message = {
        text: "I apologize, but I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      scrollToBottom();
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (analysis: AnalysisResult) => {
    setAnalysisResult(analysis);
    
    // Create a markdown table for file analysis
    const markdownMessage = `
### File Analysis: "${analysis.filename}"

| Metric | Value |
|--------|-------|
| Total Rows | ${analysis.total_rows} |
| Total Columns | ${analysis.total_columns} |
| Numeric Columns | ${Object.keys(analysis.numeric_columns || {}).length} |
| Categorical Columns | ${Object.keys(analysis.categorical_columns || {}).length} |

${analysis.numeric_columns && Object.keys(analysis.numeric_columns).length > 0 ? `
#### Numeric Columns Analysis
| Column | Mean | Median | Std Dev |
|--------|------|--------|---------|
${Object.entries(analysis.numeric_columns).map(([col, stats]) => 
  `| ${col} | ${stats.mean.toFixed(2)} | ${stats.median.toFixed(2)} | ${stats.std.toFixed(2)} |`
).join('\n')}
` : ''}

${analysis.categorical_columns && Object.keys(analysis.categorical_columns).length > 0 ? `
#### Categorical Columns
| Column | Unique Values | Missing (%) |
|--------|--------------|-------------|
${Object.entries(analysis.categorical_columns).map(([col, stats]) => 
  `| ${col} | ${stats.unique_values} | ${stats.missing_percentage.toFixed(2)}% |`
).join('\n')}
` : ''}
`;

    // Add the formatted message
    const fileMessage: Message = {
      text: markdownMessage,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, fileMessage]);
  };

  const handleDatabaseConnect = (connectionString: string) => {
    console.log('Connecting to database:', connectionString);
  };

  const handleApiImport = (apiUrl: string) => {
    console.log('Importing from API:', apiUrl);
  };

  // Update formatTimestamp function to handle undefined
  const formatTimestamp = (timestamp: Date | undefined) => {
    return timestamp ? timestamp.toLocaleTimeString() : '';
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
    // Automatically send the message
    const userMessage: Message = {
      text: question,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Trigger AI response
    handleAIResponse(question);
  };

  const handleAIResponse = async (question: string) => {
    setIsLoading(true);
    try {
      const data = await generateResponse({
        messages: [...messages, { text: question, isUser: true, timestamp: new Date() }],
        selectedFile: selectedFile,
      });
      
      // Add AI response with suggested follow-up questions
      const aiMessage: Message = {
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        plotData: data.plotData,
        suggestedQuestions: generateSuggestedQuestions(data.response, selectedFile),
      };
      setMessages(prev => [...prev, aiMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage: Message = {
        text: "I apologize, but I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  const generateSuggestedQuestions = (response: string, file: FileMetadata | null): string[] => {
    if (!file) return [];
    
    // Basic set of questions based on file type and content
    const suggestions = [
      `Can you show me a box plot of ${file.numericColumns[0] || 'numeric columns'}?`,
      `Can you create a histogram of ${file.numericColumns[0] || 'the data'}?`,
      `What are the correlations between variables?`,
      `Can you identify any outliers in the data?`,
    ];
    
    // Add more specific questions based on file content
    if (file.numericColumns.length > 1) {
      suggestions.push(`Can you show a scatter plot of ${file.numericColumns[0]} vs ${file.numericColumns[1]}?`);
    }
    if (file.categoricalColumns.length > 0) {
      suggestions.push(`Show me a bar chart of ${file.numericColumns[0]} by ${file.categoricalColumns[0]}`);
    }
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
  };

  // Update the message rendering to include clickable suggestions and plot visualization
  const renderMessage = (message: Message, index: number) => (
    <div
      key={index}
      className={`p-6 rounded-xl ${message.isUser ? 'ml-auto bg-opacity-50' : 'mr-auto'}`}
      style={{
        background: message.isUser ? colors.background.input : colors.background.card,
        maxWidth: '85%',
        border: `1px solid ${colors.border.light}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {message.isUser ? (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white text-sm">You</span>
          </div>
          <p style={{ color: colors.text.primary }} className="text-base leading-relaxed">
            {message.text}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
            <span className="text-white text-sm">AI</span>
          </div>
          <div className="flex-grow">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({...props}) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-gray-700">
                    <table className={markdownStyles.table} {...props} />
                  </div>
                ),
                th: ({...props}) => (
                  <th 
                    className={markdownStyles.tableHeader}
                    style={{
                      background: colors.background.input,
                      color: colors.text.secondary
                    }}
                    {...props} 
                  />
                ),
                td: ({...props}) => (
                  <td 
                    className={markdownStyles.tableCell}
                    style={{color: colors.text.primary}}
                    {...props} 
                  />
                ),
                code: ({className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <pre 
                      className="p-4 rounded-lg overflow-x-auto"
                      style={{
                        background: colors.background.input,
                        border: `1px solid ${colors.border.light}`
                      }}
                    >
                      <code className={className} style={{color: colors.text.primary}} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code 
                      className="px-1.5 py-0.5 rounded-md text-sm"
                      style={{
                        background: colors.background.input,
                        color: colors.primary.from
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                blockquote: ({...props}) => (
                  <blockquote
                    className="border-l-4 pl-4 italic my-4"
                    style={{
                      borderColor: colors.border.light,
                      color: colors.text.secondary
                    }}
                    {...props}
                  />
                ),
                h1: ({...props}) => (
                  <h1 className="text-2xl font-bold my-4" style={{color: colors.text.primary}} {...props} />
                ),
                h2: ({...props}) => (
                  <h2 className="text-xl font-bold my-3" style={{color: colors.text.primary}} {...props} />
                ),
                h3: ({...props}) => (
                  <h3 className="text-lg font-bold my-2" style={{color: colors.text.primary}} {...props} />
                ),
                p: ({...props}) => (
                  <p className="my-2 leading-relaxed" style={{color: colors.text.primary}} {...props} />
                ),
                ul: ({...props}) => (
                  <ul className="list-disc list-inside my-2 space-y-1" {...props} />
                ),
                ol: ({...props}) => (
                  <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
                ),
                li: ({...props}) => (
                  <li className="ml-4" style={{color: colors.text.primary}} {...props} />
                )
              } as Components}
            >
              {message.text}
            </ReactMarkdown>
            
            {/* Render plot if plotData exists */}
            {message.plotData && (
              <div className="mt-4 border rounded-lg p-4" style={{ borderColor: colors.border.light }}>
                <ChatMessage
                  message=""
                  isUser={false}
                  plotData={message.plotData}
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {!message.isUser && message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border.light }}>
          <p className="text-sm mb-2" style={{ color: colors.text.secondary }}>
            Suggested Questions:
          </p>
          <div className="flex flex-wrap gap-2">
            {message.suggestedQuestions.map((question, qIndex) => (
              <button
                key={qIndex}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-sm px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                style={{
                  background: colors.background.input,
                  border: `1px solid ${colors.border.light}`,
                  color: colors.text.primary,
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-xs mt-3 flex items-center gap-2" style={{ color: colors.text.muted }}>
        <span>{message.isUser ? 'Sent' : 'Received'} at</span>
        {formatTimestamp(message.timestamp)}
      </div>
    </div>
  );

  if (loading || !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: colors.background.primary }}>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 px-6 py-4 flex justify-between items-center" 
        style={{ 
          background: colors.background.card, 
          borderBottom: `1px solid ${colors.border.light}`,
        }}
      >
        <h1 className="text-xl font-bold" style={{ color: colors.text.primary }}>Data Analyst Dashboard</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => theme === 'dark' ? setTheme('light') : setTheme('dark')}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: colors.background.input,
              border: `1px solid ${colors.border.light}`,
              color: colors.text.primary,
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
              color: colors.text.primary,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <main className={layoutStyles.main}>
        <div className="pt-20 px-6 pb-6 h-full">
          <div className="h-full rounded-2xl shadow-2xl p-6 backdrop-blur-xl overflow-hidden flex flex-col" 
            style={{ 
              background: colors.background.card, 
              border: `1px solid ${colors.border.light}` 
            }}
          >
            {/* File Context Header */}
            {selectedFile && (
              <div 
                className="mb-4 p-3 rounded-xl flex justify-between items-center"
                style={{ background: colors.background.input }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: colors.text.secondary }}>Current File:</span>
                  <span style={{ color: colors.text.primary }} className="font-medium">
                    {selectedFile.filename}
                  </span>
                  <span style={{ color: colors.text.secondary }} className="text-sm">
                    ({selectedFile.totalRows} rows, {selectedFile.totalColumns} columns)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 rounded-lg hover:bg-opacity-80 transition-all"
                  style={{ background: colors.background.card }}
                >
                  <span style={{ color: colors.text.secondary }}>×</span>
                </button>
              </div>
            )}
            
            {/* Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto mb-4 space-y-4 pr-4 overflow-x-hidden scroll-smooth chat-container"
              style={{ scrollbarWidth: 'thin' }}
            >
              {messages.map((message, index) => renderMessage(message, index))}
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

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="flex gap-4 mt-auto">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={selectedFile 
                  ? `Ask me about ${selectedFile.filename}...` 
                  : "Select a file or ask me to analyze your data..."}
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
        </div>
      </main>

      {/* Right Sidebar - Upload Area */}
      <aside className={layoutStyles.sidebar} style={{ borderColor: colors.border.light }}>
        <div className="pt-20 px-6 pb-6 h-full">
          <DataUpload
            onFileUpload={handleFileUpload}
            onDatabaseConnect={handleDatabaseConnect}
            onApiImport={handleApiImport}
          />
        </div>
      </aside>

      {/* Visualizations Section - Only show when needed */}
      {visualizations.length > 0 && (
        <div 
          className="fixed bottom-0 left-0 right-[400px] p-6 z-20"
          style={{ 
            background: colors.background.card,
            borderTop: `1px solid ${colors.border.light}` 
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text.primary }}>
            Analysis Results
          </h2>
          <div className="grid grid-cols-2 gap-4">
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
  );
} 