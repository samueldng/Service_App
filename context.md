# 📋 MaintQR SaaS — Documento de Contexto do Sistema

> **Última atualização:** 2026-03-22
> **Objetivo:** Gestão de contexto para manter consistência de código, evitar duplicação e preservar padrões de arquitetura em todas as sessões de desenvolvimento.

---

## 1. Visão Geral do Projeto

**Nome:** MaintQR SaaS
**Descrição:** Plataforma SaaS multi-tenant para gestão de manutenção de equipamentos (foco em ar-condicionado/HVAC) com rastreamento via QR Code. Permite que empresas prestadoras de serviço gerenciem clientes, setores, equipamentos e ordens de serviço, além de oferecer um portal público de rastreamento de manutenções para o cliente final.

**Deploy Frontend:** Vercel (SPA com rewrite para `index.html`)
**Deploy Backend:** VPS com PM2 (ecosystem.config.cjs)
**Repositório:** `pixel-alchemy-23` (GitHub — branch `main`)

---

## 2. Stack Tecnológica

| Camada        | Tecnologia                          | Versão     |
|---------------|-------------------------------------|------------|
| Framework     | React                               | ^19.2.0    |
| Linguagem     | TypeScript                          | ~5.9.3     |
| Build Tool    | Vite                                | ^7.3.1     |
| Backend/BaaS  | Express.js + PostgreSQL (node-postgres) | ^4.18.2    |
| JWT Auth      | jsonwebtoken + bcryptjs             | ^9.0.2     |
| Pagamentos    | Asaas API                           | v3         |
| Roteamento    | React Router DOM                    | ^7.13.1    |
| Animações     | Framer Motion                       | ^12.35.0   |
| Ícones        | Lucide React                        | ^0.577.0   |
| Gráficos      | Recharts                            | ^3.7.0     |
| Notificações  | React Hot Toast                     | ^2.6.0     |
| 3D/Visual     | Three.js + React Three Fiber + Drei | ^0.183.2   |
| QR Code       | qrcode.react                        | ^4.2.0     |
| Datas          | date-fns                            | ^4.1.0     |
| IDs Únicos    | uuid                                | ^13.0.0    |
| Animação GSAP | gsap                                | ^3.14.2    |
| CSS           | Vanilla CSS (arquivos `.css` por componente) | —   |
| Linting       | ESLint + typescript-eslint           | ^9.39.1    |
| Hosting       | Vercel                              | —          |

### ⚠️ REGRAS DE BIBLIOTECAS — NÃO INSTALAR DUPLICATAS

| Necessidade            | JÁ temos                  | NÃO instalar            |
|------------------------|---------------------------|-------------------------|
| Ícones                 | `lucide-react`            | react-icons, heroicons  |
| Animações              | `framer-motion` + `gsap`  | react-spring, AOS       |
| Notificações/Toast     | `react-hot-toast`         | react-toastify, notistack|
| Gráficos               | `recharts`                | chart.js, nivo          |
| Datas/Formatação       | `date-fns`                | moment, dayjs           |
| Geração de UUID        | `uuid`                    | nanoid, cuid            |
| QR Code                | `qrcode.react`            | react-qr-code           |
| HTTP/API               | `fetch` nativo (`apiFetch`)| axios, supabase-js      |
| CSS                    | Vanilla CSS               | Tailwind, Styled-comp.  |
| Roteamento             | `react-router-dom`        | wouter, tanstack-router |

---

## 3. Estrutura de Diretórios

