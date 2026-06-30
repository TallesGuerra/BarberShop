# Barber Shop

Sistema de agendamento online para barbearia, construído com **React 19 + Vite**. Clientes podem visualizar serviços, preços, galeria de trabalhos e agendar horários diretamente no site — com sincronização automática ao **Google Calendar**.

**Demo:** [barbearia-cruz.vercel.app](https://barbearia-cruz.vercel.app)

![Screenshot](public/assets/screenshot.png)

---

## Funcionalidades

- Apresentação de serviços e tabela de preços
- Galeria de trabalhos
- Calendário interativo com navegação por mês
- Agendamento online com seleção de barbeiro, data e horário
- Verificação de disponibilidade em tempo real via Google Calendar API
- Detecção de conflito de horários por barbeiro (lógica de sobreposição temporal)
- Limite de agendamentos diários e semanais por profissional (sistema de quotas)
- Secção de contacto com mapa integrado (iframe Google Maps)
- Layout totalmente responsivo (mobile-first)

---

## Arquitetura

```
src/
├── components/          # Componentes de UI (um por secção da página)
│   ├── Header.jsx
│   ├── Hero.jsx
│   ├── Services.jsx
│   ├── Prices.jsx
│   ├── Hours.jsx
│   ├── Gallery.jsx
│   ├── Schedule.jsx     # Componente principal de agendamento
│   ├── Contact.jsx
│   └── Footer.jsx
├── hooks/
│   └── useAvailableSlots.js   # Hook para busca de horários disponíveis
├── config/
│   ├── calendarConfig.js      # Configuração de barbeiros, horários e quotas
│   └── servicePrices.jsx      # Catálogo de serviços e preços
└── services/
    └── googleCalendarService.js   # Camada de integração com Google Calendar API
```

### Fluxo de agendamento

```
Utilizador seleciona barbeiro + data
        ↓
useAvailableSlots hook
        ↓
GoogleCalendarService.getAvailableSlots()
  → Busca eventos do dia na Calendar API
  → Filtra por barbeiro (via extendedProperties)
  → Verifica quotas diárias
  → Retorna slots livres
        ↓
Utilizador confirma → POST /agendar (Express backend)
  → Verifica conflito de horário (sobreposição temporal)
  → Cria evento no Google Calendar
  → Armazena barberId em extendedProperties.private
```

### Decisões técnicas

**Separação frontend/backend:** A criação de eventos requer autenticação OAuth com service account (credenciais privadas), impossível de expor no frontend. O Express backend serve como proxy seguro entre o React e a Google Calendar API.

**extendedProperties para identificar barbeiro:** Como dois barbeiros partilham o mesmo Google Calendar, cada evento criado inclui o `barberId` em `extendedProperties.private`. Ao verificar disponibilidade, o serviço filtra eventos apenas do barbeiro selecionado, evitando double-booking cruzado.

**useMemo no título do calendário:** `computedTitle` é memoizado porque `toLocaleDateString` é chamado num componente que re-renderiza frequentemente ao navegar no calendário.

---

## Tecnologias

| Camada | Stack |
|---|---|
| Frontend | React 19, Vite (rolldown-vite) |
| Estilização | CSS puro, mobile-first |
| Integração | Google Calendar API v3 |
| Backend | Node.js, Express 5 |
| Deploy | Vercel (frontend + serverless backend) |
| Ícones | Font Awesome |
| Tipografia | Google Fonts (Poppins) |

---

## Instalação

```bash
npm install
```

### Variáveis de ambiente

Duplica `.env.example` para `.env` e preenche os valores:

```bash
cp .env.example .env
```

```env
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_API_URL=http://localhost:3001
```

### Desenvolvimento

```bash
# Frontend (porta 5173)
npm run dev

# Backend (porta 3001) — necessário para criar agendamentos
npm run start-backend
```

### Build para produção

```bash
npm run build
```

---

## O que melhoraria numa v2

- **TypeScript** — tipagem nos props dos componentes e no retorno do `GoogleCalendarService` eliminaria bugs silenciosos na integração com a API
- **Testes** — testes unitários para a lógica de conflito de horários (`checkAvailability`) e testes E2E para o fluxo completo de agendamento
- **React Hook Form** — substituir os múltiplos `useState` do formulário por um form manager com validação declarativa
- **Zustand** — extrair o estado global de barbeiro/serviço selecionado para uma store, evitando prop drilling em casos futuros

---

Desenvolvido por [Talles Guerra](https://www.linkedin.com/in/talles-guerra/)
