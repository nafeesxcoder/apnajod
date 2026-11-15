/** Your game coins, shared by Ludo, Games and the daily spinner. */
import { type GameWallet, coinsApi } from "../../api/coinsApi";

let wallet: GameWallet | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const walletStore = {
  get: () => wallet,
  set(next: GameWallet) {
    wallet = next;
    emit();
  },
  async refresh(token: string) {
    try {
      wallet = await coinsApi.wallet(token);
      emit();
    } catch {
      // Offline: keep what we had.
    }
    return wallet;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
