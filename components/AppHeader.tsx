"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlass, Bell, House, TrendUpIcon, ArrowsClockwise, Wallet, Sparkle, Eye, ChartBar, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const navTabs = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Markets", href: "/markets", icon: TrendUpIcon },
  { label: "Kalshi", href: "/kalshi", icon: ChartBar },
  { label: "Whales", href: "/whales", icon: Eye },
  { label: "Arbitrage", href: "/arbitrage", icon: ArrowsClockwise, premium: true },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
  { label: "Alerts", href: "/alerts", icon: Bell },
];

interface AppHeaderProps {
  showSearch?: boolean;
}

export function AppHeader({ showSearch = true }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { notifications, count: notifCount, isLoading: notifLoading, markAsRead, markAllAsRead } = useNotifications(user?.id);

  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const userTier = user?.tier ?? "free";

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleMarkItemRead = async (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        {/* Top Row: Logo, Search, Actions */}
        <div className="h-16 grid grid-cols-3 items-center px-4 lg:px-6 border-b border-border/50">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <Logo size="sm" showWordmark />
            </Link>
          </div>

          {/* Center: Search Bar */}
          {showSearch && (
            <div className="hidden md:flex justify-center">
              <div className="relative w-96 lg:w-[500px]">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search markets..."
                  className="pl-9 h-9 bg-secondary border-0 w-full"
                  aria-label="Search markets"
                />
              </div>
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2 justify-end">
            {/* Notifications */}
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell weight="regular" className="h-5 w-5" />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="text-small font-semibold">Notifications</h4>
                    {notifCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-caption px-2 text-muted-foreground hover:text-foreground"
                        onClick={handleMarkAllRead}
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifLoading ? (
                    <div className="p-6 text-center text-small text-muted-foreground animate-pulse">
                      Loading…
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-small text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.marketId ? `/markets/${notification.marketId}` : "/alerts"}
                        onClick={() => setNotificationsOpen(false)}
                        className={cn(
                          "block p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors",
                          !notification.read && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!notification.read ? (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          ) : (
                            <span className="w-2 h-2 shrink-0 mt-1.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {notification.alertType}
                              </Badge>
                              <span className="text-caption text-muted-foreground">
                                {notification.timeAgo}
                              </span>
                            </div>
                            <p className="text-small font-medium truncate">
                              {notification.marketName ?? notification.title}
                            </p>
                            <p className="text-caption text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.description}
                            </p>
                          </div>
                          {!notification.read && (
                            <button
                              type="button"
                              title="Mark as read"
                              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                              onClick={(e) => handleMarkItemRead(e, notification.id)}
                            >
                              <CheckCircle weight="regular" className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    asChild
                    onClick={() => setNotificationsOpen(false)}
                  >
                    <Link href="/alerts">View all alerts</Link>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-small">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{displayName}</span>
                    <span className="text-caption text-muted-foreground font-normal">
                      {displayEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=billing">
                    Subscription
                    <Badge variant="secondary" className="ml-auto capitalize">
                      {userTier}
                    </Badge>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleSignOut}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bottom Row: Navigation Tabs (Desktop only) */}
        <div className="hidden md:block border-b border-border/50">
          <div className="px-4 lg:px-6">
            <nav className="flex items-center gap-1">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;
                const isPremium = tab.premium && userTier === "free";

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-small font-medium transition-colors relative",
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      isPremium && "opacity-50"
                    )}
                  >
                    <Icon weight={isActive ? "fill" : "regular"} className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {isPremium && <Sparkle weight="fill" className="h-3 w-3 text-primary" />}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <MobileBottomNav />
    </>
  );
}
