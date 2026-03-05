# 📋 MaintQR SaaS — Documento de Contexto do Sistema

> **Última atualização:** 2026-03-05
> **Objetivo:** Gestão de contexto para manter consistência de código, evitar duplicação e preservar padrões de arquitetura em todas as sessões de desenvolvimento.

---

## 1. Visão Geral do Projeto

**Nome:** MaintQR SaaS
**Descrição:** Plataforma SaaS multi-tenant para gestão de manutenção de equipamentos (foco em ar-condicionado/HVAC) com rastreamento via QR Code. Permite que empresas prestadoras de serviço gerenciem clientes, setores, equipamentos e ordens de serviço, além de oferecer um portal público de rastreamento de manutenções para o cliente final.

**Deploy:** Vercel (SPA com rewrite para `index.html`)
**Repositório:** `saas_sevice`

---

## 2. Stack Tecnológica

| Camada        | Tecnologia                          | Versão     |
|---------------|-------------------------------------|------------|
| Framework     | React                               | ^19.2.0    |
| Linguagem     | TypeScript                          | ~5.9.3     |
| Build Tool    | Vite                                | ^7.3.1     |
| Backend/BaaS  | Supabase (PostgreSQL + Auth + RLS)  | ^2.98.0    |
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
| HTTP/API               | `@supabase/supabase-js`   | axios, fetch wrappers   |
| CSS                    | Vanilla CSS               | Tailwind, Styled-comp.  |
| Roteamento             | `react-router-dom`        | wouter, tanstack-router |

---

## 3. Estrutura de Diretórios

```
saas_sevice/
├── .env                          # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── index.html                    # Entry HTML
├── vite.config.ts                # Vite config (apenas plugin react)
├── vercel.json                   # SPA rewrite "/(.*)" → "/index.html"
├── tsconfig.json                 # Referencia tsconfig.app.json + tsconfig.node.json
├── supabase_schema.sql           # Schema completo do banco + RLS
├── supabase_public_rpc.sql       # RPC: get_public_equipment_data (acesso público)
├── supabase_rpc_tenant.sql       # RPC: create_tenant_from_auth (criação de tenant)
└── src/
    ├── main.tsx                  # Ponto de entrada (StrictMode + App)
    ├── App.tsx                   # Roteamento principal (BrowserRouter)
    ├── index.css                 # CSS global + design tokens
    ├── lib/
    │   └── supabase.ts           # Cliente Supabase singleton
    ├── types/
    │   └── index.ts              # Interfaces TypeScript centralizadas
    ├── services/
    │   └── api.ts                # Camada de serviço (CRUD completo via Supabase)
    ├── data/
    │   └── mockData.ts           # Dados de demonstração
    ├── layouts/
    │   ├── DashboardLayout.tsx   # Layout do painel (sidebar + auth guard)
    │   └── DashboardLayout.css
    ├── pages/
    │   ├── LandingPage.tsx       # Página inicial (marketing)
    │   ├── LoginPage.tsx + .css  # Login com Supabase Auth
    │   ├── RegisterPage.tsx      # Registro + criação de tenant (RPC)
    │   ├── PublicEquipmentPage.tsx + .css  # Portal público QR Code
    │   ├── ClientPortalPage.tsx  # Portal do cliente
    │   └── dashboard/
    │       ├── DashboardHome.tsx # Painel principal (KPIs + gráficos)
    │       ├── ClientsPage.tsx   # CRUD de clientes
    │       ├── SectorsPage.tsx   # CRUD de setores
    │       ├── EquipmentPage.tsx # CRUD de equipamentos + geração QR
    │       ├── ServiceOrdersPage.tsx # CRUD de ordens de serviço
    │       └── SettingsPage.tsx  # Configurações da organização
    ├── components/
    │   ├── landing/              # Componentes da Landing Page
    │   │   ├── Navbar.tsx + .css
    │   │   ├── HeroSection.tsx + .css
    │   │   ├── FeaturesSection.tsx + .css
    │   │   ├── HowItWorks.tsx + .css
    │   │   ├── PricingSection.tsx + .css
    │   │   └── Footer.tsx + .css
    │   └── three/                # Componentes 3D (Three.js)
    └── assets/
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

Esta é a **ÚNICA** camada de acesso ao Supabase. **Nunca** fazer chamadas `supabase.from(...)` diretamente em componentes.

**Módulos disponíveis:**
| Módulo              | Métodos disponíveis                                     |
|---------------------|--------------------------------------------------------|
| `authApi`           | `login`, `register`, `logout`, `getCurrentUser`       |
| `organizationsApi`  | `get`, `update`                                        |
| `clientsApi`        | `getAll`, `getById`, `create`, `update`, `delete`     |
| `sectorsApi`        | `getAll`, `create`, `update`, `delete`                |
| `equipmentsApi`     | `getAll`, `getByQrCode`, `getPublicTrackingData`, `create`, `update`, `delete` |
| `serviceOrdersApi`  | `getAll`, `getByEquipment`, `create`, `update`        |

### 4.3 Mapeamento snake_case ↔ camelCase

O banco de dados usa **snake_case** (PostgreSQL). O TypeScript usa **camelCase**. A conversão ocorre **SOMENTE** na camada `api.ts` via funções mapper:

```
mapClientFromDb(d)      → DB → TypeScript
mapOrgFromDb(d)         → DB → TypeScript
mapOrgToDb(updates)     → TypeScript → DB
mapEquipmentFromDb(d)   → DB → TypeScript
mapServiceOrderFromDb(d)→ DB → TypeScript
```

> **REGRA:** Nunca passar campos `snake_case` para componentes. Nunca passar campos `camelCase` para o Supabase. Toda conversão ocorre na `api.ts`.

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
/login                      → LoginPage (autenticação)
/register                   → RegisterPage (registro + criação de tenant)
/e/:qrCodeUid               → PublicEquipmentPage (portal público via QR Code)
/portal/:clientId           → ClientPortalPage (portal do cliente)
/dashboard                  → DashboardLayout (protegida, requer auth)
  ├── /dashboard            → DashboardHome (KPIs, gráficos)
  ├── /dashboard/clients    → ClientsPage
  ├── /dashboard/sectors    → SectorsPage
  ├── /dashboard/equipment  → EquipmentPage
  ├── /dashboard/service-orders → ServiceOrdersPage
  └── /dashboard/settings   → SettingsPage
```

