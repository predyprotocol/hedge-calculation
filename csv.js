const { BigNumber } = require("ethers")

const { AsyncDatabase } = require("promised-sqlite3");

const startTime = 1675000000
const endTime = 1692730000

const X128 = BigNumber.from(2).pow(128)
const BLOCK_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-one-blocks'
const UNISWAP_SUBGRAPH_ENDPOINT_ARBITRUM =
  'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal'

const poolAddress = '0xc31e54c7a869b9fcbecc14363cf510d1c41fa443'

const GET_BLOCKS = (timestamps) => {
  let queryString = 'query blocks {'
  queryString += timestamps.map(timestamp => {
    return `t${timestamp}:blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: { timestamp_gt: ${timestamp}, timestamp_lt: ${timestamp + 600
      } }) {
        number
      }`
  })
  queryString += '}'
  return queryString
}

async function queryBlock(timestamps) {
  const body = {
    operationName: 'blocks',
    query: GET_BLOCKS(timestamps),
    variables: {}
  }

  const res = await fetch(BLOCK_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(body)
  })

  return await res.json()
}


async function queryPoolDayData(
  poolAddress,
  block
) {
  const body = {
    operationName: 'pools',
    query: `query pools($address: Bytes!) {
        pools(
          where: {id: $address}
          ${block ? `block: {number: ${block}} ,` : ''}
          subgraphError: allow
        ) {
          feeGrowthGlobal0X128
          feeGrowthGlobal1X128
      }
    }`,
    variables: { address: poolAddress.toLowerCase() }
  }

  const res = await fetch(UNISWAP_SUBGRAPH_ENDPOINT_ARBITRUM, {
    method: 'POST',
    body: JSON.stringify(body)
  })

  return res.json()
}

async function main() {
  /*
  const results = await queryBlock([startTime, endTime])
  const blocks = []

  for (const t in results.data) {
    if (results.data[t].length > 0) {
      const number = results.data[t][0]['number']
      const deploymentBlock = 0
      const adjustedNumber =
        number > deploymentBlock ? number : deploymentBlock

      blocks.push({
        timestamp: t.split('t')[1],
        number: Number(adjustedNumber)
      })
    }
  }

  const start = await queryPoolDayData(
    poolAddress,
    blocks[0].number
  )
  const end = await queryPoolDayData(
    poolAddress,
    blocks[1].number
  )

  console.log(start, end)
  */

  //const db = await AsyncDatabase.open('./db/prices.db')

  //const rows = await db.all('SELECT * from hedge_pnls WHERE pool_id = ? AND span = ? ORDER BY timestamp desc', [1, 60 * 60 * 12])

  //console.log(rows)

  const startUSDC = BigNumber.from('1754488862716629003463399447254083')
  const endUSDC = BigNumber.from('1874139669102204409691699663132241')
  const startETH = BigNumber.from('906020848684588300841618068762837866720605')
  const endETH = BigNumber.from('971059922970796836109204477164758409258275')
  const usdc = endUSDC.sub(startUSDC).mul('1000000000000').div(2).div(X128)
  const eth = endETH.sub(startETH).mul('1000000000000').div(2).div(X128)

  const price = '1820000000'

  const fee = eth.mul(price).div('1000000000000000000').add(usdc)

  console.log(usdc, eth, fee.toString())

}

main().then()

/*
{
  "data": {
    "uniFeeGrowthHourlies": [
      {
        "address": "0xc31e54c7a869b9fcbecc14363cf510d1c41fa443",
        "createdAt": "1679524148",
        "feeGrowthGlobal0X128": "906020848684588300841618068762837866720605",
        "feeGrowthGlobal1X128": "1754488862716629003463399447254083",
        "updatedAt": "1679525993"
      }
    ]
  }
}

{
  "data": {
    "uniFeeGrowthHourlies": [
      {
        "id": "0xc31e54c7a869b9fcbecc14363cf510d1c41fa443-1692723600",
        "address": "0xc31e54c7a869b9fcbecc14363cf510d1c41fa443",
        "feeGrowthGlobal0X128": "971059922970796836109204477164758409258275",
        "feeGrowthGlobal1X128": "1874139669102204409691699663132241",
        "createdAt": "1692723609"
      }
    ]
  }
}
*/