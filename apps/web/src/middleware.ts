import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
    // Configured matcher to run on all routes except static assets, images, and API webhook routes
    matcher: ['/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)'],
};
