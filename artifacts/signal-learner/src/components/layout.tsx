import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Activity, LogOut, ShieldAlert, Zap, KeyRound, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPw !== confirmPw) { setError("New passwords do not match"); return; }
    if (newPw.length < 6) { setError("New password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await changePassword(currentPw, newPw);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md relative animate-in slide-in-from-bottom-4 duration-300">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-bold uppercase">
            <KeyRound className="w-4 h-4 text-primary" />
            Change Password
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-none w-8 h-8 p-0 hover:bg-destructive/10 hover:text-destructive">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 font-mono">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-muted-foreground">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                className="rounded-none bg-background border-border pr-10"
                placeholder="••••••••"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="rounded-none bg-background border-border pr-10"
                placeholder="Min 6 characters"
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-muted-foreground">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              className="rounded-none bg-background border-border"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-destructive text-[10px] uppercase border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-none uppercase text-xs h-10">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-none bg-primary text-primary-foreground uppercase text-xs h-10 font-bold">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col font-mono text-sm">
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      <header className="border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-6 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-primary font-bold tracking-tight text-base uppercase leading-none">
              <Zap className="w-5 h-5" />
              <span>QuantumTrade AI</span>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest pl-7 mt-0.5">
              Signal Learner · Pocket Option · 26 Indicators
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 text-xs transition-all duration-200 uppercase ${
                location === "/" ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              Dashboard
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 text-xs transition-all duration-200 flex items-center gap-1.5 uppercase ${
                  location === "/admin" ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground border border-border px-3 py-1.5 bg-background/50">
            <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="uppercase">{user.username}</span>
            <span className="px-1.5 bg-secondary text-secondary-foreground text-[9px] uppercase">{user.role}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChangePassword(true)}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-none border border-transparent hover:border-primary/30 text-xs uppercase transition-all duration-200"
            title="Change Password"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline ml-1.5">Password</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none border border-transparent hover:border-destructive/30 text-xs uppercase transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Exit
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 flex flex-col max-w-[1800px] w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