**Auth Guard:** O `DashboardLayout` verifica a sessão (`authApi.getCurrentUser()`) no `useEffect`. Se não autenticado, redireciona para `/login`.

---

## 6. Banco de Dados (Supabase / PostgreSQL)

### 6.1 Schema de Tabelas

```
organizations (tenant)
├── id (UUID PK)
├── name, document (CNPJ), email, phone
├── logo_url, brand_color
├── subscription_plan ('free' | 'pro' | 'enterprise')
├── payment_status ('active' | 'past_due' | 'canceled')
└── created_at

users (perfil do auth.users)
├── id (UUID PK → auth.users.id)
├── org_id (FK → organizations.id)
├── name, role ('admin' | 'technician')
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
├── qr_code_uid (UUID UNIQUE, auto-gerado)
├── name, brand, model, serial_number, btus, details
├── install_date, status ('active' | 'inactive' | 'maintenance')
└── created_at

service_orders (ordens de serviço)
├── id (UUID PK)
├── equipment_id (FK → equipments.id)
├── technician_id (FK → users.id, nullable)
├── date, type ('preventiva' | 'corretiva' | 'instalacao')
├── status ('aberta' | 'em_progresso' | 'concluida')
├── description, warranty_until, notes
├── next_maintenance_date
└── created_at
```

### 6.2 Hierarquia de Dados

```
Organization (tenant)
  └── Users (admin/técnico)
  └── Clients (clientes do tenant)
       └── Sectors (setores do cliente)
       └── Equipments (equipamentos do cliente)
            └── Service Orders (manutenções do equipamento)
```

### 6.3 Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. A segurança multi-tenant usa a função auxiliar:

```sql
public.auth_org_id() → retorna o org_id do usuário autenticado
```

| Tabela          | Política                                                  |
|-----------------|-----------------------------------------------------------|
| organizations   | SELECT/UPDATE apenas a própria org                        |
| users           | SELECT do próprio perfil + colegas da mesma org           |
| clients         | CRUD completo filtrado por `org_id = auth_org_id()`       |
| sectors         | CRUD via JOIN `sectors → clients.org_id`                  |
| equipments      | CRUD via JOIN `equipments → clients.org_id`               |
| equipments      | SELECT público (para QR Code — `USING (true)`)           |
| service_orders  | CRUD via JOIN `service_orders → equipments → clients.org_id` |

### 6.4 RPCs (Remote Procedure Calls)

| Função                       | Propósito                                           | Acesso          |
|------------------------------|-----------------------------------------------------|-----------------|
| `create_tenant_from_auth(org_name)` | Cria organização + vincula user como admin    | Autenticado     |
| `get_public_equipment_data(qr_uid)` | Retorna dados do equipamento + cliente + setor + ordens | Público (anônimo) |

### 6.5 Triggers

| Trigger                | Tabela      | Ação                                                   |
|------------------------|-------------|-------------------------------------------------------|
| `on_auth_user_created` | auth.users  | Cria registro em `public.users` automaticamente        |

---

## 7. Interfaces TypeScript (`src/types/index.ts`)

