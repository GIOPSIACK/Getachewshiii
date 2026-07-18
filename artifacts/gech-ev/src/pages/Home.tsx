import { useState, useEffect } from "react";
import { useListCampaigns } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, Trophy, Ticket, Star, Flame, TrendingUp, Zap, Check, Ban } from "lucide-react";
import bydImage from "@/assets/byd-yuan-up.jpg";
import bydYuanPlusImage from "@/assets/byd-yuan-plus.webp";
import sinotrukHowoImage from "@/assets/sinotruk-howo-371.jpg";
import glogoSrc from "@/assets/glogo.jpg";
import greenPatternSrc from "@/assets/dark-green-abstract-pattern.jpg";
import filterAllSrc from "@/assets/filter-all.svg";
import filterPopularSrc from "@/assets/filter-popular.svg";
import filterNewSrc from "@/assets/filter-new.svg";
import activeLotteriesIcon from "@/assets/icons/active-lotteries.svg";
import participantsIcon from "@/assets/icons/participants.svg";
import ticketIcon from "@/assets/icons/ticket.svg";
import soldIcon from "@/assets/icons/sold.svg";
import goTipIcon from "@/assets/icons/go-tip.svg";
import { HomeSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_MODELS: string[] = ["BYD Yuan Plus", "Sinotruk HOWO 371"];

const MODEL_PRICES: Record<string, number> = {
  "BYD Yuan Plus": 3000,
  "Sinotruk HOWO 371": 7000,
};

const VEHICLE_IMAGES: Record<string, string> = {
  "BYD Yuan Up": bydImage,
  "BYD Yuan Plus": bydYuanPlusImage,
  "Sinotruk HOWO 371": sinotrukHowoImage,
};

function vehicleImage(campaign: { imageUrl?: string | null; vehicleModel: string }): string {
  return campaign.imageUrl || VEHICLE_IMAGES[campaign.vehicleModel] || bydImage;
}

const SELLING_END_KEY = "gech:sellingPeriodEnd";

function getSellingEnd(): number {
  const stored = sessionStorage.getItem(SELLING_END_KEY);
  if (stored) {
    const end = Number(stored);
    if (!Number.isNaN(end) && end > Date.now()) return end;
  }
  const end = Date.now() + 15 * 24 * 60 * 60 * 1000;
  sessionStorage.setItem(SELLING_END_KEY, String(end));
  return end;
}

function getSellingRemaining(end: number) {
  const total = end - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    expired: false,
  };
}

function getTimeRemaining(drawDate: string) {
  const total = new Date(drawDate).getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 min-w-[46px] text-center shadow-inner">
        <span className="text-[22px] font-extrabold text-white leading-none tabular-nums tracking-tight">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{label}</span>
    </div>
  );
}

const FILTER_TABS = [
  { id: "all", label: "All", icon: Zap, bg: filterAllSrc },
  { id: "popular", label: "Popular", icon: Flame, bg: filterPopularSrc },
  { id: "new", label: "New", icon: TrendingUp, bg: filterNewSrc },
];

type AuthState = "loading" | "ready";

