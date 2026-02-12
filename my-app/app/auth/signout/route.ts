import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  for (const { name } of all) {
    if (name.startsWith("sb-")) {
      cookieStore.set(name, "", { maxAge: 0, path: "/" });
    }
  }

  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/login", url.origin));
}
