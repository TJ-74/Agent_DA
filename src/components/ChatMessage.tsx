'use client';

import React, { useState, useId } from 'react';
import { useTheme } from '@/context/ThemeContext';
import ReactMarkdown, { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import TypewriterText from './TypewriterText';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
  typingSpeed?: number;
  onExecuteCode?: (code: string, language: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isUser, 
  timestamp,
  typingSpeed = 2,
  onExecuteCode
}) => {
  const { colors, theme } = useTheme();
  const [isTypingComplete, setIsTypingComplete] = useState(isUser);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const messageId = useId();

  const handleCopy = async (code: string, blockId: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedStates(prev => ({ ...prev, [blockId]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [blockId]: false }));
    }, 2000);
  };

  const handleExecute = (code: string, language: string) => {
    if (onExecuteCode) {
      onExecuteCode(code, language);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const handleTypingComplete = () => {
    setIsTypingComplete(true);
    // Trigger scroll after typing is complete
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  };

  const components = {
    code(props: any) {
      const { inline, className, children } = props;
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const code = String(children).replace(/\n$/, '');
      const blockId = `${messageId}-${language}-${code.length}`;

      return !inline && language ? (
        <div className="relative group">
          <div className="overflow-x-auto">
            <SyntaxHighlighter
              style={theme === 'dark' ? vscDarkPlus : vs}
              language={language}
              PreTag="div"
              customStyle={{
                margin: '1em 0',
                borderRadius: '0.5rem',
                padding: '1em',
                minWidth: '100%',
                overflowX: 'auto',
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleCopy(code, blockId)}
              className="px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors cursor-pointer"
            >
              {copiedStates[blockId] ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => handleExecute(code, language)}
              className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
            >
              Execute
            </button>
          </div>
        </div>
      ) : (
        <code
          className={`${className} bg-opacity-20 rounded px-1`}
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }}
        >
          {children}
        </code>
      );
    },
    blockquote(props: any) {
      return (
        <blockquote
          className="border-l-4 pl-4 italic my-4"
          style={{
            borderColor: colors.primary.from,
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }}
        >
          {props.children}
        </blockquote>
      );
    },
    table(props: any) {
      return (
        <div className="overflow-x-auto my-4 rounded-lg border" style={{ borderColor: colors.border.light }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50" style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              {props.children[0]}
            </thead>
            <tbody className="divide-y divide-gray-200" style={{ borderColor: colors.border.light }}>
              {props.children.slice(1)}
            </tbody>
          </table>
        </div>
      );
    },
    th(props: any) {
      return (
        <th
          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
          style={{ color: colors.text.secondary }}
        >
          {props.children}
        </th>
      );
    },
    td(props: any) {
      return (
        <td
          className="px-6 py-4 whitespace-nowrap text-sm"
          style={{ color: colors.text.primary }}
        >
          {props.children}
        </td>
      );
    },
    a(props: any) {
      return (
        <a
          href={props.href}
          className="text-blue-500 hover:text-blue-600 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {props.children}
        </a>
      );
    },
    h1(props: any) { return <h1 className="text-2xl font-bold my-4">{props.children}</h1>; },
    h2(props: any) { return <h2 className="text-xl font-bold my-3">{props.children}</h2>; },
    h3(props: any) { return <h3 className="text-lg font-bold my-2">{props.children}</h3>; },
    h4(props: any) { return <h4 className="text-base font-bold my-2">{props.children}</h4>; },
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div
        className="max-w-[70%] rounded-2xl p-4 relative transition-all duration-200"
        style={{
          background: isUser
            ? `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`
            : colors.background.card,
          color: isUser ? colors.text.primary : colors.text.secondary,
          border: !isUser ? `1px solid ${colors.border.light}` : 'none',
        }}
      >
        {!isUser && (
          <div
            className="absolute -left-2 top-4 w-4 h-4 transform rotate-45"
            style={{
              background: colors.background.card,
              borderLeft: `1px solid ${colors.border.light}`,
              borderBottom: `1px solid ${colors.border.light}`,
            }}
          />
        )}
        {isUser && (
          <div
            className="absolute -right-2 top-4 w-4 h-4 transform rotate-45"
            style={{
              background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
            }}
          />
        )}
        <div className="prose prose-sm max-w-none">
          {isUser ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={components}
            >
              {message}
            </ReactMarkdown>
          ) : (
            <TypewriterText
              text={message}
              speed={typingSpeed}
              onComplete={handleTypingComplete}
              components={components}
            />
          )}
        </div>
        {timestamp && isTypingComplete && (
          <span className="text-xs opacity-70 mt-2 block">
            {formatTime(timestamp)}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;