export function Home() {
  const { data: allCampaigns, isLoading } = useListCampaigns();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sellingEnd] = useState<number>(() => getSellingEnd());
  const [countdown, setCountdown] = useState(() => getSellingRemaining(sellingEnd));
  const [heroVisible, setHeroVisible] = useState(false);

  const { setUser } = useAuth();
  const [authState, setAuthState] = useState<AuthState>("loading");

  const campaigns = (allCampaigns ?? []).filter((c) => ALLOWED_MODELS.includes(c.vehicleModel as string));

  useEffect(() => {
    if (selectedId == null && campaigns.length > 0) {
      setSelectedId(campaigns[0].id);
    }
  }, [campaigns, selectedId]);

  const campaign = campaigns.find((c) => c.id === selectedId) ?? campaigns[0];

  useEffect(() => {
    if (!campaign?.drawDate) {
      const update = () => setCountdown(getSellingRemaining(sellingEnd));
      update();
      const timer = setInterval(update, 1000);
      return () => clearInterval(timer);
    }
    return;
  }, [campaign?.drawDate, sellingEnd]);

  useEffect(() => {
    if (!isLoading) setTimeout(() => setHeroVisible(true), 50);
  }, [isLoading]);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      setAuthState("ready");
      return;
    }

    tg.ready();
    tg.expand();

    const initData = tg.initData || "";
    const fallbackUser = tg.initDataUnsafe?.user;

    async function register() {
      try {
        let telegramId: string | null = null;
        let firstName: string | null = null;
        let phone: string | null = null;

        if (initData || fallbackUser?.id) {
          const r = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: initData || undefined, fallbackUser: fallbackUser || undefined }),
          });
          if (r.ok) {
            const data = await r.json();
            if (data.user) {
              telegramId = data.user.id;
              firstName = data.user.firstName;
            }
          }
        }

        if (!telegramId && fallbackUser?.id) {
          telegramId = String(fallbackUser.id);
          firstName = fallbackUser.first_name;
        }

        if (telegramId) {
          for (let attempt = 0; attempt < 10; attempt++) {
            const userRes = await fetch(`/api/user?id=${encodeURIComponent(telegramId)}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.phone) {
                phone = userData.phone;
                break;
              }
            }
            if (attempt < 9) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
          setUser({ telegramId, firstName, lastName: null, phone });
        }
      } catch {
        // silent fail — show the app anyway
      }
      setAuthState("ready");
    }

    register();
  }, []);

  if (authState === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <HomeSkeleton />
      </div>
    );
  }

  const percentFilled = campaign
    ? Math.min(100, Math.round((campaign.soldSlots / campaign.totalSlots) * 100))
    : 0;
  const ticketsRemaining = campaign ? campaign.totalSlots - campaign.soldSlots : 0;

  return (
    <div className="flex flex-col flex-1">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <img src={glogoSrc} alt="Gech Ekub Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
          <span style={{ fontFamily: "'Hegiena', sans-serif" }} className="text-xl leading-tight tracking-tight">
            Gech Ekub
          </span>
        </div>
        <Link
          href="/leaderboard"
          className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
          aria-label="View leaderboard"
        >
          <Trophy className="w-4.5 h-4.5 text-primary" />
        </Link>
      </div>

      {isLoading ? (
        <HomeSkeleton />
      ) : (
        <div
          className={`flex flex-col transition-all duration-500 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          {campaign ? (
            <div className="px-2 pt-0 mb-5">
              <div
                className="rounded-[1.75rem] overflow-hidden shadow-lg shadow-black/10 border border-border/50 relative bg-cover bg-center"
                style={{ backgroundImage: `url(${greenPatternSrc})` }}
              >
                <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
                  <img
                    src={vehicleImage(campaign)}
                    alt={campaign.vehicleModel}
                    className="w-full h-full object-cover scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute top-0 left-0 right-0 p-4">
                    <h2
                      style={{ fontFamily: "'Highstories', sans-serif", fontSize: "36px", letterSpacing: "0.05em" }}
                      className="text-white font-extrabold leading-tight drop-shadow whitespace-nowrap pr-16"
                    >
                      {campaign.vehicleModel}
                    </h2>
                  </div>
                  <div className="absolute top-4 right-4 flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-secondary text-secondary drop-shadow" />
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
{countdown.expired ? (
  <div className="flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-xl px-3 py-2.5">
    <Ban className="w-5 h-5 text-white shrink-0" />
    <p className="text-sm font-extrabold text-white leading-tight">
      Tickets selling days are over
    </p>
  </div>
) : (
  <div className="flex items-end gap-2">
    <CountdownBlock value={countdown.days} label="Days" />
    <span className="text-white/60 font-bold text-lg pb-4">:</span>
    <CountdownBlock value={countdown.hours} label="Hrs" />
    <span className="text-white/60 font-bold text-lg pb-4">:</span>
    <CountdownBlock value={countdown.minutes} label="Min" />
    <span className="text-white/60 font-bold text-lg pb-4">:</span>
    <CountdownBlock value={countdown.seconds} label="Sec" />
  </div>
)}
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-4">
                  <div
                    className="rounded-2xl p-3.5"
                    style={{ backgroundColor: "#7BC143", boxShadow: "inset 0 0 0 3px #000000" }}
                  >
                    <div className="flex justify-between items-center text-xs font-semibold mb-2">
                      <span className="relative flex items-center">
                        <img
                          src={soldIcon}
                          alt=""
                          aria-hidden="true"
                          className="absolute -left-3 top-1/2 -translate-y-1/2 h-12 w-12 -z-0 pointer-events-none select-none"
                        />
                        <span className="relative z-10 pl-8 text-black">{campaign.soldSlots} sold</span>
                      </span>
                      <span className="text-black font-bold">{percentFilled}% filled</span>
                    </div>
                    <div className="h-5 w-full bg-muted rounded-full overflow-visible relative">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden bg-black"
                        style={{ width: `${percentFilled}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                      </div>
                      <img
                        src={goTipIcon}
                        alt=""
                        aria-hidden="true"
                        className="absolute h-5 w-5 drop-shadow-md pointer-events-none select-none"
                        style={{ left: `${percentFilled}%`, top: "50%", transform: "translate(0, -50%)" }}
                      />
                    </div>
                    <p className="text-[11px] text-black mt-1.5 font-medium">
                      {ticketsRemaining.toLocaleString()} tickets remaining
                    </p>
                  </div>
                  <div className="flex items-stretch gap-3">
                    <div
                      className="relative flex items-center gap-2.5 rounded-2xl px-4 py-3 flex-1 overflow-hidden"
                      style={{ backgroundColor: "#7BC143", boxShadow: "inset 0 0 0 3px #000000" }}
                    >
                      <Users className="w-4 h-4 text-black shrink-0 relative z-10" />
                      <div className="relative z-10">
                        <p className="text-[9px] font-bold text-black uppercase tracking-wider leading-none mb-0.5">
                          Participants
                        </p>
                        <p className="text-xl font-extrabold leading-none text-black">{campaign.soldSlots}</p>
                      </div>
                      <img
                        src={participantsIcon}
                        alt=""
                        aria-hidden="true"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 opacity-90 pointer-events-none select-none"
                      />
                    </div>
                    <Link
                      href={`/buy/${campaign.id}`}
                      className="relative flex-1 text-black rounded-2xl font-bold hover:brightness-95 active:scale-[0.97] transition-all flex items-center justify-center gap-2 whitespace-nowrap px-2"
                      style={{
                        backgroundColor: "#7BC143",
                        boxShadow: "inset 0 0 0 3px #000000",
                        fontFamily: "'Highstories', sans-serif",
                        fontSize: "30px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Buy Ticket
                      <img
                        src={ticketIcon}
                        alt=""
                        aria-hidden="true"
                        className="absolute bottom-0.5 right-1 h-8 w-8 pointer-events-none select-none"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4 mb-5">
              <div className="bg-card border border-dashed border-border rounded-[1.75rem] p-10 flex flex-col items-center text-center">
                <Trophy className="w-12 h-12 text-muted mb-3" />
                <h3 className="font-bold text-lg mb-1">No Active Campaigns</h3>
                <p className="text-muted-foreground text-sm">Check back later for new Ekub draws.</p>
              </div>
            </div>
          )}

          <div className="px-4 mb-5">
            <div className="flex gap-2 bg-muted/50 p-1 rounded-2xl">
              {FILTER_TABS.map(({ id, label, icon: Icon, bg }) => (
                <button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative overflow-hidden ${
                    activeFilter === id
                      ? "bg-card text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{
                    backgroundImage: `url(${bg})`,
                    backgroundSize: "37.5%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <span className="relative z-10 flex items-center gap-1.5 bg-white/[0.05] backdrop-blur-[2px] border border-white/[0.07] rounded-lg px-2 py-0.5">
                    <Icon className={`w-3.5 h-3.5 ${activeFilter === id ? "text-primary" : ""}`} />
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mb-2">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <img src={activeLotteriesIcon} alt="" aria-hidden="true" className="h-12 w-12 shrink-0" />
                <h3
                  style={{ fontFamily: "'Highstories', sans-serif", fontSize: "34px", letterSpacing: "0.05em" }}
                  className="font-extrabold whitespace-nowrap"
                >
                  Active Lotteries
                </h3>
              </div>
              <span className="text-xs bg-muted text-muted-foreground font-semibold px-2.5 py-1 rounded-full">
                {campaigns ? `${campaigns.length}` : "0"} available
              </span>
            </div>

            {!campaigns || campaigns.length === 0 ? (
              <div className="bg-card border border-dashed border-border/60 rounded-2xl p-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Ticket className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-bold text-sm text-foreground">No active lotteries</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add a lottery from the admin panel to show it here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {campaigns.map((c, i) => {
                  const isSelected = c.id === selectedId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      aria-pressed={isSelected}
                      className={`text-left bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 -translate-y-0.5"
                          : "border-border/60 hover:shadow-md hover:-translate-y-0.5"
                      }`}
                      style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                    >
                      <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                        <img
                          src={vehicleImage(c)}
                          alt={c.vehicleModel}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          style={{ fontFamily: "'Highstories', sans-serif", fontSize: "28px", letterSpacing: "0.05em" }}
                          className="font-bold truncate"
                        >
                          {c.vehicleModel}
                        </p>
                        <p className="text-xs text-primary font-semibold mt-0.5">
                          {MODEL_PRICES[c.vehicleModel]?.toLocaleString() ?? c.ticketPrice.toLocaleString()} Birr / ticket
                        </p>
                        <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.round((c.soldSlots / c.totalSlots) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isSelected ? (
                          <span className="text-[10px] font-extrabold text-primary bg-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                            LIVE
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {c.soldSlots}/{c.totalSlots}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}






