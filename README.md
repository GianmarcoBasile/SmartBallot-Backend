# SmartBallot-Backend
Questo repository contiene il backend dell'app SmartBallot, un sistema di voto per condomini che integra una parte centralizzata (API, autenticazione e database) con smart contract sulla blockchain per la gestione delle votazioni.
Il backend è scritto in TypeScript ed espone una REST API per la gestione di utenti, condomini e votazioni, oltre a funzioni di integrazione con smart contract (via ethers) e gestione di token JWT.
## Sommario
- Requisiti
- Installazione
- Configurazione (variabili d'ambiente)
- Endpoints principali
- Struttura del progetto
- Note sull'integrazione blockchain
- Contributi

## Requisiti
- Node.js (consigliato >= 18)
- pnpm o npm (il progetto usa pnpm nel repository principale, ma è possibile usare npm)
- TypeScript (è una dipendenza di dev nel progetto)
- Un'istanza MongoDB accessibile (locale o remota)
- (Opzionale) Una rete Ethereum compatibile (Hardhat, Ganache o testnet) per interagire con gli smart contract

## Installazione
1. Posizionati nella cartella `backend/`:

	cd backend

2. Installa le dipendenze (con pnpm o npm):

```bash
pnpm install
```

Se usi npm:

```bash
npm install
```

3. Compilazione e avvio (local):

```bash
pnpm install
```

Se usi npm:

```bash
npm install
```

Lo script `start` compila TypeScript e avvia `dist/index.js`.

## Configurazione — Variabili d'ambiente

Il backend usa un file `.env` per le seguenti variabili (inserire nella cartella `backend/`):

- DB_CONNECTION_STRING: string — URI di connessione a MongoDB.
- DB_NAME: string — nome del database MongoDB.
- SERVER_PORT: number — porta su cui far partire il server (default 3000).
- FRONTEND_URL: string — URL del frontend autorizzato per CORS (default `http://localhost:5173`).
- JWT_ACCESS_SECRET: string — secret per firmare gli access token JWT.
- JWT_REFRESH_SECRET: string — secret per firmare i refresh token JWT.

Variabili per integrazione blockchain (opzionali, ma richieste per funzionalità on-chain):

- CONTRACT_FACTORY_ADDRESS: address — indirizzo del Factory contract.
- SEMAPHORE_ADDRESS: address — indirizzo del contract Semaphore (o simile).
- BACKEND_PRIVATE_KEY: string — chiave privata dell'account backend (usata per firmare transazioni, NON impegnare su repo pubblici).
- BACKEND_WALLET_ADDRESS: address — indirizzo pubblico della wallet usata dal backend.
- RPC_URL: string — URL del nodo RPC (default `http://localhost:8545`).

Esempio minimale di `.env`:

```
DB_CONNECTION_STRING=mongodb://localhost:27017
DB_NAME=smartballot
SERVER_PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_ACCESS_SECRET=una-segreta-strong
JWT_REFRESH_SECRET=una-altra-segreta-strong
CONTRACT_FACTORY_ADDRESS=0x...
SEMAPHORE_ADDRESS=0x...
BACKEND_PRIVATE_KEY=0x...
BACKEND_WALLET_ADDRESS=0x...
RPC_URL=http://localhost:8545
```

Nota di sicurezza: non committare mai `.env` in repository pubblici.

## Endpoints principali

Gli endpoint sono montati con i seguenti prefissi (vedi `src/index.ts`):

- `POST /api/auth/...` — autenticazione, registrazione, refresh token.
- `GET/POST /api/condominiums/...` — gestione condomini, aggiunta residenti, ecc.
- `GET/POST /api/voting/...` — creazione elezioni, votazione, conteggio voti, integrazione on-chain.

Per dettagli sugli endpoint, vedere i file nella cartella `src/routes/`.

## Struttura del progetto

Cartella principale `backend/` — file e cartelle più rilevanti:

- `src/` — codice TypeScript sorgente
	- `index.ts` — entrypoint dell'app
	- `database.ts` — helper per la connessione a MongoDB
	- `routes/` — definizione delle rotte REST (auth, condominium, voting)
	- `services/` — logica applicativa e integrazioni (utente, condominio, voting)
	- `utils/` — helper (blockchain, JWT, password, costanti)
	- `middlewares.ts` — middleware Express
	- `types.ts` — tipi TypeScript condivisi
- `package.json` — dipendenze e script
- `requirements.txt` — (presente per reference, se usate utility Python)

## Integrazione con la blockchain

Il backend contiene ABI semplificate e utilizza `ethers` per interagire con smart contract (vedi `src/utils/constants.ts` e `src/utils/blockchain.ts`).
Le operazioni on-chain principali:

- Creazione di un contratto di voto per un condominio.
- Chiamate view per ottenere dettagli elezioni e conteggi voti.
- Invio di transazioni per creare elezioni, chiudere elezioni, aggiungere membri e votare.

Per test locali, si consiglia di eseguire la rete `hardhat` contenuta nella cartella `blockchain/` del repository principale e impostare `RPC_URL` e gli indirizzi dei contract nel `.env` del backend.
