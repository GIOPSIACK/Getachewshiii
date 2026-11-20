import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useListCampaigns, useGetCampaign } from "@workspace/api-client-react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { ChevronLeft, ArrowRight, Check, Sparkles, RefreshCw, Lock, Car, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import glogoSrc from "@/assets/glogo.jpg";
import numbersPatternBg from "@/assets/green-pattern-numbers-bg.jfif";
import bydImage from "@/assets/byd-yuan-up.jpg";
import bydYuanPlusImage from "@/assets/byd-yuan-plus.webp";
import sinotrukHowoImage from "@/assets/sinotruk-howo-371.jpg";

const MODEL_PRICES: Record<string, number> = {
  "BYD Yuan Plus": 3000,
  "Sinotruk HOWO 371": 7000,
};

const VEHICLE_IMAGES: Record<string, string> = {
  "BYD Yuan Up": bydImage,
  "BYD Yuan Plus": bydYuanPlusImage,
  "Sinotruk HOWO 371": sinotrukHowoImage,
};

function getVehicleImage(campaign: { imageUrl?: string | null; vehicleModel: string }): string {
  return campaign.imageUrl || VEHICLE_IMAGES[campaign.vehicleModel] || bydImage;
}

export function BuyTicket() {
  const [, params] = useRoute("/buy/:campaignId");
  const [, setLocation] = useLocation();
  const { state, updateState } = useCheckout();

  // Fetch list of all active campaigns
  const { data: allCampaigns, isLoading: campaignsLoading } = useListCampaigns();
  const activeCampaigns = (allCampaigns ?? []).filter((c) => c.status === "active" || !c.status);

  // Selected campaign state
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (params?.campaignId) return Number(params.campaignId);
    if (state.campaignId) return Number(state.campaignId);
    return null;
  });

  useEffect(() => {
    if (selectedId == null && activeCampaigns.length > 0) {
      setSelectedId(activeCampaigns[0].id);
    }
  }, [activeCampaigns, selectedId]);

  const campaignId = selectedId || Number(params?.campaignId || state.campaignId || 1);
  const { data: singleCampaign } = useGetCampaign(campaignId, {
    query: { enabled: !!campaignId && activeCampaigns.length === 0 } as any,
  });

  const campaign = activeCampaigns.find((c) => c.id === campaignId) ?? singleCampaign ?? activeCampaigns[0];

  // Car switcher dropdown/modal toggle
  const [showCarPicker, setShowCarPicker] = useState(false);

  // Taken numbers state (from DB / backend API)
  const [takenNumbers, setTakenNumbers] = useState<number[]>([]);
  const [fetchingTaken, setFetchingTaken] = useState(false);

  useEffect(() => {
    if (!campaign?.id) return;
    // Initial sync from campaign object if already present
    if (Array.isArray((campaign as any).takenNumbers)) {
      setTakenNumbers((campaign as any).takenNumbers);
    }

    setFetchingTaken(true);
    fetch(`/api/campaigns/${campaign.id}/taken-numbers`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.takenNumbers)) {
          setTakenNumbers(data.takenNumbers);
        }
      })
      .catch(() => {})
      .finally(() => setFetchingTaken(false));
  }, [campaign?.id]);

  const takenSet = useMemo(() => new Set<number>(takenNumbers), [takenNumbers]);

  // Selected numbers: 1 ticket = 1 single number!
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>(() => {
    const existing = state.luckyNumbers || [];
    return existing;
  });

  // Filter out any selected numbers that might have been taken
  useEffect(() => {
    if (takenSet.size > 0) {
      setSelectedNumbers((prev) => prev.filter((num) => !takenSet.has(num)));
    }
  }, [takenSet]);

  const toggleNumber = (num: number) => {
    if (takenSet.has(num)) return; // Taken by someone else or pre-sold
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const quickPickOne = () => {
    const totalSlots = campaign?.totalSlots || 1000;
    const available: number[] = [];
    for (let i = 1; i <= totalSlots; i++) {
      if (!takenSet.has(i) && !selectedNumbers.includes(i)) {
        available.push(i);
      }
    }
    if (available.length === 0) return;
    const rand = available[Math.floor(Math.random() * available.length)];
    setSelectedNumbers((prev) => [...prev, rand].sort((a, b) => a - b));
  };

  const resetSelection = () => {
    setSelectedNumbers([]);
  };

  const totalSlots = campaign?.totalSlots || 1000;
  const price = campaign ? (MODEL_PRICES[campaign.vehicleModel] ?? campaign.ticketPrice) : 3000;
  const quantity = selectedNumbers.length;
  const totalPrice = quantity * price;
  const availableSlotsCount = Math.max(0, totalSlots - takenNumbers.length);

  const handleCheckout = () => {
    if (quantity === 0 || !campaign) return;
    updateState({
      campaignId: campaign.id,
      quantity,
      luckyNumbers: selectedNumbers,
    });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setLocation(`/checkout/${campaign.id}`);
  };

  if (campaignsLoading && !campaign) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-safe animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <img src={glogoSrc} alt="Gech Ekub Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm shrink-0" />
          <span style={{ fontFamily: "'Hegiena', sans-serif" }} className="text-xl leading-tight tracking-tight">
            Gech Ekub
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm shrink-0 hover:bg-muted transition-colors"
              aria-label="Back to home"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em" }}>
                Select Lucky Numbers
              </h1>
              <p className="text-xs text-muted-foreground">
                1 Number = 1 Ticket &bull; Pick as many as you want
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full shrink-0">
            {quantity} {quantity === 1 ? "Ticket" : "Tickets"}
          </span>
        </div>
      </div>

      {/* Selected Vehicle Card with Change Car Option */}
      {campaign && (
        <div className="px-4 mb-3">
          <div className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0">
                <img
                  src={getVehicleImage(campaign)}
                  alt={campaign.vehicleModel}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-foreground text-sm truncate">{campaign.vehicleModel}</p>
                <p className="text-xs text-primary font-bold">{price.toLocaleString()} Birr / ticket</p>
              </div>
            </div>
            {activeCampaigns.length > 1 && (
              <button
                type="button"
                onClick={() => setShowCarPicker((v) => !v)}
                className="text-xs text-primary font-bold bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors shrink-0"
              >
                {showCarPicker ? "Close" : "Change Car"}
              </button>
            )}
          </div>

          {/* Collapsible Active Lotteries Switcher */}
          {showCarPicker && activeCampaigns.length > 1 && (
            <div className="mt-2 bg-card border border-border rounded-2xl p-3 shadow-md animate-in slide-in-from-top-2 duration-200">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Switch Vehicle Lottery
              </p>
              <div className="flex flex-col gap-2">
                {activeCampaigns.map((c) => {
                  const isCurrent = c.id === campaign.id;
                  const cPrice = MODEL_PRICES[c.vehicleModel] ?? c.ticketPrice;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        setSelectedNumbers([]);
                        setShowCarPicker(false);
                      }}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl text-left transition-all border",
                        isCurrent
                          ? "bg-primary/10 border-primary font-bold"
                          : "bg-muted/40 border-border hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getVehicleImage(c)}
                          alt={c.vehicleModel}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <span className="text-xs truncate">{c.vehicleModel}</span>
                      </div>
                      <span className="text-xs text-primary font-bold shrink-0">
                        {cPrice.toLocaleString()} Birr
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Number Picking Section */}
      <div className="px-4 flex-1 flex flex-col gap-3 animate-in fade-in duration-200">
        <div
          className="relative overflow-hidden bg-card rounded-[1.75rem] p-4 shadow-sm border border-border flex-1 flex flex-col"
          style={{
            backgroundImage: `url(${numbersPatternBg})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Header & Quick Action Buttons */}
          <div className="flex justify-between items-center mb-3 gap-2">
            <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: "#E6EBB2" }}>
              <h2
                className="font-bold text-foreground"
                style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em", fontSize: "1.6rem" }}
              >
                Pick Your Tickets
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Tap numbers to select &bull; {availableSlotsCount} remaining
              </p>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={quickPickOne}
                type="button"
                className="flex items-center justify-center gap-1 text-black rounded-full hover:brightness-110 active:scale-[0.97] transition-all px-3 py-1.5 shadow-sm"
                style={{
                  backgroundColor: "#7BC143",
                  boxShadow: "inset 0 0 0 2px #000000",
                  fontFamily: "'Highstories', sans-serif",
                  letterSpacing: "0.05em",
                  fontSize: "12px",
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Quick Pick
              </button>
              <button
                onClick={resetSelection}
                disabled={selectedNumbers.length === 0}
                type="button"
                className="flex items-center justify-center gap-1 text-black rounded-full hover:brightness-110 active:scale-[0.97] transition-all px-3 py-1.5 shadow-sm disabled:opacity-40"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: "inset 0 0 0 2px #000000",
                  fontFamily: "'Highstories', sans-serif",
                  letterSpacing: "0.05em",
                  fontSize: "12px",
                }}
              >
                <RefreshCw className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Selected Numbers Summary Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 mb-3 shadow-sm border border-black/10">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[11px] font-extrabold text-foreground uppercase tracking-wider">
                Selected Tickets ({selectedNumbers.length})
              </span>
              <span className="text-[11px] font-bold text-primary">
                {totalPrice.toLocaleString()} Birr
              </span>
            </div>

            {selectedNumbers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1 text-center">
                No tickets selected yet. Tap any available number below!
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1 pb-0.5">
                {selectedNumbers.map((num, idx) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleNumber(num)}
                    className="bg-[#7BC143] text-black font-extrabold text-xs px-2.5 py-1 rounded-xl border border-black/30 shadow-sm flex items-center gap-1 hover:brightness-95 active:scale-95 transition-all"
                    title="Click to remove"
                  >
                    <span>#{num}</span>
                    <X className="w-3 h-3 stroke-[2.5] opacity-70" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mb-2.5 text-[10px] font-bold text-foreground">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-black border border-border inline-block shadow-sm" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#7BC143] border border-black inline-block shadow-sm" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-neutral-600 inline-flex items-center justify-center text-[8px] text-white">
                ✕
              </span>
              <span>Taken / Unavailable</span>
            </div>
          </div>

          {/* Numbers Selection Grid (1 to totalSlots) */}
          <div
            className="flex-1 max-h-80 overflow-y-auto rounded-2xl p-3 shadow-inner"
            style={{ backgroundColor: "#E6EBB2" }}
          >
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
              {Array.from({ length: totalSlots }, (_, i) => i + 1).map((num) => {
                const isTaken = takenSet.has(num);
                const isSelected = selectedNumbers.includes(num);

                if (isTaken) {
                  return (
                    <div
                      key={num}
                      aria-disabled="true"
                      title={`Number #${num} is already taken`}
                      className="aspect-square rounded-full flex flex-col items-center justify-center text-[10px] font-bold bg-neutral-700/60 text-neutral-400 border border-neutral-600/30 cursor-not-allowed select-none line-through relative opacity-60"
                    >
                      <span>{num}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleNumber(num)}
                    aria-pressed={isSelected}
                    className={cn(
                      "aspect-square rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                      isSelected
                        ? "ring-4 ring-[#7BC143] bg-[#7BC143] text-black font-extrabold scale-105"
                        : "hover:bg-neutral-800 active:scale-95 bg-black text-white"
                    )}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Checkout Bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 pb-8 mt-auto shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">
              {quantity} {quantity === 1 ? "ticket" : "tickets"} &bull; {campaign?.vehicleModel}
            </div>
            <div className="text-2xl font-extrabold text-foreground">
              {totalPrice.toLocaleString()} <span className="text-sm">Birr</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={quantity === 0}
            className={cn(
              "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
              quantity > 0
                ? "text-black hover:brightness-105 active:scale-[0.98] shadow-sm cursor-pointer"
                : "text-muted-foreground opacity-50 cursor-not-allowed"
            )}
            style={
              quantity > 0
                ? {
                    backgroundColor: "#7BC143",
                    boxShadow: "inset 0 0 0 3px #000000",
                    fontFamily: "'Highstories', sans-serif",
                    fontSize: "24px",
                    letterSpacing: "0.05em",
                  }
                : {
                    backgroundColor: "#0A2218",
                    boxShadow: "inset 0 0 0 2px #333333",
                    fontFamily: "'Highstories', sans-serif",
                    fontSize: "20px",
                    letterSpacing: "0.05em",
                  }
            }
          >
            {quantity > 0 ? (
              <>
                Checkout ({quantity} {quantity === 1 ? "Ticket" : "Tickets"})
                <ArrowRight className="w-5 h-5 text-black" />
              </>
            ) : (
              "Select at Least 1 Number"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
