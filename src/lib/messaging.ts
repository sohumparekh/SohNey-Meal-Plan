// How messages reach the cook. Phase 1 opens WhatsApp on our phone with the text
// prefilled; we tap Send. Phase 2 (later) sends through the official WhatsApp Business
// Cloud API with approved templates. Screens only use `cookChannel()`, so switching is
// a configuration change.

import { waLink } from "./core/cookMessages";

export type Delivery = { mode: "link"; url: string } | { mode: "sent"; id: string };

export interface CookChannel {
  readonly name: "wa_link" | "cloud_api";
  deliver(phone: string, text: string): Promise<Delivery>;
}

export class WaLinkChannel implements CookChannel {
  readonly name = "wa_link" as const;
  async deliver(phone: string, text: string): Promise<Delivery> {
    return { mode: "link", url: waLink(phone, text) };
  }
}

/**
 * Phase 2 placeholder. Business-initiated messages outside the 24-hour window must use
 * pre-approved utility templates (daily menu, dinner reminder, menu change, item missing),
 * so this needs: a Meta Business account, a sender number, approved templates, and the
 * env vars WA_PHONE_NUMBER_ID / WA_ACCESS_TOKEN. Not enabled until Phase 1 has run a week.
 */
export class CloudApiChannel implements CookChannel {
  readonly name = "cloud_api" as const;
  async deliver(): Promise<Delivery> {
    throw new Error("WhatsApp Cloud API is not set up yet (Phase 2)");
  }
}

export function cookChannel(): CookChannel {
  return process.env.WHATSAPP_MODE === "cloud_api" ? new CloudApiChannel() : new WaLinkChannel();
}
