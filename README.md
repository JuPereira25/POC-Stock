# Controle de estoque

Aplicação para acompanhar produtos, kits e pendências de um posto de montagem. O operador vê solicitações na página inicial, consulta a composição dos kits e cadastra produtos. Quando um kit sai do estoque, as quantidades são baixadas e itens zerados viram pendência.

O projeto tem três partes:

- **frontend**: interface em React, TypeScript e Vite.
- **backend**: API em ASP.NET Core com PostgreSQL, alertas MQTT e tempo real via SignalR.
- **electron**: aplicativo de desktop que sobe a API e abre a interface.

## Como executar em desenvolvimento

Pré-requisitos: Node.js, npm e .NET 10.

Na pasta `backend`:

```bash
dotnet run --launch-profile http
```

A API fica em `http://localhost:5231`. O endpoint `GET /health` responde `{ "status": "ok" }`.

Na pasta `frontend`:

```bash
npm install
npm run dev
```

O Vite abre em `http://localhost:5173`. Se essa porta estiver ocupada, ele usa a seguinte. O CORS da API aceita `http://localhost:5173` e `http://localhost:5174`.

## Dados de demonstração

A interface não chama a API neste momento. Produtos, kits e pendências vêm de um conjunto em memória em `frontend/src/services/mockStore.ts`. Incluir, editar, excluir e dar baixa funciona durante a sessão. Ao recarregar a página, os dados voltam ao conjunto inicial.

Seriais de exemplo: `KIT-1042`, `KIT-2088` e `KIT-3310`.

## API

Quando o frontend voltar a usar o banco, estas são as rotas:

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/produtos` | Lista os produtos |
| POST | `/api/produtos` | Cadastra um produto |
| PUT | `/api/produtos/{id}` | Edita um produto |
| DELETE | `/api/produtos/{id}` | Exclui um produto |
| GET | `/api/kits/{serial}` | Busca os itens de um kit |
| POST | `/api/kits` | Cadastra um kit |
| GET | `/api/estoque/kits` | Lista os kits disponíveis |
| POST | `/api/estoque/saidas-kit` | Registra a saída de um kit |
| GET | `/api/estoque/pendencias` | Lista pendências em aberto |
| POST | `/api/estoque/pendencias` | Cria uma solicitação pendente |
| PATCH | `/api/estoque/pendencias/{id}/resolver` | Marca uma pendência como resolvida |

O hub SignalR fica em `/hubs/dashboard` e publica o evento `StockAlertReceived` quando chega uma mensagem MQTT.

## Configuração

`backend/appsettings.json` define o host do PostgreSQL e o broker MQTT. A senha do banco fica de fora do arquivo. Antes de subir a API, defina a conexão completa nesta variável de ambiente:

```powershell
$env:ConnectionStrings__PostgreSql = "Host=192.168.0.192;Port=5432;Pooling=true;Database=estoque;User Id=postgres;Password=SUA_SENHA;"
```

O tópico MQTT escutado é `Estoque/Posto1`.

A API sobe mesmo se o banco ou o broker estiverem fora do ar. As consultas falham até esses serviços responderem, e o cliente MQTT tenta reconectar.

## Telas

- **Página inicial**: pendências de estoque e de solicitação. Uma solicitação abre a leitura da serial do kit.
- **Kits**: grade com serial, produto, quantidade, status e QR Code.
- **Cadastrar kits**: monta um kit a partir dos produtos existentes.
- **Cadastrar produto**: inclui, edita e exclui produtos, com quantidade, status e QR Code.

## Aplicativo de desktop

Na pasta `electron`, `npm start` compila o processo principal e abre a janela. `npm run dist` publica a API, gera o frontend e monta o instalador Windows.
