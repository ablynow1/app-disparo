import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
    // Ignora arquivos estáticos e pastas internas pra não travar no middleware Edge
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
