import { ImageUploadForm } from "@/app/components/ImageUploadForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-[var(--foreground)]">
          Upload
        </h1>
        <ImageUploadForm />
      </div>
    </main>
  );
}
