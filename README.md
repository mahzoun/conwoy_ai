# Conwoy AI — 2-Player Competitive Conway's Game of Life

A competitive, wagering-based 2-player version of Conway's Game of Life where two players deploy cellular automata patterns and watch them battle for board dominance.

## Architecture

```
conwoy-ai/
├── apps/
│   ├── web/          # Next.js 14 App Router frontend
│   └── backend/      # Node.js Express + WebSocket server
├── packages/
│   └── shared/       # Shared TypeScript types & constants
└── contracts/        # Solidity escrow contract (Hardhat)
```

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui, RainbowKit, wagmi
- **Backend**: Node.js, Express, WebSocket (ws), PostgreSQL, Drizzle ORM
- **Blockchain**: Solidity, Hardhat, ethers.js v6
- **Shared**: TypeScript monorepo with npm workspaces

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL 14+
- MetaMask or compatible wallet

### Installation

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

### Database Setup

```bash
cd apps/backend
psql -U postgres -c "CREATE DATABASE conwoy_ai;"
psql -U postgres -d conwoy_ai -f src/db/migrations/001_initial.sql
```

### Development

```bash
# Start all services
npm run dev

# Or individually:
npm run dev --workspace=apps/backend
npm run dev --workspace=apps/web
```

### Contracts

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network sepolia
```

## Game Rules

1. **Setup Phase**: Each player picks an agent faction and deploys patterns in their half of the board
2. **Simulation Phase**: Conway's Game of Life rules run automatically for up to 500 generations
3. **Victory Condition**: Player with the most live cells at the end wins

### Agents

| Agent | Patterns | Special |
|-------|----------|---------|
| Architect | Block, Boat, Tub | No rotation/mirror |
| Swarm | Glider, LWSS | Full rotation + mirror |
| Chaos | Blinker, Toad, Beacon | Rotation only |
| Engineer | Block, Glider, Blinker, Boat | Full rotation + mirror |

## License

MIT
