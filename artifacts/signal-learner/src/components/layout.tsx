import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Activity, LogOut, ShieldAlert, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col font-mono text-sm">
      <header className="border-b border-border bg-card flex items-center justify-between px-6 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-primary font-bold tracking-tight text-base uppercase leading-none">
              <Zap className="w-5 h-5" />
              <span>QuantumTrade AI</span>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest pl-7 mt-0.5">
              Signal Learner • Pocket Option
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 text-xs transition-colors uppercase ${
                location === "/"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 text-xs transition-colors flex items-center gap-2 uppercase ${
                  location === "/admin"
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground border border-border px-3 py-1.5 bg-background">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="uppercase">{user.username}</span>
            <span className="px-1.5 bg-secondary text-secondary-foreground text-[9px]">
              {user.role.toUpperCase()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none border border-transparent hover:border-destructive/30 text-xs uppercase"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Exit
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 flex flex-col max-w-[1700px] w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
