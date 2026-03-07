'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido.'),
  password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg('');
    
    // Simulate API Auth Request
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    if (data.email !== 'admin@evolution.com' || data.password !== '123456') {
      setErrorMsg('Credenciais inválidas. Tente admin@evolution.com / 123456');
      setIsLoading(false);
      return;
    }

    // Success transition redirect simulation
    window.location.href = '/dashboard'; 
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-zinc-950/40 relative overflow-hidden">
      {/* Background Ambience Animations (Apple HIG Vibrancy mimic) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 blur-[100px] pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
          transition={{ duration: 10, repeat: Infinity }} 
          className="absolute -top-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full bg-emerald-500/20"
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }} 
          transition={{ duration: 15, repeat: Infinity }} 
          className="absolute -bottom-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-blue-600/20"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md mx-auto"
      >
        {/* Glassmorphism Card */}
        <div className="backdrop-blur-xl bg-zinc-900/50 border border-zinc-800/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-zinc-500 to-transparent opacity-50" />
          
          <div className="mb-8 text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-zinc-800/80 rounded-2xl border border-zinc-700/50 flex items-center justify-center mb-6 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-zinc-100" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Acesso Restrito
            </h1>
            <p className="text-sm text-zinc-400">
              Gerencie suas campanhas e fluxos.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300 ml-1">E-mail</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500" />
                </div>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="Seu e-mail corporativo"
                  className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 pl-10 h-11 rounded-xl transition-all focus:ring-1 focus:ring-zinc-600 focus:border-zinc-500"
                  {...register('email')}
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-xs text-red-400/90 ml-1 mt-1 font-medium">
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-zinc-300">Senha</Label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="••••••••"
                  className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 pl-10 h-11 rounded-xl transition-all focus:ring-1 focus:ring-zinc-600 focus:border-zinc-500"
                  {...register('password')}
                />
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-xs text-red-400/90 ml-1 mt-1 font-medium">
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl flex items-center justify-center text-center">
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-white font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              disabled={isLoading || !isValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          
        </div>
      </motion.div>
    </main>
  );
}
