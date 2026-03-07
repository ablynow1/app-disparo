# 🚀 C-Level DevOps: Guia de Decolagem AWS EC2 + MongoDB Atlas (Deploy App Disparo)

Siga este procedimento ao iniciar a arquitetura Premium do App Disparo. Esta documentação foi polida para extrair a melhor relação Custo/Performance na nuvem da Amazon (AWS).

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

### Passo 4: Conexão Ouro (MongoDB Atlas) 
No painel do [MongoDB Atlas](https://www.mongodb.com/cloud/atlas):
1. **Database Access**: Crie um Usuário com senha complexa.
2. **Network Access**: **Crucial!** Adicione o endereço IP público da sua AWS EC2 ali, senão ocorrem timeouts eternos!
3. **Connect**: Copie sua *Connection String* do MongoDB Driver. Ex: `mongodb+srv://admin:senha-atlas@cluster0.abc.mongodb.net/evolution_db?retryWrites=true&w=majority`

### Passo 5: O Arquivo Secreto `.env.prod`
```bash
nano .env.prod
```

Cole isso no terminal nano e troque as chaves pelas suas:
```bash
DOMAIN_NAME=app.seudominio.com.br
DATABASE_URL=mongodb+srv://admin:senha-atlas@cluster0.abc.mongodb.net/evolution_db?retryWrites=true&w=majority
REDIS_PASS=CrieUmaSenhaForteExemplo998
EVO_KEY=CrieSuaSenhaDaApiDoWhatsappExemploMasterKey
GEMINI_API_KEY=AIzaSuaChaveDoGoogleGemini
```
Aperte `CTRL+O`, depois `ENTER` e `CTRL+X` para salvar e fechar.

### Onde eu pego esses 5 dados do `.env.prod`?
1. **DOMAIN_NAME**: O Domínio do seu site (Ex: `painel.minhaempresa.com.br`). Você decide esse nome.
2. **DATABASE_URL**: No final do **Passo 4** lá no MongoDB Atlas, quando você clica em Connect > Drivers. Copie o link inteiro lá.
3. **REDIS_PASS**: Você inventa isso agora! É uma senha aleatória (ex: *LoboMau8899!*) pra proteger o Cache do BullMQ de invasores.
4. **EVO_KEY**: Você também inventa agora! Será a Senha Principal *Master Key* que você vai usar ao se logar dentro da Evolution API para cadastrar os WhatsApps.
5. **GEMINI_API_KEY**: Vá ao site **Google AI Studio** (aistudio.google.com), logue com sua conta Gmail e clique em "Get API Key" -> "Create API Key". Copie a string longa e cole aqui.

### Passo 6: Decolagem Master! 🛫
Diga para o Orquestrador ler os Dockerfiles multi-stage, subir o Traefik SSL, Redis, Evolution e a nossa Aplicação Node Next/Fastify.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```
*Vá tomar um café, a primeira vez demora uns minutos compilando a imagem Multi-Stage do Next e os Builds do Prisma MongoDB.* ☕

### Passo 7: Push Final pro Banco (Prisma Mongo)
O Prisma e o MongoDB já estarão orquestrados, e tabelas não precisam de Migration rígida no Mongo, mas empurramos o schema (Puxando a URL de dentro do env de Produção) para ele indexar `_id`:

```bash
docker exec -it supersaas_api pnpm --filter @app-disparo/database run push
```

**E pronto!** Acesse `https://app.seudominio.com.br` e seu SaaS estará servido através de Edge Routing seguro com Let's Encrypt dinâmico, totalmente escalável no ecossistema AWS com MongoDB Atlas e Redis.
