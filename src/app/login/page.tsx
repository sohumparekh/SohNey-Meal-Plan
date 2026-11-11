import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-[80dvh] flex-col justify-center gap-6">
      <div>
        <div className="text-5xl">🍛</div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Ghar ka Menu</h1>
        <p className="text-muted">Enter the household passcode. This phone stays logged in for a year.</p>
      </div>
      <LoginForm next={next ?? "/"} />
    </div>
  );
}
