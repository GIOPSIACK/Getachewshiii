import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  buyerName: string;
  buyerPhone: string;
  ticketCount: number;
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-yellow-400/20 border-yellow-400/40 text-yellow-600",
  2: "bg-slate-300/20 border-slate-300/40 text-slate-500",
  3: "bg-amber-600/15 border-amber-600/30 text-amber-700",
};

export function Leaderboard() {
  const [, setLocation] = useLocation();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => setEntries(data.leaderboard ?? []))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-[100dvh]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 pt-10 pb-4 flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
            <Trophy className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">Leaderboard</h1>
            <p className="text-xs text-muted-foreground">Top ticket holders</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-8">
        {error && (
          <div className="bg-card border border-dashed border-border rounded-[1.5rem] p-8 flex flex-col items-center text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-bold text-base mb-1">Couldn't load leaderboard</h3>
            <p className="text-sm text-muted-foreground">Please try again later.</p>
          </div>
        )}

        {!error && entries === null && (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!error && entries?.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-[1.5rem] p-8 flex flex-col items-center text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-bold text-base mb-1">No participants yet</h3>
            <p className="text-sm text-muted-foreground">
              Be the first to buy a ticket and top the leaderboard.
            </p>
          </div>
        )}

        {!error && entries && entries.length > 0 && (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center font-extrabold text-sm shrink-0",
                    RANK_STYLES[entry.rank] ?? "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {entry.rank <= 3 ? <Medal className="w-5 h-5" /> : entry.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{entry.buyerName}</p>
                  <p className="text-xs text-muted-foreground">{entry.buyerPhone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-extrabold text-primary leading-none">{entry.ticketCount}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                    Tickets
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
