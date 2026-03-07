import { PrismaClient } from '@prisma/client'
export * from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Em desenvolvimento, o Next.js (e Fastify sob watch) pode limpar o cache de importações
// e recriar o PrismaClient, estourando limite de conexões. Isso previne com globalThis.
export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
