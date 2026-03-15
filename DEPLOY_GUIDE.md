# 🚀 C-Level DevOps: Guia de Decolagem AWS EC2 (Deploy App Disparo)

Siga este procedimento ao iniciar a arquitetura Premium do App Disparo. Esta documentação foi polida para extrair a melhor relação Custo/Performance na nuvem da Amazon (AWS), usando Infraestrutura 100% Dockerizada (PostgreSQL, Redis, Traefik, Fastify, Next.js).

---

### Passo 1: Provisionamento AWS EC2 (t3a.micro/small)
1. Vá ao Console AWS > **EC2** > **Launch Instances**.
2. **OS Image**: Ubuntu 22.04 LTS ou Ubuntu 24.04 LTS (64-bit x86).
3. **Instance Type**: t3a.micro (Econômica com chip AMD) ou t3a.small (100% de folga).
4. **Key Pair**: Crie um `.pem` para acesso seguro SSH.
5. **Network Settings**: Em Security Groups, crie regras (Inbound Rules) liberando:
   - Porta `22` (SSH) do seu IP.
   - Porta `80` (HTTP) de *Anywhere* (0.0.0.0/0)
   - Porta `443` (HTTPS) de *Anywhere* (0.0.0.0/0)
6. **Storage**: Suba de 8GB para 20GB ou 30GB gp3 (SSD).

Acesse sua máquina como Administrador (Root):
```bash
ssh -i "suachave.pem" ubuntu@<IP-DA-EC2>
```

### Passo 2: Aterrisagem de Instalações e Docker
Execute tudo de uma vez para atualizar o Kernel, baixar o Git e o Docker Engine com o plugin do Compose V2.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install git curl wget -y

# Instalar Docker Oficial
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
```
Deslogue da máquina (digite `exit`) e volte pelo `ssh` para não precisar mais digitar `sudo` pra comandar o Docker. Em seguida:
```bash
sudo apt-get install docker-compose-plugin
```

### Passo 3: Baixe seu Tesouro (O Código)
Faça a injeção do seu Monorepo (Crie um Token no Github para Clonagem Privada).

```bash
git clone https://github.com/SeuUsuario/app-disparo.git
cd app-disparo
```

### Passo 4: Apontamento de Domínio (DNS)
No painel do seu registrador (HostGator, Registro.br, Cloudflare):
1. Crie um registro tipo **A** apontando o nome raiz (ex: `@`) para o **IP Público da sua EC2**.
2. Crie um registro tipo **A** apontando o subdomínio `api` (ex: `api`) para o **IP Público da sua EC2**.

*Exemplo:*
- `meusistema.com.br` -> `3.155.xx.xx` (Isso abrirá o Painel Next.js)
- `api.meusistema.com.br` -> `3.155.xx.xx` (Isso será a URL do Backend Fastify e Evolution)

### Passo 5: O Arquivo Secreto `.env.prod`
```bash
nano .env.prod
```

Cole isso no terminal nano e preencha com seus dados reais:
```bash
DOMAIN_NAME=meusistema.com.br
REDIS_PASS=SuaSenhaForteBancoDeDados123!
EVO_KEY=ExemploMasterKeyDoEvolution
GEMINI_API_KEY=AIzaSuaChaveDoGoogleGemini
```
Aperte `CTRL+O`, depois `ENTER` e `CTRL+X` para salvar e fechar.

### Onde eu pego os dados do `.env.prod`?
1. **DOMAIN_NAME**: O Domínio raiz do seu site (Ex: `minhaempresa.com.br`). O Traefik usará isso para gerar os certificados SSL automáticos (HTTPS) tanto pro painel quanto para o `api.minhaempresa.com.br`.
2. **REDIS_PASS**: Você inventa isso agora! É uma senha forte (ex: *LoboMau8899!*) pra proteger o Postgres e o Redis de invasores. O sistema vai usar essa senha internamente.
3. **EVO_KEY**: Você também inventa agora! Será a Senha Principal *Master Key* que você vai usar ao se logar dentro da Evolution API para parear os WhatsApps.
4. **GEMINI_API_KEY**: Vá ao site **Google AI Studio** (aistudio.google.com), logue com sua conta Gmail e crie a API Key.

### Passo 6: Decolagem Master! 🛫
Diga para o Orquestrador ler os Dockerfiles multi-stage, subir o Traefik SSL, Redis, Evolution e a nossa Aplicação Node Next/Fastify.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```
*Vá tomar um café, a primeira vez demora uns minutos compilando a imagem do Next e o Backend Node.* ☕

### Passo 7: Push Final pro Banco (Prisma Postgres)
O banco de dados subirá do zero na primeira vez. Precisamos avisar o Node.js para criar as tabelas dentro do Postgres (`db:push`):

```bash
docker exec -it supersaas_api pnpm --filter @app-disparo/database run db:push --accept-data-loss
```

**E pronto!** Acesse `https://meusistema.com.br` e seu SaaS estará servido através de Edge Routing seguro com Traefik e Let's Encrypt dinâmico, rodando 100% no ecossistema isolado da sua AWS EC2. No painel, o Evolution e os Webhooks responderão por `https://api.meusistema.com.br`.
