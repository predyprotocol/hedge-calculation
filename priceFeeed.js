const {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  gql
} = require('@apollo/client')
const fetch = require('cross-fetch')
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()
let db = new sqlite3.Database('./db/prices.db')

const UNISWAP_SUBGRAPH_ENDPOINT =
  'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal'

const SWAP_QUERY = gql`
  query (
    $first: Int
    $orderBy: BigInt
    $orderDirection: String
    $poolAddress: String
    $startTime: BigInt
  ) {
    swaps(
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { pool: $poolAddress, timestamp_gt: $startTime }
    ) {
      id
      amount0
      amount1
      sqrtPriceX96
      timestamp
    }
  }
`

const httpLink = new HttpLink({
  uri: UNISWAP_SUBGRAPH_ENDPOINT,
  fetch
})

const cache = new InMemoryCache();

const client = new ApolloClient({
  link: httpLink,
  cache
})

const startTime = 1685600000

async function fetchPriceRange(timestamp) {
  const data = await client.query({
    query: SWAP_QUERY,
    variables: {
      first: 1000,
      orderBy: 'timestamp',
      orderDirection: 'asc',
      poolAddress: '0xc31e54c7a869b9fcbecc14363cf510d1c41fa443',
      startTime: timestamp
    }
  })
  return data.data
}

async function fetchPriceRanges(startTime) {
  const data = await fetchPriceRange(startTime)

  if (data.swaps.length === 0) {
    return []
  }

  const swaps = data.swaps.map(swap => ({
    ts: swap.timestamp,
    amount0: swap.amount0,
    amount1: swap.amount1,
    sqrtPriceX96: swap.sqrtPriceX96
  }))

  const nextTimestamp = swaps[swaps.length - 1].ts

  console.log(startTime, swaps[0].ts, nextTimestamp)

  return swaps.concat(await fetchPriceRanges(nextTimestamp))
}

fetchPriceRanges(startTime).then(data => {
  data = data.sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  fs.writeFileSync('prices.json', JSON.stringify(data))
})