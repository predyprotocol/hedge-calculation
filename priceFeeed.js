const {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  gql
} = require('@apollo/client')
const { BigNumber } = require('ethers')
const { AsyncDatabase } = require("promised-sqlite3")

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

const startTime = 1675000000
const poolAddress = '0xc31e54c7a869b9fcbecc14363cf510d1c41fa443'
const X96 = BigNumber.from(2).pow(96)

async function fetchPriceRange(timestamp) {
  const data = await client.query({
    fetchPolicy: 'no-cache',
    query: SWAP_QUERY,
    variables: {
      first: 1000,
      orderBy: 'timestamp',
      orderDirection: 'asc',
      poolAddress,
      startTime: timestamp
    }
  })
  return data.data
}

async function fetchPriceRanges(startTime) {
  const data = await fetchPriceRange(startTime)

  if (data.swaps.length === 0) {
    return [undefined, []]
  }

  const swaps = data.swaps.map(swap => ({
    id: swap.id,
    ts: swap.timestamp,
    amount0: swap.amount0,
    amount1: swap.amount1,
    sqrtPriceX96: BigNumber.from(swap.sqrtPriceX96)
  }))

  const nextTimestamp = swaps[swaps.length - 1].ts

  console.log(new Date(startTime * 1000).toLocaleString(), startTime, swaps[0].ts, nextTimestamp)

  return [nextTimestamp, swaps]
}

async function start() {
  const db = await AsyncDatabase.open('./db/prices.db')

  await db.run('CREATE TABLE IF NOT EXISTS pools(pool_id integer PRIMARY KEY, address varchar(42))')

  await db.run(`
  CREATE TABLE IF NOT EXISTS prices(
    id integer PRIMARY KEY,
    pool_id integer,
    timestamp integer,
    sqrt_price integer,
    FOREIGN KEY (pool_id)
       REFERENCES pools (pool_id) 
  )
  `)

  /*
  await db.run('INSERT INTO pools(pool_id, address) VALUES(?, ?)', [
    1,
    poolAddress
  ])
  */

  const row = await db.get('SELECT timestamp from prices ORDER BY timestamp desc LIMIT 1')

  console.log(row)

  let time = row ? row.timestamp : startTime

  while (true) {
    const result = await fetchPriceRanges(time)

    time = result[0]
    const data = result[1]

    if (data.length === 0) {
      break
    }

    for (let d of data) {
      const ts = Number(d.ts)
      const id = Math.floor(ts / 60)
      const sqrtPrice = d.sqrtPriceX96.mul('1000000000000').div(X96)

      await db.run('INSERT INTO prices(id, pool_id, timestamp, sqrt_price) VALUES(?, ?, ?, ?) ON CONFLICT(id) do update set sqrt_price = ?', [
        id,
        1,
        ts,
        sqrtPrice.toNumber(),
        sqrtPrice.toNumber()
      ])
    }
  }
}

start()