# WhatsApp API Module

Um módulo completo para integração com WhatsApp baseado no Baileys, com suporte multitenant, armazenamento em banco de dados MySQL e todas as funcionalidades necessárias para uma API robusta.

## 🚀 Características

- **Multitenant**: Suporte a múltiplos clientes/tenants isolados
- **Armazenamento em DB**: Todas as informações armazenadas em MySQL com TypeORM
- **Conexão via QR ou Código**: Suporte a ambos os métodos de autenticação
- **Perfil Completo**: Informações completas do tenant e contatos
- **Todos os Tipos de Mensagem**: Texto, imagem, vídeo, áudio, documento, sticker, localização, contato
- **Webhooks**: Notificações em tempo real via webhooks
- **Upload de Mídia**: Sistema completo de upload e gerenciamento de arquivos
- **Filtros Avançados**: Busca e filtros para mensagens e contatos
- **Estatísticas**: Relatórios e estatísticas de uso

## 📋 Pré-requisitos

- Node.js 18+
- MySQL 8.0+
- TypeScript

## 🛠️ Instalação

1. Clone o repositório:

```bash
git clone <repository-url>
cd whatsapp-api-module
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

4. Configure o banco de dados no arquivo `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=whatsapp_api
```

5. Execute as migrações do banco:

```bash
npm run build
npm start
```

## 📁 Estrutura de Arquivos

```
src/
├── config/
│   └── database.ts          # Configuração do TypeORM
├── entities/
│   ├── Tenant.ts            # Entidade Tenant
│   ├── Session.ts           # Entidade Session
│   ├── Contact.ts           # Entidade Contact
│   ├── Message.ts           # Entidade Message
│   └── Media.ts             # Entidade Media
├── services/
│   ├── WhatsAppService.ts   # Serviço principal do WhatsApp
│   ├── ConfigService.ts     # Gerenciamento de configurações
│   ├── ContactService.ts    # Gerenciamento de contatos
│   ├── MessageService.ts    # Gerenciamento de mensagens
│   ├── MediaService.ts      # Gerenciamento de mídia
│   ├── WebhookService.ts    # Gerenciamento de webhooks
│   └── AuthService.ts       # Autenticação e sessões
├── modules/
│   └── WhatsAppModule.ts    # Módulo principal (interface)
├── middleware/
│   ├── auth.ts              # Middleware de autenticação
│   └── upload.ts            # Middleware de upload
├── routes/
│   └── api.ts               # Rotas da API
├── types/
│   └── interfaces.ts        # Interfaces TypeScript
├── app.ts                   # Aplicação Express
└── index.ts                 # Ponto de entrada
```

## 🔧 Uso do Módulo

### Exemplo Básico

```typescript
import { WhatsAppModule, initializeDatabase } from "./src";

async function main() {
  // Inicializar banco de dados
  await initializeDatabase();

  // Criar instância do módulo
  const whatsapp = new WhatsAppModule();

  // Criar tenant
  const tenant = await whatsapp.createTenant({
    name: "Minha Empresa",
    receiveGroupMessages: true,
    autoReconnect: true,
    webhookUrl: "https://meuapp.com/webhook",
  });

  // Criar conexão
  const connection = await whatsapp.createConnection({
    tenantId: tenant.id,
    usePairingCode: false, // true para usar código de pareamento
  });

  // Enviar mensagem de texto
  await whatsapp.sendMessage(tenant.id, connection.sessionId, {
    to: "5511999999999@s.whatsapp.net",
    type: "text",
    content: "Olá do WhatsApp API!",
  });
}
```

### Gerenciamento de Tenants

```typescript
// Criar tenant
const tenant = await whatsapp.createTenant({
  name: "Empresa XYZ",
  receiveGroupMessages: true,
  autoReconnect: true,
  webhookUrl: "https://webhook.exemplo.com",
});

// Obter tenant
const tenant = await whatsapp.getTenant(tenantId);

// Atualizar tenant
await whatsapp.updateTenant(tenantId, {
  receiveGroupMessages: false,
});

// Validar API Key
const tenant = await whatsapp.validateApiKey(apiKey);
```

### Conexões WhatsApp

```typescript
// Conexão via QR Code
const connection = await whatsapp.createConnection({
  tenantId: "tenant-id",
  usePairingCode: false,
});

// Conexão via Código de Pareamento
const connection = await whatsapp.createConnection({
  tenantId: "tenant-id",
  usePairingCode: true,
  phoneNumber: "5511999999999",
});

// Verificar status da conexão
const status = await whatsapp.getConnectionStatus(sessionId);

// Desconectar
await whatsapp.disconnectSession(sessionId);
```

### Envio de Mensagens

```typescript
// Mensagem de texto
await whatsapp.sendMessage(tenantId, sessionId, {
  to: "5511999999999@s.whatsapp.net",
  type: "text",
  content: "Olá!",
});

// Mensagem com imagem
await whatsapp.sendMessage(tenantId, sessionId, {
  to: "5511999999999@s.whatsapp.net",
  type: "image",
  media: {
    data: buffer, // ou caminho do arquivo
    mimetype: "image/jpeg",
    caption: "Confira esta imagem!",
  },
});

