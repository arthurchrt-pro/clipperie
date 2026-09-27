import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Seules les pages de l'espace client ont besoin de la session.
export const config = {
  matcher: ["/app/:path*"],
};
