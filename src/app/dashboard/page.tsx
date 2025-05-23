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
import TypewriterText from '@/components/TypewriterText';
import LoadingDots from '@/components/LoadingDots';
import { useMobileMenu } from '@/context/MobileMenuContext';
import MobileMenu from '@/components/MobileMenu';
import { IoMenu } from 'react-icons/io5';

interface SuggestedQuestion {
  text: string;
  action: () => void;
}

interface Message extends ChatMessageType {
  suggestedQuestions?: string[];
  plotData?: any;
}

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [visualizations, setVisualizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [savedFiles, setSavedFiles] = useState<FileMetadata[]>([]);
  const { colors, theme } = useTheme();
  const { user, loading } = useAuth();
  const { selectedFile, setSelectedFile } = useFile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toggleMenu } = useMobileMenu();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Initialize welcome message
  useEffect(() => {
    setMessages([{
      text: "Welcome! I'm your Data Analyst Agent. How can I help you analyze your data today?",
      isUser: false,
      timestamp: new Date(),
    }]);
  }, []);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    const loadingId = Date.now().toString();
    const loadingMessage: Message = {
      text: "Thinking...",
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setLoadingMessageId(loadingId);
    setInputMessage('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const data = await generateResponse({
        messages: [...messages, userMessage],
        selectedFile: selectedFile,
      });
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.text === "Thinking...") {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, {
            text: data.response,
            isUser: false,
            timestamp: new Date(),
            plotData: data.plotData,
            suggestedQuestions: generateSuggestedQuestions(data.response, selectedFile),
          }];
        }
        return prev;
      });
      scrollToBottom();
    } catch (error) {
      console.error('Error getting response:', error);
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.text === "Thinking...") {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, {
            text: "I apologize, but I encountered an error. Please try again.",
            isUser: false,
            timestamp: new Date(),
          }];
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      setLoadingMessageId(null);
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
    if (isLoading) return;

    const loadingId = Date.now().toString();
    const loadingMessage: Message = {
      text: "Thinking...",
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, loadingMessage]);
    setLoadingMessageId(loadingId);
    setIsLoading(true);

    try {
      const data = await generateResponse({
        messages: [...messages, { text: question, isUser: true, timestamp: new Date() }],
        selectedFile: selectedFile,
      });
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.text === "Thinking...") {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, {
            text: data.response,
            isUser: false,
            timestamp: new Date(),
            plotData: data.plotData,
            suggestedQuestions: generateSuggestedQuestions(data.response, selectedFile),
          }];
        }
        return prev;
      });
      scrollToBottom();
    } catch (error) {
      console.error('Error getting response:', error);
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.text === "Thinking...") {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, {
            text: "I apologize, but I encountered an error. Please try again.",
            isUser: false,
            timestamp: new Date(),
          }];
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      setLoadingMessageId(null);
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
      className={`p-4 lg:p-6 rounded-xl w-[95%] sm:w-[85%] ${message.isUser ? 'ml-auto bg-opacity-50' : 'mr-auto'}`}
      style={{
        background: message.isUser ? colors.background.input : colors.background.card,
        border: `1px solid ${colors.border.light}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {message.isUser ? (
        <div className="flex items-start gap-2 lg:gap-3">
          <div className="flex-shrink-0 w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white text-xs lg:text-sm">You</span>
          </div>
          <p style={{ color: colors.text.primary }} className="text-sm lg:text-base leading-relaxed">
            {message.text}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 lg:gap-3">
          <div className="flex-shrink-0 w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
            <span className="text-white text-xs lg:text-sm">AI</span>
          </div>
          <div className="flex-grow">
            {message.text === "Thinking..." ? (
              <div style={{ color: colors.text.primary }}>
                <LoadingDots 
                  text={selectedFile ? "Analyzing" : "Thinking"}
                  color={colors.text.primary} 
                />
              </div>
            ) : index === messages.length - 1 && !message.isUser ? (
              <TypewriterText
                text={message.text}
                speed={selectedFile ? 1 : 0.5}
                components={{
                  table: ({...props}) => (
                    <div className="overflow-x-auto my-4 rounded-lg border border-gray-700">
                      <table className="min-w-full border-collapse my-4 rounded-lg overflow-hidden" {...props} />
                    </div>
                  ),
                  th: ({...props}) => (
                    <th 
                      className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-700"
                      style={{
                        background: colors.background.input,
                        color: colors.text.secondary
                      }}
                      {...props} 
                    />
                  ),
                  td: ({...props}) => (
                    <td 
                      className="px-4 py-2 text-sm border-b border-gray-700/50"
                      style={{color: colors.text.primary}}
                      {...props} 
                    />
                  ),
                  code: ({className, children, ...props}: React.ComponentPropsWithoutRef<'code'>) => {
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
                }}
              />
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({...props}) => (
                    <div className="overflow-x-auto my-4 rounded-lg border border-gray-700">
                      <table className="min-w-full border-collapse my-4 rounded-lg overflow-hidden" {...props} />
                    </div>
                  ),
                  th: ({...props}) => (
                    <th 
                      className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-700"
                      style={{
                        background: colors.background.input,
                        color: colors.text.secondary
                      }}
                      {...props} 
                    />
                  ),
                  td: ({...props}) => (
                    <td 
                      className="px-4 py-2 text-sm border-b border-gray-700/50"
                      style={{color: colors.text.primary}}
                      {...props} 
                    />
                  ),
                  code: ({className, children, ...props}: React.ComponentPropsWithoutRef<'code'>) => {
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
                }}
              >
                {message.text}
              </ReactMarkdown>
            )}
            
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
        <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t" style={{ borderColor: colors.border.light }}>
          <p className="text-xs lg:text-sm mb-2" style={{ color: colors.text.secondary }}>
            Suggested Questions:
          </p>
          <div className="flex flex-wrap gap-1.5 lg:gap-2">
            {message.suggestedQuestions.map((question, qIndex) => (
              <button
                key={qIndex}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-xs lg:text-sm px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer"
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
      
      <div className="text-[10px] lg:text-xs mt-2 lg:mt-3 flex items-center gap-2" style={{ color: colors.text.muted }}>
        <span>{message.isUser ? 'Sent' : 'Received'} at</span>
        {formatTimestamp(message.timestamp)}
      </div>
    </div>
  );

  // Simplified loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background.primary }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, return null (redirect will happen)
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen" style={{ 
      background: theme === 'dark' ? '#000000' : colors.background.primary 
    }}>
      <Navbar />
      
      {/* Mobile Menu */}
      <MobileMenu
        onFileUpload={handleFileUpload}
        onDatabaseConnect={handleDatabaseConnect}
        onApiImport={handleApiImport}
      />
      
      {/* Main Content Area */}
      <main className="relative lg:fixed lg:left-0 lg:top-0 h-[calc(100vh-64px)] lg:h-screen w-full lg:w-[calc(100%-400px)] overflow-y-auto z-10 order-2 lg:order-1" style={{ 
        borderColor: colors.border.light,
        background: theme === 'dark' ? '#000000' : colors.background.primary 
      }}>
        <div className="pt-16 lg:pt-20 px-4 lg:px-6 pb-6 h-full flex flex-col">
          {/* Chat Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-4 lg:space-y-6 mb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
          >
            {messages.map((message, index) => renderMessage(message, index))}
          </div>

          {/* Input Form */}
          <div className="sticky bottom-0 left-0 right-0 bg-opacity-80 backdrop-blur-lg pt-4">
            <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={selectedFile 
                  ? `Ask me about ${selectedFile.filename}...` 
                  : "Select a file or ask me to analyze your data..."}
                className="flex-1 rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                style={{
                  background: colors.background.input,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border.light}`,
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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

      {/* Right Sidebar - Upload Area (Only visible on desktop) */}
      <aside className="hidden lg:block fixed right-0 top-0 h-screen w-[400px] overflow-y-auto border-l z-20 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent" style={{ borderColor: colors.border.light }}>
        <div className="pt-16 lg:pt-20 px-4 lg:px-6 pb-6 h-full">
          <DataUpload
            onFileUpload={handleFileUpload}
            onDatabaseConnect={handleDatabaseConnect}
            onApiImport={handleApiImport}
          />
        </div>
      </aside>

      {/* Visualizations Section */}
      {visualizations.length > 0 && (
        <div 
          className="fixed bottom-0 left-0 w-full lg:w-[calc(100%-400px)] p-4 lg:p-6 z-20"
          style={{ 
            background: colors.background.card,
            borderTop: `1px solid ${colors.border.light}` 
          }}
        >
          <h2 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4" style={{ color: colors.text.primary }}>
            Analysis Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
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