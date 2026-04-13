import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Activity, LogOut, ShieldAlert, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col font-mono text-sm">
      <header className="border-b border-border bg-card flex items-center justify-between px-6 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary font-bold tracking-tight text-base uppercase">
            <Cpu className="w-5 h-5" />
            <span>QuantumTrade AI</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 transition-colors ${
                location === "/"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              DASHBOARD
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 transition-colors flex items-center gap-2 ${
                  location === "/admin"
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                ADMIN
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground border border-border px-3 py-1.5 bg-background">
            <Activity className="w-4 h-4 text-primary" />
            <span className="uppercase">{user.username}</span>
            <span className="text-xs px-1.5 bg-secondary text-secondary-foreground">
              {user.role}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none border border-transparent hover:border-destructive/30">
            <LogOut className="w-4 h-4 mr-2" />
            DISCONNECT
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 flex flex-col max-w-[1600px] w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
