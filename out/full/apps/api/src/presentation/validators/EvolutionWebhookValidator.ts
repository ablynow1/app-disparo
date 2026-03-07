import { z } from 'zod';

// Zod Schema to validate Evolution API's messages.upsert payload
export const EvolutionMessageSchema = z.object({
  event: z.literal('messages.upsert'),
  instance: z.string().optional(),
  data: z.object({
    key: z.object({
      remoteJid: z.string(), // O número de telefone
      fromMe: z.boolean().optional(),
      id: z.string().optional(),
    }),
    pushName: z.string().optional(),
    message: z.object({
      // Mensagem de texto simples
      conversation: z.string().optional(),
      // Caso seja mensagen estendida, com menções, etc
      extendedTextMessage: z.object({
        text: z.string(),
      }).optional(),
    }).passthrough(),
    messageType: z.string().optional(),
  }).strict(),
}).strict();

// Extract type automatically from Zod schema
export type EvolutionMessagePayload = z.infer<typeof EvolutionMessageSchema>;