```
Service_App/
├── .env                          # VITE_API_URL
├── index.html                    # Entry HTML
├── vite.config.ts                # Vite config (plugin react)
├── vercel.json                   # SPA rewrite "/(.*)" → "/index.html"
├── tsconfig.json                 # Referencia tsconfig.app.json + tsconfig.node.json
├── context.md                    # Este documento
└── src/
    ├── main.tsx                  # Ponto de entrada (StrictMode + App)
    ├── App.tsx                   # Roteamento principal (BrowserRouter)
    ├── index.css                 # CSS global + design tokens
    ├── lib/
    │   ├── supabase.ts           # Configuração legada (não mais usado para API)
    │   ├── masks.ts              # Máscaras: CPF, CNPJ, Telefone + validação
    │   └── locations.ts          # UF list + IBGE API para cidades (autocomplete)
    ├── types/
    │   └── index.ts              # Interfaces TypeScript centralizadas
    ├── services/
    │   └── api.ts                # Camada de serviço (CRUD via Express API com fetch)
    ├── layouts/
    │   ├── DashboardLayout.tsx   # Layout do painel (sidebar + auth guard)
    │   └── DashboardLayout.css
    ├── pages/
    │   ├── LandingPage.tsx       # Página inicial (marketing)
    │   ├── LoginPage.tsx + .css  # Login com JWT
    │   ├── RegisterPage.tsx      # Registro + criação de org + assinatura Asaas
    │   ├── PaymentBlockedPage.tsx # Bloqueio por inadimplência (payment_status != active)
    │   ├── PublicEquipmentPage.tsx + .css  # Portal público QR Code
    │   ├── ClientPortalPage.tsx  # Portal do cliente
    │   ├── TechnicianPortalPage.tsx # Login/portal do técnico (plano Professional+)
    │   └── dashboard/
    │       ├── DashboardHome.tsx  # Painel principal (KPIs + gráficos)
    │       ├── ClientsPage.tsx    # CRUD de clientes (listagem)
    │       ├── ClientDetailPage.tsx + .css # Detalhe do cliente + ordens + PDF
    │       ├── SectorsPage.tsx    # CRUD de setores
    │       ├── EquipmentPage.tsx  # CRUD de equipamentos + geração QR
    │       ├── ServiceOrdersPage.tsx # CRUD de ordens de serviço
    │       ├── TechniciansPage.tsx # CRUD de técnicos (plano Professional+)
    │       └── SettingsPage.tsx   # Configurações da org (dados, billing, banco)
    └── components/
        ├── PhotoCapture.tsx       # Captura de fotos (antes/depois) para OS
        ├── landing/              # Componentes da Landing Page
        │   ├── Navbar.tsx + .css
        │   ├── HeroSection.tsx + .css
        │   ├── FeaturesSection.tsx + .css
        │   ├── HowItWorks.tsx + .css
        │   ├── PricingSection.tsx + .css
        │   └── Footer.tsx + .css
        └── three/                # Componentes 3D (Three.js)
```

**Backend API (`/server`):**
```
server/
├── .env                          # DATABASE_URL + JWT_SECRET + ASAAS_API_KEY + ASAAS_WEBHOOK_TOKEN
├── ecosystem.config.cjs          # PM2 config para VPS
├── tsconfig.json                 # TypeScript backend config
├── migrate.js                    # Runner de migrações SQL
├── run_migration.ts              # Runner alternativo (TypeScript)
├── check_plan.js                 # Script utilitário para verificar plano
├── test_asaas_webhooks.js        # Script de teste de webhooks Asaas
├── src/
│   ├── index.ts                  # Entry point (Express server, porta 3333)
│   ├── config/db.ts              # PostgreSQL Pool (pg)
│   ├── middleware/auth.ts        # Validação de token JWT (orgId + userId)
│   └── routes/
│       ├── auth.ts               # Register/Login (JWT + bcrypt)
│       ├── organizations.ts      # GET/PUT dados da org
│       ├── clients.ts            # CRUD Clientes (filtrado por org_id)
│       ├── sectors.ts            # CRUD Setores
│       ├── equipments.ts         # CRUD Equipamentos + Rota Pública QR Code
│       ├── service-orders.ts     # CRUD Ordens de Serviço
│       ├── catalog.ts            # CRUD Catálogo de Peças/Serviços
│       ├── orders.ts             # CRUD Pedidos/Orçamentos + Order Items
│       ├── users.ts              # CRUD Usuários/Técnicos
│       ├── upload.ts             # Upload de fotos (multer)
│       └── asaas.ts              # Asaas: criação subscription + webhooks
└── migrations/
    ├── 001_add_auth_columns.sql  # Auth, UUID defaults, RLS off, Asaas fields, photos
    ├── 002_orders_catalog.sql    # Tabelas: catalog_items, orders, order_items
    └── 003_org_billing_fields.sql # Campos billing/banco na org + order_number
```

