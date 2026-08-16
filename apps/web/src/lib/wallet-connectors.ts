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
 * Ready mobile connector (StarknetKit docs call this ReadyConnector from
 * `starknetkit/ready` — that export is not in npm 3.4.3 yet; ArgentMobileConnector
 * is the shipped equivalent).
 *
 * Modes (https://www.starknetkit.com/docs/latest/connectors/ready):
 * - Desktop: QR
 * - Mobile system browser: app redirect (ready:// after our starknetkit patch)
 * - In-app browser: automatic injected connect
 *
 * @see https://www.starknetkit.com/docs/latest/connectors/ready
 * @see https://github.com/argentlabs/demo-dapp-starknet/blob/develop/src/connectors/index.ts
 */
export const isInReadyAppBrowser = isInArgentMobileAppBrowser;

const rpc =
  process.env.NEXT_PUBLIC_STARKNET_MAINNET_RPC || publicMainnetRpcFallback;

const chainId = useMainnet
  ? constants.NetworkName.SN_MAIN
  : constants.NetworkName.SN_SEPOLIA;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/** Ready docs prefer hostname; demo-dapp still passes full href. */
function dappUrl(): string {
  if (typeof window !== "undefined" && window.location.hostname) {
    return window.location.hostname;
  }
  return "philoxenia-iota.vercel.app";
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
      ...(projectId ? { projectId } : {}),
    },
    inAppBrowserOptions: {},
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

/**
 * Standalone Ready connector list per StarknetKit Ready docs:
 * in-app → Ready only; otherwise extension + Ready mobile.
 */
export function availableConnectors(): Connector[] {
  if (typeof window !== "undefined" && isInReadyAppBrowser()) {
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

  if (isInReadyAppBrowser()) {
    return connectors.find((c) => c.id === "argentMobile") ?? connectors[0];
  }

  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Mobile system browser → Ready mobile (WalletConnect / app redirect).
  if (mobile) {
    return connectors.find((c) => c.id === "argentMobile") ?? connectors[0];
  }

  const injected = connectors.find((c) => c.id === "argentX");
  if (injected?.available()) return injected;
  return connectors.find((c) => c.id === "argentMobile") ?? injected;
}
