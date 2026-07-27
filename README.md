# Crypto Wallet

[Crypto Wallet](https://crypto-wallet-rho.vercel.app/) é uma aplicação web desenvolvida para acompanhar o mercado de criptomoedas por meio de uma interface simples, moderna e focada na visualização de dados.

A proposta do projeto é exibir informações relevantes do mercado cripto, como principais criptomoedas, ativos em tendência, preços atualizados, variação nas últimas 24 horas, market cap e gráficos resumidos, oferecendo uma experiência clara e objetiva para análise rápida dos ativos digitais.

## Tecnologias

O projeto está sendo desenvolvido com:

- **Next.js:** framework React utilizado para construir a aplicação web com foco em performance, organização de rotas e uma experiência moderna de desenvolvimento.
- **TypeScript:** adiciona tipagem estática ao JavaScript, ajudando a tornar o código mais seguro, previsível e fácil de manter.
- **MongoDB:** banco de dados NoSQL utilizado para armazenar informações da aplicação de forma flexível e escalável.
- **CoinGecko API:** API utilizada para obter dados atualizados sobre criptomoedas, como preços, variação, market cap, pesquisa de ativos e criptomoedas em tendência.
- **Auth.js / NextAuth:** utilizado para gerenciar a autenticação dos usuários, facilitando recursos como login, logout, controle de sessão e proteção de rotas dentro da aplicação.
- **bcryptjs:** utilizado para gerar hashes seguros de senhas, evitando que credenciais sejam armazenadas em texto puro no banco de dados e aumentando a segurança da aplicação.

## Como rodar localmente

Antes de iniciar, tenha o Node.js instalado na máquina.

Instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse a aplicação no navegador:

```txt
http://localhost:3000
```

Para ter uma experiência completa com o projeto, crie um arquivo .env e preencha as seguintes variáveis:

```txt
MONGODB_URI=
MONGODB_DB_NAME=
NEXTAUTH_SECRET=
COINGECKO_API_KEY=
COINGECKO_API_BASE_URL=
```

Ou acesse pelo link abaixo:

[Clique aqui para acessar a Crypto Wallet](https://crypto-wallet-rho.vercel.app/)
