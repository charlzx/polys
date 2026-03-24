"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Palette,
  Check,
  Sun,
  Moon,
  Monitor,
  Warning,
  SignOut,
  Lock,
  Timer,
  TextAa,
  ArrowsDownUp,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";

const NAV_SECTIONS = [
  { id: "profile", label: "Profile", description: "Account details", icon: User },
  { id: "security", label: "Security", description: "Password & sessions", icon: Shield },
  { id: "notifications", label: "Notifications", description: "Email & push preferences", icon: Bell },
  { id: "billing", label: "Billing", description: "Subscription & plans", icon: CreditCard },
  { id: "appearance", label: "Appearance", description: "Theme & display", icon: Palette },
] as const;

type SectionId = (typeof NAV_SECTIONS)[number]["id"];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "UTC", label: "UTC" },
];

const PLANS = [
  {
    id: "free",
    name: "Explorer",
    price: "$0",
    period: "/month",
    features: ["Basic market browsing", "5 alerts/day", "7-day historical data"],
  },
  {
    id: "pro",
    name: "Trader",
    price: "$79",
    period: "/month",
    popular: true,
    features: ["Unlimited alerts", "Full historical data", "All markets", "Whale tracking"],
  },
  {
    id: "premium",
    name: "Professional",
    price: "$199",
    period: "/month",
    features: ["Real-time arbitrage", "Cross-platform scanning", "API access", "Priority support"],
  },
] as const;