---

## 4. Padrões de Arquitetura e Código

### 4.1 Padrão de Componente

- **Componentes funcionais** com `export default function NomeComponente()`
- **Hooks:** `useState`, `useEffect`, `useNavigate`, `useLocation`, `useParams`
- **Sem Context API** ou gerenciamento de estado global — estado local por página
- **Cada página faz seus próprios fetches** no `useEffect` ao montar
- **CSS separado** por componente (não inline, não Tailwind)
- **Animação:** Usar `framer-motion` (`motion.div`, `AnimatePresence`) para transições de UI. `gsap` para animações mais complexas (landing page)

### 4.2 Camada de API (`src/services/api.ts`)

Esta é a **ÚNICA** camada de acesso ao backend Express. Usa `apiFetch()` (wrapper de `fetch` com JWT token automático). **Nunca** fazer chamadas HTTP diretamente em componentes.

**Módulos disponíveis:**
| Módulo              | Métodos disponíveis                                     |
|---------------------|--------------------------------------------------------|
| `authApi`           | `login`, `register`, `logout`, `getCurrentUser`       |
| `organizationsApi`  | `get`, `update`                                        |
| `clientsApi`        | `getAll`, `getById`, `create`, `update`, `delete`     |
| `sectorsApi`        | `getAll`, `create`, `update`, `delete`                |
| `equipmentsApi`     | `getAll`, `getByQrCode`, `getPublicTrackingData`, `create`, `update`, `delete` |
| `serviceOrdersApi`  | `getAll`, `getByEquipment`, `create`, `update`        |
| `catalogApi`        | `getAll`, `create`, `update`, `delete`                |
| `ordersApi`         | `getAll`, `getByClient`, `getById`, `create`, `update`, `delete` |

### 4.3 Mapeamento snake_case ↔ camelCase

O banco de dados usa **snake_case** (PostgreSQL). O TypeScript usa **camelCase**. A conversão ocorre **SOMENTE** na camada `api.ts` via funções mapper:

```
mapClientFromDb(d)       → DB → TypeScript
mapOrgFromDb(d)          → DB → TypeScript
mapOrgToDb(updates)      → TypeScript → DB
mapEquipmentFromDb(d)    → DB → TypeScript
mapServiceOrderFromDb(d) → DB → TypeScript
mapCatalogItemFromDb(d)  → DB → TypeScript
mapOrderFromDb(d)        → DB → TypeScript
mapOrderItemFromDb(d)    → DB → TypeScript
```

> **REGRA:** Nunca passar campos `snake_case` para componentes. Nunca passar campos `camelCase` para o backend. Toda conversão ocorre na `api.ts`.

### 4.4 Padrão de Tratamento de Erros

```typescript
try {
    const result = await api.method();
    toast.success('Mensagem de sucesso');
} catch (err: any) {
    toast.error(err.message || 'Mensagem de erro padrão');
}
```

- Usar `react-hot-toast` para feedback visual
- Erros são capturados no componente, não na api.ts
- A api.ts faz `throw error` para propagar

### 4.5 Padrão de Formulário

- Formulários são controlados via `useState` por campo ou com objeto de estado
- Validação é feita no handler antes de chamar a API
- Modais são usados para criar/editar entidades (não páginas separadas)
- Botões usam `disabled` durante loading

---

## 5. Sistema de Roteamento