```typescript
Organization { id, name, document, email, phone, createdAt, logoUrl?, brandColor?, subscriptionPlan, paymentStatus }
Client       { id, orgId, name, document, documentType, email, phone, address, createdAt }
Sector       { id, clientId, name, description?, createdAt }
Equipment    { id, sectorId, clientId, qrCodeUid, name, brand, model, serialNumber, btus?, details?, installDate, status, createdAt }
ServiceOrder { id, equipmentId, date, type, status, description, technicianName, warrantyUntil?, notes?, photos?, nextMaintenanceDate?, createdAt }
User         { id, orgId, name, email, role, avatar? }
```

> **REGRA:** Todas as interfaces vivem em `src/types/index.ts`. Não criar tipos avulsos em componentes.

---

## 8. Regras de Negócio

### 8.1 Multi-tenancy
- Cada organização é um **tenant isolado**
- Todos os dados são filtrados pelo `org_id` do usuário logado
- RLS garante isolamento no nível do banco de dados
- Ao criar um registro (ex: novo cliente), o `org_id` é obtido do perfil do usuário autenticado

### 8.2 Registro de Usuário
1. Usuário se registra com email/senha/nome/empresa
2. Supabase Auth cria o registro em `auth.users`
3. Trigger `on_auth_user_created` cria registro em `public.users`
4. Se sessão disponível imediatamente (sem confirmação de email), chama RPC `create_tenant_from_auth` para criar a organização e vincular o user como `admin`

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

### 8.6 Planos de Assinatura
- **Starter:** R$ 79/mês — até 30 equipamentos
- **Professional:** R$ 149/mês — até 150 equipamentos
- **Enterprise:** R$ 349/mês — equipamentos ilimitados
- Status de pagamento: `active`, `past_due`, `canceled`
- Armazenados na tabela `organizations`

---

## 9. Variáveis de Ambiente

```env
VITE_SUPABASE_URL=<url do projeto Supabase>
VITE_SUPABASE_ANON_KEY=<chave anon/pública do Supabase>
```

> Acessadas via `import.meta.env.VITE_*` (padrão Vite)

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
| `supabase` (singleton)        | `src/lib/supabase.ts` | Cliente Supabase configurado e exportado               |
| `mapClientFromDb`             | `src/services/api.ts` | Converte cliente do DB (snake) para TS (camel)         |
| `mapOrgFromDb`                | `src/services/api.ts` | Converte organização do DB para TS                     |
| `mapOrgToDb`                  | `src/services/api.ts` | Converte organização do TS para DB                     |
| `mapEquipmentFromDb`          | `src/services/api.ts` | Converte equipamento do DB para TS                     |
| `mapServiceOrderFromDb`       | `src/services/api.ts` | Converte ordem de serviço do DB para TS                |
| `public.auth_org_id()`        | Supabase (SQL)        | Retorna o org_id do usuário autenticado                |
| `public.create_tenant_from_auth()` | Supabase (SQL)  | Cria org + vincula user como admin                     |
| `public.get_public_equipment_data()` | Supabase (SQL) | Dados públicos do equipamento via QR                  |
| `public.handle_new_user()`    | Supabase (SQL)        | Trigger: cria perfil ao registrar                      |

---

## 12. Convenções Importantes

| Regra                              | Detalhe                                                   |
|------------------------------------|-----------------------------------------------------------|
| Idioma do código                   | Inglês para código, Português para textos de UI           |
| Formato de data no DB              | `TIMESTAMP WITH TIME ZONE` e `DATE`                       |
| Formato de ID                      | UUID v4 (gerado pelo PostgreSQL)                          |
| Autenticação                       | Supabase Auth (email/password)                            |
| Chamadas ao banco                  | Somente via `api.ts`, nunca direto no componente          |
| Tipos                              | Centralizados em `src/types/index.ts`                     |
| Notificações                       | `toast.success()` / `toast.error()` (react-hot-toast)     |
| Ícones                             | Importar de `lucide-react`                                |
| Animações de componente            | `framer-motion` (motion.div, AnimatePresence)             |
| Estilo de exportação               | `export default function` para páginas/componentes        |
| SPA routing                        | `vercel.json` com rewrite para suporte a rotas client-side|
| Estado                             | Local com `useState` (sem Redux/Zustand/Context global)   |
| Build command                      | `tsc -b && vite build`                                    |

---

## 13. Histórico de Alterações

| Data       | Alteração                                                              |
|------------|------------------------------------------------------------------------|
| 2026-03-05 | Documento criado com análise completa do sistema                       |
| 2026-03-05 | Planos atualizados: Starter R$79 (30 equip), Professional R$149 (150 equip) |

---

> **⚠️ INSTRUÇÃO PARA A IA:** Este documento deve ser consultado SEMPRE antes de sugerir instalação de bibliotecas, criar novos arquivos, ou implementar padrões. Deve ser atualizado a cada implementação significativa.
