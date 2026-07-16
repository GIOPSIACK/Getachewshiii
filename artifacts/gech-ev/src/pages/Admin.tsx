import { useState, useEffect, useRef } from "react";
import { useAdminListTickets, useUpdateTicketStatus, setAuthTokenGetter, Ticket, AdminListTicketsStatus } from "@workspace/api-client-react";
import { Check, X, Search, Image as ImageIcon, CheckCircle2, Clock, LogOut, Lock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "gech:admin:password";

// Attach the stored admin password as a Bearer token on every API request.
setAuthTokenGetter(() => sessionStorage.getItem(STORAGE_KEY));

function LoginGate({ onAuthed }: { onAuthed: (password: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const attempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tickets", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.status === 401) {
        setError("Incorrect password.");
        setChecking(false);
        return;
      }
      if (!res.ok) {
        setError(`Unexpected error (${res.status}).`);
        setChecking(false);
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, password);
      onAuthed(password);
    } catch {
      setError("Could not reach the server. Try again.");
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background w-full max-w-md mx-auto items-center justify-center px-6">
      <form onSubmit={attempt} className="w-full bg-card border border-border rounded-[1.75rem] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold">Ekub Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Enter the admin password to continue.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        <button
          type="submit"
          disabled={checking || password.length === 0}
          className="w-full mt-4 bg-primary text-white font-bold rounded-xl py-3 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {checking ? "Verifying…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

export function AdminPanel() {
  const [filter, setFilter] = useState<AdminListTicketsStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [authed, setAuthed] = useState<boolean>(() => Boolean(sessionStorage.getItem(STORAGE_KEY)));

  // Re-register the token getter if a session already exists on mount.
  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) setAuthed(true);
  }, []);

  const { data: tickets, isLoading, refetch } = useAdminListTickets(
    { status: filter },
    { query: { queryKey: ['adminTickets', filter], enabled: authed } }
  );

  const updateStatus = useUpdateTicketStatus();

  const handleAction = async (id: number, newStatus: 'active' | 'rejected') => {
    await updateStatus.mutateAsync({ id, data: { status: newStatus } });
    refetch();
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
  };

  if (!authed) {
    return <LoginGate onAuthed={() => setAuthed(true)} />;
  }

  const filteredTickets = tickets?.filter(t =>
    t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.buyerPhone.includes(search) ||
    t.buyerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background w-full max-w-4xl mx-auto pb-12">
      <div className="bg-card border-b border-border sticky top-0 z-10 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-foreground">Ekub Admin</h1>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">Manager Mode</div>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex bg-muted p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setFilter(undefined)}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1", !filter ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}
            >
              All
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1", filter === "pending" ? "bg-card shadow-sm text-yellow-600" : "text-muted-foreground")}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter("active")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1", filter === "active" ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
            >
              Active
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, ticket..."
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Ticket / Date</th>
                    <th className="px-6 py-4">Buyer Details</th>
                    <th className="px-6 py-4">Payment Info</th>
                    <th className="px-6 py-4">Receipt</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTickets?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        No tickets found matching your criteria.
                      </td>
                    </tr>
                  )}
                  {filteredTickets?.map((ticket) => (
                    <tr key={ticket.id} className={cn("hover:bg-muted/20 transition-colors", ticket.status === 'pending' ? 'bg-yellow-50/30' : '')}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-foreground">{ticket.ticketNumber}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(ticket.createdAt), "MMM d, HH:mm")}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-foreground">{ticket.buyerName}</div>
                        <div className="text-xs text-muted-foreground">{ticket.buyerPhone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-foreground">{ticket.totalAmount.toLocaleString()} Birr</div>
                        <div className="text-xs text-muted-foreground uppercase">{ticket.paymentMethod} • {ticket.senderAccount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ticket.receiptImageUrl ? (
                          <a href={ticket.receiptImageUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:ring-2 ring-primary/50 transition-all overflow-hidden relative group">
                            <img src={ticket.receiptImageUrl} className="w-full h-full object-cover" alt="receipt" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ImageIcon className="w-4 h-4 text-white" />
                            </div>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit",
                          ticket.status === 'active' ? 'bg-primary/10 text-primary' :
                          ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-destructive/10 text-destructive'
                        )}>
                          {ticket.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                          {ticket.status === 'pending' && <Clock className="w-3 h-3" />}
                          {ticket.status === 'rejected' && <X className="w-3 h-3" />}
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {ticket.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAction(ticket.id, 'active')}
                              className="w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(ticket.id, 'rejected')}
                              className="w-8 h-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
