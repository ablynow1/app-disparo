# ==========================================
# STAGE 1: Base de Ferramentas (pnpm e node)
# ==========================================
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ==========================================
# STAGE 2: Resolvedor de Dependências (Prune)
# ==========================================
FROM base AS builder
# Necessário para Prisma no Debian
RUN apt-get update && apt-get install -y openssl

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
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# Copia root lockfile e workspaces
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install

# Copia o código fonte do app web extraído do monorepo
COPY --from=builder /app/out/full/ .

# Gera o Prisma Client
RUN pnpm --filter @app-disparo/database run db:generate

# Compila o Next.js com limite de memória explícito (evita OOM em t3.micro/t2.micro)
ENV NODE_OPTIONS="--max-old-space-size=512"
RUN pnpm turbo run build --filter=web...


# ==========================================
# STAGE 4: Imagem de Produção Final (Apenas O Necessário + Dependências Pnpm Linkadas)
# ==========================================
FROM base AS runner
WORKDIR /app

# VITAL: Prisma precisa de SSL nativo para a Query Engine rodar
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Variaveis de ambiente para Produção Node do Next.js
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Redireciona cache do corepack para /tmp (gravavel por usuarios de sistema)
ENV COREPACK_HOME=/tmp/corepack

# O Next.js aconselha rodar usando um usuário não-root por segurança
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copia toda a aplicação já instalada e compilada pelo estagio installer
COPY --from=installer --chown=nextjs:nodejs /app .

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Garante que o schema PostgreSQL exista antes de iniciar (idempotente)
CMD ["sh", "-c", "pnpm --filter @app-disparo/database run db:push --accept-data-loss 2>/dev/null || true && pnpm --filter web start"]