```
/                           → LandingPage (pública, marketing)
/login                      → LoginPage (autenticação JWT)
/register                   → RegisterPage (registro + criação de org + assinatura Asaas)
/e/:qrCodeUid               → PublicEquipmentPage (portal público via QR Code)
/portal/:clientId           → ClientPortalPage (portal do cliente)
/tecnico                    → TechnicianPortalPage (login/portal do técnico)
/dashboard                  → DashboardLayout (protegida, requer auth)
  ├── /dashboard            → DashboardHome (KPIs, gráficos)
  ├── /dashboard/clients    → ClientsPage (listagem)
  ├── /dashboard/clients/:id → ClientDetailPage (detalhes + ordens + PDF)
  ├── /dashboard/sectors    → SectorsPage
  ├── /dashboard/equipment  → EquipmentPage
  ├── /dashboard/service-orders → ServiceOrdersPage
  ├── /dashboard/technicians → TechniciansPage (plano Professional+)
  └── /dashboard/settings   → SettingsPage
```

**Auth Guard:** O `DashboardLayout` verifica a sessão (`authApi.getCurrentUser()`) no `useEffect`. Se não autenticado, redireciona para `/login`. Se `paymentStatus !== 'active'` e trial expirado, redireciona para `PaymentBlockedPage`.

---

## 6. Banco de Dados (PostgreSQL — VPS próprio)

> **RLS desabilitado.** A autorização multi-tenant é feita via middleware `auth.ts` no backend (extrai `orgId` do JWT).

### 6.1 Schema de Tabelas

```
organizations (tenant)
├── id (UUID PK, gen_random_uuid())
├── name, document (CNPJ), email, phone
├── logo_url, brand_color
├── subscription_plan ('free' | 'starter' | 'pro' | 'professional' | 'enterprise')
├── payment_status ('active' | 'past_due' | 'canceled')
├── trial_ends_at (TIMESTAMPTZ)
├── max_equipments (INTEGER, default 30)
├── asaas_customer_id (TEXT)
├── asaas_subscription_id (TEXT)
├── address, city, state, cep, owner_name
├── pix_key, bank_name, bank_agency, bank_account, bank_account_type, bank_holder
├── order_counter (INTEGER, default 0)
└── created_at

users
├── id (UUID PK, gen_random_uuid())
├── org_id (FK → organizations.id)
├── name, email (UNIQUE), password_hash
├── role ('admin' | 'technician')
├── avatar_url
└── created_at

clients (clientes do tenant)
├── id (UUID PK)
├── org_id (FK → organizations.id)  ← MULTI-TENANCY
├── name, document, document_type ('CPF' | 'CNPJ')
├── email, phone, address
└── created_at

sectors (setores dentro de um cliente)
├── id (UUID PK)
├── client_id (FK → clients.id)
├── name, description
└── created_at

equipments (equipamentos)
├── id (UUID PK)
├── client_id (FK → clients.id)
├── sector_id (FK → sectors.id, nullable)
├── qr_code_uid (UUID UNIQUE, gen_random_uuid())
├── name, brand, model, serial_number, btus, details
├── install_date, status ('active' | 'inactive' | 'maintenance')
└── created_at

service_orders (ordens de serviço)
├── id (UUID PK)
├── equipment_id (FK → equipments.id)
├── technician_id (FK → users.id, nullable)
├── date, type ('preventiva' | 'corretiva' | 'instalacao')
├── status ('aberta' | 'em_progresso' | 'aguardando_aprovacao' | 'concluida')
├── description, warranty_until, notes
├── photos_before (JSONB), photos_after (JSONB)
├── next_maintenance_date
└── created_at

catalog_items (catálogo de peças/serviços por org)
├── id (UUID PK)
├── org_id (FK → organizations.id)
├── name, type ('peca' | 'servico')
├── default_price (NUMERIC 10,2)
└── created_at

orders (pedidos/orçamentos)
├── id (UUID PK)
├── org_id (FK → organizations.id)
├── client_id (FK → clients.id)
├── equipment_id (FK → equipments.id, nullable)
├── order_number (INTEGER, sequencial por org)
├── defect, observations
├── status ('pendente' | 'aprovado' | 'em_andamento' | 'concluido' | 'cancelado')
├── subtotal, discount, delivery_fee, total (NUMERIC 10,2)
├── payment_method, warranty
└── created_at

order_items (itens do pedido)
├── id (UUID PK)
├── order_id (FK → orders.id ON DELETE CASCADE)
├── catalog_item_id (FK → catalog_items.id, nullable)
├── name, type ('peca' | 'servico')
├── quantity (INTEGER), unit_price, total_price (NUMERIC 10,2)
└── created_at
```

