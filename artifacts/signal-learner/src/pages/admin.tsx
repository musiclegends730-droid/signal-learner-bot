import { useState } from "react";
import { useAuth, authFetch } from "@/lib/auth";
import { useAdminListUsers, useAdminDeleteUser, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ShieldAlert, Trash2, Users, KeyRound, X, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function ResetPasswordModal({ userId, username, onClose }: { userId: number; username: string; onClose: () => void }) {
  const { toast } = useToast();
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPw.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await authFetch(`/admin/users/${userId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: newPw }),
      });
      toast({ title: "Password Reset", description: `Password for ${username} has been reset successfully.` });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md relative animate-in slide-in-from-bottom-4 duration-300 font-mono">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-bold uppercase">
            <KeyRound className="w-4 h-4 text-warning" />
            Reset Password — {username}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-none w-8 h-8 p-0 hover:bg-destructive/10 hover:text-destructive">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-[10px] text-muted-foreground uppercase border border-warning/20 bg-warning/5 px-3 py-2">
            This will immediately override the user's current password.
          </p>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="rounded-none bg-background border-border pr-10"
                placeholder="Min 6 characters"
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-muted-foreground">Confirm Password</Label>
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
            <p className="text-destructive text-[10px] uppercase border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-none uppercase text-xs h-10">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-none bg-warning text-warning-foreground hover:bg-warning/90 uppercase text-xs h-10 font-bold">
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const { token, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [resetTarget, setResetTarget] = useState<{ id: number; username: string } | null>(null);

  const { data: users = [], isLoading, refetch } = useAdminListUsers({
    query: {
      enabled: !!token && currentUser?.role === "admin",
      queryKey: getAdminListUsersQueryKey(),
    }
  });

  const deleteMutation = useAdminDeleteUser();

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      toast({ title: "User Deleted", description: `Operator removed from system.` });
    } catch (e: any) {
      toast({ title: "Deletion Failed", description: e.message || "An error occurred.", variant: "destructive" });
    }
  };

  const totalSignals = users.reduce((a, u) => a + (u.signalCount || 0), 0);
  const avgWinRate = users.length > 0 ? users.reduce((a, u) => a + (u.winRate || 0), 0) / users.length : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {resetTarget && (
        <ResetPasswordModal
          userId={resetTarget.id}
          username={resetTarget.username}
          onClose={() => setResetTarget(null)}
        />
      )}

      {/* Header */}
      <div className="bg-card border border-border p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            Admin Control Panel
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase mt-1">
            QuantumTrade AI · Pocket Option Signal Bot
          </p>
        </div>
        <div className="flex gap-5">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-muted-foreground uppercase">Operators</span>
            <span className="text-2xl font-bold font-mono text-foreground">{users.length}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-muted-foreground uppercase">Total Signals</span>
            <span className="text-2xl font-bold font-mono text-foreground">{totalSignals}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-muted-foreground uppercase">Avg Win Rate</span>
            <span className={`text-2xl font-bold font-mono ${avgWinRate >= 0.5 ? 'text-success' : 'text-destructive'}`}>
              {(avgWinRate * 100).toFixed(1)}%
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="rounded-none border border-border hover:bg-muted/30 text-muted-foreground text-xs uppercase self-center">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-card border border-border">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Operator Registry</h2>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm text-left font-mono">
            <thead className="text-[10px] uppercase bg-muted/20 border-b border-border text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-bold">#</th>
                <th className="px-5 py-3 font-bold">Operator</th>
                <th className="px-5 py-3 font-bold">Role</th>
                <th className="px-5 py-3 font-bold text-right">Signals</th>
                <th className="px-5 py-3 font-bold text-right">Win Rate</th>
                <th className="px-5 py-3 font-bold">Registered</th>
                <th className="px-5 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-4 bg-muted/30 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground text-xs uppercase">
                    No operators registered
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors duration-150">
                    <td className="px-5 py-4 text-muted-foreground text-xs">#{user.id}</td>
                    <td className="px-5 py-4 font-bold">{user.username}</td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={`rounded-none uppercase text-[9px] px-2 py-0.5 ${
                          user.role === "admin"
                            ? "border-destructive/50 text-destructive bg-destructive/5"
                            : "border-primary/50 text-primary bg-primary/5"
                        }`}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">{user.signalCount || 0}</td>
                    <td className="px-5 py-4 text-right">
                      {user.signalCount === 0 ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <span className={`font-bold ${(user.winRate || 0) >= 0.5 ? "text-success" : "text-destructive"}`}>
                          {((user.winRate || 0) * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {format(new Date(user.createdAt), "yyyy-MM-dd HH:mm")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Reset Password */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetTarget({ id: user.id, username: user.username })}
                          className="text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-none h-8 w-8 p-0 transition-colors duration-150"
                          title={`Reset ${user.username}'s password`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none h-8 w-8 p-0 transition-colors duration-150"
                              disabled={user.id === currentUser?.id}
                              title={user.id === currentUser?.id ? "Cannot delete yourself" : `Delete ${user.username}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-none border-border bg-card font-mono">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="uppercase flex items-center gap-2 text-destructive text-sm">
                                <ShieldAlert className="w-4 h-4" /> Confirm Deletion
                              </AlertDialogTitle>
                              <AlertDialogDescription className="uppercase text-[10px] mt-3 text-muted-foreground">
                                Permanently purge operator <span className="text-foreground font-bold">{user.username}</span> including all their signals, model weights, and trade history. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                              <AlertDialogCancel className="rounded-none border-border hover:bg-muted uppercase text-xs">Abort</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
                                className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90 uppercase text-xs"
                              >
                                Purge Operator
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forgot Password Info */}
      <div className="bg-card border border-border/50 p-4 text-[10px] text-muted-foreground uppercase flex items-center gap-3">
        <KeyRound className="w-4 h-4 text-primary shrink-0" />
        <span>
          <span className="text-foreground font-bold">Forgot Password Flow:</span> Users who cannot log in should contact an admin. 
          Use the <KeyRound className="w-3 h-3 inline mx-0.5 text-warning" /> button above to reset any operator's password instantly.
          Logged-in users can change their own password via the "Password" button in the top navigation bar.
        </span>
      </div>
    </div>
  );
}
