const { BigNumber } = require('ethers');
const fs = require('fs')
const { AsyncDatabase } = require("promised-sqlite3");


const startTime = 1675000000
const poolAddress = '0xc31e54c7a869b9fcbecc14363cf510d1c41fa443'

async function fetchPriceRange(timestamp) {
  const data = await client.query({
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

  await db.run(`
  CREATE TABLE IF NOT EXISTS price_per_minutes(
    id varchar(96) PRIMARY KEY,
    pool_id integer,
    timestamp integer,
    min_sqrt_price varchar(48),
    max_sqrt_price varchar(48),
    FOREIGN KEY (pool_id)
       REFERENCES pools (pool_id) 
  )
  `)

  const time = startTime

  while (true) {
    const row = await db.get('SELECT timestamp from prices WHERE ORDER BY timestamp desc LIMIT 1')

    const result = await fetchPriceRanges(time)

    time = result[0]
    const data = result[1]

    if (data.length === 0) {
      break
    }

    for (let d of data) {
      await db.run('INSERT INTO prices(id, pool_id, timestamp, amount0, amount1, sqrt_price) VALUES(?, ?, ?, ?, ?, ?)', [
        d.id,
        1,
        Number(d.ts),
        d.amount0,
        d.amount1,
        d.sqrtPriceX96.toHexString()
      ])
    }
  }
}

function createTimestamps(start, span) {
  const outputs = []
  const now = (new Date()).getTime() / 1000

  for (let i = start; i < now; i += span) {
    outputs.push(i)
  }

  return outputs
}

start()