### 6.2 Hierarquia de Dados

```
Organization (tenant)
  ├── Users (admin/técnico)
  ├── Catalog Items (peças/serviços)
  ├── Clients (clientes do tenant)
  │    ├── Sectors (setores do cliente)
  │    ├── Equipments (equipamentos do cliente)
  │    │    └── Service Orders (manutenções do equipamento)
  │    └── Orders (pedidos/orçamentos do cliente)
  │         └── Order Items (itens do pedido)
  └── Asaas (subscription externa)
```

### 6.3 Migrações SQL

O projeto usa migrações SQL manuais em `server/migrations/`. Não usa Prisma/Knex/etc.

| Arquivo                        | Conteúdo                                                   |
|--------------------------------|------------------------------------------------------------|
| `001_add_auth_columns.sql`     | Auth (email/password_hash), UUID defaults, RLS off, Asaas fields, photos columns |
| `002_orders_catalog.sql`       | Tabelas catalog_items, orders, order_items                 |
| `003_org_billing_fields.sql`   | Campos billing/banco na org + order_number em orders       |

> **Para rodar migrações:** `node migrate.js` ou criar novo arquivo `.sql` seguindo numeração sequencial.

---

## 7. Interfaces TypeScript (`src/types/index.ts`)

```typescript
Organization { id, name, document, email, phone, createdAt, logoUrl?, brandColor?,
               subscriptionPlan: 'free'|'starter'|'pro'|'professional'|'enterprise',
               paymentStatus: 'active'|'past_due'|'canceled',
               trialEndsAt?, maxEquipments?, asaasCustomerId?, asaasSubscriptionId?,
               address?, city?, state?, cep?, ownerName?,
               pixKey?, bankName?, bankAgency?, bankAccount?, bankAccountType?, bankHolder?,
               orderCounter? }
Client       { id, orgId, name, document, documentType, email, phone, address, createdAt }
Sector       { id, clientId, name, description?, createdAt }
Equipment    { id, sectorId, clientId, qrCodeUid, name, brand, model, serialNumber, btus?, details?, installDate, status, createdAt }
ServiceOrder { id, equipmentId, date, type, status: 'aberta'|'em_progresso'|'aguardando_aprovacao'|'concluida',
               description, technicianName, technicianId?, warrantyUntil?, notes?,
               photos?, photosBefore?, photosAfter?, nextMaintenanceDate?, createdAt }
User         { id, orgId, name, email, role: 'admin'|'technician', avatar? }
CatalogItem  { id, orgId, name, type: 'peca'|'servico', defaultPrice, createdAt }
Order        { id, orgId, clientId, equipmentId?, defect?, observations?,
               status: 'pendente'|'aprovado'|'em_andamento'|'concluido'|'cancelado',
               subtotal, discount, deliveryFee, total, paymentMethod?, warranty?,
               items?: OrderItem[], clientName?, equipmentName?, createdAt }
OrderItem    { id, orderId, catalogItemId?, name, type: 'peca'|'servico',
               quantity, unitPrice, totalPrice }
```

> **REGRA:** Todas as interfaces vivem em `src/types/index.ts`. Não criar tipos avulsos em componentes.

---

## 8. Regras de Negócio

### 8.1 Multi-tenancy
- Cada organização é um **tenant isolado**
- Todos os dados são filtrados pelo `org_id` do usuário logado
- Middleware `auth.ts` extrai `orgId` e `userId` do JWT e injeta em `req.user`
- RLS está **desabilitado** — a segurança é feita no backend via middleware
- Ao criar um registro (ex: novo cliente), o `org_id` é obtido do JWT do usuário autenticado

