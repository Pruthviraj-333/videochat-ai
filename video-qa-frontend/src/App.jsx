import { useState, useRef, useEffect } from 'react';
import { 
  Youtube, 
  MessageSquare, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Send, 
  Trash2, 
  Play, 
  FileText, 
  Mic, 
  UploadCloud, 
  FileAudio,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Palette
} from 'lucide-react';

// =============================================================================
// Unique Color Themes
// =============================================================================
const THEMES = {
  violet: {
    id: 'violet',
    name: 'Cyber Violet',
    icon: '🟣',
    type: 'dark',
    description: 'High-tech obsidian slate with electric violet & indigo glow (Linear / Perplexity style)',
    bg: 'bg-[#0B0F17]',
    bgGradient: 'bg-gradient-to-br from-[#0B0F17] via-[#111827] to-[#0A0D14]',
    headerBg: 'bg-[#0F172A]/90 border-b border-violet-900/30 backdrop-blur-md',
    headerIcon: 'from-violet-500 to-indigo-600',
    cardBg: 'bg-[#111827]/90 border border-slate-800 shadow-xl shadow-black/40',
    cardInner: 'bg-slate-900/70 border border-slate-800/80',
    titleGradient: 'bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent',
    accentText: 'text-violet-400',
    accentSubtext: 'text-violet-400/80',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    inputBg: 'bg-slate-950/70 border-2 border-slate-800 focus:border-violet-500 focus:bg-slate-950 text-slate-100 placeholder-slate-500',
    btnPrimary: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-950/50',
    btnSecondary: 'text-violet-400 hover:bg-violet-950/40 border border-violet-900/40',
    badge: 'bg-violet-950/60 text-violet-300 border border-violet-800/50',
    activeTab: 'bg-violet-600 text-white shadow-md shadow-violet-950/50',
    inactiveTab: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
    tabContainer: 'bg-slate-950/70 border border-slate-800',
    userBubble: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-950/40',
    aiBubble: 'bg-slate-900/90 border border-slate-800 text-slate-200 shadow-lg shadow-black/30',
    chatBg: 'bg-gradient-to-b from-slate-950/40 to-[#0B0F17]',
    accentGlow: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
    accentBorder: 'border-violet-500',
    numberBadge: 'bg-violet-500/20 text-violet-300',
    bulletDot: 'bg-violet-400',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Matrix',
    icon: '🟢',
    type: 'dark',
    description: 'Deep obsidian pine with mint jade telemetry (Supabase / Bloomberg style)',
    bg: 'bg-[#080E0B]',
    bgGradient: 'bg-gradient-to-br from-[#060D0A] via-[#091410] to-[#040806]',
    headerBg: 'bg-[#0A1612]/90 border-b border-emerald-900/30 backdrop-blur-md',
    headerIcon: 'from-emerald-500 to-teal-600',
    cardBg: 'bg-[#0D1B16]/90 border border-emerald-900/30 shadow-xl shadow-black/40',
    cardInner: 'bg-emerald-950/40 border border-emerald-900/40',
    titleGradient: 'bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 bg-clip-text text-transparent',
    accentText: 'text-emerald-400',
    accentSubtext: 'text-emerald-400/80',
    textPrimary: 'text-emerald-50',
    textSecondary: 'text-emerald-200/70',
    textMuted: 'text-emerald-400/50',
    inputBg: 'bg-[#060D0A] border-2 border-emerald-900/50 focus:border-emerald-400 focus:bg-[#060D0A] text-emerald-100 placeholder-emerald-600/50',
    btnPrimary: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50',
    btnSecondary: 'text-emerald-400 hover:bg-emerald-950/50 border border-emerald-900/50',
    badge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60',
    activeTab: 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50',
    inactiveTab: 'text-emerald-300/60 hover:text-emerald-100 hover:bg-emerald-950/40',
    tabContainer: 'bg-[#060D0A] border border-emerald-900/50',
    userBubble: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40',
    aiBubble: 'bg-[#0D1B16]/90 border border-emerald-900/40 text-emerald-100 shadow-lg shadow-black/30',
    chatBg: 'bg-gradient-to-b from-[#060D0A]/40 to-[#080E0B]',
    accentGlow: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    accentBorder: 'border-emerald-500',
    numberBadge: 'bg-emerald-500/20 text-emerald-300',
    bulletDot: 'bg-emerald-400',
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Frost',
    icon: '🔵',
    type: 'light',
    description: 'Crisp pearl slate with royal indigo & cobalt accents (Stripe / Vercel style)',
    bg: 'bg-slate-50',
    bgGradient: 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/40',
    headerBg: 'bg-white/90 border-b border-slate-200/80 backdrop-blur-md',
    headerIcon: 'from-indigo-600 to-blue-600',
    cardBg: 'bg-white border border-slate-200/80 shadow-md shadow-slate-100',
    cardInner: 'bg-slate-50 border border-slate-200/60',
    titleGradient: 'bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 bg-clip-text text-transparent',
    accentText: 'text-indigo-600',
    accentSubtext: 'text-indigo-600/80',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-400',
    inputBg: 'bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400',
    btnPrimary: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-200',
    btnSecondary: 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    activeTab: 'bg-indigo-600 text-white shadow-sm',
    inactiveTab: 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
    tabContainer: 'bg-slate-100 border border-slate-200',
    userBubble: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-100',
    aiBubble: 'bg-white border-2 border-indigo-100/80 text-slate-800 shadow-sm',
    chatBg: 'bg-gradient-to-b from-slate-50/50 to-white',
    accentGlow: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    accentBorder: 'border-indigo-500',
    numberBadge: 'bg-indigo-100 text-indigo-700',
    bulletDot: 'bg-indigo-500',
  },
  amber: {
    id: 'amber',
    name: 'Sunset Espresso',
    icon: '🟠',
    type: 'dark',
    description: 'Warm charcoal obsidian with glowing sunset amber & terracotta (Claude / Anthropic style)',
    bg: 'bg-[#121110]',
    bgGradient: 'bg-gradient-to-br from-[#121110] via-[#1A1816] to-[#0F0E0D]',
    headerBg: 'bg-[#181614]/90 border-b border-amber-950/40 backdrop-blur-md',
    headerIcon: 'from-amber-500 to-orange-600',
    cardBg: 'bg-[#1A1816]/90 border border-stone-800 shadow-xl shadow-black/40',
    cardInner: 'bg-stone-900/60 border border-stone-800/80',
    titleGradient: 'bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 bg-clip-text text-transparent',
    accentText: 'text-amber-400',
    accentSubtext: 'text-amber-400/80',
    textPrimary: 'text-stone-100',
    textSecondary: 'text-stone-300',
    textMuted: 'text-stone-500',
    inputBg: 'bg-[#100F0E] border-2 border-stone-800 focus:border-amber-500 focus:bg-[#100F0E] text-stone-100 placeholder-stone-500',
    btnPrimary: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-950/50',
    btnSecondary: 'text-amber-400 hover:bg-amber-950/40 border border-amber-900/40',
    badge: 'bg-amber-950/60 text-amber-300 border border-amber-800/50',
    activeTab: 'bg-amber-600 text-white shadow-md shadow-amber-950/50',
    inactiveTab: 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50',
    tabContainer: 'bg-[#100F0E] border border-stone-800',
    userBubble: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-950/40',
    aiBubble: 'bg-[#1C1A18]/90 border border-stone-800 text-stone-200 shadow-lg shadow-black/30',
    chatBg: 'bg-gradient-to-b from-[#100F0E]/40 to-[#121110]',
    accentGlow: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    accentBorder: 'border-amber-500',
    numberBadge: 'bg-amber-500/20 text-amber-300',
    bulletDot: 'bg-amber-400',
  },
  cyan: {
    id: 'cyan',
    name: 'Ocean Cyan',
    icon: '🌊',
    type: 'light',
    description: 'Refreshing bright cyan & ocean teal (Classic palette)',
    bg: 'bg-cyan-50',
    bgGradient: 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50',
    headerBg: 'bg-white border-b border-cyan-100 shadow-sm',
    headerIcon: 'from-cyan-500 to-blue-600',
    cardBg: 'bg-white border border-cyan-100 shadow-md',
    cardInner: 'bg-cyan-50/50 border border-cyan-100',
    titleGradient: 'bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent',
    accentText: 'text-cyan-600',
    accentSubtext: 'text-cyan-600',
    textPrimary: 'text-gray-800',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-400',
    inputBg: 'bg-gray-50 border-2 border-gray-200 focus:border-cyan-400 focus:bg-white text-gray-700 placeholder-gray-400',
    btnPrimary: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg',
    btnSecondary: 'text-cyan-600 hover:bg-cyan-50 border border-cyan-200',
    badge: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    activeTab: 'bg-white text-cyan-700 shadow-sm',
    inactiveTab: 'text-gray-500 hover:text-gray-700',
    tabContainer: 'bg-gray-100 border border-gray-200',
    userBubble: 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md',
    aiBubble: 'bg-white border-2 border-cyan-100 text-gray-700 shadow-sm',
    chatBg: 'bg-gradient-to-b from-gray-50/50 to-white',
    accentGlow: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    accentBorder: 'border-cyan-500',
    numberBadge: 'bg-cyan-100 text-cyan-700',
    bulletDot: 'bg-cyan-500',
  }
};

