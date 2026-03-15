'use server';

import { signIn } from '../../../../auth';
import { AuthError } from 'next-auth';

export async function authenticate(prevState: string | undefined, formData: FormData) {
    try {
        await signIn('credentials', Object.fromEntries(formData));
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Credenciais inválidas. Verifique seu e-mail e senha.';
                default:
                    return 'Algo deu errado durante a autenticação.';
            }
        }
        // O Next.js sempre lança um erro interno NEXT_REDIRECT em caso de sucesso
        // para trocar a URL pro dashboard. Nós devemos repassar (throw) pra ele não capturar no block
        throw error;
    }
}