### 8.2 Registro de Usuário
1. Usuário se registra com email/senha/nome/empresa e plano desejado
2. Backend cria organização + usuário (admin) em transação
3. Cria cliente + assinatura no Asaas (com 7 dias de trial)
4. Retorna JWT para login automático

### 8.3 Papéis de Usuário
- **admin:** Acesso total ao dashboard, pode alterar configurações da organização
- **technician:** Acesso ao dashboard, pode gerenciar ordens de serviço

### 8.4 Equipamentos e QR Codes
- Cada equipamento recebe um `qr_code_uid` único (UUID) automaticamente ao ser criado
- O QR Code aponta para a rota `/e/:qrCodeUid`
- Esta rota é **pública** (não requer autenticação) e usa a RPC `get_public_equipment_data`
- O portal público exibe: dados do equipamento, cliente, setor e histórico de manutenções

### 8.5 Ordens de Serviço
- Tipos: `preventiva`, `corretiva`, `instalacao`
- Status: `aberta` → `em_progresso` → `concluida`
- Podem ter data de garantia e próxima manutenção programada
- Vinculadas a um equipamento específico

### 8.6 Planos de Assinatura (Asaas API)
- **Starter:** R$ 59/mês — até 30 equipamentos
- **Professional:** R$ 149/mês — até 150 equipamentos, permite "Múltiplos Técnicos", botão de enviar OS para Técnico direto pro WhatsApp.
- **Enterprise:** R$ 349/mês — ilimitado
- Status do Tenant: Atualizado dinamicamente pelo Webhook do Asaas (`PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`).
- Ao registrar, a assinatura é criada no Asaas com 7 dias de Trial e data de vencimento correspondente.
- **Webhook seguro:** Token de autenticação via header `asaas-access-token` validado contra `ASAAS_WEBHOOK_TOKEN`.

### 8.7 Envio para Técnico
- A partir do plano **Professional**, os administradores dispõem de um botão na OS interagindo com a API nativa do WhatsApp direcionada ao número do técnico. Envia todas as informações formatadas via texto e link seguro para login (puxando o `window.location.origin` dinâmico).

### 8.8 Pedidos/Orçamentos (Orders)
- Pedidos são vinculados a um cliente e opcionalmente a um equipamento
- Cada pedido tem número sequencial por organização (`order_counter` na org)
- Itens do pedido vêm do catálogo (`catalog_items`) ou são criados avulsos
- Status: `pendente` → `aprovado` → `em_andamento` → `concluido` (ou `cancelado`)
- PDF de orçamento gerado no frontend (`ClientDetailPage`) com dados da org (billing/banco)
- Pedidos podem ser editados: ao clicar em "Editar" na consulta, os dados populam o formulário

### 8.9 Bloqueio por Inadimplência
- Se `paymentStatus !== 'active'` e trial expirado, usuário é redirecionado para `PaymentBlockedPage`
- Página exibe link para o portal Asaas para regularizar pagamento

### 8.10 Portal do Técnico
- Rota `/tecnico` — login independente para técnicos
- Exibe apenas as OS atribuídas ao técnico logado
- Permite upload de fotos antes/depois via componente `PhotoCapture`
- Status `aguardando_aprovacao` adicionado ao fluxo de OS

---

## 9. Variáveis de Ambiente

**Frontend (`.env` na raiz):**
```env
VITE_API_URL=https://seu-dominio.com/api   # URL base da API Express
```

