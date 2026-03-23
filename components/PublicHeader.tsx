"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNavTrigger } from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import {
  MagnifyingGlass,
  Bell,
  Gear,
  CreditCard,
  SignOut,
  Sparkle,
} from "@phosphor-icons/react";

interface PublicHeaderProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onMobileNavOpen: () => void;
}

// Mock notifications - same as AppHeader
const mockNotifications = [
  {
    id: "1",
    title: "Market Alert",
    message: "Bitcoin ETF approval odds increased to 87%",
    time: "2m ago",
    unread: true,
  },
  {
    id: "2",
    title: "Arbitrage Opportunity",
    message: "3.2% spread detected on Election market",
    time: "15m ago",
    unread: true,
  },
  {
    id: "3",
    title: "Price Alert",
    message: "Your watched market reached target price",
    time: "1h ago",
    unread: false,
  },
];

export function PublicHeader({ searchQuery = "", onSearchChange, onMobileNavOpen }: PublicHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [notifications] = useState(mockNotifications);

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-primary-foreground text-small font-bold">P</span>
            </div>
            <span className="text-subtitle font-bold hidden sm:inline">Polys</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 ml-8">
            <Link href="/markets" className="text-small text-muted-foreground hover:text-foreground transition-colors">
              Markets
            </Link>
            <Link href="/dashboard" className="text-small text-muted-foreground hover:text-foreground transition-colors">
              Analytics
            </Link>
            <Link href="/arbitrage" className="text-small text-muted-foreground hover:text-foreground transition-colors">
              Arbitrage
            </Link>
          </nav>

          {/* Search - desktop only */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-9 bg-secondary/50 border-transparent focus:border-border"
              />
            </div>
          </div>

          {/* Right side - Auth dependent */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {isAuthenticated && user ? (
              <>
                {/* Notifications - Desktop only */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative hidden md:inline-flex">
                      <Bell weight="bold" className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <h3 className="text-small font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-caption">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer ${
                            notification.unread ? "bg-secondary/30" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-small font-medium">{notification.title}</span>
                                {notification.unread && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                )}
                              </div>
                              <p className="text-caption text-muted-foreground">{notification.message}</p>
                              <span className="text-caption text-muted-foreground/70 mt-1">
                                {notification.time}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* User Profile Dropdown - Desktop only */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 hidden md:inline-flex">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-caption">
                          {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-small hidden lg:inline">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-1">
                        <span className="text-small font-medium">{user.name}</span>
                        <span className="text-caption text-muted-foreground">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Gear weight="bold" className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings?tab=billing" className="cursor-pointer">
                        <CreditCard weight="bold" className="mr-2 h-4 w-4" />
                        Subscription
                        {user.tier === "pro" && (
                          <Badge variant="secondary" className="ml-auto text-caption">
                            <Sparkle weight="fill" className="h-2.5 w-2.5 mr-0.5" />
                            PRO
                          </Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <SignOut weight="bold" className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Login/Signup - Not authenticated */}
                <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild className="hidden md:inline-flex">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
            <MobileNavTrigger onClick={onMobileNavOpen} />
          </div>
        </div>
      </div>
    </header>
  );
}
