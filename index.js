// TODO
// 修正済み-> *　本来はSubVault毎にentryPriceなどを分けて、PositionValueを計算しなければいけません。
// 分けて計算しなくても、PositionValueの値は同じになりますが、positionUSDCが実際の値と異なることになります。
// * AMMのスプレッドはまだ反映できていません。

const { BigNumber } = require("ethers")
const fs = require('fs')

// load event data
const swaps = require("./events/prices.json")

// swaps.sort((a, b) => Number(a.ts) - Number(b.ts))

const startTime = 1685600000
const X96 = BigNumber.from(2).pow(96)


generateOutput(60 * 60 * 12)
generateOutput(60 * 60 * 24)
generateOutput(60 * 60 * 24 * 2)
generateOutput(60 * 60 * 24 * 3)

function generateOutput(swap) {
  const timestamps = createTimestamps(
    startTime,
    swap

  )
  // console.log(timestamps)
  let beforeSqrtPrice = null
  let totalPnL = BigNumber.from(0)
  timestamps.forEach((t) => {
    const swap = getSwap(swaps, t)

    if (!swap) {
      return
    }

    const sqrtPrice = BigNumber.from(swap.sqrtPriceX96)

    if (beforeSqrtPrice) {
      const tradeSqrtPrice = calculateTradePrice(beforeSqrtPrice, sqrtPrice)

      const pnl = calculatePnL(beforeSqrtPrice, tradeSqrtPrice)
      totalPnL = totalPnL.add(pnl.mul('1000000000000').div(X96))

      console.log(tradeSqrtPrice.mul(tradeSqrtPrice).div(X96).mul(1000000000000).div(X96).toString())

      beforeSqrtPrice = tradeSqrtPrice
    } else {
      beforeSqrtPrice = sqrtPrice
    }
  })

  console.log(totalPnL.toString())
}

function createTimestamps(start, span) {
  const outputs = []
  const now = (new Date()).getTime() / 1000

  for (let i = start; i < now; i += span) {
    outputs.push(i)
  }

  return outputs
}

function getSwap(swaps, ts) {
  const befores = swaps.filter(swap => swap.ts < ts)

  return befores[befores.length - 1]
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
