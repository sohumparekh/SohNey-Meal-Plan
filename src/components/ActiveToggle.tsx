import { setDishActive } from "@/data/repo";
import { Switch } from "@/ui/glass";

export function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  return <Switch on={active} label="In rotation" onChange={(v) => setDishActive(id, v)} />;
}
