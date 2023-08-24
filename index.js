// TODO
// 修正済み-> *　本来はSubVault毎にentryPriceなどを分けて、PositionValueを計算しなければいけません。
// 分けて計算しなくても、PositionValueの値は同じになりますが、positionUSDCが実際の値と異なることになります。
// * AMMのスプレッドはまだ反映できていません。

const { BigNumber } = require("ethers")

const { AsyncDatabase } = require("promised-sqlite3");

const fs = require('fs')

// load event data
const swaps = require("./events/prices.json")

// swaps.sort((a, b) => Number(a.ts) - Number(b.ts))

const startTime = 1679525993
const endTime = 1692722815
const X96 = BigNumber.from(2).pow(96)


main().then()

async function main() {
  const db = await AsyncDatabase.open('./db/prices.db')

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

  await showOutput(db, 60 * 60 * 12)
  await showOutput(db, 60 * 60 * 24)
  await showOutput(db, 60 * 60 * 12 * 3)
  await showOutput(db, 60 * 60 * 24 * 2)
  await showOutput(db, 60 * 60 * 12 * 5)
  await showOutput(db, 60 * 60 * 24 * 3)
  await showOutput(db, 60 * 60 * 24 * 4)
  await showOutput(db, 60 * 60 * 24 * 5)
}

async function showOutput(db, span) {
  const output = await generateOutput(db, span)
  console.log(
    span,
    'min', output.min.toString(),
    'max', output.max.toString(),
    'average', output.average.toString()
  )
}

async function generateOutput(db, span) {
  const offset = span / 6
  const pnl0 = await calculatePnLByHedge(db, span, offset * 0)
  const pnl1 = await calculatePnLByHedge(db, span, offset * 1)
  const pnl2 = await calculatePnLByHedge(db, span, offset * 2)
  const pnl3 = await calculatePnLByHedge(db, span, offset * 3)
  const pnl4 = await calculatePnLByHedge(db, span, offset * 5)
  const pnl5 = await calculatePnLByHedge(db, span, offset * 6)

  return {
    max: Math.max(pnl0, pnl1, pnl2, pnl3, pnl4, pnl5),
    min: Math.min(pnl0, pnl1, pnl2, pnl3, pnl4, pnl5),
    average: pnl0.add(pnl1).add(pnl2).add(pnl3).add(pnl4).add(pnl5).div(6)
  }
}

async function calculatePnLByHedge(db, span, offset) {
  const timestamps = createTimestamps(
    startTime + offset,
    span
  )
  console.log('start', span, offset, timestamps[timestamps.length - 1])

  // console.log(timestamps)
  let beforeSqrtPrice = null
  let totalPnL = BigNumber.from(0)

  for (let t of timestamps) {
    const swap = await getSwap(db, t)

    if (!swap) {
      continue
    }

    const sqrtPrice = BigNumber.from(swap.sqrtPriceX96)

    if (beforeSqrtPrice) {
      const tradeSqrtPrice = calculateTradePrice(beforeSqrtPrice, sqrtPrice)

      const pnl = calculatePnL(beforeSqrtPrice, tradeSqrtPrice).mul('1000000000000').div(X96)
      totalPnL = totalPnL.add(pnl)

      // console.log(tradeSqrtPrice.mul(tradeSqrtPrice).div(X96).mul(1000000000000).div(X96).toString())
      await db.run('INSERT INTO hedge_pnls(id, pool_id, span, offset, timestamp, pnl) VALUES(?, ?, ?, ?, ?, ?)', [
        1 + '-' + span + '-' + offset + '-' + t,
        1,
        span,
        offset,
        t,
        pnl.toNumber()
      ])

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
    const sqrtPrice = BigNumber.from(row.sqrt_price)

    return {
      sqrtPriceX96: sqrtPrice
    }
  }
}



function calculateTradePrice(sqrtPrice1, sqrtPrice2) {
  const ratio = 998999
  if (sqrtPrice1.gt(sqrtPrice2)) {
    return sqrtPrice2.mul(ratio).div(1000000)
  } else {
    return sqrtPrice2.mul(1000000).div(ratio)
  }
}


function calculatePnL(sqrtPrice1, sqrtPrice2) {
  return (sqrtPrice2.sub(sqrtPrice2.mul(sqrtPrice2).div(sqrtPrice1.mul(2)))).sub(sqrtPrice1.div(2))
}
