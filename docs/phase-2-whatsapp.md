# Phase 2: automatic WhatsApp (after Phase 1 has run for a week)

Phase 1 needs one tap a night. Phase 2 sends the messages by itself through Meta's
official WhatsApp Business Cloud API and reads Vimal's replies automatically.

## What's needed

1. A **Meta Business account** and a phone number for the "kitchen" sender. Simplest: a
   cheap prepaid SIM used only for this. (Meta also offers "coexistence", where a number
   keeps running in the WhatsApp Business app while connected to the API.)
2. In Meta's WhatsApp Manager, **utility templates** with quick-reply buttons
   (OK / Item missing / Plan B):
   - `daily_menu`: tomorrow's three meals + Plan Bs + prep note
   - `dinner_reminder`, `menu_change`, `item_missing_confirm`
   Business-initiated messages outside the 24-hour customer window must use approved
   templates; free-form replies are fine inside the window.
3. Env vars: `WHATSAPP_MODE=cloud_api`, `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`,
   `WA_VERIFY_TOKEN`, and a webhook URL (`/api/whatsapp/webhook`, to be added) registered in
   the Meta app.

## Code changes

- `src/lib/messaging.ts`: implement `CloudApiChannel.deliver()` (template send). Screens
  and jobs already go through `cookChannel()`, so nothing else changes for sending.
- Nightly job: when the channel is `cloud_api`, send instead of notifying us.
- Webhook route: verify the signature, store the message in `cook_messages`, run
  `parseCookReply()` (with `readCookReply()` from `src/lib/ai.ts` as fallback for free
  text) and apply it exactly as the "Vimal replied?" box does today. Voice notes: save
  and notify us.

## Cost (check current rates in Meta's pricing docs before starting)

The brief's estimate was about ₹0.145 per delivered utility template in India, with
service replies inside the 24-hour window free up to a monthly allowance. At 60 to 70
messages a month that is around ₹10 a month. These rates could not be checked from the
build machine, so confirm them on Meta's pricing page first.
