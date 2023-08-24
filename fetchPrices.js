import { ethers, Contract } from "ethers"
import { AsyncDatabase } from "promised-sqlite3"

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc'

const abi = [
  "event Swap(address indexed sender,address indexed recipient,int256 amount0,int256 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick)"
]
const poolAddress = '0xc31e54c7a869b9fcbecc14363cf510d1c41fa443'
const FROM_BLOCK = 124400526
const FEE_TIER = 5n

const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC)

const contract = new Contract(poolAddress, abi, provider)


async function start() {
  /*
  const db = await AsyncDatabase.open('./db/prices.db')

  await db.run('CREATE TABLE IF NOT EXISTS pools(pool_id integer PRIMARY KEY, address varchar(42))')

  await db.run(`
  CREATE TABLE IF NOT EXISTS prices(
    id varchar(96) PRIMARY KEY,
    pool_id integer,
    timestamp integer,
    fee0 varchar(48),
    fee1 varchar(48),
    sqrt_price varchar(48),
    FOREIGN KEY (pool_id)
       REFERENCES pools (pool_id) 
  )
  `)
  */

  let blockNumber = await provider.getBlockNumber()

  console.log(blockNumber)

  const poolId = 1

  const blockTimes = []

  async function getTimestamp(event) {
    if (blockTimes[event.blockNumber]) {
      return blockTimes[event.blockNumber]
    } else {
      const block = await event.getBlock()
      blockTimes[event.blockNumber] = block.timestamp
      return block.timestamp
    }
  }

  while (blockNumber > FROM_BLOCK) {
    const from = blockNumber - 5000
    const to = blockNumber
    const events = await contract.queryFilter('Swap', from, to)

    const prices = {}

    for (let event of events) {
      const amount0 = event.args[2]
      const amount1 = event.args[3]
      const sqrtPriceX96 = event.args[4]
      const liquidity = event.args[5]

      const fee0 = amount0 > 0 ? amount0 * FEE_TIER / 10000n : 0n
      const fee1 = amount1 > 0 ? amount1 * FEE_TIER / 10000n : 0n

      const fee0PerLiquidity = fee0 * (2n ** 96n) / liquidity
      const fee1PerLiquidity = fee1 * (2n ** 96n) / liquidity
      const sqrtPrice = sqrtPriceX96

      const blockTime = await getTimestamp(event)

      const id = poolId + '-' + Math.floor(blockTime / 60)

      const price = prices[id] || {
        id,
        timestamp: blockTime,
        fee0PerLiquidity: 0n,
        fee1PerLiquidity: 0n,
        sqrtPrice: 0n
      }

      prices[id] = {
        id,
        timestamp: blockTime,
        fee0PerLiquidity: price.fee0PerLiquidity + fee0PerLiquidity,
        fee1PerLiquidity: price.fee1PerLiquidity + fee1PerLiquidity,
        sqrtPrice
      }
    }

    for (let price of Object.values(prices)) {
      console.log(
        price.id,
        price.timestamp,
        price.fee0PerLiquidity,
        price.fee1PerLiquidity,
        price.sqrtPrice
      )

      /*
          await db.run('INSERT INTO prices(id, pool_id, timestamp, amount0, amount1, sqrt_price) VALUES(?, ?, ?, ?, ?, ?)', [
      id,
      1,
      block.timestamp,
      d.amount0,
      d.amount1,
      d.sqrtPriceX96.toHexString()
    ])
ç
      */

    }



    // console.log(events)

    blockNumber = from - 1
  }

}

start()
