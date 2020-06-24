# Plaid Vercel

A [Vercel Functions](https://vercel.com/docs/v2/serverless-functions/introduction) wrapper around [plaid](https://github.com/plaid/plaid-node). It is important to invoke Plaid calls from a backend service to avoid exposing [private identifiers](https://plaid.com/docs/quickstart/#api-keys) (`secret` and `client_id`) in client-side code, using a serverless implementation makes this easy to manage.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/project?template=https://github.com/rhino88/plaid-vercel)

## Required Environment Variables

```
  PLAID_CLIENT_ID
  PLAID_SECRET
  PLAID_PUBLIC_KEY
  PLAID_ENVIRONMENT
```

## Running Locally

Prerequisite: Node 12

1. `yarn add global vercel` or `npm i -g vercel`
1. `yarn` or `npm i`
1. `vercel dev`

All Plaid functions are available using a path segment based on the plaid client function name.

`http://localhost:3000/api/plaid/<functionName>`

For example, to invoke [`getCategories`](https://plaid.com/docs/#all-categories-request) you would use `http://localhost:3000/api/plaid/getCategories`. Query parameters are accepted for functions with parameters.
