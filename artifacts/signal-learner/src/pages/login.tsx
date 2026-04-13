import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Terminal } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md bg-card border border-border p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary" />

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 flex items-center justify-center border border-primary/30 text-primary">
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[10px] uppercase text-muted-foreground">Operator ID</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background border-border focus-visible:ring-primary rounded-none font-mono uppercase"
              placeholder="ENTER USERNAME"
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] uppercase text-muted-foreground">Authorization Code</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border focus-visible:ring-primary rounded-none font-mono"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-destructive text-xs uppercase text-center border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest h-12"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Initialize Session"}
          </Button>
        </form>

        <div className="mt-6 text-center border-t border-border pt-5">
          <p className="text-[10px] text-muted-foreground uppercase">
            New operator?{" "}
            <Link href="/register" className="text-primary hover:underline font-bold">
              Request Access
            </Link>
          </p>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground uppercase mt-6 tracking-widest text-center">
        AI-powered binary options signals · 16 technical indicators<br />
        For use on Pocket Option platform
      </p>
    </div>
  );
}
