/**
 * Account-level server functions. Uses supabaseAdmin only after verifying
 * the caller is the account owner via requireSupabaseAuth.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Domain rows cascade via FK ON DELETE CASCADE. Also clean storage.
    try {
      const { data: photos } = await supabaseAdmin
        .from("physique_photos")
        .select("storage_path")
        .eq("user_id", userId);
      const { data: reports } = await supabaseAdmin
        .from("blood_reports")
        .select("file_path")
        .eq("user_id", userId);
      const paths = (photos ?? []).map((p) => p.storage_path as string).filter(Boolean);
      const rpaths = (reports ?? []).map((p) => p.file_path as string).filter(Boolean);
      if (paths.length) await supabaseAdmin.storage.from("physique").remove(paths);
      if (rpaths.length) await supabaseAdmin.storage.from("bloodwork").remove(rpaths);
    } catch {
      // best-effort
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
