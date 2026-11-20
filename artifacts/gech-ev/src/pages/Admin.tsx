import { useState, useEffect, useRef } from "react";
import { useAdminListTickets, useUpdateTicketStatus, setAuthTokenGetter, Ticket, AdminListTicketsStatus } from "@workspace/api-client-react";
import { Check, X, Search, Image as ImageIcon, CheckCircle2, Clock, LogOut, Lock, Trophy, Trash2, Plus, Sparkles, Calendar, Car, AlertCircle, Upload, Download } from "lucide-react";
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

function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface WinnerFormState {
  ticketId: string;
  campaignId: string;
  prize: string;
  position: string;
}

interface CampaignFormState {
  vehicleModel: string;
  ticketPrice: string;
  totalSlots: string;
  initialSoldTickets: string;
  drawDate: string;
  imageUrl: string;
  telebirrNumber: string;
  cbeAccount: string;
  accountName: string;
}

export function AdminPanel() {
  const [filter, setFilter] = useState<AdminListTicketsStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [authed, setAuthed] = useState<boolean>(() => Boolean(sessionStorage.getItem(STORAGE_KEY)));
  const [tab, setTab] = useState<"tickets" | "lotteries" | "winners">("tickets");

  // Lotteries state
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState<CampaignFormState>({
    vehicleModel: "BYD Yuan Plus",
    ticketPrice: "3000",
    totalSlots: "1000",
    initialSoldTickets: "0",
    drawDate: "",
    imageUrl: "",
    telebirrNumber: "0911223344",
    cbeAccount: "100012345678",
    accountName: "Gech EV Ekub",
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const handleVehicleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setCampaignError(null);
    try {
      const compressedDataUrl = await compressImage(file, 1200, 0.85);
      setNewCampaign((prev) => ({ ...prev, imageUrl: compressedDataUrl }));
    } catch {
      setCampaignError("Failed to process image. Please try another image file.");
    } finally {
      setImageUploading(false);
    }
  };

  // Winners state
  const [winners, setWinners] = useState<any[]>([]);
  const [showAddWinner, setShowAddWinner] = useState(false);
  const [newWinner, setNewWinner] = useState<WinnerFormState>({ ticketId: "", campaignId: "", prize: "", position: "1" });
  const [quickWinnerTicket, setQuickWinnerTicket] = useState<Ticket | null>(null);
  const [quickPrize, setQuickPrize] = useState("");
  const [quickPosition, setQuickPosition] = useState("1");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [winnerTicketSearch, setWinnerTicketSearch] = useState("");

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

  const downloadReceipt = async (url: string, ticketNumber: string) => {
    try {
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${ticketNumber}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `receipt-${ticketNumber}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${ticketNumber}.jpg`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
  };

  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        setCampaigns(await res.json());
      }
    } catch {} finally {
      setCampaignsLoading(false);
    }
  };

  const loadWinners = async () => {
    try {
      const token = sessionStorage.getItem(STORAGE_KEY);
      const res = await fetch("/api/admin/winners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setWinners(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (authed) {
      if (tab === "lotteries") loadCampaigns();
      if (tab === "winners") loadWinners();
    }
  }, [authed, tab]);

  const submitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignError(null);

    if (!newCampaign.imageUrl || !newCampaign.imageUrl.trim()) {
      setCampaignError("Vehicle photo is required! Please upload a photo from your device.");
      return;
    }

    try {
      const token = sessionStorage.getItem(STORAGE_KEY);
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newCampaign.vehicleModel,
          description: `${newCampaign.vehicleModel} Ekub Lottery Draw`,
          vehicleModel: newCampaign.vehicleModel,
          vehicleYear: 2025,
          ticketPrice: parseFloat(newCampaign.ticketPrice) || 3000,
          totalSlots: parseInt(newCampaign.totalSlots) || 1000,
          initialSoldTickets: parseInt(newCampaign.initialSoldTickets) || 0,
          drawDate: new Date(newCampaign.drawDate).toISOString(),
          imageUrl: newCampaign.imageUrl.trim() || null,
          status: "active",
          paymentDetails: {
            telebirrNumber: newCampaign.telebirrNumber.trim(),
            cbeAccount: newCampaign.cbeAccount.trim(),
            accountName: newCampaign.accountName.trim() || "Gech EV Ekub",
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setCampaignError(err.error || "Failed to create lottery");
        return;
      }

      setShowAddCampaign(false);
      setNewCampaign({
        vehicleModel: "BYD Yuan Plus",
        ticketPrice: "3000",
        totalSlots: "1000",
        initialSoldTickets: "0",
        drawDate: "",
        imageUrl: "",
        telebirrNumber: "0911223344",
        cbeAccount: "100012345678",
        accountName: "Gech EV Ekub",
      });
      loadCampaigns();
    } catch (e: any) {
      setCampaignError(e.message || "Network error");
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Are you sure you want to remove or archive this lottery?")) return;
    try {
      const token = sessionStorage.getItem(STORAGE_KEY);
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadCampaigns();
    } catch {}
  };

  const handleToggleCampaignStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "completed" : "active";
    try {
      const token = sessionStorage.getItem(STORAGE_KEY);
      const res = await fetch(`/api/admin/campaigns/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) loadCampaigns();
    } catch {}
  };

  const submitWinner = async (data: WinnerFormState) => {
    setQuickError(null);
    try {
      const token = sessionStorage.getItem(STORAGE_KEY);
      const res = await fetch("/api/admin/winners", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ticketId: parseInt(data.ticketId),
          campaignId: parseInt(data.campaignId),
          prize: data.prize,
          position: parseInt(data.position) || 1,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setQuickError(errBody.error || "Failed to save winner");
        return;
      }
      setQuickWinnerTicket(null);
      setQuickPrize("");
      setQuickPosition("1");
      setQuickError(null);
      setShowAddWinner(false);
      setNewWinner({ ticketId: "", campaignId: "", prize: "", position: "1" });
      loadWinners();
      refetch();
    } catch (e: any) {
      setQuickError(e.message || "Network error");
    }
  };

  const handleQuickWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickWinnerTicket) return;
    await submitWinner({
      ticketId: String(quickWinnerTicket.id),
      campaignId: String(quickWinnerTicket.campaignId),
      prize: quickPrize,
      position: quickPosition,
    });
  };

  const handleAddWinnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitWinner(newWinner);
  };

  const handleDeleteWinner = async (id: number) => {
    try {
      const token = sessionStorage.getItem(STORAGE_KEY);
      const res = await fetch(`/api/admin/winners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadWinners();
    } catch {}
  };

  const openQuickWinner = (ticket: Ticket) => {
    setQuickWinnerTicket(ticket);
    setQuickPrize("");
    setQuickPosition("1");
  };

  if (!authed) {
    return <LoginGate onAuthed={() => setAuthed(true)} />;
  }

  const filteredTickets = tickets?.filter(t =>
    t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.buyerPhone.includes(search) ||
    t.buyerName.toLowerCase().includes(search.toLowerCase())
  );

  const activeTickets = tickets?.filter(t => t.status === "active") ?? [];

  const filteredActiveTickets = activeTickets.filter(t =>
    t.ticketNumber.toLowerCase().includes(winnerTicketSearch.toLowerCase()) ||
    t.buyerName.toLowerCase().includes(winnerTicketSearch.toLowerCase()) ||
    t.buyerPhone.includes(winnerTicketSearch)
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

        {/* 3 Main Tabs: Tickets, Lotteries, Winners */}
        <div className="flex bg-muted p-1 rounded-xl w-full mb-4">
          <button
            onClick={() => setTab("tickets")}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1", tab === "tickets" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}
          >
            Tickets
          </button>
          <button
            onClick={() => setTab("lotteries")}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1", tab === "lotteries" ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1" />
            Lotteries
          </button>
          <button
            onClick={() => setTab("winners")}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1", tab === "winners" ? "bg-card shadow-sm text-yellow-600" : "text-muted-foreground")}
          >
            <Trophy className="w-3.5 h-3.5 inline mr-1" />
            Winners
          </button>
        </div>

        {tab === "tickets" && (
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
        )}
      </div>

      {/* ================= TAB 1: TICKETS ================= */}
      {tab === "tickets" && (
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Quick Winner Modal */}
              {quickWinnerTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-card border border-border rounded-[1.75rem] p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base">Mark as Winner</h3>
                        <p className="text-xs text-muted-foreground">{quickWinnerTicket.ticketNumber} &mdash; {quickWinnerTicket.buyerName}</p>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-3 mb-4 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Ticket ID:</span><span className="font-mono font-bold">{quickWinnerTicket.id}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Campaign ID:</span><span className="font-mono font-bold">{quickWinnerTicket.campaignId}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Campaign:</span><span className="font-bold text-right">{quickWinnerTicket.campaign?.title ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Buyer:</span><span className="font-bold">{quickWinnerTicket.buyerName} &bull; {quickWinnerTicket.buyerPhone}</span></div>
                    </div>

                    <form onSubmit={handleQuickWinner} className="space-y-3">
                      {quickError && (
                        <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive font-medium">
                          {quickError}
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Prize</label>
                        <input
                          type="text"
                          value={quickPrize}
                          onChange={e => setQuickPrize(e.target.value)}
                          placeholder="e.g. Grand Prize - BYD Yuan Plus"
                          required
                          autoFocus
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Position</label>
                        <input
                          type="number"
                          value={quickPosition}
                          onChange={e => setQuickPosition(e.target.value)}
                          placeholder="1"
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 bg-yellow-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-yellow-600 active:scale-[0.98] transition-all"
                        >
                          Confirm Winner
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickWinnerTicket(null)}
                          className="px-5 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold hover:bg-muted/80 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

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
                              <div className="flex items-center gap-2">
                                <a
                                  href={ticket.receiptImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:ring-2 ring-primary/50 transition-all overflow-hidden relative group shrink-0"
                                  title="View full receipt"
                                >
                                  <img src={ticket.receiptImageUrl} className="w-full h-full object-cover" alt="receipt" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <ImageIcon className="w-4 h-4 text-white" />
                                  </div>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => downloadReceipt(ticket.receiptImageUrl!, ticket.ticketNumber)}
                                  className="h-8 px-2.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm active:scale-95"
                                  title="Download receipt screenshot"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </button>
                              </div>
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
                            ) : ticket.status === 'active' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openQuickWinner(ticket)}
                                  className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-600 hover:bg-yellow-400 hover:text-white flex items-center justify-center transition-colors"
                                  title="Mark as Winner"
                                >
                                  <Trophy className="w-4 h-4" />
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
            </>
          )}
        </div>
      )}

      {/* ================= TAB 2: LOTTERIES (ADD & MANAGE) ================= */}
      {tab === "lotteries" && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold">Active Lotteries</h2>
              <p className="text-xs text-muted-foreground">Manage active vehicle campaigns and draw schedules</p>
            </div>
            <button
              onClick={() => {
                setShowAddCampaign(!showAddCampaign);
                setCampaignError(null);
              }}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:brightness-105 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Active Lottery
            </button>
          </div>

          {/* Add Lottery Form */}
          {showAddCampaign && (
            <form onSubmit={submitCampaign} className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-md animate-in fade-in duration-200">
              <h3 className="font-extrabold text-base mb-1 flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Create New Vehicle Lottery
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                This lottery will immediately appear on the Home page for users to purchase tickets.
              </p>

              {campaignError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium rounded-xl p-3 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {campaignError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Vehicle Model */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Vehicle Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCampaign.vehicleModel}
                    onChange={e => setNewCampaign({ ...newCampaign, vehicleModel: e.target.value })}
                    placeholder="e.g. BYD Yuan Plus, Sinotruk HOWO 371..."
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {["BYD Yuan Plus", "Sinotruk HOWO 371", "BYD Yuan Up", "BYD Seagull"].map(model => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => setNewCampaign({ ...newCampaign, vehicleModel: model })}
                        className="text-[10px] font-semibold bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-md text-foreground transition-colors"
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ticket Price in Birr */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Ticket Price (ETB / Birr) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newCampaign.ticketPrice}
                    onChange={e => setNewCampaign({ ...newCampaign, ticketPrice: e.target.value })}
                    placeholder="3000"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Total Slots */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Total Slots / Tickets *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newCampaign.totalSlots}
                    onChange={e => setNewCampaign({ ...newCampaign, totalSlots: e.target.value })}
                    placeholder="1000"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Pre-sold Tickets / Participants */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Already Sold Tickets</span>
                    <span className="text-[10px] text-primary font-bold">Auto-Locks Slots</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={parseInt(newCampaign.totalSlots) || 1000}
                    value={newCampaign.initialSoldTickets}
                    onChange={e => setNewCampaign({ ...newCampaign, initialSoldTickets: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    System picks this many random numbers and marks them as unavailable.
                  </p>
                </div>

                {/* Draw Date & Time */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Draw Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newCampaign.drawDate}
                    onChange={e => setNewCampaign({ ...newCampaign, drawDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Vehicle Photo Upload (Required from device) */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Vehicle Photo * (Upload from Device)</span>
                    <span className="text-[11px] text-primary font-bold">Required &bull; Displayed on Home</span>
                  </label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVehicleImageChange}
                    className="hidden"
                  />

                  {newCampaign.imageUrl ? (
                    <div className="relative w-full aspect-[16/9] max-h-72 rounded-2xl overflow-hidden border-2 border-primary shadow-md bg-muted group">
                      <img
                        src={newCampaign.imageUrl}
                        alt="Vehicle Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="px-4 py-2 bg-primary text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:brightness-105 active:scale-95 transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" /> Change Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCampaign((prev) => ({ ...prev, imageUrl: "" }));
                            if (imageInputRef.current) imageInputRef.current.value = "";
                          }}
                          className="px-4 py-2 bg-destructive text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:brightness-105 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Vehicle Photo Uploaded
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className={cn(
                        "w-full aspect-[16/9] max-h-52 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 p-6 transition-all",
                        campaignError && !newCampaign.imageUrl
                          ? "border-destructive/80 bg-destructive/5"
                          : "border-primary/50 bg-primary/5 hover:bg-primary/10 active:scale-[0.99]"
                      )}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-1 shadow-sm">
                        {imageUploading ? (
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-7 h-7" />
                        )}
                      </div>
                      <p className="font-extrabold text-sm text-foreground">
                        {imageUploading ? "Processing photo..." : "Upload Vehicle Photo from Device *"}
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        Tap here to select PNG, JPG, or WEBP from your phone/computer
                      </p>
                    </button>
                  )}
                </div>

                {/* Payment details */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Telebirr Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCampaign.telebirrNumber}
                    onChange={e => setNewCampaign({ ...newCampaign, telebirrNumber: e.target.value })}
                    placeholder="0911223344"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    CBE Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCampaign.cbeAccount}
                    onChange={e => setNewCampaign({ ...newCampaign, cbeAccount: e.target.value })}
                    placeholder="100012345678"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCampaign.accountName}
                    onChange={e => setNewCampaign({ ...newCampaign, accountName: e.target.value })}
                    placeholder="e.g. Gech EV Ekub / Getachew Shiferaw"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Shown to users before transfer to verify the account recipient.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-sm"
                >
                  Publish Active Lottery
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCampaign(false)}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Lotteries Table */}
          <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
            {campaignsLoading ? (
              <div className="flex justify-center p-12">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Vehicle / Title</th>
                      <th className="px-6 py-4">Ticket Price</th>
                      <th className="px-6 py-4">Slots Sold</th>
                      <th className="px-6 py-4">Draw Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          No lotteries created yet. Click "Add Active Lottery" above to create one.
                        </td>
                      </tr>
                    )}
                    {campaigns.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-foreground">{c.vehicleModel} ({c.vehicleYear})</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{c.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-primary">
                          {Number(c.ticketPrice).toLocaleString()} Birr
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-foreground">{c.soldSlots} / {c.totalSlots}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {Math.round((c.soldSlots / c.totalSlots) * 100)}% filled
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            {format(new Date(c.drawDate), "MMM d, yyyy HH:mm")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit block",
                            c.status === "active" ? "bg-primary/10 text-primary" :
                            c.status === "completed" ? "bg-muted text-muted-foreground" :
                            "bg-destructive/10 text-destructive"
                          )}>
                            {c.status || "active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleCampaignStatus(c.id, c.status || "active")}
                              className="px-2.5 py-1 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/80 transition-colors"
                              title="Toggle Active/Completed"
                            >
                              {c.status === "active" ? "Mark Complete" : "Mark Active"}
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(c.id)}
                              className="w-8 h-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-colors"
                              title="Delete lottery"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: WINNERS ================= */}
      {tab === "winners" && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Winners</h2>
            <button
              onClick={() => setShowAddWinner(!showAddWinner)}
              className="flex items-center gap-1.5 bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Winner Manually
            </button>
          </div>

          {showAddWinner && (
            <form onSubmit={handleAddWinnerSubmit} className="bg-card border border-border rounded-2xl p-4 mb-4 shadow-sm">
              {/* Ticket Picker */}
              <div className="mb-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Select Active Ticket
                </label>
                <input
                  type="text"
                  value={winnerTicketSearch}
                  onChange={e => setWinnerTicketSearch(e.target.value)}
                  placeholder="Search by ticket #, name, or phone..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                />
                <div className="max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {filteredActiveTickets.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">No active tickets found</div>
                  )}
                  {filteredActiveTickets.slice(0, 20).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setNewWinner({ ticketId: String(t.id), campaignId: String(t.campaignId), prize: newWinner.prize, position: newWinner.position });
                        setWinnerTicketSearch("");
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2",
                        newWinner.ticketId === String(t.id) ? "bg-yellow-50" : ""
                      )}
                    >
                      <span className="font-mono font-bold shrink-0">{t.ticketNumber}</span>
                      <span className="text-muted-foreground truncate">{t.buyerName}</span>
                      <span className="text-muted-foreground/50 text-[10px] ml-auto">{t.campaign?.title ?? `Campaign #${t.campaignId}`}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected ticket info */}
              {newWinner.ticketId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 mb-3 text-xs flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                  <span className="text-yellow-700">
                    Ticket <strong>#{newWinner.ticketId}</strong> &middot; Campaign <strong>#{newWinner.campaignId}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewWinner({ ...newWinner, ticketId: "", campaignId: "" })}
                    className="ml-auto text-yellow-500 hover:text-yellow-700 font-bold"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={newWinner.prize}
                  onChange={e => setNewWinner({ ...newWinner, prize: e.target.value })}
                  placeholder="Prize (e.g. Grand Prize)"
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                />
                <input
                  type="number"
                  value={newWinner.position}
                  onChange={e => setNewWinner({ ...newWinner, position: e.target.value })}
                  placeholder="Position (default: 1)"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-primary text-white font-bold py-2 rounded-xl text-sm hover:brightness-105 transition-all">
                  Save Winner
                </button>
                <button type="button" onClick={() => { setShowAddWinner(false); setNewWinner({ ticketId: "", campaignId: "", prize: "", position: "1" }); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-bold">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Ticket</th>
                    <th className="px-6 py-4">Buyer</th>
                    <th className="px-6 py-4">Campaign</th>
                    <th className="px-6 py-4">Prize</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {winners.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        No winners declared yet.
                      </td>
                    </tr>
                  )}
                  {winners.map((w: any) => (
                    <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold">
                        {w.ticket?.ticketNumber ?? `#${w.ticketId}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold">{w.ticket?.buyerName ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{w.ticket?.buyerPhone ?? ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        #{w.campaignId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-yellow-600">{w.prize}</td>
                      <td className="px-6 py-4 whitespace-nowrap">#{w.position}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        {format(new Date(w.createdAt), "MMM d, HH:mm")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteWinner(w.id)}
                          className="w-8 h-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-colors"
                          title="Remove winner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
