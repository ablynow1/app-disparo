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
# libc6-compat e openssl exigido pelo motor Prisma do PostgreSQL
RUN apt-get update && apt-get install -y openssl

WORKDIR /app
RUN pnpm install -g turbo
COPY . .
# Encontra todas as dependências exclusivas do app "api" no monorepo
RUN turbo prune api --docker

# ==========================================
# STAGE 3: Instalador e Compilador API
# ==========================================
FROM base AS installer
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Instala todas dependências
RUN pnpm install

COPY --from=builder /app/out/full/ .

# Essencial: Gerar o Prisma Engine para rodar consultas no banco postgres
RUN pnpm --filter @app-disparo/database run db:generate

# Injeta a base de configurações explícita do Typescript que é procurada pela API
COPY tsconfig.base.json ./tsconfig.base.json

# Compila apenas a API para javascript puro na pasta dist/
RUN pnpm turbo run build --filter=api...

# ==========================================
# STAGE 4: Imagem de Produção Final da API / Worker
# ==========================================
FROM base AS runner
WORKDIR /app

# Adicionamos openssl para garantir o motor C++ do Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Redireciona cache do corepack para /tmp (gravavel por usuarios de sistema)
ENV COREPACK_HOME=/tmp/corepack

# Proteção de Execução Nível OS
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs apiuser

# Puxa o instalador e código final (aqui a api usa dist/ e não standalone)
COPY --from=installer --chown=apiuser:nodejs /app . 

USER apiuser

EXPOSE 3333
ENV PORT=3333

# Entramos na pasta da API e mandamos ligar no ambiente de Produção
CMD ["pnpm", "--filter", "api", "run", "start"]
