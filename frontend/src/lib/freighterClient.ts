"use client";

import {
  getAddress as freighterGetAddress,
  isAllowed as freighterIsAllowed,
  isConnected as freighterIsConnected,
  setAllowed as freighterSetAllowed,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

type FreighterTestApi = Partial<{
  isConnected: () => Promise<{ isConnected: boolean }>;
  isAllowed: () => Promise<{ isAllowed: boolean }>;
  setAllowed: () => Promise<{ isAllowed: boolean }>;
  getAddress: () => Promise<{ address: string }>;
  signTransaction: (xdr: string, opts?: { network?: string }) => Promise<{ signedTxXdr: string }>;
}>;

declare global {
  interface Window {
    __STELLARKRAAL_E2E__?: FreighterTestApi & {
      submitSignedXdr?: (signedXdr: string) => Promise<string> | string;
    };
  }
}

function getTestApi(): FreighterTestApi | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__STELLARKRAAL_E2E__;
}

export async function isConnected() {
  const mock = getTestApi();
  if (mock?.isConnected) return mock.isConnected();
  return freighterIsConnected();
}

export async function isAllowed() {
  const mock = getTestApi();
  if (mock?.isAllowed) return mock.isAllowed();
  return freighterIsAllowed();
}

export async function setAllowed() {
  const mock = getTestApi();
  if (mock?.setAllowed) return mock.setAllowed();
  return freighterSetAllowed();
}

export async function getAddress() {
  const mock = getTestApi();
  if (mock?.getAddress) return mock.getAddress();
  return freighterGetAddress();
}

export async function signTransaction(
  xdr: string,
  opts?: { network?: string; networkPassphrase?: string; address?: string }
) {
  const mock = getTestApi();
  if (mock?.signTransaction) return mock.signTransaction(xdr, opts);
  return freighterSignTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase ?? opts?.network,
    address: opts?.address,
  });
}
