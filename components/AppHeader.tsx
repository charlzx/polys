"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlass, Bell, House, TrendUpIcon, ArrowsClockwise, Wallet, Sparkle, Eye } from "@phosphor-icons/react";
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
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const navTabs = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Markets", href: "/markets", icon: TrendUpIcon },
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
  const { notifications, count: notifCount } = useNotifications(user?.id);

  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const userTier = user?.tier ?? "free";

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        {/* Top Row: Logo, Search, Actions */}
        <div className="h-16 grid grid-cols-3 items-center px-4 lg:px-6 border-b border-border/50">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-subtitle font-bold">
                Poly<span className="text-primary">s</span>
              </span>
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
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="text-small font-semibold">Notifications</h4>
                    {notifCount > 0 && (
                      <Badge variant="secondary" className="text-caption">
                        {notifCount} triggered
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-small text-muted-foreground">
                      No alerts triggered in the last 24h
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer bg-primary/5"
                      >
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-small font-medium truncate">{notification.title}</p>
                            <p className="text-caption text-muted-foreground line-clamp-2">
                              {notification.description}
                            </p>
                            <p className="text-caption text-muted-foreground mt-1">
                              {notification.timeAgo}
                            </p>
                          </div>
                        </div>
                      </div>
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
