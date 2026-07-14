import { useState } from "react";
import { useListTickets, useGetTicketStats } from "@workspace/api-client-react";
import { Search, Ticket as TicketIcon, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import bydImage from "@/assets/byd-yuan-up.jpg";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { TicketSkeleton } from "@/components/ui/skeleton";

export function MyTickets() {
  const [inputPhone, setInputPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState<string | null>(null);

  const { data: tickets, isLoading: ticketsLoading } = useListTickets(
    { phone: searchedPhone! },
    { query: { enabled: !!searchedPhone } }
  );

  const { data: stats } = useGetTicketStats(
    { phone: searchedPhone! },
    { query: { enabled: !!searchedPhone } }
  );

  const handleSearch = () => {
    const cleaned = inputPhone.replace(/\D/g, "");
    if (cleaned.length >= 9) {
      setSearchedPhone(cleaned);
      localStorage.setItem("gech_phone", cleaned);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 pt-10 pb-4">
        <h1 className="text-2xl font-extrabold mb-0.5">My Tickets</h1>
        <p className="text-sm text-muted-foreground mb-4">Track your lottery entries</p>

        {/* Phone search */}
        <div className="flex gap-2">
          <input
            type="tel"
            value={inputPhone}
            onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="251922990331"
            className="flex-1 bg-card border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 text-base font-medium shadow-sm tracking-wider"
          />
          <button
            onClick={handleSearch}
            className="px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center gap-2 shadow-sm shadow-primary/20 hover:brightness-105 active:scale-[0.97] transition-all"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {searchedPhone && stats && !ticketsLoading && (
        <div className="px-4 pt-4 pb-2 grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <AnimatedStatCard value={stats.active} label="Active" valueClass="text-primary" />
          <AnimatedStatCard value={stats.pending} label="Pending" valueClass="text-yellow-500" />
          <AnimatedStatCard value={stats.total} label="Total" valueClass="text-yellow-500" />
        </div>
      )}

      {/* Loading skeletons */}
      {searchedPhone && ticketsLoading && (
        <div className="px-4 pt-4 flex flex-col gap-4">
          {[...Array(2)].map((_, i) => <TicketSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {searchedPhone && !ticketsLoading && tickets?.length === 0 && (
        <div className="mx-4 mt-4 text-center p-8 bg-card rounded-3xl border border-dashed border-border animate-in fade-in">
          <TicketIcon className="w-12 h-12 text-muted mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1">No tickets found</h3>
          <p className="text-sm text-muted-foreground">
            Could not find any tickets for {searchedPhone}.
          </p>
        </div>
      )}

      {/* Ticket list */}
      <div className="px-4 pt-3 flex flex-col gap-4 pb-28">
        {searchedPhone &&
          tickets?.map((ticket, i) => {
            const isPending = ticket.status === "pending";
            const isActive = ticket.status === "active";
            const isRejected = ticket.status === "rejected";

            return (
              <div
                key={ticket.id}
                className="relative bg-card rounded-[1.5rem] border border-border shadow-sm animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 90}ms`, animationFillMode: "both" }}
              >
                {/* Top section */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={ticket.campaign?.imageUrl || bydImage}
                      className="w-full h-full object-cover"
                      alt="EV"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {ticket.campaign?.title || "Ekub Draw"}
                    </p>
                    <p className="text-primary font-extrabold text-lg leading-tight tabular-nums">
                      {ticket.ticketNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticket.createdAt), "M/d/yyyy")}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {isPending && (
                      <>
                        <div className="w-9 h-9 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                          <Clock className="w-4.5 h-4.5 text-yellow-500" />
                        </div>
                        <span className="text-[9px] font-extrabold text-yellow-500 uppercase tracking-wider">
                          Pending
                        </span>
                      </>
                    )}
                    {isActive && (
                      <>
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider">
                          Active
                        </span>
                      </>
                    )}
                    {isRejected && (
                      <>
                        <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                          <XCircle className="w-4.5 h-4.5 text-destructive" />
                        </div>
                        <span className="text-[9px] font-extrabold text-destructive uppercase tracking-wider">
                          Rejected
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Perforated divider */}
                <div className="relative flex items-center">
                  {/* Left notch */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border z-20 shadow-inner" />
                  {/* Right notch */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border z-20 shadow-inner" />
                  {/* Dashed line */}
                  <div className="w-full border-t-2 border-dashed border-muted mx-3" />
                </div>

                {/* Bottom section */}
                <div className="p-4">
                  {/* Lucky numbers */}
                  {ticket.luckyNumbers && ticket.luckyNumbers.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap justify-center mb-3">
                      {ticket.luckyNumbers.map((n) => (
                        <div
                          key={n}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shadow-sm",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-primary/25"
                              : isPending
                              ? "bg-secondary text-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status footer */}
                  {isPending && (
                    <div className="flex items-center justify-center gap-2 bg-yellow-50 rounded-xl py-2 px-3">
                      <TicketIcon className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      <span className="text-[11px] font-medium text-yellow-700">
                        Waiting for admin payment approval
                      </span>
                    </div>
                  )}
                  {isRejected && (
                    <div className="flex items-center justify-center gap-2 bg-destructive/5 rounded-xl py-2 px-3">
                      <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <span className="text-[11px] font-medium text-destructive">
                        Payment verification failed
                      </span>
                    </div>
                  )}
                  {isActive && (
                    <div className="flex items-center justify-center gap-2 bg-primary/5 rounded-xl py-2 px-3">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-[11px] font-medium text-primary">
                        Ticket confirmed & active
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Empty prompt */}
      {!searchedPhone && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-5 shadow-inner">
            <Search className="w-9 h-9 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-base mb-1.5">Find your tickets</h3>
          <p className="text-sm text-muted-foreground max-w-[220px]">
            Enter your registered phone number above to track your entries.
          </p>
        </div>
      )}
    </div>
  );
}

function AnimatedStatCard({
  value,
  label,
  valueClass,
}: {
  value: number;
  label: string;
  valueClass: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
      <span className={cn("text-2xl font-black leading-none", valueClass)}>{animated}</span>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
        {label}
      </span>
    </div>
  );
}
