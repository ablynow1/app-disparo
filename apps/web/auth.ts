import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@app-disparo/database';
import bcrypt from 'bcryptjs';

export const { auth, signIn, signOut, handlers: { GET, POST } } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;

                    const user = await prisma.user.findUnique({ where: { email } });
                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        // Retornamos os dados limpos sem senha
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role
                        };
                    }
                }

                console.log('[Auth] Combinação de Email/Senha Inválida');
                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            // Quando o login ocorre, a V5 passa o `user` do retorno do provider.
            // Colocamos o ID e a Role dele no Token Encriptado que viaja via Cookie.
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            // A Sessão de servidor puxa o JWT Encriptado e recarrega na RAM p/ Server Components usar
            if (token?.id) {
                session.user.id = token.id as string;
                (session.user as any).role = token.role as string;
            }
            return session;
        }
    },
    session: {
        strategy: 'jwt' // NextAuth manda nos cookies JWT sem usar banco
    }
});