**Backend (`server/.env`):**
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=<segredo para assinar tokens>
ASAAS_API_KEY=<chave da API Asaas>
ASAAS_WEBHOOK_TOKEN=<token para validar webhooks>
```

> Frontend: `import.meta.env.VITE_*` (padrão Vite)
> Backend: `process.env.*` via `dotenv`

---

## 10. Padrões de CSS

- **Vanilla CSS** — um arquivo `.css` por componente
- CSS global em `src/index.css`
- Sem Tailwind, Styled Components ou CSS Modules
- Classes com nomenclatura descritiva (não BEM estrito, mas consistente)
- Animações de entrada feitas com `framer-motion`, não CSS transitions
- Responsividade via media queries no CSS do componente

---

## 11. Funções Utilitárias Já Existentes

| Função/Módulo                 | Localização           | O que faz                                              |
|-------------------------------|-----------------------|--------------------------------------------------------|
| `apiFetch<T>(path, options)`  | `src/services/api.ts` | Wrapper de fetch com JWT automático + error handling   |
| `getToken/setToken/removeToken`| `src/services/api.ts`| Gerenciamento do JWT token no localStorage             |
| `mapClientFromDb`             | `src/services/api.ts` | Converte cliente do DB (snake) para TS (camel)         |
| `mapOrgFromDb`                | `src/services/api.ts` | Converte organização do DB para TS                     |
| `mapOrgToDb`                  | `src/services/api.ts` | Converte organização do TS para DB                     |
| `mapEquipmentFromDb`          | `src/services/api.ts` | Converte equipamento do DB para TS                     |
| `mapServiceOrderFromDb`       | `src/services/api.ts` | Converte ordem de serviço do DB para TS                |
| `mapCatalogItemFromDb`        | `src/services/api.ts` | Converte item de catálogo do DB para TS                |
| `mapOrderFromDb`              | `src/services/api.ts` | Converte pedido do DB para TS (inclui items)           |
| `mapOrderItemFromDb`          | `src/services/api.ts` | Converte item de pedido do DB para TS                  |
| `maskCPF(value)`              | `src/lib/masks.ts`    | Formata CPF: ###.###.###-##                            |
| `maskCNPJ(value)`             | `src/lib/masks.ts`    | Formata CNPJ: ##.###.###/####-##                       |
| `maskDocument(value, type)`   | `src/lib/masks.ts`    | Aplica máscara CPF ou CNPJ pelo tipo                   |
| `maskPhone(value)`            | `src/lib/masks.ts`    | Formata telefone: (##) #####-####                      |
| `unmask(value)`               | `src/lib/masks.ts`    | Remove formatação, retorna só dígitos                  |
| `isValidCPF(cpf)`             | `src/lib/masks.ts`    | Valida CPF com dígitos verificadores                   |
| `isValidCNPJ(cnpj)`           | `src/lib/masks.ts`    | Valida CNPJ com dígitos verificadores                  |
| `filterUFs(query)`            | `src/lib/locations.ts`| Filtra lista de 27 UFs por sigla ou nome               |
| `getCitiesByUF(uf)`           | `src/lib/locations.ts`| Busca cidades do IBGE API (com cache em memória)       |
| `filterCities(cities, query)` | `src/lib/locations.ts`| Filtra cidades por texto digitado                      |

---

## 12. Convenções Importantes

| Regra                              | Detalhe                                                   |
|------------------------------------|-----------------------------------------------------------|
| Idioma do código                   | Inglês para código, Português para textos de UI           |
| Formato de data no DB              | `TIMESTAMP WITH TIME ZONE` e `DATE`                       |
| Formato de ID                      | UUID v4 (gerado pelo PostgreSQL)                          |
| Autenticação                       | JWT (jsonwebtoken) + bcryptjs no backend Express          |
| Chamadas ao banco                  | Somente via `api.ts`, nunca direto no componente          |
| Tipos                              | Centralizados em `src/types/index.ts`                     |
| Notificações                       | `toast.success()` / `toast.error()` (react-hot-toast)     |
| Ícones                             | Importar de `lucide-react`                                |
| Animações de componente            | `framer-motion` (motion.div, AnimatePresence)             |
| Estilo de exportação               | `export default function` para páginas/componentes        |
| SPA routing                        | `vercel.json` com rewrite para suporte a rotas client-side|
| Estado                             | Local com `useState` (sem Redux/Zustand/Context global)   |
| Build command                      | `tsc -b` seguido de `vite build` (comandos separados)    |
| Terminal (Shell)                   | **PowerShell** — NÃO usar `&&` para encadear comandos   |

### 12.1 Práticas de Terminal e Deploy

> **⚠️ REGRA CRÍTICA:** O terminal do projeto é **PowerShell (Windows)**. O operador `&&` NÃO funciona neste shell. Sempre rodar comandos **separadamente**, um por vez.

**Git workflow (deploy via Vercel):**
```powershell
# Passo 1 — Adicionar arquivos
git add -A

