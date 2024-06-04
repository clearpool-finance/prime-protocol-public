# Subgraph for Clearpool Prime

## How to depoy

Subgraph reads environment variables from your runtime, not from .env file. Export them first before deploying your subgraph:

```shell
export GRAPH_TOKEN=<your token>
export GRAPH_PROJECT=<<account>/<project>>
```

Then, deploy your subgraph:

```shell
npm run prepare:<test/main>
npm run deploy:<test/main>
```

## Deployed versions

| Owner | Link |
|-------|------|
| @blockedby  | [blockedby/prime_draft](https://thegraph.com/hosted-service/subgraph/blockedby/prime_draft) |
| @georgeciubotaru  | [georgeciubotaru/clearpool-prime-mumbai](https://thegraph.com/hosted-service/subgraph/georgeciubotaru/clearpool-prime-mumbai) |
