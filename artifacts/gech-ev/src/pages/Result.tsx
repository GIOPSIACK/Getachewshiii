import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Trophy, XCircle, Clock, Ticket, Star } from "lucide-react";
import sageBg from "@/assets/sage.png";
import creatorBg from "@/assets/creator.png";
import explorerBg from "@/assets/explorer.png";
import jesterBg from "@/assets/jester.png";
import outlawBg from "@/assets/outlaw.png";
import glogoSrc from "@/assets/glogo.jpg";
import { cn } from "@/lib/utils";

const bgImages = [sageBg, creatorBg, explorerBg, jesterBg, outlawBg];

interface ResultData {
  won: boolean;
  prize: string | null;
  position: number | null;
  ticket: {
    id: number;
    ticketNumber: string;
    luckyNumbers: number[];
  };
  campaign: {
    id: number;
    title: string;
    vehicleModel: string;
    vehicleYear: number;
    imageUrl: string | null;
    drawDate: string;
    status: string;
  };
}

export function Result() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bgIndex = ticketId ? parseInt(ticketId, 10) % bgImages.length : 0;
  const bgSrc = bgImages[bgIndex];

  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);
    fetch(`/api/tickets/${ticketId}/result`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Ticket not found" : "Failed to load result");
        return r.json();
      })
      .then((d: ResultData) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [ticketId]);

  return (
    <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
      {/* Background decorative image */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <img
          src={bgSrc}
          alt=""
          className="w-full h-full object-cover opacity-[0.12]"
          aria-hidden="true"
        />
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/70 via-background/50 to-background pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
          <Link
            href="/tickets"
            className="w-10 h-10 rounded-2xl bg-card/60 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <img
              src={glogoSrc}
              alt="Gech Ekub"
              className="w-8 h-8 rounded-xl object-cover shadow-sm"
            />
            <span
              style={{ fontFamily: "'Hegiena', sans-serif" }}
              className="text-lg leading-tight tracking-tight"
            >
              Gech Ekub
            </span>
          </div>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-5">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2
              className="text-2xl font-black mb-2"
              style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.03em" }}
            >
              Oops!
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link
              href="/tickets"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-sm"
            >
              Back to Tickets
            </Link>
          </div>
        )}

        {data && (
          <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-12">
            {/* Pre-draw state */}
            {data.campaign.status === "active" && (
              <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="w-24 h-24 rounded-[2rem] bg-card/60 backdrop-blur-xl border border-border/30 flex items-center justify-center mb-6 shadow-xl shadow-black/5">
                  <Clock className="w-12 h-12 text-muted-foreground" />
                </div>
                <h1
                  className="text-3xl font-black mb-2"
                  style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.03em" }}
                >
                  Draw Not Yet Held
                </h1>
                <p className="text-muted-foreground text-sm max-w-[280px] mb-6">
                  The draw for this campaign hasn't taken place yet. Check back after the draw date.
                </p>
                <div className="bg-card/60 backdrop-blur-md border border-border/30 rounded-2xl p-5 w-full max-w-sm shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Draw Date</p>
                  <p className="text-lg font-bold" style={{ fontFamily: "'Hegiena', sans-serif" }}>
                    {new Date(data.campaign.drawDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Result (won/lost) */}
            {(data.campaign.status === "completed" || data.campaign.status === "cancelled") && (
              <div className="flex flex-col items-center text-center w-full max-w-sm animate-in fade-in slide-in-from-bottom-6 duration-500">
                {data.won ? (
                  <>
                    <div className="relative mb-6">
                      <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
                        <Trophy className="w-14 h-14 text-white drop-shadow-lg" />
                      </div>
                      <div className="absolute -top-2 -right-2">
                        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg animate-bounce">
                          <Star className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                    <h1
                      className="text-4xl font-black text-yellow-500 mb-1"
                      style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em" }}
                    >
                      YOU WON!
                    </h1>
                    <p className="text-muted-foreground text-sm mb-2">Congratulations!</p>

                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-5 w-full shadow-sm mb-4">
                      <p className="text-xs text-yellow-600 uppercase tracking-wider font-bold mb-1">Prize</p>
                      <p
                        className="text-2xl font-black text-yellow-700"
                        style={{ fontFamily: "'Hegiena', sans-serif" }}
                      >
                        {data.prize ?? "Grand Prize"}
                      </p>
                      {data.position && (
                        <p className="text-sm text-yellow-600 mt-1">
                          Position #{data.position}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 rounded-[2rem] bg-card/60 backdrop-blur-xl border border-border/30 flex items-center justify-center mb-6 shadow-xl shadow-black/5">
                      <XCircle className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h1
                      className="text-3xl font-black mb-2"
                      style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.03em" }}
                    >
                      Not This Time
                    </h1>
                    <p className="text-muted-foreground text-sm max-w-[280px] mb-6">
                      Better luck next time! Keep trying — your win is just around the corner.
                    </p>
                  </>
                )}

                {/* Ticket info card */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl p-5 w-full shadow-sm mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Ticket className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                        Ticket
                      </p>
                      <p className="text-lg font-bold tabular-nums" style={{ fontFamily: "'Hegiena', sans-serif" }}>
                        {data.ticket.ticketNumber}
                      </p>
                    </div>
                  </div>

                  {data.ticket.luckyNumbers.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap justify-center mb-3">
                      {data.ticket.luckyNumbers.map((n) => (
                        <div
                          key={n}
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold shadow-sm",
                            data.won
                              ? "bg-yellow-400 text-white shadow-yellow-400/30"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campaign info card */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl p-5 w-full shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">
                    Campaign
                  </p>
                  <p
                    className="text-base font-bold mb-1"
                    style={{ fontFamily: "'Hegiena', sans-serif" }}
                  >
                    {data.campaign.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.campaign.vehicleModel} ({data.campaign.vehicleYear})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Draw:{" "}
                    {new Date(data.campaign.drawDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