# Passo 2 — Commit
git commit -m "descricao da alteracao"

# Passo 3 — Push (dispara deploy automático na Vercel)
git push
```

**Build local:**
```powershell
# Passo 1 — Type check
tsc -b

# Passo 2 — Build
vite build
```

**Dev server:**
```powershell
npm run dev
```

---

## 13. Boas Práticas de Teste UI/UX

> Ao fazer alterações visuais, sempre validar no navegador antes de subir para produção.

**Checklist de teste mobile:**
1. Abrir o dev server local (`npm run dev`)
2. Usar o Chrome DevTools (F12) → Toggle Device Toolbar (Ctrl+Shift+M)
3. Testar nos viewports: **390×844** (iPhone 14), **360×800** (Android médio)
4. Verificar que todo conteúdo da seção cabe na viewport sem corte
5. Testar navegação, dropdowns e modais no viewport mobile
6. Testar autocompletes com teclado virtual simulado

**Checklist de formulários:**
1. Campos de CPF/CNPJ devem usar `maskDocument()` de `src/lib/masks.ts`
2. Campos de telefone devem usar `maskPhone()` de `src/lib/masks.ts`
3. Campos de UF/Cidade devem usar autocomplete de `src/lib/locations.ts`
4. Endereço é armazenado como string única: `"Rua X, 123 - Cidade/UF"`

---

## 14. Histórico de Alterações

| Data       | Alteração                                                              |
|------------|------------------------------------------------------------------------|
| 2026-03-05 | Documento criado com análise completa do sistema                       |
| 2026-03-05 | Planos atualizados: Starter R$59 (30 equip), Professional R$149 (150 equip) |
| 2026-03-05 | Correção: Nome do técnico salvo no BD e Etiqueta QR 58mm c/ nome da empresa |
| 2026-03-13 | **Migração Supabase → Backend Express**: API própria em Node.js com pg, bcrypt e rotas JWT |
| 2026-03-13 | **Adoção Asaas API**: Criação automática de Subscription via API + Recebimento por Webhooks |
| 2026-03-13 | **Feature de Restrição Paga**: Tab Técnicos + "Envio p/ Técnico" amarrados a plano Professional+. Footer atualizado p/ LogiStack |
| 2026-03-13 | **Segurança Webhooks Asaas**: Token de autenticação (`asaas-access-token`) + teste de eventos (`PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`) |
| 2026-03-15 | **Dashboard Atividades (MeuIA)**: Módulo de abas Financeiro/Atividades com timeline vertical e mock data p/ Google Calendar |
| 2026-03-16 | **Build APK local**: Configuração de build Android local (Gradle + Android SDK) |
| 2026-03-17 | **Campos Billing/Banco na Org**: Migration 003 — address, city, state, cep, owner_name, pix_key, bank_*, order_counter |
| 2026-03-17 | **Sistema de Pedidos/Orçamentos**: Tabelas catalog_items, orders, order_items + CRUD completo + PDF de orçamento na ClientDetailPage |
| 2026-03-17 | **Número sequencial de pedido**: `order_counter` na org incrementado atomicamente + `order_number` no pedido |
| 2026-03-18 | **Fix PDF caracteres**: Corrigido rendering de emojis/caracteres especiais em PDFs gerados no frontend |
| 2026-03-22 | **Edição de Pedidos**: Funcionalidade de editar pedidos/orçamentos existentes a partir da consulta |
| 2026-03-22 | **Atualização context.md**: Documento atualizado com todas as mudanças acumuladas desde 2026-03-13 |

---

> **⚠️ INSTRUÇÃO PARA A IA:** Este documento deve ser consultado SEMPRE antes de sugerir instalação de bibliotecas, criar novos arquivos, ou implementar padrões. Deve ser atualizado a cada implementação significativa.
