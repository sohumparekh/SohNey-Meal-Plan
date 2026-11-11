import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sohney.gharkamenu",
  appName: "Ghar ka Menu",
  webDir: "dist",
  // Keep the scheme/host fixed: the on-device database belongs to this origin, so
  // changing it would make an updated app start with empty data.
  server: { androidScheme: "https", hostname: "localhost" },
  plugins: {
    LocalNotifications: { smallIcon: "ic_stat_notify", iconColor: "#c2410c" },
  },
};
export default config;
