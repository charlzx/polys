"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useAlerts, type CreateAlertInput } from "@/hooks/useAlerts";
import {
  Bell,
  Plus,
  TrendUpIcon,
  Lightning,
  Trash,
  Envelope,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { alertTypes } from "@/data/alerts";

const ALERT_TYPE_LABELS: Record<string, string> = {
  odds: "Odds Movement",
  volume: "Volume Spike",
  new: "New Market",
  arbitrage: "Arbitrage",
};

const ALERTS_TEMPORARILY_DISABLED = true;
const ALERTS_DISABLED_MESSAGE = "Alerts are temporarily unavailable while we complete backend maintenance.";

export default function AlertsPage() {
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });
  const { user } = useAuth();
  const { alerts, isLoading, error, createAlert, toggleAlert, deleteAlert } = useAlerts(
    user?.id
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<{
    name: string;
    type: "odds" | "volume" | "new";
    market: string;
    threshold: number[];
    deliveryEmail: boolean;
  }>({
    name: "",
    type: "odds",
    market: "",
    threshold: [10],
    deliveryEmail: true,
  });

  if (!shouldShowContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const triggeredToday = alerts.filter((a) => {
    if (!a.last_triggered_at) return false;
    const d = new Date(a.last_triggered_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const stats = [
    { label: "Total Alerts", value: String(alerts.length), Icon: Bell },
    { label: "Active", value: String(activeCount), Icon: Lightning },
    { label: "Triggered Today", value: String(triggeredToday), Icon: TrendUpIcon },
  ];

  async function handleCreate() {
    if (ALERTS_TEMPORARILY_DISABLED) {
      setCreateError(ALERTS_DISABLED_MESSAGE);
      return;
    }

    setCreateError(null);
    if (!newAlert.name.trim()) {
      setCreateError("Please enter a name for the alert.");
      return;
    }
    if (!newAlert.market.trim()) {
      setCreateError("Please enter a market name or keyword.");
      return;
    }
    setIsSubmitting(true);
    const input: CreateAlertInput = {
      name: newAlert.name.trim(),
      alert_type: newAlert.type,
      market_name: newAlert.market.trim(),
      threshold: newAlert.threshold[0],
      delivery_email: newAlert.deliveryEmail,
    };
    const err = await createAlert(input);
    setIsSubmitting(false);
    if (err) {
      setCreateError(err);
      return;
    }
    setIsCreateOpen(false);
    setNewAlert({ name: "", type: "odds", market: "", threshold: [10], deliveryEmail: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0 min-h-screen">
        <div className="container max-w-screen-2xl py-6 md:py-8 space-y-4 md:space-y-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-title md:text-display font-bold">Alerts</h1>
              <p className="text-small text-muted-foreground mt-1">
                Get notified by email when market conditions match your criteria
              </p>
              {ALERTS_TEMPORARILY_DISABLED && (
                <p className="text-caption text-muted-foreground mt-2">{ALERTS_DISABLED_MESSAGE}</p>
              )}
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button disabled={ALERTS_TEMPORARILY_DISABLED} title={ALERTS_DISABLED_MESSAGE}>
                  <Plus weight="bold" className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Alert</DialogTitle>
                  <DialogDescription>
                    Get an email when market conditions match your criteria
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="alert-name">Alert Name</Label>
                    <Input
                      id="alert-name"
                      placeholder="e.g., BTC price movement"
                      value={newAlert.name}
                      onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alert Type</Label>
                    <Select
                      value={newAlert.type}
                      onValueChange={(v) =>
                        setNewAlert({
                          ...newAlert,
                          type: v as "odds" | "volume" | "new",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {alertTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alert-market">Market Name / Keyword</Label>
                    <Input
                      id="alert-market"
                      placeholder={
                        newAlert.type === "new"
                          ? "e.g., crypto (keyword to watch for)"
                          : "e.g., Bitcoin to reach $150k"
                      }
                      value={newAlert.market}
                      onChange={(e) => setNewAlert({ ...newAlert, market: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {newAlert.type === "volume"
                        ? `Volume Threshold: $${newAlert.threshold[0]}k (24h)`
                        : `Threshold: ${newAlert.threshold[0]}%`}
                    </Label>
                    <Slider
                      value={newAlert.threshold}
                      onValueChange={(v) => setNewAlert({ ...newAlert, threshold: v })}
                      min={5}
                      max={newAlert.type === "volume" ? 500 : 50}
                      step={newAlert.type === "volume" ? 25 : 5}
                    />
                    <p className="text-caption text-muted-foreground">
                      {newAlert.type === "odds" &&
                        `Fire when YES odds drop below ${newAlert.threshold[0]}%`}
                      {newAlert.type === "volume" &&
                        `Fire when 24h volume exceeds $${newAlert.threshold[0]}k`}
                      {newAlert.type === "new" && "Fire when a matching market is found"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="email-toggle"
                      checked={newAlert.deliveryEmail}
                      onCheckedChange={(v) => setNewAlert({ ...newAlert, deliveryEmail: v })}
                    />
                    <Label htmlFor="email-toggle" className="flex items-center gap-2 cursor-pointer">
                      <Envelope weight="regular" className="h-4 w-4" />
                      Email alerts to {user?.email ?? "your account email"}
                    </Label>
                  </div>
                  {createError && (
                    <p className="text-caption text-destructive">{createError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isSubmitting || ALERTS_TEMPORARILY_DISABLED}
                    title={ALERTS_DISABLED_MESSAGE}
                  >
                    {isSubmitting ? "Creating…" : "Create Alert"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4"
          >
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.Icon weight="duotone" className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-subtitle md:text-title font-bold">{stat.value}</div>
                  <div className="text-caption text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          <div className="border-t border-border my-2" />

          {/* Alerts List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-small text-destructive">
                  Failed to load alerts: {error}
                </p>
              </CardContent>
            </Card>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 text-center">
                <Bell weight="duotone" className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-subtitle font-semibold mb-2">No alerts yet</h3>
                <p className="text-small text-muted-foreground mb-4">
                  Create your first alert to stay informed about market movements
                </p>
                <Button disabled={ALERTS_TEMPORARILY_DISABLED} title={ALERTS_DISABLED_MESSAGE}>
                  <Plus weight="bold" className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                >
                  <Card className={
                    alert.status === "triggered"
                      ? "border-green-500/40"
                      : alert.status === "paused"
                      ? "opacity-60"
                      : ""
                  }>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Alert Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-caption">
                              {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                            </Badge>
                            {alert.last_triggered_at && (
                              <span className="text-caption text-muted-foreground flex items-center gap-1">
                                <Clock weight="regular" className="h-3 w-3" />
                                Last: {new Date(alert.last_triggered_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h3 className="text-small md:text-body font-medium">{alert.name}</h3>
                          <p className="text-caption text-muted-foreground truncate">
                            {alert.market_name}
                          </p>
                          <p className="text-caption text-muted-foreground">
                            {alert.condition_text}
                          </p>
                        </div>

                        {/* Delivery + Count */}
                        <div className="flex items-center gap-2 shrink-0">
                          {alert.delivery_email && (
                            <div className="p-1.5 rounded bg-secondary" title="Email alerts enabled">
                              <Envelope weight="regular" className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          {alert.trigger_count > 0 && (
                            <Badge variant="secondary" className="text-caption">
                              {alert.trigger_count}x
                            </Badge>
                          )}
                          {alert.status === "triggered" && (
                            <Badge className="text-caption bg-green-500/10 text-green-500 border-green-500/30">
                              <CheckCircle weight="fill" className="h-3 w-3 mr-1" />
                              Fired
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {alert.status === "triggered" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-caption"
                              onClick={() => toggleAlert(alert.id, alert.status)}
                              title="Re-arm this alert to watch for new triggers"
                            >
                              Re-arm
                            </Button>
                          ) : (
                            <Switch
                              checked={alert.status === "active"}
                              onCheckedChange={() => toggleAlert(alert.id, alert.status)}
                              title={alert.status === "active" ? "Pause alert" : "Activate alert"}
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteAlert(alert.id)}
                            title="Delete alert"
                          >
                            <Trash weight="regular" className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
