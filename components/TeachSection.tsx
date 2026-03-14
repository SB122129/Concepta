import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Square, Volume2, VolumeX, GraduationCap, User } from 'lucide-react';
import { createStudentSession, sendMessageToStudent } from '../services/geminiService';
import { Button } from './Button';

interface TeachSectionProps {
  initialTopic?: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
}

export const TeachSection: React.FC<TeachSectionProps> = ({ initialTopic = '' }) => {
  // State
  const [topic, setTopic] = useState(initialTopic);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);

  // Refs
  const chatSessionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Scrolling ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- TTS Helper ---
  const speakText = (text: string) => {
    if (!isTTSEnabled || !window.speechSynthesis) return;
    
    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.name.includes('English')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.1; // Slightly faster for conversational feel
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  // --- Session Management ---
  const startSession = async () => {
    if (!topic.trim()) return;
    
    setIsSessionActive(true);
    setIsProcessing(true);
    
    try {
        const chat = createStudentSession(topic);
        chatSessionRef.current = chat;
        
        // Initial "Student" message trigger
        const initialPrompt = `I'm ready to learn about ${topic}. Can you explain it to me simply?`;
        // We pretend the model sent this to start the UI interaction, 
        // OR we can actually ask the model to greet. 
        // Let's ask the model to generate the greeting based on system instructions.
        const response = await sendMessageToStudent(chat, "Hello student, are you ready?", null);
        
        setMessages([
            { id: 'init', role: 'model', text: response }
        ]);
        speakText(response);
    } catch (e) {
        console.error("Failed to start session", e);
        alert("Failed to start student session.");
        setIsSessionActive(false);
    } finally {
        setIsProcessing(false);
    }
  };

  const endSession = () => {
    window.speechSynthesis.cancel();
    setIsSessionActive(false);
    setMessages([]);
    chatSessionRef.current = null;
    setTopic('');
  };

  // --- Messaging ---
  const handleSendMessage = async (text: string | null, audioBlob: Blob | null) => {
    if (!chatSessionRef.current) return;
    
    const newMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: text || (audioBlob ? "Audio Message" : ""),
        isAudio: !!audioBlob
    };
    setMessages(prev => [...prev, newMessage]);
    setIsProcessing(true);

    try {
        let audioBase64: string | null = null;
        
        if (audioBlob) {
            audioBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => resolve(reader.result as string);
            });
        }

        const responseText = await sendMessageToStudent(chatSessionRef.current, text, audioBase64);
        
        const modelMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText
        };
        setMessages(prev => [...prev, modelMessage]);
        speakText(responseText);

    } catch (e) {
        console.error(e);
        // Add error message to chat
    } finally {
        setIsProcessing(false);
    }
  };

  const onSendText = () => {
      if (!inputText.trim()) return;
      handleSendMessage(inputText, null);
      setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSendText();
      }
  };

  // --- Audio Recording ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            handleSendMessage(null, audioBlob);
            
            // Stop tracks
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (e) {
        console.error("Microphone access denied", e);
        alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  // --- RENDER ---

  // 1. Setup Screen
  if (!isSessionActive) {
      return (
          <div className="h-full flex flex-col items-center justify-center p-4 animate-fade-in bg-transparent transition-colors">
              <div className="max-w-md w-full text-center space-y-8 bg-white/90 dark:bg-slate-950/90 border border-cyan-100 dark:border-cyan-900/30 rounded-2xl p-8 shadow-sm backdrop-blur-sm">
                  <div className="w-24 h-24 bg-cyan-50 dark:bg-cyan-900/20 rounded-3xl mx-auto flex items-center justify-center rotate-3">
                      <GraduationCap className="w-12 h-12 text-cyan-500" />
                  </div>
                  
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Feynman Mode</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        The best way to learn is to teach. I'll act as a curious student. 
                        Explain a concept to me, and I'll ask questions to test your understanding.
                    </p>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-950/90 border-2 border-cyan-100 dark:border-cyan-900/30 rounded-2xl p-2 shadow-lg focus-within:border-cyan-500 transition-colors backdrop-blur-sm">
                      <input 
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="What topic are you teaching?"
                        className="w-full p-3 bg-transparent outline-none text-lg font-medium text-center text-gray-800 dark:text-gray-100 placeholder-gray-400"
                        onKeyDown={(e) => e.key === 'Enter' && startSession()}
                      />
                  </div>

                  <Button 
                    onClick={startSession} 
                    disabled={!topic.trim() || isProcessing}
                                        className="w-full py-4 text-lg bg-gradient-to-r from-cyan-500 to-orange-500 hover:opacity-95 text-white rounded-xl font-bold shadow-xl transition-transform active:scale-95"
                  >
                     {isProcessing ? "Preparing Class..." : "Start Teaching"}
                  </Button>
              </div>
          </div>
      );
  }

  // 2. Chat Session Screen
  return (
      <div className="h-full flex flex-col bg-transparent transition-colors">
          
          {/* Header */}
          <div className="h-16 px-6 bg-white/90 dark:bg-slate-950/90 border-b border-cyan-100 dark:border-cyan-900/30 flex items-center justify-between shadow-sm z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center">
                      <span className="text-xl">🧑‍🎓</span>
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 leading-tight">Student Alex</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Topic: {topic}</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
                    title="Toggle Voice"
                  >
                      {isTTSEnabled ? <Volume2 className="w-5 h-5"/> : <VolumeX className="w-5 h-5"/>}
                  </button>
                  <Button variant="ghost" onClick={endSession} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      End Class
                  </Button>
              </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-transparent">
              {messages.map((msg) => {
                  const isModel = msg.role === 'model';
                  return (
                    <div key={msg.id} className={`flex ${isModel ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                        <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 
                                ${isModel ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                {isModel ? '🎓' : <User className="w-4 h-4"/>}
                            </div>

                            {/* Bubble */}
                            <div className={`p-4 rounded-2xl shadow-sm text-[15px] leading-relaxed
                                ${isModel 
                                    ? 'bg-white/90 dark:bg-slate-950/90 text-gray-800 dark:text-gray-100 rounded-tl-none border border-cyan-100 dark:border-cyan-900/30 backdrop-blur-sm' 
                                    : 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none'}
                            `}>
                                {msg.isAudio ? (
                                    <div className="flex items-center gap-2 italic opacity-90">
                                        <Mic className="w-4 h-4" /> Audio Message
                                    </div>
                                ) : (
                                    msg.text
                                )}
                            </div>
                        </div>
                    </div>
                  );
              })}
              {isProcessing && (
                  <div className="flex justify-start animate-fade-in">
                      <div className="flex gap-3 max-w-[75%]">
                          <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/40 rounded-full flex items-center justify-center mt-1">🎓</div>
                          <div className="bg-white/90 dark:bg-slate-950/90 p-4 rounded-2xl rounded-tl-none border border-cyan-100 dark:border-cyan-900/30 flex gap-1 items-center h-12 backdrop-blur-sm">
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75"></div>
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150"></div>
                          </div>
                      </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/90 dark:bg-slate-950/90 border-t border-cyan-100 dark:border-cyan-900/30 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto flex items-end gap-3">
                  
                  {/* Mic Button */}
                  <button 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-4 rounded-full transition-all duration-200 flex-shrink-0 shadow-md border-2
                        ${isRecording 
                            ? 'bg-red-500 border-red-600 text-white scale-110' 
                                                        : 'bg-white/90 dark:bg-slate-950/90 border-cyan-100 dark:border-cyan-900/30 text-gray-500 dark:text-gray-400 hover:border-cyan-500 hover:text-cyan-500'}
                    `}
                    title="Hold to Speak"
                  >
                      {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
                  </button>

                  {/* Text Input */}
                  <div className="flex-1 bg-white/90 dark:bg-slate-950/90 rounded-2xl flex items-center px-4 py-2 border border-cyan-100 dark:border-cyan-900/30 focus-within:border-cyan-300 dark:focus-within:border-cyan-500 transition-colors backdrop-blur-sm">
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isRecording ? "Recording..." : "Type your explanation..."}
                        className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 h-10"
                        disabled={isRecording || isProcessing}
                      />
                      <button 
                        onClick={onSendText}
                        disabled={!inputText.trim() || isProcessing}
                                                className="p-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                          <Send className="w-5 h-5" />
                      </button>
                  </div>

              </div>
              <p className="text-center text-xs text-gray-400 mt-2">Hold the mic button to speak, or type your message.</p>
          </div>

      </div>
  );
};