// =============================================================================
// Code Block Component with Copy Action
// =============================================================================
function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300">{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 text-[11px] hover:text-slate-200 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-800"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy code'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// =============================================================================
// Formatted Markdown & Sources Output Component
// =============================================================================
function FormattedAnswer({ text, sources = [], theme }) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inline formatting parser: `code`, **bold**, *italic*
  const renderInline = (str) => {
    if (!str) return null;
    const parts = str.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-black/20 text-xs font-mono border border-current/20 mx-0.5 font-semibold text-emerald-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, j) => {
        if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
          return <strong key={j} className="font-bold text-inherit">{bPart.slice(2, -2)}</strong>;
        }
        const italicParts = bPart.split(/(\*[^*]+\*)/g);
        return italicParts.map((itPart, k) => {
          if (itPart.startsWith('*') && itPart.endsWith('*') && itPart.length > 2) {
            return <em key={k} className="italic text-inherit">{itPart.slice(1, -1)}</em>;
          }
          return itPart;
        });
      });
    });
  };

  // Block parser: code blocks, headers, quotes, lists, paragraphs
  const renderBlocks = () => {
    if (!text) return null;

    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      blocks.push({ type: 'code', lang: match[1] || 'code', code: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      blocks.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return blocks.map((block, bIdx) => {
      if (block.type === 'code') {
        return <CodeBlock key={bIdx} code={block.code} lang={block.lang} />;
      }

      const lines = block.content.split('\n');
      const renderedLines = [];
      let listItems = [];
      let isOrdered = false;

      const flushList = () => {
        if (listItems.length > 0) {
          if (isOrdered) {
            renderedLines.push(
              <ol key={`ol-${renderedLines.length}`} className="my-2.5 space-y-1.5 pl-0.5">
                {listItems.map((li, liIdx) => (
                  <li key={liIdx} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full ${theme.numberBadge} text-xs font-bold flex items-center justify-center mt-0.5`}>
                      {liIdx + 1}
                    </span>
                    <div className="flex-1">{renderInline(li)}</div>
                  </li>
                ))}
              </ol>
            );
          } else {
            renderedLines.push(
              <ul key={`ul-${renderedLines.length}`} className="my-2.5 space-y-1.5 pl-0.5">
                {listItems.map((li, liIdx) => (
                  <li key={liIdx} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <span className={`w-1.5 h-1.5 rounded-full ${theme.bulletDot} mt-2 flex-shrink-0`} />
                    <div className="flex-1">{renderInline(li)}</div>
                  </li>
                ))}
              </ul>
            );
          }
          listItems = [];
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          flushList();
          continue;
        }

        if (trimmed.startsWith('### ')) {
          flushList();
          renderedLines.push(
            <h4 key={`h4-${i}`} className="text-sm font-bold text-inherit mt-3.5 mb-1.5 flex items-center gap-2">
              <span className={`w-1.5 h-3.5 ${theme.bulletDot} rounded-full`} />
              {renderInline(trimmed.slice(4))}
            </h4>
          );
          continue;
        }
        if (trimmed.startsWith('## ')) {
          flushList();
          renderedLines.push(
            <h3 key={`h3-${i}`} className="text-base font-bold text-inherit mt-4 mb-2 flex items-center gap-2 border-b border-current/10 pb-1">
              {renderInline(trimmed.slice(3))}
            </h3>
          );
          continue;
        }
        if (trimmed.startsWith('# ')) {
          flushList();
          renderedLines.push(
            <h2 key={`h2-${i}`} className="text-lg font-extrabold text-inherit mt-4 mb-2">
              {renderInline(trimmed.slice(2))}
            </h2>
          );
          continue;
        }

        if (trimmed.startsWith('> ')) {
          flushList();
          renderedLines.push(
            <blockquote key={`bq-${i}`} className={`border-l-4 ${theme.accentBorder} pl-3 py-1 my-2 bg-black/10 rounded-r-lg italic text-xs text-inherit/90`}>
              {renderInline(trimmed.slice(2))}
            </blockquote>
          );
          continue;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          if (isOrdered && listItems.length > 0) flushList();
          isOrdered = false;
          listItems.push(trimmed.slice(2));
          continue;
        }

        const ordMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (ordMatch) {
          if (!isOrdered && listItems.length > 0) flushList();
          isOrdered = true;
          listItems.push(ordMatch[2]);
          continue;
        }

        flushList();
        renderedLines.push(
          <p key={`p-${i}`} className="my-1.5 leading-relaxed text-sm">
            {renderInline(trimmed)}
          </p>
        );
      }
      flushList();

      return <div key={bIdx}>{renderedLines}</div>;
    });
  };

  return (
    <div className="space-y-3">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-current/10 text-xs">
        <div className="flex items-center gap-1.5 font-semibold opacity-85">
          <Sparkles className={`w-3.5 h-3.5 ${theme.accentText}`} />
          <span>Synthesized Answer</span>
        </div>
        <button
          type="button"
          onClick={handleCopyAnswer}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/10 hover:bg-black/20 transition-all text-xs font-medium cursor-pointer"
          title="Copy full answer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 opacity-70" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Formatted Markdown Content */}
      <div className="text-inherit leading-relaxed font-normal">
        {renderBlocks()}
      </div>

      {/* Retrieved Sources Accordion (Context Transparency) */}
      {sources && sources.length > 0 && (
        <div className="pt-2 mt-3 border-t border-current/10">
          <button
            type="button"
            onClick={() => setShowSources(!showSources)}
            className="w-full flex items-center justify-between py-1 text-xs font-semibold opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Layers className={`w-3.5 h-3.5 ${theme.accentText}`} />
              <span>Retrieved Context ({sources.length} Qdrant vectors)</span>
            </div>
            {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showSources && (
            <div className="mt-2.5 space-y-2 animate-fadeIn">
              {sources.map((chunk, cIdx) => (
                <div
                  key={cIdx}
                  className="p-3 rounded-lg bg-black/20 border border-current/10 text-xs leading-relaxed space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-inherit opacity-90">
                    <span className={theme.accentText}>Vector Chunk #{cIdx + 1}</span>
                    <span className="opacity-60">{chunk.length} characters</span>
                  </div>
                  <p className="opacity-80 line-clamp-3 hover:line-clamp-none transition-all">{chunk}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Application
// =============================================================================
function App() {
  const [currentTheme, setCurrentTheme] = useState('violet'); // Default: Cyber Violet
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('url'); // 'url' | 'paste' | 'audio'
  const [videoUrl, setVideoUrl] = useState('');
  const [customTranscript, setCustomTranscript] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [videoProcessed, setVideoProcessed] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const conversationEndRef = useRef(null);
  const questionInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const themeMenuRef = useRef(null);

  const t = THEMES[currentTheme] || THEMES.violet;
  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Focus question input after video is processed
  useEffect(() => {
    if (videoProcessed && questionInputRef.current) {
      questionInputRef.current.focus();
    }
  }, [videoProcessed]);

  // Close theme dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const extractVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url?.match(regex);
    return match ? match[1] : null;
  };

  const processVideoOrTranscript = async () => {
    if (activeTab === 'url' && !videoUrl.trim()) {
      setError('Please enter a YouTube video URL');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (activeTab === 'paste' && !customTranscript.trim()) {
      setError('Please paste a transcript to index');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const effectiveUrl = videoUrl.trim() || `https://www.youtube.com/watch?v=custom_${Math.random().toString(36).substring(2, 9)}`;
    const id = extractVideoId(effectiveUrl) || 'custom_doc';

    setProcessing(true);
    setError('');
    setVideoProcessed(false);
    setShowSuccess(false);

    try {
      const payload = { video_url: effectiveUrl };
      if (customTranscript.trim()) {
        payload.transcript = customTranscript.trim();
      }

      const response = await fetch(`${API_BASE}/process-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setVideoProcessed(true);
        setVideoUrl(effectiveUrl);
        setVideoId(id);
        setConversationHistory([]);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError(data.detail || 'Failed to process video/transcript');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure the backend is running.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const processAudio = async () => {
    if (!audioFile) {
      setError('Please select an audio file (.mp3, .m4a, .wav) to transcribe');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setProcessing(true);
    setError('');
    setVideoProcessed(false);
    setShowSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      if (videoUrl.trim()) {
        formData.append('video_url', videoUrl.trim());
      }

      const response = await fetch(`${API_BASE}/process-audio`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setVideoProcessed(true);
        setVideoUrl(data.video_url || 'https://www.youtube.com/watch?v=' + data.video_id);
        setVideoId(data.video_id);
        setConversationHistory([]);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError(data.detail || 'Failed to transcribe audio with Groq Whisper');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      setError('Failed to connect to server');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion('');
    
    if (questionInputRef.current) {
      questionInputRef.current.style.height = '56px';
    }
    
    setLoading(true);
    setError('');

    const tempEntry = {
      question: currentQuestion,
      answer: null,
      sources: [],
      loading: true
    };
    setConversationHistory(prev => [...prev, tempEntry]);

    try {
      const response = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          question: currentQuestion
        })
      });

      const data = await response.json();

      if (response.ok) {
        setConversationHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = {
            question: currentQuestion,
            answer: data.answer,
            sources: data.relevant_chunks || [],
            loading: false
          };
          return newHistory;
        });
      } else {
        setError(data.detail || 'Failed to get answer');
        setConversationHistory(prev => prev.slice(0, -1));
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      setError('Failed to connect to server');
      setConversationHistory(prev => prev.slice(0, -1));
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
  };

  const resetAll = () => {
    setVideoUrl('');
    setCustomTranscript('');
    setAudioFile(null);
    setQuestion('');
    setVideoProcessed(false);
    setVideoId('');
    setConversationHistory([]);
    setError('');
    setActiveTab('url');
  };

  return (
    <div className={`min-h-screen ${t.bgGradient} transition-colors duration-300 font-sans`}>
      <div className={`fixed inset-0 ${t.bgGradient} -z-10`}></div>
      
      {/* Header */}
      <div className={`${t.headerBg} sticky top-0 z-30 transition-colors duration-300`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            
            {/* Logo & Subtitle */}
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 bg-gradient-to-br ${t.headerIcon} rounded-xl flex items-center justify-center shadow-lg`}>
                <Youtube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${t.titleGradient} tracking-tight`}>
                  VideoChat AI
                </h1>
                <p className={`${t.accentSubtext} text-xs font-medium`}>
                  RAG Video Q&A with FastEmbed, Qdrant & Groq LLM
                </p>
              </div>
            </div>

            {/* Right Action Controls: Theme Selector + Reset Button */}
            <div className="flex items-center gap-3">
              
              {/* Palette / Theme Switcher Dropdown */}
              <div className="relative" ref={themeMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${t.cardInner} ${t.textPrimary} hover:scale-[1.02] cursor-pointer`}
                  title="Switch Color Theme"
                >
                  <Palette className={`w-4 h-4 ${t.accentText}`} />
                  <span className="hidden sm:inline">{t.icon} {t.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {showThemeMenu && (
                  <div className={`absolute right-0 mt-2 w-64 rounded-2xl ${t.cardBg} p-2 shadow-2xl border border-current/20 z-50 animate-fadeIn`}>
                    <div className="px-3 py-2 border-b border-current/10 mb-1">
                      <p className={`text-xs font-bold ${t.textPrimary}`}>Choose Color Grading</p>
                      <p className={`text-[10px] ${t.textSecondary}`}>Select visual aesthetic</p>
                    </div>
                    {Object.values(THEMES).map((themeOption) => (
                      <button
                        key={themeOption.id}
                        type="button"
                        onClick={() => {
                          setCurrentTheme(themeOption.id);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          currentTheme === themeOption.id 
                            ? `${themeOption.activeTab} font-semibold` 
                            : `${t.textSecondary} hover:${t.textPrimary} hover:bg-white/5`
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{themeOption.icon}</span>
                          <div>
                            <p className="font-medium">{themeOption.name}</p>
                            <p className="text-[10px] opacity-70 capitalize">{themeOption.type} theme</p>
                          </div>
                        </div>
                        {currentTheme === themeOption.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {videoProcessed && (
                <button
                  onClick={resetAll}
                  className={`px-3 py-1.5 ${t.btnSecondary} rounded-xl transition-all text-xs font-medium flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Video</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 py-6 min-h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-5 min-h-full">
          
          {/* Left Panel - Input Section */}
          <div className="lg:col-span-2 space-y-4 flex flex-col min-h-[calc(100vh-120px)]">
            
            {/* Input Card */}
            <div className={`${t.cardBg} rounded-2xl p-6 transition-all duration-300`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.headerIcon} flex items-center justify-center shadow-md`}>
                  <Youtube className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${t.textPrimary}`}>Content Source</h2>
                  <p className={`text-xs ${t.textSecondary}`}>Choose ingestion method</p>
                </div>
              </div>

              {/* Source Tabs */}
              <div className={`grid grid-cols-3 gap-1 ${t.tabContainer} p-1 rounded-xl mb-4 text-xs font-semibold`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'url' ? t.activeTab : t.inactiveTab
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5" />
                  YouTube
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'paste' ? t.activeTab : t.inactiveTab
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('audio')}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'audio' ? t.activeTab : t.inactiveTab
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  Audio
                </button>
              </div>

              {/* Tab 1: YouTube URL */}
              {activeTab === 'url' && (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !processing && videoUrl && processVideoOrTranscript()}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={`w-full px-4 py-3 pr-12 rounded-xl text-sm transition-all ${t.inputBg}`}
                      disabled={processing}
                    />
                    {videoProcessed && (
                      <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                    )}
                  </div>

                  <button
                    onClick={processVideoOrTranscript}
                    disabled={processing || !videoUrl.trim()}
                    className={`w-full px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm ${t.btnPrimary}`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Fetching & Indexing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Process Video
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="mt-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex flex-col gap-2.5 animate-fadeIn">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{error}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => { setActiveTab('paste'); setError(''); }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Switch to Paste Text
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('audio'); setError(''); }}
                          className={`px-3 py-1.5 ${t.btnPrimary} text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          Switch to Audio Upload
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Paste Transcript */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Optional YouTube URL or Title..."
                    className={`w-full px-3 py-2 rounded-lg text-xs transition-all ${t.inputBg}`}
                    disabled={processing}
                  />

                  <textarea
                    rows={6}
                    value={customTranscript}
                    onChange={(e) => setCustomTranscript(e.target.value)}
                    placeholder="Paste real video transcript or article text here..."
                    className={`w-full px-4 py-3 rounded-xl text-sm resize-none transition-all ${t.inputBg}`}
                    disabled={processing}
                  />

                  <button
                    onClick={processVideoOrTranscript}
                    disabled={processing || !customTranscript.trim()}
                    className={`w-full px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm ${t.btnPrimary}`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Embedding into Qdrant...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Index Transcript
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 3: Upload Audio (Groq Whisper) */}
              {activeTab === 'audio' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                    className="hidden"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${t.cardInner} hover:border-current`}
                  >
                    <UploadCloud className={`w-8 h-8 ${t.accentText}`} />
                    <div>
                      <p className={`text-sm font-semibold ${t.textPrimary}`}>
                        {audioFile ? audioFile.name : 'Click to select audio file'}
                      </p>
                      <p className={`text-xs ${t.textSecondary}`}>MP3, M4A, WAV up to 25MB</p>
                    </div>
                  </div>

                  {audioFile && (
                    <div className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border ${t.badge}`}>
                      <FileAudio className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{audioFile.name}</span>
                      <span className="ml-auto font-medium opacity-75">
                        {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  )}

                  <button
                    onClick={processAudio}
                    disabled={processing || !audioFile}
                    className={`w-full px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm ${t.btnPrimary}`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transcribing with Whisper...
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Transcribe & Index
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Video Thumbnail (if YouTube ID is present) */}
              {videoId && videoId.length === 11 && (
                <div className="mt-4 relative rounded-xl overflow-hidden aspect-video shadow-md">
                  <img 
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3">
                    <div className="flex items-center gap-2 text-white text-xs font-semibold">
                      <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                      <span>Video Ready</span>
                    </div>
                  </div>
                </div>
              )}

              {showSuccess && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-300 text-xs font-semibold">
                    Indexed successfully into Qdrant! Ready for Q&A.
                  </span>
                </div>
              )}
            </div>

            {/* Ingestion Info Guide */}
            {!videoProcessed && !processing && (
              <div className={`${t.cardBg} rounded-2xl p-5 border border-dashed border-current/20 space-y-3`}>
                <h3 className={`text-sm font-bold ${t.textPrimary} flex items-center gap-2`}>
                  <Sparkles className={`w-4 h-4 ${t.accentText}`} />
                  Supported Ingestion Methods
                </h3>
                <div className={`space-y-2.5 text-xs ${t.textSecondary}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full ${t.numberBadge} flex items-center justify-center flex-shrink-0 font-bold text-[11px]`}>1</div>
                    <p><b className={t.textPrimary}>YouTube:</b> Free rotating Invidious pool extracts speech captions directly.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full ${t.numberBadge} flex items-center justify-center flex-shrink-0 font-bold text-[11px]`}>2</div>
                    <p><b className={t.textPrimary}>Paste Text:</b> Instant indexing, bypassing all cloud server IP challenges.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full ${t.numberBadge} flex items-center justify-center flex-shrink-0 font-bold text-[11px]`}>3</div>
                    <p><b className={t.textPrimary}>Audio Upload:</b> Automated speech-to-text via Groq Whisper API.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Conversation Display */}
          <div className="lg:col-span-5 flex flex-col min-h-[calc(100vh-120px)] gap-4">
            
            {/* Conversation Area */}
            <div className={`${t.cardBg} rounded-2xl flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
              
              {/* Conversation Header */}
              <div className={`p-4 border-b border-current/10 ${t.headerBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.headerIcon} flex items-center justify-center shadow-md`}>
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-sm font-bold ${t.textPrimary}`}>Video Conversation</h2>
                      <p className={`text-[11px] ${t.textSecondary}`}>
                        {conversationHistory.length > 0 
                          ? `${conversationHistory.length} ${conversationHistory.length === 1 ? 'exchange' : 'exchanges'}`
                          : 'Awaiting your question'}
                      </p>
                    </div>
                  </div>
                  {conversationHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={clearConversation}
                      className={`px-3 py-1.5 ${t.btnSecondary} rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5 cursor-pointer`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${t.chatBg}`}>
                {conversationHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className={`w-16 h-16 rounded-2xl ${t.cardInner} flex items-center justify-center mb-3 shadow-inner`}>
                      <MessageSquare className={`w-8 h-8 ${t.accentText} opacity-80`} />
                    </div>
                    <h3 className={`text-base font-bold ${t.textPrimary} mb-1.5`}>
                      Ready for Questions
                    </h3>
                    <p className={`text-xs ${t.textSecondary} max-w-sm leading-relaxed`}>
                      {videoProcessed 
                        ? "Ask anything about the video content. Responses are retrieved from Qdrant and synthesized with Groq LLM." 
                        : "Ingest a YouTube video URL, paste text, or upload an audio file to start."}
                    </p>
                  </div>
                ) : (
                  <>
                    {conversationHistory.map((item, idx) => (
                      <div key={idx} className="space-y-4 animate-fadeIn">
                        
                        {/* User Question */}
                        <div className="flex gap-3 justify-end items-start">
                          <div className={`max-w-[80%] ${t.userBubble} rounded-2xl rounded-tr-sm px-4 py-3 shadow-md`}>
                            <p className="text-white text-sm font-medium leading-relaxed">{item.question}</p>
                          </div>
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.headerIcon} flex items-center justify-center flex-shrink-0 shadow-md mt-0.5`}>
                            <MessageSquare className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        {/* AI Synthesized Answer */}
                        <div className="flex gap-3 items-start">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.headerIcon} flex items-center justify-center flex-shrink-0 shadow-md mt-0.5`}>
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          
                          <div className={`max-w-[85%] ${t.aiBubble} rounded-2xl rounded-tl-sm p-4 shadow-md flex-1`}>
                            {item.loading ? (
                              <div className="flex items-center gap-2.5 py-2">
                                <Loader2 className={`w-4 h-4 animate-spin ${t.accentText}`} />
                                <span className={`text-xs font-medium ${t.textSecondary}`}>
                                  Searching Qdrant vector index & synthesizing answer via Groq LLM...
                                </span>
                              </div>
                            ) : (
                              <FormattedAnswer
                                text={item.answer}
                                sources={item.sources}
                                theme={t}
                              />
                            )}
                          </div>
                        </div>

                      </div>
                    ))}
                    <div ref={conversationEndRef} />
                  </>
                )}
              </div>
            </div>

            {/* Question Input at Bottom */}
            {videoProcessed && (
              <div className={`${t.cardBg} rounded-2xl p-4 transition-all duration-300 shadow-lg`}>
                <div className="flex gap-3 items-end">
                  <textarea
                    ref={questionInputRef}
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        askQuestion();
                      }
                    }}
                    placeholder="Ask a question about the video (e.g. summarize key takeaways, extract steps)..."
                    className={`flex-1 px-4 py-3 rounded-xl text-sm resize-none min-h-[52px] max-h-[180px] transition-all ${t.inputBg}`}
                    disabled={loading}
                    style={{ height: '52px' }}
                  />
                  <button
                    type="button"
                    onClick={askQuestion}
                    disabled={loading || !question.trim()}
                    className={`h-[52px] w-[52px] flex-shrink-0 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] cursor-pointer ${t.btnPrimary}`}
                    title="Send Question (Enter)"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
            
          </div>

        </div>
      </div>

      {/* Global Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 bg-red-950/90 border border-red-800 text-red-200 rounded-xl p-4 shadow-2xl flex items-center gap-3 max-w-md animate-slideIn z-50">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-xs font-medium">{error}</span>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

export default App;
