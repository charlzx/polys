"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface UserAlert {
  id: string;
  user_id: string;
  name: string;
  alert_type: "odds" | "volume" | "new" | "arbitrage";
  market_id: string | null;
  market_name: string | null;
  condition_text: string | null;
  threshold: number;
  delivery_email: boolean;
  status: "active" | "paused" | "triggered";
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

export interface CreateAlertInput {
  name: string;
  alert_type: "odds" | "volume" | "new" | "arbitrage";
  market_name: string;
  threshold: number;
  delivery_email: boolean;
}

export function useAlerts(userId: string | undefined) {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!userId) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error: err } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setAlerts((data ?? []) as UserAlert[]);
    }
    setIsLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const createAlert = useCallback(
    async (input: CreateAlertInput): Promise<string | null> => {
      if (!userId) return "Not authenticated";

      const conditionText = buildConditionText(input);
      const { error: err } = await supabase.from("alerts").insert({
        user_id: userId,
        name: input.name,
        alert_type: input.alert_type,
        market_name: input.market_name,
        condition_text: conditionText,
        threshold: input.threshold,
        delivery_email: input.delivery_email,
        status: "active",
      });

      if (err) return err.message;
      await loadAlerts();
      return null;
    },
    [supabase, userId, loadAlerts]
  );

  const toggleAlert = useCallback(
    async (id: string, currentStatus: string): Promise<void> => {
      const newStatus = currentStatus === "active" ? "paused" : "active";
      await supabase.from("alerts").update({ status: newStatus }).eq("id", id);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: newStatus as UserAlert["status"] } : a
        )
      );
    },
    [supabase]
  );

  const deleteAlert = useCallback(
    async (id: string): Promise<void> => {
      await supabase.from("alerts").delete().eq("id", id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    },
    [supabase]
  );

  return { alerts, isLoading, error, createAlert, toggleAlert, deleteAlert, reload: loadAlerts };
}

function buildConditionText(input: CreateAlertInput): string {
  switch (input.alert_type) {
    case "odds":
      return `When YES odds drop below ${input.threshold}%`;
    case "volume":
      return `When 24h volume exceeds $${input.threshold}k`;
    case "new":
      return `When a new market matching "${input.market_name}" is created`;
    case "arbitrage":
      return `When arbitrage spread exceeds ${input.threshold}%`;
    default:
      return `Threshold: ${input.threshold}%`;
  }
}
