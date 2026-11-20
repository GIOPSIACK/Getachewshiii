import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trophy, Medal, Sparkles, TrendingUp, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  buyerName: string;
  buyerPhone: string;
  ticketCount: number;
  recentGain?: number;
  movedUp?: boolean;
}

const TOP_RANK_COLORS: Record<number, { bg: string; border: string; text: string; badge: string }> = {
  1: {
    bg: "from-amber-400/20 via-yellow-500/10 to-transparent",
    border: "border-yellow-400/60 shadow-yellow-500/20",
    text: "text-yellow-600",
    badge: "bg-yellow-400 text-black",
  },
  2: {
    bg: "from-slate-300/20 via-slate-400/10 to-transparent",
    border: "border-slate-300/60 shadow-slate-400/20",
    text: "text-slate-500",
    badge: "bg-slate-300 text-black",
  },
  3: {
    bg: "from-amber-600/20 via-amber-700/10 to-transparent",
    border: "border-amber-600/60 shadow-amber-600/20",
    text: "text-amber-700",
    badge: "bg-amber-600 text-white",
  },
};

export function Leaderboard() {
  const [, setLocation] = useLocation();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [error, setError] = useState(false);
  const [liveEvent, setLiveEvent] = useState<string | null>(null);
  const [recentlyMovedName, setRecentlyMovedName] = useState<string | null>(null);
  const entriesRef = useRef<LeaderboardEntry[] | null>(null);
  entriesRef.current = entries;

  // Initial fetch
  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        const list = (data.leaderboard ?? []).map((item: any, i: number) => ({
          ...item,
          rank: i + 1,
        }));
        setEntries(list);
        setIsSimulated(Boolean(data.isSimulated));
        if (data.isSimulated && list.length > 0) {
          setLiveEvent(`⚡ Live Contest: ${list[0]?.buyerName} currently leads with ${list[0]?.ticketCount} tickets!`);
        }
      })
      .catch(() => setError(true));
  }, []);

  // Constantly moving simulation (runs when isSimulated is true)
  useEffect(() => {
    if (!isSimulated) return;

    const interval = setInterval(() => {
      const current = entriesRef.current;
      if (!current || current.length < 5) return;

      // Pick an account (frequently between ranks 4 and 50 so positions shift actively)
      const targetIndex = Math.floor(Math.random() * Math.min(50, current.length - 1)) + 1;
      const target = current[targetIndex];
      if (!target) return;

      // Add 1 to 3 tickets
      const addedTickets = Math.floor(Math.random() * 3) + 1;
      const updatedTarget: LeaderboardEntry = {
        ...target,
        ticketCount: target.ticketCount + addedTickets,
        recentGain: addedTickets,
        movedUp: true,
      };

      // Clone, update and re-sort
      const nextList = [...current];
      nextList[targetIndex] = updatedTarget;
      nextList.sort((a, b) => b.ticketCount - a.ticketCount);

      // Re-assign ranks
      let newRank = 1;
      const reRanked = nextList.map((entry, index) => {
        const itemRank = index + 1;
        if (entry.buyerName === target.buyerName) {
          newRank = itemRank;
        }
        return {
          ...entry,
          rank: itemRank,
        };
      });

      setEntries(reRanked);
      setRecentlyMovedName(target.buyerName);
      setLiveEvent(`⚡ ${target.buyerName} just bought ${addedTickets} ticket${addedTickets > 1 ? "s" : ""}! Moved to #${newRank}`);

      // Clear highlight after 2.5s
      setTimeout(() => {
        setRecentlyMovedName((prev) => (prev === target.buyerName ? null : prev));
      }, 2500);
    }, 3800);

    return () => clearInterval(interval);
  }, [isSimulated]);

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <div className="flex flex-col flex-1 min-h-[100dvh] pb-24 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/40 px-4 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 shadow-sm hover:bg-muted transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em" }}>
                Leaderboard
              </h1>
              <p className="text-xs text-muted-foreground">Top ticket holders</p>
            </div>
          </div>
        </div>

        {/* Live Contest Pill */}
        {isSimulated && (
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-extrabold text-primary tracking-wide uppercase">
              LIVE &bull; 70 Active
            </span>
          </div>
        )}
      </div>

      {/* Live Activity Ticker Banner */}
      {liveEvent && (
        <div className="mx-4 mt-3 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border border-primary/20 rounded-2xl px-3.5 py-2 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles className="w-4 h-4 text-primary shrink-0 animate-spin" style={{ animationDuration: "6s" }} />
          <p className="text-xs font-bold text-foreground truncate flex-1">{liveEvent}</p>
        </div>
      )}

      <div className="flex-1 px-4 pt-4">
        {error && (
          <div className="bg-card border border-dashed border-border rounded-[1.5rem] p-8 flex flex-col items-center text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-bold text-base mb-1">Couldn't load leaderboard</h3>
            <p className="text-sm text-muted-foreground">Please try again later.</p>
          </div>
        )}

        {!error && entries === null && (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        )}

        {!error && entries && entries.length > 0 && (
          <div className="flex flex-col gap-5">
            {/* Top 3 Podium Display */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-3 gap-2.5 items-end pt-4 pb-2">
                {/* 2nd Place */}
                <div className="flex flex-col items-center bg-card border border-border/80 rounded-2xl p-3 shadow-sm relative pt-6 bg-gradient-to-t from-slate-200/20 to-transparent">
                  <div className="absolute -top-3 w-7 h-7 rounded-full bg-slate-300 border-2 border-background flex items-center justify-center font-extrabold text-xs text-black shadow-sm">
                    2
                  </div>
                  <Medal className="w-6 h-6 text-slate-400 mb-1" />
                  <p className="font-bold text-xs text-foreground text-center truncate w-full">{top3[1].buyerName.split(" ")[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate w-full text-center">{top3[1].buyerPhone}</p>
                  <div className="mt-2 bg-muted/60 px-2 py-0.5 rounded-full text-[11px] font-black text-foreground">
                    {top3[1].ticketCount} tix
                  </div>
                </div>

                {/* 1st Place - Center & Higher */}
                <div className="flex flex-col items-center bg-card border-2 border-primary/50 rounded-2xl p-3.5 shadow-md relative pt-7 bg-gradient-to-t from-primary/15 to-transparent -translate-y-2">
                  <div className="absolute -top-4 w-9 h-9 rounded-full bg-yellow-400 border-2 border-background flex items-center justify-center font-black text-sm text-black shadow-md">
                    👑
                  </div>
                  <Trophy className="w-8 h-8 text-primary mb-1" />
                  <p className="font-extrabold text-xs text-foreground text-center truncate w-full">{top3[0].buyerName.split(" ")[0]}</p>
                  <p className="text-[10px] text-primary font-semibold truncate w-full text-center">{top3[0].buyerPhone}</p>
                  <div className="mt-2 bg-primary text-black px-2.5 py-0.5 rounded-full text-xs font-black shadow-sm">
                    {top3[0].ticketCount} tix
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center bg-card border border-border/80 rounded-2xl p-3 shadow-sm relative pt-6 bg-gradient-to-t from-amber-700/10 to-transparent">
                  <div className="absolute -top-3 w-7 h-7 rounded-full bg-amber-600 border-2 border-background flex items-center justify-center font-extrabold text-xs text-white shadow-sm">
                    3
                  </div>
                  <Medal className="w-6 h-6 text-amber-600 mb-1" />
                  <p className="font-bold text-xs text-foreground text-center truncate w-full">{top3[2].buyerName.split(" ")[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate w-full text-center">{top3[2].buyerPhone}</p>
                  <div className="mt-2 bg-muted/60 px-2 py-0.5 rounded-full text-[11px] font-black text-foreground">
                    {top3[2].ticketCount} tix
                  </div>
                </div>
              </div>
            )}

            {/* Section Heading */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  All Rankings ({entries.length})
                </span>
              </div>
              <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Constantly Updating
              </span>
            </div>

            {/* Rankings List (1 to 70 with smooth dynamic movement) */}
            <div className="flex flex-col gap-2">
              {entries.map((entry) => {
                const isHighlight = entry.buyerName === recentlyMovedName;
                const topStyle = TOP_RANK_COLORS[entry.rank];

                return (
                  <div
                    key={entry.buyerName}
                    className={cn(
                      "bg-card border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 shadow-sm",
                      topStyle ? topStyle.border : "border-border/70",
                      isHighlight && "ring-2 ring-primary bg-primary/10 scale-[1.01]"
                    )}
                  >
                    {/* Rank Badge */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm",
                        topStyle ? topStyle.badge : "bg-muted/70 text-muted-foreground font-bold"
                      )}
                    >
                      {entry.rank <= 3 ? `#${entry.rank}` : entry.rank}
                    </div>

                    {/* Participant Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground truncate">{entry.buyerName}</p>
                        {isHighlight && (
                          <span className="text-[10px] font-extrabold bg-primary text-black px-1.5 py-0.2 rounded-full animate-bounce">
                            +{entry.recentGain ?? 1} tix!
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{entry.buyerPhone}</p>
                    </div>

                    {/* Ticket Count & Movement */}
                    <div className="text-right shrink-0">
                      <p className="text-base font-extrabold text-primary leading-none tabular-nums">
                        {entry.ticketCount}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                        Tickets
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
