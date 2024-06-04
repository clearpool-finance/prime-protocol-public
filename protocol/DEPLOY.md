# DEPLOY

## Prerequisites

Fill in deployer's private key and API keys of the contract verification services of the Polygonscan in `.env` file by copying `.env.example`.

Install dependencies:

```bash
npm i
```

## Deploy

Execute the following command to deploy the contracts to the Polygon Mumbai network:

```bash
npm run deploy:stage
```

Execute the following command to deploy the contracts to the local network:

```bash
npm run network
npm run deploy:local
```

Deployment data of contracts will be saved in the `deployments` folder. [More about deployments](./deployments/README.md)