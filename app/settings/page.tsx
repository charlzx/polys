"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AppHeader } from "@/components/AppHeader";
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Palette,
  CaretRight,
  CaretLeft,
  Check,
  Sun,
  Moon,
  Warning,
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

// Settings sections
const settingsSections = [
  { id: "profile", label: "Profile", description: "Manage your account details", icon: User },
  {
    id: "security",
    label: "Security",
    description: "Two-factor authentication",
    icon: Shield,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Email and push preferences",
    icon: Bell,
  },
  {
    id: "billing",
    label: "Billing",
    description: "Subscription and payments",
    icon: CreditCard,
  },
  { id: "appearance", label: "Appearance", description: "Theme settings", icon: Palette },
];

// Subscription plans
const plans = [
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
    features: ["Unlimited alerts", "Full historical data", "All markets", "Mobile apps"],
  },
  {
    id: "elite",
    name: "Professional",
    price: "$199",
    period: "/month",
    features: [
      "Real-time arbitrage",
      "Cross-platform scanning",
      "API access",
      "Priority support",
    ],
  },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const activeSection = searchParams?.get("tab") || null;
  const { theme, setTheme } = useTheme();
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Mock user data
  const [userTier, setUserTier] = useState("pro");
  const [profile, setProfile] = useState({
    name: "Alex Chen",
    email: "alex@example.com",
    timezone: "America/New_York",
  });

  const [notifications, setNotifications] = useState({
    alertsEmail: true,
    alertsPush: true,
    portfolioDaily: false,
    portfolioWeekly: true,
    productUpdates: true,
    marketing: false,
  });

  // Show loading while checking auth
  if (!shouldShowContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleDeleteAccount = () => {
    if (deleteConfirmEmail !== profile.email) {
      alert("Email doesn't match");
      return;
    }

    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      setShowDeleteModal(false);
      alert("Account scheduled for deletion");
    }, 1500);
  };

  const navigateToSection = (sectionId: string | null) => {
    if (sectionId) {
      window.history.pushState({}, "", `/settings?tab=${sectionId}`);
    } else {
      window.history.pushState({}, "", "/settings");
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-title">
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">
                  Change Avatar
                </Button>
                <p className="text-caption text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex gap-2">
                  <Input id="email" value={profile.email} disabled className="flex-1" />
                  <Badge variant="secondary" className="shrink-0">
                    <Check weight="bold" className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={profile.timezone}
                  onValueChange={(v) => setProfile({ ...profile, timezone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="mt-4">Save Changes</Button>
          </motion.div>
        );

      case "security":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-body">Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium">Status: Not enabled</p>
                    <p className="text-caption text-muted-foreground">
                      Protect your account with 2FA
                    </p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-body">Active Sessions</CardTitle>
                <CardDescription>Manage your active sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-small font-medium">Current Session</p>
                    <p className="text-caption text-muted-foreground">
                      Chrome on macOS • Last active now
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <Button variant="outline" size="sm">
                  Sign out all other sessions
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-body text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium">Delete Account</p>
                    <p className="text-caption text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case "notifications":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-body">Alert Notifications</CardTitle>
                <CardDescription>How you receive alert notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium">Email notifications</p>
                    <p className="text-caption text-muted-foreground">Receive alerts via email</p>
                  </div>
                  <Switch
                    checked={notifications.alertsEmail}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, alertsEmail: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium">Push notifications</p>
                    <p className="text-caption text-muted-foreground">
                      Receive alerts on your device
                    </p>
                  </div>
                  <Switch
                    checked={notifications.alertsPush}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, alertsPush: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-body">Portfolio Updates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium">Daily digest</p>
                    <p className="text-caption text-muted-foreground">
                      Summary of daily performance
                    </p>
                  </div>
                  <Switch
                    checked={notifications.portfolioDaily}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, portfolioDaily: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium">Weekly summary</p>
                    <p className="text-caption text-muted-foreground">Weekly performance report</p>
                  </div>
                  <Switch
                    checked={notifications.portfolioWeekly}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, portfolioWeekly: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case "billing":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-body">Current Plan</CardTitle>
                <CardDescription>Manage your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/50 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-subtitle font-semibold capitalize">{userTier} Plan</span>
                      {userTier === "pro" && <Badge>Current</Badge>}
                    </div>
                    <p className="text-caption text-muted-foreground">
                      {userTier === "free" ? "Free forever" : "Next billing: Feb 5, 2026"}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/pricing">View All Plans</Link>
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-4 rounded-lg border transition-base ${
                        userTier === plan.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {plan.popular && <Badge className="mb-2">Most Popular</Badge>}
                      <h4 className="text-body font-semibold">{plan.name}</h4>
                      <div className="flex items-baseline gap-1 my-2">
                        <span className="text-title font-bold">{plan.price}</span>
                        <span className="text-caption text-muted-foreground">{plan.period}</span>
                      </div>
                      <ul className="space-y-1 mb-4">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-caption">
                            <Check weight="bold" className="h-3 w-3 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={userTier === plan.id ? "secondary" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setUserTier(plan.id)}
                        disabled={userTier === plan.id}
                      >
                        {userTier === plan.id ? "Current Plan" : "Select"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case "appearance":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-body">Theme</CardTitle>
                <CardDescription>Customize how Polys looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm shrink-0">
                    <Sun weight="duotone" className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-body font-medium">Light</span>
                    <p className="text-caption text-muted-foreground">A clean, bright appearance</p>
                  </div>
                  {theme === "light" && (
                    <Check weight="bold" className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Moon weight="duotone" className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-body font-medium">Dark</span>
                    <p className="text-caption text-muted-foreground">
                      Easier on the eyes in low light
                    </p>
                  </div>
                  {theme === "dark" && (
                    <Check weight="bold" className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>

                <button
                  onClick={() => setTheme("system")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-indigo-900 border border-border flex items-center justify-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-indigo-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-body font-medium">System</span>
                    <p className="text-caption text-muted-foreground">
                      Matches your device settings
                    </p>
                  </div>
                  {theme === "system" && (
                    <Check weight="bold" className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {!activeSection ? (
              <motion.div
                key="menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 md:space-y-6"
              >
                {/* Header */}
                <div>
                  <h1 className="text-title md:text-display font-bold">Settings</h1>
                  <p className="text-small text-muted-foreground mt-1">
                    Manage your account preferences
                  </p>
                </div>

                {/* Settings Sections List */}
                <div className="space-y-2">
                  {settingsSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <motion.button
                        key={section.id}
                        onClick={() => navigateToSection(section.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all text-left group"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Icon weight="duotone" className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-body font-medium">{section.label}</p>
                          <p className="text-caption text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                        <CaretRight
                          weight="bold"
                          className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors"
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 md:space-y-6"
              >
                {/* Back button + Section Header */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateToSection(null)}
                    className="mb-4 -ml-2"
                  >
                    <CaretLeft weight="bold" className="h-4 w-4 mr-1" />
                    Back to Settings
                  </Button>
                  <h1 className="text-title md:text-display font-bold">
                    {settingsSections.find((s) => s.id === activeSection)?.label}
                  </h1>
                  <p className="text-small text-muted-foreground mt-1">
                    {settingsSections.find((s) => s.id === activeSection)?.description}
                  </p>
                </div>

                {/* Section Content */}
                {renderSectionContent()}
              </motion.div>
            )}
          </AnimatePresence>
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
              This action is irreversible. All your data, watchlists, alerts, and settings will be
              permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">
                Type <span className="font-semibold">{profile.email}</span> to confirm
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
              disabled={isDeleting || deleteConfirmEmail !== profile.email}
              className="w-full sm:w-auto"
            >
              {isDeleting ? "Deleting..." : "Delete My Account"}
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
