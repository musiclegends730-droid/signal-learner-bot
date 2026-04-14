import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Terminal, Eye, EyeOff, KeyRound } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Check your username and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-mono animate-in fade-in duration-500">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in slide-in-from-bottom-6 duration-500">
        <div className="bg-card border border-border p-8 relative overflow-hidden shadow-2xl shadow-black/50">
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary" />

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center border border-primary/30 text-primary animate-pulse">
              <Zap size={32} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground uppercase tracking-wider flex items-center justify-center gap-2">
              <Terminal size={20} />
              System Access
            </h1>
            <p className="text-muted-foreground mt-1.5 uppercase text-[10px] tracking-widest">
              QuantumTrade AI · Pocket Option Signal Bot
            </p>
          </div>

          {!showForgot ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[10px] uppercase text-muted-foreground">Operator ID</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="bg-background border-border focus-visible:ring-primary rounded-none font-mono uppercase transition-all duration-200"
                  placeholder="ENTER USERNAME"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] uppercase text-muted-foreground">Authorization Code</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-background border-border focus-visible:ring-primary rounded-none font-mono pr-10 transition-all duration-200"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-destructive text-[10px] uppercase border border-destructive/30 bg-destructive/10 px-3 py-2 animate-in slide-in-from-top-2 duration-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest h-12 transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 animate-pulse" /> Authenticating...
                  </span>
                ) : "Initialize Session"}
              </Button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[10px] text-muted-foreground hover:text-primary uppercase transition-colors cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Forgot Password?
                </button>
                <Link href="/register" className="text-[10px] text-primary hover:underline font-bold uppercase">
                  Register
                </Link>
              </div>
            </form>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase mb-4">
                <KeyRound className="w-4 h-4 text-warning" />
                Password Recovery
              </div>
              <div className="p-4 bg-background border border-border/50 text-[10px] text-muted-foreground uppercase space-y-3 leading-relaxed">
                <p>
                  <span className="text-foreground font-bold block mb-1">How to recover your password:</span>
                  This platform uses admin-controlled password resets for security.
                </p>
                <p>
                  <span className="text-primary">Step 1:</span> Contact your system administrator (the first registered user).
                </p>
                <p>
                  <span className="text-primary">Step 2:</span> The admin can reset your password from the Admin Panel using the <KeyRound className="w-3 h-3 inline mx-0.5 text-warning" /> icon next to your username.
                </p>
                <p>
                  <span className="text-primary">Step 3:</span> Log in with your new password, then change it via the "Password" button in the navigation bar.
                </p>
              </div>
              <Button
                onClick={() => setShowForgot(false)}
                variant="outline"
                className="w-full rounded-none uppercase text-xs h-10"
              >
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground uppercase mt-6 tracking-widest text-center z-10">
        AI-powered signals · 26 technical indicators · Pocket Option platform
      </p>
    </div>
  );
}
