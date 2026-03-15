import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login', // Redirecionador customizado para caso não haja sessão
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isDashboard = nextUrl.pathname.startsWith('/dashboard');

            if (isDashboard) {
                if (isLoggedIn) return true;
                return false; // Redireciona pro Sign-In
            } else if (isLoggedIn && nextUrl.pathname === '/login') {
                // Se estiver logado e tentar acessar o /login, manda pro dashboard
                return Response.redirect(new URL('/dashboard', nextUrl));
            }

            return true; // Rotas abertas (API, Webhooks) passam limpas
        },
    },
    providers: [], // Provedores são injetados no auth.ts que não roda no Edge
} satisfies NextAuthConfig;
