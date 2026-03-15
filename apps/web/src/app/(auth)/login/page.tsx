'use client';

import { useActionState } from 'react';
import { authenticate } from './actions';
import { Loader2, Lock, Mail, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginForm() {
    const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);

    return (
        <div className="min-h-screen bg-[#0c0c0e] flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">

            {/* Elementos Decorativos de Fundo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center relative">
                <div className="mx-auto w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-8">
                    <Zap className="text-zinc-950 w-8 h-8" />
                </div>
                <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">O Motor do seu SaaS</h2>
                <p className="mt-3 text-center text-sm text-zinc-400">Entre na sua conta para orquestrar disparaos de WhatsApp</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
                <div className="bg-zinc-950/80 backdrop-blur-xl py-10 px-6 shadow-2xl sm:rounded-[2rem] border border-zinc-800/80">

                    <form className="space-y-6" action={formAction}>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 ml-2 mb-2">E-mail de Acesso</label>
                            <div className="relative mt-1 border border-zinc-800 rounded-2xl bg-zinc-900 group focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all overflow-hidden">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-zinc-500" />
                                </div>
                                <input
                                    id="email" name="email" type="email" autoComplete="email" required
                                    className="block w-full pl-12 pr-4 py-4 bg-transparent border-0 text-white placeholder-zinc-600 focus:ring-0 sm:text-sm font-medium"
                                    placeholder="vtr@disparo.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-zinc-400 ml-2 mb-2">Senha Secreta</label>
                            <div className="relative mt-1 border border-zinc-800 rounded-2xl bg-zinc-900 group focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all overflow-hidden">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-zinc-500" />
                                </div>
                                <input
                                    id="password" name="password" type="password" autoComplete="current-password" required
                                    className="block w-full pl-12 pr-4 py-4 bg-transparent border-0 text-white placeholder-zinc-600 focus:ring-0 sm:text-sm font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-sm text-center text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                                {errorMessage}
                            </motion.div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-zinc-950 bg-white hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 focus:ring-offset-zinc-950 disabled:opacity-50 transition-all"
                            >
                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <span className="flex items-center gap-2">Destravar Painel <ArrowRight size={16} /></span>
                                )}
                            </button>
                        </div>
                    </form>

                </div>
            </motion.div>
        </div>
    );
}
