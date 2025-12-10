"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  UserPlus,
  Sparkles,
  Settings,
  CreditCard,
  LogOut,
  User,
  Shield,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  plan: string;
}

interface DashboardHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  profile: UserProfile | null;
}

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [effectivePlan, setEffectivePlan] = useState<string>(profile?.plan || "free");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Fetch effective plan from plan-limits API (handles super admin status)
    fetch("/api/user/plan-limits")
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) {
          setEffectivePlan(data.plan);
        }
        if (data.isSuperAdmin) {
          setIsSuperAdmin(true);
        }
      })
      .catch(() => {
        // Fall back to profile plan
      });
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: "/login" });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return user.email?.charAt(0).toUpperCase() || "U";
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.name || user.name || user.email || "User";

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/20 bg-white/60 px-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="lg:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Spacer for desktop */}
      <div className="hidden lg:block" />

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Invite Teammate */}
        <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
          <Link href="/dashboard/team?invite=true">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Teammate
          </Link>
        </Button>

        {/* Upgrade Button (only show for free plan, not super admins) */}
        {effectivePlan === "free" && !isSuperAdmin && (
          <Button size="sm" asChild>
            <Link href="/dashboard/billing">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade
            </Link>
          </Button>
        )}

        {/* Plan Badge */}
        {isSuperAdmin ? (
          <Badge className="hidden md:inline-flex bg-purple-600 hover:bg-purple-700 shadow-glass-sm">
            <Shield className="mr-1 h-3 w-3" />
            Admin
          </Badge>
        ) : (
          <Badge
            variant={effectivePlan === "free" ? "secondary" : "default"}
            className="hidden md:inline-flex capitalize shadow-glass-sm"
          >
            {effectivePlan}
          </Badge>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-white/20 transition-all hover:ring-white/40 dark:ring-white/10 dark:hover:ring-white/20">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={profile?.image || user.image || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-primary/10 text-primary">{getInitials(profile?.name || user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/20 dark:bg-white/10" />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/billing">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/20 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isLoading}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoading ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
