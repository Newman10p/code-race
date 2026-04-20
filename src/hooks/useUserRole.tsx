import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "setter" | "learner" | "admin";

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
    })();
  }, [user, authLoading]);

  const isSetter = roles.includes("setter") || user?.email === "bulegafarid@gmail.com";
  const isLearner = roles.includes("learner");

  return { roles, isSetter, isLearner, loading: loading || authLoading };
}
