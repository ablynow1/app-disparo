'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Loader2, Info } from 'lucide-react';
import { simulateAiChat } from '@/actions/ai-playground';
import { toast } from 'sonner';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

interface AiPlaygroundModalProps {
    agent: {
        id: string;
        name: string;
        provider: string;
        temperature: number;
        knowledgeBases: any[];
    };
    onClose: () => void;
}

export function AiPlaygroundModal({ agent, onClose }: AiPlaygroundModalProps) {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: `Olá! Eu sou o agente "${agent.name}". Como posso testar minhas habilidades configuradas hoje?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');

        const newMessages: Message[] = [
            ...messages,
            { id: Date.now().toString(), role: 'user', text: userText }
        ];
        setMessages(newMessages);
        setIsLoading(true);

        // Formata histórico exigido pela API do Gemini
        // Ignora a msg 1 de saudacao para n enviesar
        const geminiHistory = newMessages.slice(1, -1).map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        try {
            const res = await simulateAiChat(agent.id, userText, geminiHistory);

            if (res.success) {
                setMessages(prev => [
                    ...prev,
                    { id: (Date.now() + 1).toString(), role: 'model', text: res.text || '' }
                ]);
            } else {
                toast.error(res.error || 'Erro no Simulador LLM');
            }
        } catch (err: any) {
            toast.error('Gargalo de conexão com AI Server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Simulator Drawler Lateral Direito - Imitação Celular */}
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative z-10 w-full max-w-md h-full bg-[#111b21] shadow-2xl flex flex-col border-l border-zinc-800"
            >
                {/* Header - Imitação Painel Topo WhatsApp Dark */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between shadow z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30 overflow-hidden">
                            <Bot className="text-indigo-400 w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-zinc-100 font-semibold text-[15px]">{agent.name}</span>
                            <span className="text-emerald-500 text-[12px]">Online (Playground Mode)</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-2"><X size={20} /></button>
                </div>

                {/* Info Banner do RAG */}
                {(agent.knowledgeBases?.length > 0) && (
                    <div className="bg-[#182229] border-b border-[#202c33] px-4 py-2 flex items-center gap-2 text-[11px] text-amber-500/80">
                        <Info size={14} className="shrink-0" />
                        <p>O LLM injetou as {agent.knowledgeBases.length} bases de conhecimento na RAM (RAG).</p>
                    </div>
                )}

                {/* Chat Area - O famigerado Fundo do ZAP */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b141a]"
                    // Background Tile Opcional do ZAP Dark
                    style={{ backgroundImage: 'radial-gradient(circle at center, #111b21 0, #0b141a 100%)' }}
                >
                    {messages.map((msg) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`relative max-w-[85%] rounded-2xl px-3 py-2 text-[14px] leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-[#005c4b] text-zinc-100 rounded-tr-none'
                                        : 'bg-[#202c33] text-zinc-200 rounded-tl-none'
                                    }`}
                                style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                            >
                                {msg.text}
                                <div className="text-[10px] text-right mt-1 opacity-60">
                                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-[#202c33] max-w-[85%] rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                <Loader2 size={16} className="text-indigo-400 animate-spin" />
                                <span className="text-zinc-400 text-[13px] font-medium">{agent.provider} Processando...</span>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Campo de Digitação Bottom */}
                <div className="bg-[#202c33] px-3 py-3 flex items-end gap-2 shrink-0">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Teste uma objeção do lide..."
                        className="bg-[#2a3942] text-zinc-100 rounded-xl px-4 py-3 min-h-[44px] max-h-32 w-full resize-none focus:outline-none placeholder:text-zinc-500 text-[15px]"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="w-12 h-[44px] rounded-full bg-[#00a884] flex items-center justify-center text-white shrink-0 hover:bg-[#008f6f] transition-colors disabled:opacity-50 disabled:bg-[#00a884]"
                    >
                        <Send size={20} className="ml-1" />
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
