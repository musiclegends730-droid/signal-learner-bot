import { useAuth } from "@/lib/auth";
import { useAdminListUsers, useAdminDeleteUser, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ShieldAlert, Trash2, Users, Activity, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  Body,
  Cell,
  Head,
  Header,
  Row,
} from "@/components/ui/table"; // Assuming standard table components exist or use basic HTML

export default function Admin() {
  const { token, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useAdminListUsers({
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
      toast({
        title: "User Deleted",
        description: `Operator ID ${id} has been permanently removed.`,
      });
    } catch (e: any) {
      toast({
        title: "Deletion Failed",
        description: e.message || "An error occurred while deleting the user.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            Admin Subsystem
          </h1>
          <p className="text-xs text-muted-foreground uppercase mt-1">
            Global operator registry and system oversight
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase">Total Operators</span>
            <span className="text-xl font-bold font-mono">{users.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Operator Directory
          </h2>
        </div>
        
        <div className="p-0 overflow-auto">
          <table className="w-full text-sm text-left font-mono">
            <thead className="text-xs uppercase bg-muted/30 border-b border-border text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-bold">ID</th>
                <th className="px-6 py-4 font-bold">Operator</th>
                <th className="px-6 py-4 font-bold">Clearance</th>
                <th className="px-6 py-4 font-bold text-right">Signals Evaluated</th>
                <th className="px-6 py-4 font-bold text-right">Model Accuracy</th>
                <th className="px-6 py-4 font-bold">Provisioned</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground uppercase text-xs">
                    Accessing directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground uppercase text-xs">
                    No operators found
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">#{user.id}</td>
                    <td className="px-6 py-4 font-bold">{user.username}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`rounded-none uppercase text-[10px] ${user.role === 'admin' ? 'border-destructive text-destructive' : 'border-primary text-primary'}`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">{user.signalCount || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={user.winRate >= 0.5 ? 'text-success' : 'text-destructive'}>
                        {((user.winRate || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {format(new Date(user.createdAt), "yyyy-MM-dd")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none h-8 w-8 p-0"
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-none border-border bg-card font-mono">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="uppercase flex items-center gap-2 text-destructive">
                              <ShieldAlert className="w-5 h-5" />
                              Confirm Deletion
                            </AlertDialogTitle>
                            <AlertDialogDescription className="uppercase text-xs mt-4">
                              This action will permanently purge operator <strong>{user.username}</strong> from the system, including all their historical signals and model weights. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel className="rounded-none border-border hover:bg-muted uppercase text-xs">Abort</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(user.id)}
                              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90 uppercase text-xs"
                            >
                              Execute Purge
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
