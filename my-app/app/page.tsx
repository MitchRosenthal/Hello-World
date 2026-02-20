import { Feed } from "@/app/components/Feed";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-[var(--foreground)]">
          Feed
        </h1>
        <Feed userId={user?.id ?? null} />
      </div>
    </main>
  );
}
