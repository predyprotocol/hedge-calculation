const { BigNumber } = require("ethers")
const { AsyncDatabase } = require("promised-sqlite3");

const startTime = 1679525993
const endTime = 1692722815
const PARTITIONS = 8
// 0.28%
const ESTIMATED_SLIPPAGE = 0.28

main().then()

function getDate(timestamp) {
  return new Date(timestamp).toLocaleString()
}

async function main() {
  const db = await AsyncDatabase.open('./db/prices.db')

  /*
  await db.run(`
  CREATE TABLE IF NOT EXISTS hedge_pnls(
    id varchar(64) PRIMARY KEY,
    pool_id integer,
    span integer,
    offset integer,
    timestamp integer,
    pnl integer,
    FOREIGN KEY (pool_id)
       REFERENCES pools (pool_id) 
  )
  `)
  */

  console.log(
    `from ${getDate(startTime)} to ${getDate(endTime)}`
  )

  console.log(
    ['span',
      'min',
      'max',
      'average',
    ].join(',')
  )

  const spans = [1, 2, 3, 4, 5, 6, 7, 8].map(x => x * 60 * 60 * 12)
  const outputs = []

  for (let span of spans) {
    const output = await generateOutput(db, span, PARTITIONS)
    outputs.push(output)
  }

  for (let output of outputs) {
    console.log(
      [output.span,
      output.min.toString(),
      output.max.toString(),
      output.average.toString()
      ].join(',')
    )
  }
}

async function generateOutput(db, span, partitions) {
  const offset = span / partitions

  const pnls = []

  for (let i = 0; i < partitions; i++) {
    const pnl = await calculatePnLByHedge(db, span, offset * i)
    pnls.push(pnl.toNumber())
  }

  return {
    span,
    max: Math.max(...pnls),
    min: Math.min(...pnls),
    average: pnls.reduce((acc, i) => acc + i, 0) / partitions
  }
}

async function calculatePnLByHedge(db, span, offset) {
  const timestamps = createTimestamps(
    startTime + offset,
    span
  )
  // console.log('start', span, offset, timestamps[timestamps.length - 1])

  // console.log(timestamps)
  let beforeSqrtPrice = null
  let totalPnL = BigNumber.from(0)

  for (let t of timestamps) {
    const swap = await getSwap(db, t)

    if (!swap) {
      continue
    }

    const sqrtPrice = BigNumber.from(swap.sqrtPrice)

    if (beforeSqrtPrice) {
      const tradeSqrtPrice = calculateTradePrice(beforeSqrtPrice, sqrtPrice)

      const pnl = calculatePnL(beforeSqrtPrice, tradeSqrtPrice)
      totalPnL = totalPnL.add(pnl)

      // console.log(tradeSqrtPrice.mul(tradeSqrtPrice).div(X96).mul(1000000000000).div(X96).toString())
      /*
      await db.run('INSERT INTO hedge_pnls(id, pool_id, span, offset, timestamp, pnl) VALUES(?, ?, ?, ?, ?, ?)', [
        1 + '-' + span + '-' + offset + '-' + t,
        1,
        span,
        offset,
        t,
        pnl.toNumber()
      ])
      */

      beforeSqrtPrice = tradeSqrtPrice
    } else {
      beforeSqrtPrice = sqrtPrice
    }
  }

  return totalPnL
}

function createTimestamps(start, span) {
  const outputs = []

  for (let i = start; i < endTime; i += span) {
    outputs.push(i)
  }

  outputs.push(endTime)

  return outputs
}

async function getSwap(db, ts) {
  const row = await db.get('SELECT * from prices WHERE pool_id = ? AND timestamp < ? ORDER BY timestamp desc LIMIT 1', [1, ts])
  // console.log(ts, row)

  if (row) {
    return {
      sqrtPrice: row.sqrt_price
    }
  }
}



function calculateTradePrice(sqrtPrice1, sqrtPrice2) {
  const resolution = 1000000
  const sqrtEstimatedSlippage = BigNumber.from(Math.floor(resolution * Math.sqrt(100 + ESTIMATED_SLIPPAGE) / 10))

  if (sqrtPrice1.gt(sqrtPrice2)) {
    return sqrtPrice2.mul(resolution).div(sqrtEstimatedSlippage)
  } else {
    return sqrtPrice2.mul(sqrtEstimatedSlippage).div(resolution)
  }
}


function calculatePnL(sqrtPrice1, sqrtPrice2) {
  return (sqrtPrice2.sub(sqrtPrice2.mul(sqrtPrice2).div(sqrtPrice1.mul(2)))).sub(sqrtPrice1.div(2))
}
