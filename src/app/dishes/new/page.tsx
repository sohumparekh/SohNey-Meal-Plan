import Link from "next/link";
import { NewDish } from "@/components/NewDish";

export default function NewDishPage() {
  return (
    <div className="space-y-4">
      <Link href="/dishes" className="text-sm text-muted">‹ Dishes</Link>
      <h1 className="text-2xl font-bold tracking-tight">Add a dish</h1>
      <p className="text-sm text-muted">Paste an Instagram or YouTube link, or type the dish name. The app drafts ingredients for 2, the cook&apos;s name for it, a short recipe and a Plan B. You check and save.</p>
      <NewDish />
    </div>
  );
}
