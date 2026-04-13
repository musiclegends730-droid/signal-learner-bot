import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Terminal } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ username, password });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md bg-card border border-border p-8 relative overflow-hidden">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>

        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-primary/10 flex items-center justify-center border border-primary/30 text-primary">
            <ShieldCheck size={32} />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-wider flex items-center justify-center gap-2">
            <Terminal size={20} />
            New Operator
          </h1>
          <p className="text-muted-foreground mt-2 uppercase text-xs tracking-widest">
            Terminal Provisioning
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-xs uppercase text-muted-foreground">Desired ID</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background border-border focus-visible:ring-primary rounded-none font-mono"
              placeholder="ENTER USERNAME"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase text-muted-foreground">Authorization Code</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border focus-visible:ring-primary rounded-none font-mono"
              placeholder="••••••••"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest h-12"
            disabled={loading}
          >
            {loading ? "Provisioning..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-border pt-6">
          <p className="text-xs text-muted-foreground uppercase">
            Existing operator?{" "}
            <Link href="/login" className="text-primary hover:underline font-bold">
              Return to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
