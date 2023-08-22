// TODO
// 修正済み-> *　本来はSubVault毎にentryPriceなどを分けて、PositionValueを計算しなければいけません。
// 分けて計算しなくても、PositionValueの値は同じになりますが、positionUSDCが実際の値と異なることになります。
// * AMMのスプレッドはまだ反映できていません。

const { BigNumber } = require("ethers")
const fs = require('fs')

// load event data
const swaps = require("./events/prices.json")

// swaps.sort((a, b) => Number(a.ts) - Number(b.ts))

const startTime = 1690300000


generateOutput()

function generateOutput() {
  const timestamps = createTimestamps(
    startTime,
    60 * 60 * 24
  )
  timestamps.map((t) => {
    const swap = getSwap(t)
  })

  fs.writeFileSync(`output/vault${vaultId}.json`, JSON.stringify(data, undefined, 2))
}

function createTimestamps(start, span) {
  const outputs = []
  const now = new Date()

  for (let i = start; i < now; i += span) {
    outputs.push(i)
  }

  return outputs
}

function getSwap(swaps, ts) {
  const befores = swaps.filter(swap => swap.ts < ts)

  return befores[befores.length - 1]
}

function calculatePnL(sqrtPrice1, sqrtPrice2) {
  return (sqrtPrice2 - sqrtPrice2 / (2 * sqrtPrice1)) - sqrtPrice1 / 2
}
