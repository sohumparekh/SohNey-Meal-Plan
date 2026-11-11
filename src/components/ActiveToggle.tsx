import { useTransition } from "react";
import { setDishActive } from "@/data/repo";

export function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      role="switch"
      aria-checked={active}
      disabled={pending}
      onClick={() => start(() => setDishActive(id, !active))}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${active ? "bg-ok" : "bg-line"}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${active ? "left-7" : "left-1"}`} />
    </button>
  );
}
