'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Home, 
  Smartphone, 
  Zap, 
  Webhook, 
  BrainCircuit, 
  LogOut,
  Bell
} from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Visão Geral', href: '/dashboard', icon: Home, section: 'Principal' },
    { name: 'Aparelhos', href: '/dashboard/instances', icon: Smartphone, section: 'Principal' },
    { name: 'Regras', href: '/dashboard/rules', icon: Zap, section: 'Motor de Vendas' },
    { name: 'Integrações', href: '/dashboard/integrations', icon: Webhook, section: 'Motor de Vendas' },
    { name: 'Agentes IA', href: '/dashboard/ai-agents', icon: BrainCircuit, section: 'Inteligência RAG' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 flex overflow-hidden selection:bg-indigo-500/30">
      
      {/* 
        ---------------------------------------------------------
        DESKTOP SIDEBAR (GLASSMORPHISM PREMIUM APPLE HIG)
        ---------------------------------------------------------
      */}
      <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-zinc-950/50 backdrop-blur-2xl relative z-40">
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <div className="font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20">
              E
            </div>
            <span className="text-lg">Evolution App</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-6 overflow-y-auto custom-scrollbar">
          {['Principal', 'Motor de Vendas', 'Inteligência RAG'].map((section) => (
            <div key={section} className="space-y-1">
              <div className="px-4 mb-3 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                {section}
              </div>
              {navItems.filter(i => i.section === section).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 relative group ${
                      isActive 
                        ? 'text-white bg-white/10 shadow-sm ring-1 ring-white/5' 
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                       <motion.div 
                         layoutId="active-nav-indicator"
                         className="absolute inset-0 bg-white/5 rounded-2xl pointer-events-none"
                         transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                       />
                    )}
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'group-hover:text-zinc-300'}`} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        
        <div className="p-6 border-t border-white/5 mt-auto bg-zinc-950/20">
           <Link href="/login" className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-2xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors group">
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Sair da Conta
          </Link>
        </div>
      </aside>

      {/* 
        ---------------------------------------------------------
        MAIN CONTENT AREA (WRAPPER ANIMADO)
        ---------------------------------------------------------
      */}
      <main className="flex-1 flex flex-col relative w-full h-[100dvh]">
        {/* Fundo gradiente sutil para criar profundidade HIG */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

        {/* Header Superior Top Bar */}
        <header className="h-20 border-b border-white/5 bg-zinc-950/40 backdrop-blur-xl flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 w-full">
           <div className="md:hidden font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-lg">E</div>
              Evolution 
           </div>
           
           <div className="flex-1" />
           
           <div className="flex items-center gap-5">
             <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
               <Bell className="w-4 h-4" />
             </button>
             <div className="h-8 w-px bg-white/10 hidden sm:block" />
             <div className="flex items-center gap-3">
               <div className="text-sm font-medium text-zinc-300 hidden sm:block">Admin.</div>
               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-sm text-zinc-300 font-bold shadow-inner">
                 V
               </div>
             </div>
           </div>
        </header>

        {/* Scrollable Page Content envelopado no PageTransition (Framer Motion) */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8 relative z-10 custom-scrollbar">
           <div className="p-6 lg:p-10 max-w-7xl mx-auto">
             <PageTransition>
               {children}
             </PageTransition>
           </div>
        </div>
      </main>

      {/* 
        ---------------------------------------------------------
        MOBILE BOTTOM NAVIGATION BAR (NATIVE APP STYLE)
        ---------------------------------------------------------
      */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[84px] pb-safe border-t border-white/10 bg-zinc-950/80 backdrop-blur-3xl z-50 px-2 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
        <ul className="flex items-center justify-around h-16 mt-1">
           {navItems.filter(i => ['Visão Geral', 'Aparelhos', 'Regras', 'Agentes IA'].includes(i.name)).map((item) => {
             const isActive = pathname === item.href;
             return (
               <li key={item.href} className="flex-1 h-full">
                 <Link href={item.href} className="w-full h-full flex flex-col items-center justify-center gap-1.5 relative">
                   {isActive && (
                     <motion.div 
                       layoutId="mobile-active-indicator"
                       className="absolute -top-1 w-10 h-1 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                     />
                   )}
                   <item.icon className={`w-6 h-6 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} strokeWidth={isActive ? 2.5 : 2} />
                   <span className={`text-[10px] font-medium ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                     {item.name.replace('Visão Geral', 'Início').replace('Agentes IA', 'I.A.')}
                   </span>
                 </Link>
               </li>
             );
           })}
        </ul>
      </nav>

    </div>
  );
}
