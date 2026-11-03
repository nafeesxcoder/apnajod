export function canAfford(balance: number, cost: number) {
  return Number.isFinite(balance) && Number.isFinite(cost) && balance >= cost && cost > 0;
}

export function spendCoins(balance: number, cost: number) {
  return canAfford(balance, cost) ? balance - cost : balance;
}

