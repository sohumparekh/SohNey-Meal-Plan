// Tiny haptic taps that make the glass feel physical. No-ops in a browser.
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

const native = () => Capacitor.isNativePlatform();

export const haptic = {
  tap: () => { if (native()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); },
  press: () => { if (native()) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}); },
  select: () => { if (native()) Haptics.selectionChanged().catch(() => {}); },
  success: () => { if (native()) Haptics.notification({ type: NotificationType.Success }).catch(() => {}); },
  warn: () => { if (native()) Haptics.notification({ type: NotificationType.Warning }).catch(() => {}); },
};