function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch { /* ignore */ }
  }, [key]);

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch { /* ignore */ }
    },
    [key]
  );

  return [value, set];
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams?.get("tab");
  const activeSection: SectionId = (
    rawTab && NAV_SECTIONS.some((s) => s.id === rawTab) ? rawTab : "profile"
  ) as SectionId;
  const hasExplicitTab = !!rawTab;

  const { theme, setTheme } = useTheme();
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("UTC");
  const [profileEmail, setProfileEmail] = useState("");

  const [notifEmailAlerts, setNotifEmailAlerts] = useState(true);
  const [notifDailyDigest, setNotifDailyDigest] = useState(true);
  const [notifWeeklySummary, setNotifWeeklySummary] = useState(true);

  const [density, setDensity] = useLocalStorage<"comfortable" | "compact">("polys-density", "comfortable");
  const [fontSize, setFontSize] = useLocalStorage<"normal" | "large">("polys-font-size", "normal");

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || "");
    setProfileEmail(user.email || "");
  }, [user]);

  const loadProfilePrefs = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("timezone, email_alerts_enabled, portfolio_daily_digest, weekly_summary")
      .eq("id", user.id)
      .single();
    if (data) {
      if (data.timezone) setProfileTimezone(data.timezone);
      if (data.email_alerts_enabled !== null) setNotifEmailAlerts(data.email_alerts_enabled ?? true);
      if (data.portfolio_daily_digest !== null) setNotifDailyDigest(data.portfolio_daily_digest ?? true);
      if (data.weekly_summary !== null) setNotifWeeklySummary(data.weekly_summary ?? true);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    loadProfilePrefs();
  }, [loadProfilePrefs]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: profileName, timezone: profileTimezone })
      .eq("id", user.id);
    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved", description: "Your display name and timezone have been updated." });
    }
    setIsSavingProfile(false);
  };

  const handleToggle = useCallback(
    async (field: "email_alerts_enabled" | "portfolio_daily_digest" | "weekly_summary", value: boolean) => {
      if (!user?.id) return;
      const setters: Record<string, (v: boolean) => void> = {
        email_alerts_enabled: setNotifEmailAlerts,
        portfolio_daily_digest: setNotifDailyDigest,
        weekly_summary: setNotifWeeklySummary,
      };
      setters[field](value);
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", user.id);
      if (error) {
        setters[field](!value);
        toast({ title: "Save failed", description: "Could not update preference.", variant: "destructive" });
      }
    },
    [supabase, user?.id, toast]
  );

  const handleSendPasswordReset = async () => {
    if (!profileEmail) return;
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(profileEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setResetSent(true);
      toast({ title: "Email sent", description: "Check your inbox for a password reset link." });
    }
    setIsSendingReset(false);
  };

  const handleSignOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    await logout();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== profileEmail) {
      toast({ title: "Email mismatch", description: "The email you entered doesn't match.", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    await supabase.auth.signOut();
    toast({
      title: "Account deletion requested",
      description: "Contact support@polys.app to complete permanent account deletion.",
    });
    setIsDeleting(false);
    setShowDeleteModal(false);
  };

  const navigateTo = (id: SectionId) => {
    router.push(`/settings?tab=${id}`);
  };

  if (!shouldShowContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-small">Loading...</div>
      </div>
    );
  }

  const userTier = user?.tier ?? "free";

  const initials = profileName
    ? profileName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profileEmail
    ? profileEmail[0].toUpperCase()
    : "?";

  const sectionContent: Record<SectionId, React.ReactNode> = {
    profile: (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-title font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-body font-semibold">{profileName || "—"}</p>
            <p className="text-caption text-muted-foreground">{profileEmail}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-body">Personal Information</CardTitle>
            <CardDescription>Update your display name and regional settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2 items-center">
                <Input id="email" value={profileEmail} disabled className="flex-1" />
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <Check weight="bold" className="h-3 w-3" />
                  Verified
                </Badge>
              </div>
              <p className="text-caption text-muted-foreground">Email address cannot be changed here.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">
                <span className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" />
                  Timezone
                </span>
              </Label>
              <Select value={profileTimezone} onValueChange={setProfileTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="mt-2">
              {isSavingProfile ? "Saving…" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    ),

    security: (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-body">Password & Authentication</CardTitle>
            <CardDescription>Manage your login credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-small font-medium">Change Password</p>
                <p className="text-caption text-muted-foreground">
                  {resetSent
                    ? "Reset email sent — check your inbox."
                    : "Send a secure reset link to your email address."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendPasswordReset}
                disabled={isSendingReset || resetSent}
                className="shrink-0"
              >
                <Lock className="h-4 w-4 mr-2" />
                {resetSent ? "Email Sent" : isSendingReset ? "Sending…" : "Send Reset Email"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body">Active Sessions</CardTitle>
            <CardDescription>Devices currently signed in to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
              <div>
                <p className="text-small font-medium">Current Session</p>
                <p className="text-caption text-muted-foreground">
                  {profileEmail} &bull; Active now
                </p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOutAll} className="gap-2">
              <SignOut className="h-4 w-4" />
              Sign Out All Devices
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-body text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-small font-medium">Delete Account</p>
                <p className="text-caption text-muted-foreground">
                  Permanently remove your account and all associated data.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="shrink-0"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    ),

    notifications: (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-body">Alert Notifications</CardTitle>
            <CardDescription>Choose how you receive alerts about market movements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-small font-medium">Email notifications</p>
                <p className="text-caption text-muted-foreground">Receive triggered alerts via email</p>
              </div>
              <Switch
                checked={notifEmailAlerts}
                onCheckedChange={(v) => handleToggle("email_alerts_enabled", v)}
              />
            </div>
            <div className="flex items-center justify-between py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-small font-medium">Push notifications</p>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Coming soon</Badge>
                </div>
                <p className="text-caption text-muted-foreground">Browser push alerts (not yet available)</p>
              </div>
              <Switch checked={false} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body">Account Updates</CardTitle>
            <CardDescription>Periodic summaries and digests sent to your email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-small font-medium">Daily digest</p>
                <p className="text-caption text-muted-foreground">
                  Morning summary of your portfolio performance
                </p>
              </div>
              <Switch
                checked={notifDailyDigest}
                onCheckedChange={(v) => handleToggle("portfolio_daily_digest", v)}
              />
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-small font-medium">Weekly market summary</p>
                <p className="text-caption text-muted-foreground">
                  Sunday roundup of top market movements
                </p>
              </div>
              <Switch
                checked={notifWeeklySummary}
                onCheckedChange={(v) => handleToggle("weekly_summary", v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    ),

    billing: (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-body">Current Plan</CardTitle>
            <CardDescription>Your active subscription and included features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-secondary/30 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-subtitle font-semibold">
                    {PLANS.find((p) => p.id === userTier)?.name ?? "Explorer"} Plan
                  </span>
                  <Badge>Active</Badge>
                </div>
                <p className="text-caption text-muted-foreground">
                  {userTier === "free"
                    ? "You are on the free plan."
                    : "Manage your subscription via the billing portal."}
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/pricing">View All Plans</Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => {
                const isActive = userTier === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {"popular" in plan && plan.popular && (
                      <Badge className="mb-2 text-[10px]">Most Popular</Badge>
                    )}
                    <h4 className="text-body font-semibold">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-title font-bold">{plan.price}</span>
                      <span className="text-caption text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-caption">
                          <Check weight="bold" className="h-3 w-3 text-primary shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isActive ? "secondary" : "outline"}
                      size="sm"
                      className="w-full"
                      disabled={isActive}
                      asChild={!isActive}
                    >
                      {isActive ? (
                        <span>Current Plan</span>
                      ) : (
                        <Link href="/pricing">Upgrade</Link>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    ),

    appearance: (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-body">Theme</CardTitle>
            <CardDescription>Choose how Polys looks on your device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                {
                  id: "light",
                  label: "Light",
                  desc: "A clean, bright interface",
                  icon: <Sun weight="duotone" className="h-6 w-6 text-amber-500" />,
                  preview: "bg-white border-zinc-200",
                },
                {
                  id: "dark",
                  label: "Dark",
                  desc: "Easier on the eyes in low light",
                  icon: <Moon weight="duotone" className="h-6 w-6 text-blue-400" />,
                  preview: "bg-zinc-900 border-zinc-700",
                },
                {
                  id: "system",
                  label: "System",
                  desc: "Matches your device preference",
                  icon: <Monitor weight="duotone" className="h-6 w-6 text-muted-foreground" />,
                  preview: "bg-secondary border-border",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors text-left ${
                  theme === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${opt.preview}`}
                >
                  {opt.icon}
                </div>
                <div className="flex-1">
                  <p className="text-body font-medium">{opt.label}</p>
                  <p className="text-caption text-muted-foreground">{opt.desc}</p>
                </div>
                {theme === opt.id && (
                  <Check weight="bold" className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body">
              <span className="flex items-center gap-2">
                <ArrowsDownUp className="h-4 w-4" />
                Display Density
              </span>
            </CardTitle>
            <CardDescription>Control how compact or spacious the interface feels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { id: "comfortable", label: "Comfortable", desc: "More spacing between elements (default)" },
                { id: "compact", label: "Compact", desc: "Tighter layout to see more at once" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDensity(opt.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors text-left ${
                  density === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div>
                  <p className="text-body font-medium">{opt.label}</p>
                  <p className="text-caption text-muted-foreground">{opt.desc}</p>
                </div>
                {density === opt.id && (
                  <Check weight="bold" className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body">
              <span className="flex items-center gap-2">
                <TextAa className="h-4 w-4" />
                Font Size
              </span>
            </CardTitle>
            <CardDescription>Adjust text size for readability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { id: "normal", label: "Normal", desc: "Default text size" },
                { id: "large", label: "Large", desc: "Larger text for improved readability" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFontSize(opt.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors text-left ${
                  fontSize === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div>
                  <p className="text-body font-medium">{opt.label}</p>
                  <p className="text-caption text-muted-foreground">{opt.desc}</p>
                </div>
                {fontSize === opt.id && (
                  <Check weight="bold" className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Page header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-title md:text-display font-bold">Settings</h1>
            <p className="text-small text-muted-foreground mt-1">
              Manage your account preferences and configuration
            </p>
          </div>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* ── Desktop sidebar nav ── */}
            <aside className="hidden md:flex flex-col w-52 shrink-0 sticky top-[100px]">
              <nav className="space-y-0.5">
                {NAV_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => navigateTo(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? "bg-secondary text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <Icon
                        weight={isActive ? "fill" : "regular"}
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="text-small">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* ── Content area ── */}
            <div className="flex-1 min-w-0">
              {/* Mobile: section list (no tab selected) */}
              {!hasExplicitTab && (
                <div className="md:hidden space-y-2">
                  {NAV_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => navigateTo(section.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Icon weight="duotone" className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-body font-medium">{section.label}</p>
                          <p className="text-caption text-muted-foreground">{section.description}</p>
                        </div>
                        <span className="text-muted-foreground">›</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Mobile: section content (tab selected) */}
              {hasExplicitTab && (
                <div className="md:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/settings")}
                    className="-ml-2 mb-4"
                  >
                    ‹ Back to Settings
                  </Button>
                  <div className="mb-6">
                    <h2 className="text-subtitle font-semibold">
                      {NAV_SECTIONS.find((s) => s.id === activeSection)?.label}
                    </h2>
                    <p className="text-caption text-muted-foreground">
                      {NAV_SECTIONS.find((s) => s.id === activeSection)?.description}
                    </p>
                  </div>
                  {sectionContent[activeSection]}
                </div>
              )}

              {/* Desktop: always show section content */}
              <div className="hidden md:block">
                {sectionContent[activeSection]}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Account Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <Warning weight="fill" className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Delete Account</DialogTitle>
            <DialogDescription className="text-center">
              This action is permanent. All your data, watchlists, alerts, and settings will be
              deleted. Contact support to complete permanent deletion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">
                Type <span className="font-semibold">{profileEmail}</span> to confirm
              </Label>
              <Input
                id="confirm-email"
                placeholder="Enter your email"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmEmail("");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmEmail !== profileEmail}
              className="w-full sm:w-auto"
            >
              {isDeleting ? "Processing…" : "Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SettingsContent />
    </Suspense>
  );
}
