import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useBudgets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .order("category");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const upsertBudget = async (category: string, monthlyLimit: number) => {
    if (!user) return;
    const existing = budgets.find((b) => b.category === category);
    if (existing) {
      const { error } = await supabase
        .from("budgets")
        .update({ monthly_limit: monthlyLimit } as any)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("budgets")
        .insert({ user_id: user.id, category, monthly_limit: monthlyLimit } as any);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  };

  return { budgets, isLoading, upsertBudget, deleteBudget };
}
