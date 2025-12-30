import { useState, useRef, useEffect } from 'react';
import { Search, Youtube, MessageSquare, Loader2, CheckCircle, AlertCircle, Sparkles, Send, Trash2, Play } from 'lucide-react';

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [videoProcessed, setVideoProcessed] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const conversationEndRef = useRef(null);
  const questionInputRef = useRef(null);

  const API_BASE = 'http://localhost:10000';

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

  const extractVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const processVideo = async () => {
    const id = extractVideoId(videoUrl);
    if (!id) {
      setError('Invalid YouTube URL');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setProcessing(true);
    setError('');
    setVideoProcessed(false);
    setShowSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/process-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl })
      });

      const data = await response.json();

      if (response.ok) {
        setVideoProcessed(true);
        setVideoId(id);
        setConversationHistory([]);
        setAnswer('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError(data.detail || 'Failed to process video');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure the backend is running on port 8000.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion('');
    
    // Reset textarea height after clearing
    if (questionInputRef.current) {
      questionInputRef.current.style.height = '56px';
    }
    
    setLoading(true);
    setError('');

    // Add user question immediately for better UX
    const tempEntry = {
      question: currentQuestion,
      answer: null,
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
        setAnswer(data.answer);
        setConversationHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = {
            question: currentQuestion,
            answer: data.answer,
            sources: data.relevant_chunks,
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
    setQuestion('');
    setAnswer('');
    setVideoProcessed(false);
    setVideoId('');
    setConversationHistory([]);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Fixed background overlay to extend beyond content */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 -z-10"></div>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-cyan-100">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Youtube className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  VideoChat AI
                </h1>
                <p className="text-cyan-600 text-xs font-medium">
                  Intelligent Video Q&A Assistant
                </p>
              </div>
            </div>
            {videoProcessed && (
              <button
                onClick={resetAll}
                className="px-4 py-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                New Video
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="max-w-[1600px] mx-auto px-4 py-6 min-h-[calc(100vh-88px)]">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 min-h-full">
          
          {/* Left Panel - Input Section */}
          <div className="lg:col-span-2 space-y-4 flex flex-col min-h-[calc(100vh-120px)]">
            
            {/* Video Input */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-cyan-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                  <Youtube className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Video Source</h2>
                  <p className="text-xs text-gray-500">Paste YouTube URL to begin</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !processing && videoUrl && processVideo()}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-cyan-400 focus:bg-white focus:outline-none transition-all text-gray-700 placeholder-gray-400"
                    disabled={processing}
                  />
                  {videoProcessed && (
                    <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                
                {videoId && (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video">
                    <img 
                      src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <Play className="w-4 h-4" />
                        <span>Video loaded</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={processVideo}
                  disabled={processing || !videoUrl}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Video...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Process Video
                    </>
                  )}
                </button>
              </div>

              {showSuccess && (
                <div className="mt-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3 animate-fadeIn">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 text-sm font-semibold">Ready to answer questions!</span>
                </div>
              )}
            </div>


            {/* Info Card */}
            {!videoProcessed && !processing && (
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border-2 border-cyan-200 border-dashed">
                <h3 className="text-base font-bold text-cyan-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Quick Start Guide
                </h3>
                <div className="space-y-3 text-sm text-cyan-700">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-200 flex items-center justify-center flex-shrink-0 font-bold text-cyan-900">1</div>
                    <p>Paste any YouTube video URL above</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-200 flex items-center justify-center flex-shrink-0 font-bold text-cyan-900">2</div>
                    <p>Wait for AI to analyze the transcript</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-200 flex items-center justify-center flex-shrink-0 font-bold text-cyan-900">3</div>
                    <p>Ask questions and get instant answers</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Conversation Display */}
          <div className="lg:col-span-5 flex flex-col min-h-[calc(100vh-120px)] gap-4">
            
            {/* Conversation Area */}
            <div className="bg-white rounded-2xl shadow-md border border-cyan-100 flex flex-col flex-1 overflow-hidden">
              <div className="p-6 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Conversation</h2>
                      <p className="text-xs text-gray-500">
                        {conversationHistory.length > 0 
                          ? `${conversationHistory.length} ${conversationHistory.length === 1 ? 'exchange' : 'exchanges'}`
                          : 'No messages yet'}
                      </p>
                    </div>
                  </div>
                  {conversationHistory.length > 0 && (
                    <button
                      onClick={clearConversation}
                      className="px-3 py-1.5 text-cyan-600 hover:bg-cyan-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-white">
                {conversationHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4">
                      <MessageSquare className="w-10 h-10 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Start a Conversation</h3>
                    <p className="text-gray-500 max-w-sm">
                      {videoProcessed 
                        ? "Ask your first question about the video to begin" 
                        : "Process a YouTube video to start asking questions"}
                    </p>
                  </div>
                ) : (
                  <>
                    {conversationHistory.map((item, idx) => (
                      <div key={idx} className="space-y-3 animate-fadeIn">
                        {/* Question */}
                        <div className="flex gap-3 justify-end">
                          <div className="max-w-[80%] bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl rounded-tr-sm p-4 shadow-md">
                            <p className="text-white font-medium">{item.question}</p>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                        </div>

                        {/* Answer */}
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div className="max-w-[80%] bg-white border-2 border-cyan-100 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                            {item.loading ? (
                              <div className="flex items-center gap-2 text-cyan-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Analyzing video content...</span>
                              </div>
                            ) : (
                              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
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
              <div className="bg-white rounded-2xl shadow-md p-6 border border-cyan-100">
                <div className="flex gap-3 items-end">
                  <textarea
                    ref={questionInputRef}
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      // Auto-resize textarea
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        askQuestion();
                      }
                    }}
                    placeholder="Ask a question about the video..."
                    className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:bg-white focus:outline-none transition-all text-gray-700 placeholder-gray-400 resize-none min-h-[56px] max-h-[200px]"
                    disabled={loading}
                    style={{ height: '56px' }}
                  />
                  <button
                    onClick={askQuestion}
                    disabled={loading || !question.trim()}
                    className="h-14 w-14 flex-shrink-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Send className="w-6 h-6" />
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
        <div className="fixed bottom-6 right-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-2xl flex items-center gap-3 max-w-md animate-slideIn">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800 text-sm font-medium">{error}</span>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default App;
