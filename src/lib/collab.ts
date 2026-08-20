import { supabase } from "@/integrations/supabase/client";

export async function myDisplayName(userId: string, fallbackEmail?: string | null) {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.display_name || data?.email || fallbackEmail || "Student";
}

/** Append an administrative/moderation action to the immutable audit log. */
export async function logAdminAction(params: {
  actorId: string;
  actorName: string;
  action: string;
  reason: string;
  targetType?: string;
  targetId?: string | null;
  targetLabel?: string | null;
  result?: string;
}) {
  await supabase.from("admin_audit_log").insert({
    actor_id: params.actorId,
    actor_name: params.actorName,
    action: params.action,
    reason: params.reason,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    target_label: params.targetLabel ?? null,
    result: params.result ?? "applied",
  });
}

export const REPORT_CATEGORIES = [
  "harassment",
  "bullying",
  "threatening behaviour",
  "inappropriate content",
  "spam",
  "impersonation",
  "hate or abusive content",
  "unsafe behaviour",
  "other",
] as const;