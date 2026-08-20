import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "setter" | "learner" | "admin" | "patron";

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setRoles((data || []).map((r) => r.role as AppRole));
      setLoading(false);

      // Link any pending organisation membership invited by email to this account.
      if (user.email) {
        await supabase
          .from("organization_members")
          .update({ user_id: user.id })
          .is("user_id", null)
          .ilike("email", user.email);
      }
    })();
  }, [user, authLoading]);

  const isSetter = roles.includes("setter") || user?.email === "bulegafarid@gmail.com";
  const isLearner = roles.includes("learner");
  const isPatron = roles.includes("patron");
  const isAdmin = roles.includes("admin") || user?.email === "bulegafarid@gmail.com";

  return { roles, isSetter, isLearner, isPatron, isAdmin, loading: loading || authLoading };
}
