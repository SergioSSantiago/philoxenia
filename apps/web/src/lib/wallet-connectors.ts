import { type Connector } from "@starknet-react/core";
import {
  ArgentMobileConnector,
  isInArgentMobileAppBrowser,
} from "starknetkit/argentMobile";
import { InjectedConnector } from "starknetkit/injected";
import { constants } from "starknet";
import { publicMainnetRpcFallback } from "@philoxenia/shared";
import { useMainnet } from "@/lib/starknet-config";

/**
 * Official Ready / StarknetKit wiring (published starknetkit still exports
 * ArgentMobileConnector; docs call the same thing ReadyConnector).
 *
 * @see https://www.starknetkit.com/docs/latest/connectors/ready
 * @see https://github.com/argentlabs/demo-dapp-starknet/blob/develop/src/connectors/index.ts
 */
const rpc =
  process.env.NEXT_PUBLIC_STARKNET_MAINNET_RPC || publicMainnetRpcFallback;

const chainId = useMainnet
  ? constants.NetworkName.SN_MAIN
  : constants.NetworkName.SN_SEPOLIA;

function dappUrl(): string {
  // Official demo-dapp uses the full page URL with ArgentMobileConnector.
  // (ReadyConnector docs ask for hostname; that export is not in npm 3.4.x yet.)
  if (typeof window !== "undefined" && window.location.href) {
    return window.location.href;
  }
  return "https://philoxenia-iota.vercel.app";
}

function readyMobileConnector() {
  return ArgentMobileConnector.init({
    options: {
      dappName: "Philoxenia",
      url: dappUrl(),
      chainId,
      description: "Private P2P hospitality on Starknet",
      icons: ["https://philoxenia-iota.vercel.app/philoxenia-mark.png"],
      rpcUrl: rpc,
    },
  }) as Connector;
}

function readyExtensionConnector() {
  return new InjectedConnector({
    options: {
      id: "argentX",
      name: "Ready Wallet (formerly Argent)",
    },
  }) as Connector;
}

export function availableConnectors(): Connector[] {
  // In Ready’s in-app browser, only the mobile connector (injected path).
  if (typeof window !== "undefined" && isInArgentMobileAppBrowser()) {
    return [readyMobileConnector()];
  }

  return [readyExtensionConnector(), readyMobileConnector()];
}

export const PHILOXENIA_CONNECTORS = availableConnectors();

export function pickReadyConnector(
  connectors: Connector[]
): Connector | undefined {
  if (typeof window === "undefined") {
    return connectors[0];
  }

  if (isInArgentMobileAppBrowser()) {
    return connectors.find((c) => c.id === "argentMobile") ?? connectors[0];
  }

  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (mobile) {
    return connectors.find((c) => c.id === "argentMobile") ?? connectors[0];
  }

  const injected = connectors.find((c) => c.id === "argentX");
  if (injected?.available()) return injected;
  return connectors.find((c) => c.id === "argentMobile") ?? injected;
}
