'use client';

import { useState, useEffect, useRef } from 'react';
import { sendManualMessage, getConversationHistory, toggleAiPause } from '@/actions/chat';
import { MessageSquare, Send, PauseCircle, PlayCircle, Bot, Zap, Loader2, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ChatInterface({ initialContacts }: { initialContacts: any[] }) {
    const [activeContactId, setActiveContactId] = useState<string | null>(null);
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [message, setMessage] = useState('');
    const [loadingMsg, setLoadingMsg] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Selecionando um lead
    useEffect(() => {
        if (!activeContactId) return;

        let isSubscribed = true;
        const fetchChat = async () => {
            setLoadingChat(true);
            try {
                const history = await getConversationHistory(activeContactId);
                if (isSubscribed) setActiveChat(history);
            } catch (e) {
                console.error('Failed to load chat', e);
            } finally {
                if (isSubscribed) setLoadingChat(false);
            }
        };
        fetchChat();

        return () => { isSubscribed = false; };
    }, [activeContactId]);

    // Scroll down
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChat?.messages]);

    const handleSend = async () => {
        if (!message.trim() || !activeContactId) return;

        setLoadingMsg(true);
        const textToSend = message;
        setMessage(''); // Optimistic clear

        // Optimistic UI Append
        setActiveChat((prev: any) => ({
            ...prev,
            messages: [...prev.messages, { id: 'temp', text: textToSend, direction: 'OUTBOUND', createdAt: new Date() }]
        }));

        const result = await sendManualMessage(activeContactId, textToSend);
        if (!result.success) {
            alert('Erro ao enviar: ' + result.error);
        } else {
            // Re-sync UI (replace temp id with DB info)
            const fresh = await getConversationHistory(activeContactId);
            setActiveChat(fresh);
        }
        setLoadingMsg(false);
    };

    const handleToggleAi = async () => {
        if (!activeContactId) return;
        const isPaused = !activeChat.aiPaused;

        // UI Optimistic
        setActiveChat((prev: any) => ({ ...prev, aiPaused: isPaused }));

        // DB Side
        await toggleAiPause(activeContactId, isPaused);
    };

    return (
        <div className="flex h-full bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

            {/* Sidebar (Lista de Leads) */}
            <div className="w-1/3 min-w-[300px] border-r border-white/5 flex flex-col bg-background/20 relative z-10">
                <div className="p-5 border-b border-white/5 bg-white/[0.01]">
                    <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-400" /> Conversas
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {initialContacts.map(contact => {
                        const lastMsg = contact.messages[0];
                        const isActive = activeContactId === contact.id;
                        return (
                            <button
                                key={contact.id}
                                onClick={() => setActiveContactId(contact.id)}
                                className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors flex flex-col gap-1 ${isActive ? 'bg-white/[0.04] shadow-inner border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-medium text-zinc-200 truncate pr-2">
                                        {contact.pushName || contact.remoteJid.split('@')[0]}
                                    </span>
                                    {lastMsg && (
                                        <span className="text-[10px] text-zinc-500 shrink-0">
                                            {format(new Date(lastMsg.createdAt), "HH:mm")}
                                        </span>
                                    )}
                                </div>
                                {contact.aiPaused && (
                                    <span className="inline-flex max-w-min items-center gap-1 bg-rose-500/10 text-rose-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold">
                                        <PauseCircle className="w-3 h-3" /> IA Pausada
                                    </span>
                                )}
                                <span className="text-xs text-zinc-400 truncate w-full h-4">
                                    {lastMsg ? lastMsg.text : 'Sem mensagens ainda.'}
                                </span>
                            </button>
                        );
                    })}
                    {initialContacts.length === 0 && (
                        <div className="p-6 text-center text-sm text-zinc-500">Nenhuma conversa encontrada na loja atual.</div>
                    )}
                </div>
            </div>

            {/* Janela de Chat Central */}
            <div className="flex-1 flex flex-col bg-transparent relative z-10">
                {activeContactId ? (
                    <>
                        {/* Header da Conversa */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
                            <div className="flex flex-col">
                                <span className="font-semibold text-zinc-100">{activeChat?.pushName || 'Desconhecido'}</span>
                                <span className="text-xs text-zinc-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {activeChat?.remoteJid?.split('@')[0]}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                {activeChat && (
                                    <button
                                        onClick={handleToggleAi}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeChat.aiPaused
                                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20'
                                            }`}
                                    >
                                        {activeChat.aiPaused ? (
                                            <><Bot className="w-4 h-4" /> IA Pausada</>
                                        ) : (
                                            <><Zap className="w-4 h-4" /> IA Atendendo</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mensagens */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative custom-scrollbar">
                            {/* Glass Background Grid FX */}
                            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02] pointer-events-none" />
                            {loadingChat ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-zinc-700" />
                                </div>
                            ) : (
                                activeChat?.messages.map((msg: any) => {
                                    const isMe = msg.direction === 'OUTBOUND';
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-md backdrop-blur-sm border ${isMe
                                                ? 'bg-indigo-600/90 text-white rounded-tr-sm border-indigo-500/50'
                                                : 'bg-white/[0.05] border-white/10 text-zinc-200 rounded-tl-sm'
                                                }`}>
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-zinc-500'}`}>
                                                    {format(new Date(msg.createdAt), "HH:mm")}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Footer */}
                        <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Envie uma mensagem manual..."
                                    className="w-full bg-white/[0.03] border border-white/10 text-zinc-100 rounded-full px-5 py-3.5 pr-14 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all placeholder-zinc-500 shadow-inner"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={loadingMsg || !message.trim()}
                                    className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-transform active:scale-95 disabled:opacity-50"
                                >
                                    {loadingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5 mt-0.5" />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-transparent">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                        <p className="font-medium">Selecione uma conversa para iniciar o atendimento</p>
                        <p className="text-sm mt-1 max-w-xs text-center">Nesta tela você visualiza as mensagens que chegam e pode Pausar o Robô para assumir vendas complexas.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