// Mensagem de localização
await whatsapp.sendMessage(tenantId, sessionId, {
  to: "5511999999999@s.whatsapp.net",
  type: "location",
  location: {
    latitude: -23.5505,
    longitude: -46.6333,
    name: "São Paulo",
    address: "São Paulo, SP, Brasil",
  },
});

// Envio em massa
const results = await whatsapp.sendBulkMessages(tenantId, sessionId, [
  {
    to: "5511999999999@s.whatsapp.net",
    message: { type: "text", content: "Mensagem 1" },
  },
  {
    to: "5511888888888@s.whatsapp.net",
    message: { type: "text", content: "Mensagem 2" },
  },
]);
```

### Gerenciamento de Mensagens

```typescript
// Buscar mensagens
const messages = await whatsapp.getMessages({
  tenantId: "tenant-id",
  type: "text",
  direction: "inbound",
  limit: 50,
});

// Mensagens não lidas
const unread = await whatsapp.getUnreadMessages(tenantId);

// Marcar como lida
await whatsapp.markAsRead(messageId);

// Pesquisar mensagens
const results = await whatsapp.searchMessages(tenantId, "olá", 10);

// Estatísticas
const stats = await whatsapp.getMessageStats(tenantId);
```

### Gerenciamento de Contatos

```typescript
// Listar contatos
const contacts = await whatsapp.getContacts({
  tenantId: "tenant-id",
  isGroup: false,
  limit: 100,
});

// Contatos de grupos
const groups = await whatsapp.getGroupContacts(tenantId);

// Pesquisar contatos
const results = await whatsapp.searchContacts(tenantId, "joão");

// Bloquear/desbloquear
await whatsapp.blockContact(tenantId, whatsappId);
await whatsapp.unblockContact(tenantId, whatsappId);
```

## 🌐 API REST

### Autenticação

Todas as rotas protegidas requerem API Key no header:

```
X-API-Key: sua-api-key-aqui
```

ou

```
Authorization: Bearer sua-api-key-aqui
```

### Endpoints Principais

#### Tenants

- `POST /api/tenants` - Criar tenant
- `GET /api/tenants` - Listar tenants
- `GET /api/tenants/:id` - Obter tenant
- `PUT /api/tenants/:id` - Atualizar tenant
- `DELETE /api/tenants/:id` - Deletar tenant

#### Conexões

- `POST /api/connect` - Criar conexão
- `GET /api/connection/:sessionId/status` - Status da conexão
- `DELETE /api/connection/:sessionId` - Desconectar
- `GET /api/connections` - Listar conexões

#### Mensagens

- `POST /api/messages/send` - Enviar mensagem
- `POST /api/messages/send-bulk` - Envio em massa
- `GET /api/messages` - Listar mensagens
- `GET /api/messages/:messageId` - Obter mensagem
- `PUT /api/messages/:messageId/status` - Atualizar status
- `GET /api/messages/unread` - Mensagens não lidas
- `GET /api/messages/search` - Pesquisar mensagens

#### Contatos

- `GET /api/contacts` - Listar contatos
- `GET /api/contacts/:contactId` - Obter contato
- `PUT /api/contacts/:contactId` - Atualizar contato
- `POST /api/contacts/:whatsappId/block` - Bloquear contato
- `GET /api/contacts/search` - Pesquisar contatos

#### Mídia

- `POST /api/media/upload` - Upload de arquivo
- `GET /api/media/:filename` - Baixar arquivo
- `DELETE /api/media/:filename` - Deletar arquivo

## 📞 Webhooks

Configure uma URL de webhook para receber notificações em tempo real:

### Eventos Suportados

- `connection` - Status da conexão
- `qr_code` - QR Code gerado
- `pairing_code` - Código de pareamento
- `message` - Nova mensagem recebida
- `message_status` - Status da mensagem atualizado
- `contact` - Contato atualizado
- `presence` - Presença do contato

### Exemplo de Payload

```json
{
  "tenantId": "tenant-uuid",
  "sessionId": "session-uuid",
  "event": "message",
  "data": {
    "id": "message-id",
    "from": "5511999999999@s.whatsapp.net",
    "message": { ... },
    "timestamp": 1234567890
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 🔒 Segurança

- API Keys únicas por tenant
- Validação de tipos de arquivo para upload
- Sanitização de dados de entrada
- Controle de acesso por tenant
- Logs de auditoria

## 📊 Monitoramento

- Health check endpoint: `GET /health`
- Estatísticas de mensagens por tenant
- Logs estruturados
- Métricas de performance

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para dúvidas e suporte:

- Abra uma issue no GitHub
- Consulte a documentação
- Verifique os exemplos na pasta `example/`

## 🔄 Changelog

### v1.0.0

- Versão inicial
- Suporte multitenant
- Todas as funcionalidades básicas implementadas
- API REST completa
- Sistema de webhooks
- Upload de mídia
- Documentação completa
