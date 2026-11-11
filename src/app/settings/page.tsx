import { logoutAction } from "@/app/actions";
import { PushSetup } from "@/components/PushSetup";
import { SettingsForm } from "@/components/SettingsForm";
import { Card } from "@/components/ui";
import { nowIST, prettyDate } from "@/lib/core/dates";
import * as repo from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, log] = await Promise.all([repo.getSettings(), repo.recentCookMessages(15)]);
  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <PushSetup vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      <SettingsForm settings={settings} />
      <Card>
        <h2 className="mb-2 font-semibold">Messages with the cook</h2>
        {log.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
        <ul className="space-y-2 text-sm">
          {log.map((m) => {
            const n = nowIST(new Date(m.createdAt));
            return (
              <li key={m.id} className="rounded-lg bg-soft p-2">
                <div className="text-xs text-muted">{m.direction === "out" ? "Sent" : "Reply"} · {m.kind} · {prettyDate(n.date)} {n.hhmm}</div>
                <div className="line-clamp-3 whitespace-pre-wrap">{m.text}</div>
              </li>
            );
          })}
        </ul>
      </Card>
      <form action={logoutAction}>
        <button className="h-12 w-full rounded-xl border border-line text-muted">Log out of this phone</button>
      </form>
    </div>
  );
}
