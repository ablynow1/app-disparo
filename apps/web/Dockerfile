# ==========================================
# STAGE 1: Base de Ferramentas (pnpm e node)
# ==========================================
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ==========================================
# STAGE 2: Resolvedor de Dependências (Prune)
# ==========================================
FROM base AS builder
# Necessário para Prisma
RUN apk update && apk add --no-cache libc6-compat openssl

WORKDIR /app
# Instala turborepo globalmente para fazer o prune do monorepo
RUN pnpm install -g turbo
COPY . .
# Encontra todas as dependências do app "web" e isola numa pasta out/
RUN turbo prune web --docker

# ==========================================
# STAGE 3: Instalador (Node_modules p/ Build)
# ==========================================
FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copia root lockfile e workspaces
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

# Copia o código fonte do app web extraído do monorepo
COPY --from=builder /app/out/full/ .

# Gera o Prisma Client
RUN pnpm --filter @app-disparo/database run db:generate

# Compila o Next.js (Irá gerar a pasta .next/standalone automaticamente)
RUN pnpm turbo run build --filter=web...

# ==========================================
# STAGE 4: Imagem de Produção Final (Apenas O Necessário)
# ==========================================
FROM base AS runner
WORKDIR /app

# Variaveis de ambiente para Produção Node do Next.js
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# O Next.js aconselha rodar usando um usuário não-root por segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia utilitários do Next public/ e package.json
COPY --from=installer /app/apps/web/public ./apps/web/public
COPY --from=installer /app/apps/web/package.json ./apps/web/package.json

# Essa pasta foi gerada pelo 'output: standalone' no next.config.ts 
# Tem exatamente OS MEGAS NECESSÁRIOS. E já inclui a engine do node
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
