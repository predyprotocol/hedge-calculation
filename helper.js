
module.exports.calculateMinCollateral = function (
  positions,
  n0,
  n1,
  underlyingPrice,
  minMargin
) {
  const alpha = 0.05
  const minCollateral =
    alpha *
    underlyingPrice *
    (Math.abs(
      (2 * underlyingPrice * (1 + n1) * positions[1]) / 10000 +
      (1 + n0) * positions[0]
    ) +
      (2 * alpha * underlyingPrice * (1 + n1) * Math.abs(positions[1])) / 10000)
  if (minCollateral < minMargin) {
    return minMargin
  }
  return minCollateral
}

module.exports.calculatePositionValueOfSubVault = function (
  positions,
  entryPrices,
  tradePrice0,
  tradePrice1,
  fundingEntries,
  fundingFeePerPosition0,
  fundingFeePerPosition1
) {
  const perpetualValue =
    positions[0] * (tradePrice0 - entryPrices[0]) +
    positions[1] * (tradePrice1 - entryPrices[1])

  const fundingPaid =
    positions[0] * (fundingEntries[0] - fundingFeePerPosition0) +
    positions[1] * (fundingEntries[1] - fundingFeePerPosition1)

  return perpetualValue + fundingPaid
}

module.exports.calculatePositionValue = function (
  positions,
  entryPrices,
  tradePrice0,
  tradePrice1,
  fundingEntries,
  fundingFeePerPosition0,
  fundingFeePerPosition1,
  margin
) {
  const perpetualValue =
    positions[0] * (tradePrice0 - entryPrices[0]) +
    positions[1] * (tradePrice1 - entryPrices[1])

  const fundingPaid =
    positions[0] * (fundingEntries[0] - fundingFeePerPosition0) +
    positions[1] * (fundingEntries[1] - fundingFeePerPosition1)

  return perpetualValue + fundingPaid + margin
}

module.exports.updateEntryPrice = function (
  entryPrice,
  position,
  tradePrice,
  positionTrade
) {
  let newEntryPrice = 0
  let profitValue = 0

  const newPosition = position + positionTrade

  if (positionTrade === 0) {
    return {
      newEntryPrice: entryPrice,
      profitValue: 0
    }
  }

  if (
    position === 0 ||
    (position > 0 && positionTrade > 0) ||
    (position < 0 && positionTrade < 0)
  ) {
    newEntryPrice =
      (entryPrice * Math.abs(position) + tradePrice * Math.abs(positionTrade)) /
      Math.abs(position + positionTrade)
  } else if (
    (position > 0 && positionTrade < 0 && newPosition > 0) ||
    (position < 0 && positionTrade > 0 && newPosition < 0)
  ) {
    newEntryPrice = entryPrice
    profitValue = -positionTrade * (tradePrice - entryPrice)
  } else {
    if (newPosition != 0) {
      newEntryPrice = tradePrice
    }

    profitValue = position * (tradePrice - entryPrice)
  }

  return {
    newEntryPrice,
    profitValue
  }
}
