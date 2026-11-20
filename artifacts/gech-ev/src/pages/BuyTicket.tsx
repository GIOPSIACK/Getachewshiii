import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useListCampaigns, useGetCampaign } from "@workspace/api-client-react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Minus, Plus, RefreshCw, ChevronLeft, ArrowRight, Check, Sparkles, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import glogoSrc from "@/assets/glogo.jpg";
import numbersPatternBg from "@/assets/green-pattern-numbers-bg.jfif";
import bydImage from "@/assets/byd-yuan-up.jpg";
import bydYuanPlusImage from "@/assets/byd-yuan-plus.webp";
import sinotrukHowoImage from "@/assets/sinotruk-howo-371.jpg";
import activeLotteriesIcon from "@/assets/icons/active-lotteries.svg";

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

const TOTAL_LUCKY_NUMBERS = 5000;

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

  // 3 distinct sequential sub-steps:
  // "car" -> "quantity" -> "numbers"
  const [subStep, setSubStep] = useState<"car" | "quantity" | "numbers">("car");
  const [quantity, setQuantity] = useState(state.quantity || 1);

  // Each ticket has its own array of 6 lucky numbers: ticketNumbers[ticketIndex] = [num1, num2, ...]
  const [ticketNumbers, setTicketNumbers] = useState<number[][]>(() => {
    const initQty = state.quantity || 1;
    const existing = state.luckyNumbers || [];
    const arr: number[][] = [];
    for (let i = 0; i < initQty; i++) {
      arr.push(existing.slice(i * 6, (i + 1) * 6));
    }
    return arr;
  });

  const [activeTicketIndex, setActiveTicketIndex] = useState(0);

  // When quantity changes, resize ticketNumbers preserving existing picks
  useEffect(() => {
    setTicketNumbers((prev) => {
      const next: number[][] = [];
      for (let i = 0; i < quantity; i++) {
        next.push(prev[i] || []);
      }
      return next;
    });
    if (activeTicketIndex >= quantity) {
      setActiveTicketIndex(0);
    }
  }, [quantity]);

  // Scroll to top whenever subStep changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [subStep]);

  // Sync state to CheckoutContext (flattened array of all tickets' lucky numbers)
  useEffect(() => {
    if (campaign?.id) {
      const flattened = ticketNumbers.flat();
      updateState({ campaignId: campaign.id, quantity, luckyNumbers: flattened });
    }
  }, [quantity, ticketNumbers, campaign?.id]);

  const currentTicketNumbers = ticketNumbers[activeTicketIndex] || [];

  const toggleNumber = (num: number) => {
    setTicketNumbers((prev) => {
      return prev.map((arr, idx) => {
        if (idx !== activeTicketIndex) return arr;
        if (arr.includes(num)) {
          return arr.filter((n) => n !== num);
        }
        if (arr.length < 6) {
          return [...arr, num].sort((a, b) => a - b);
        }
        return arr;
      });
    });
  };

  const quickPickActive = () => {
    const numbers = new Set<number>();
    while (numbers.size < 6) {
      numbers.add(Math.floor(Math.random() * TOTAL_LUCKY_NUMBERS) + 1);
    }
    const picked = Array.from(numbers).sort((a, b) => a - b);
    setTicketNumbers((prev) => {
      const copy = [...prev];
      copy[activeTicketIndex] = picked;
      return copy;
    });
  };

  const resetActive = () => {
    setTicketNumbers((prev) => {
      const copy = [...prev];
      copy[activeTicketIndex] = [];
      return copy;
    });
  };

  const isAllComplete = ticketNumbers.length === quantity && ticketNumbers.every((t) => t && t.length === 6);
  const firstIncompleteIndex = ticketNumbers.findIndex((t) => !t || t.length < 6);

  if (campaignsLoading && !campaign) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const price = campaign ? (MODEL_PRICES[campaign.vehicleModel] ?? campaign.ticketPrice) : 3000;
  const totalPrice = quantity * price;

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
              onClick={() => {
                if (subStep === "numbers") {
                  setSubStep("quantity");
                } else if (subStep === "quantity") {
                  setSubStep("car");
                } else {
                  setLocation("/");
                }
              }}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm shrink-0 hover:bg-muted transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em" }}>
                {subStep === "car" && "Step 1: Choose Vehicle"}
                {subStep === "quantity" && "Step 2: Choose Quantity"}
                {subStep === "numbers" && (quantity > 1 ? `Step 3: Lucky Numbers (${quantity} Tickets)` : "Step 3: Pick Lucky Numbers")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {subStep === "car" && "Select which active lottery car you want"}
                {subStep === "quantity" && "Select how many entries you want"}
                {subStep === "numbers" && (quantity > 1 ? "Each ticket gets its own 6 lucky numbers" : "Select 6 unique lucky numbers")}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full shrink-0">
            {subStep === "car" && "1/3"}
            {subStep === "quantity" && "2/3"}
            {subStep === "numbers" && "3/3"}
          </span>
        </div>
      </div>

      {/* Selected Vehicle Badge (Shown on Step 2 and Step 3) */}
      {subStep !== "car" && campaign && (
        <div className="px-4 mb-4">
          <div className="bg-card border border-border/80 rounded-2xl p-3 flex items-center justify-between shadow-sm">
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
            <button
              onClick={() => setSubStep("car")}
              className="text-xs text-primary font-bold bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              Change Car
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 1: CHOOSE VEHICLE / ACTIVE LOTTERY ================= */}
      {subStep === "car" && (
        <div className="px-4 flex-1 flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-1">
            <img src={activeLotteriesIcon} alt="" aria-hidden="true" className="h-10 w-10 shrink-0" />
            <div>
              <h2
                style={{ fontFamily: "'Highstories', sans-serif", fontSize: "28px", letterSpacing: "0.05em" }}
                className="font-extrabold leading-none"
              >
                Active Lotteries
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a car below to participate in its draw
              </p>
            </div>
          </div>

          {activeCampaigns.length === 0 && !campaign ? (
            <div className="bg-card border border-dashed border-border/60 rounded-2xl p-8 flex flex-col items-center text-center">
              <Ticket className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="font-bold text-sm">No active lotteries available</p>
              <p className="text-xs text-muted-foreground mt-1">Please check back later.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(activeCampaigns.length > 0 ? activeCampaigns : [campaign]).map((c) => {
                const isSelected = c.id === campaignId;
                const cPrice = MODEL_PRICES[c.vehicleModel] ?? c.ticketPrice;
                const pct = Math.round((c.soldSlots / c.totalSlots) * 100);

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                    }}
                    aria-pressed={isSelected}
                    className={cn(
                      "text-left bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-sm transition-all duration-200",
                      isSelected
                        ? "border-primary ring-2 ring-primary/40 -translate-y-0.5 shadow-md bg-primary/[0.03]"
                        : "border-border/60 hover:shadow-md hover:-translate-y-0.5"
                    )}
                  >
                    <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
                      <img
                        src={getVehicleImage(c)}
                        alt={c.vehicleModel}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{ fontFamily: "'Highstories', sans-serif", fontSize: "26px", letterSpacing: "0.05em" }}
                        className="font-bold truncate text-foreground leading-tight"
                      >
                        {c.vehicleModel}
                      </p>
                      <p className="text-xs text-primary font-bold mt-0.5">
                        {cPrice.toLocaleString()} Birr / ticket
                      </p>
                      <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          LIVE
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3 text-white stroke-[3]" /> Selected
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {c.soldSlots}/{c.totalSlots}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sticky Next Button for Step 1 */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 pb-8 mt-auto shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Selected Car</p>
                <p className="text-base font-extrabold text-foreground truncate max-w-[200px]">
                  {campaign?.vehicleModel ?? "Select a car"}
                </p>
              </div>
              <span className="text-lg font-black text-primary">
                {price.toLocaleString()} <span className="text-xs">Birr</span>
              </span>
            </div>
            <button
              onClick={() => {
                if (campaign) {
                  setSubStep("quantity");
                }
              }}
              disabled={!campaign}
              className="w-full py-4 text-black rounded-2xl font-bold hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              style={{
                backgroundColor: "#7BC143",
                boxShadow: "inset 0 0 0 3px #000000",
                fontFamily: "'Highstories', sans-serif",
                fontSize: "26px",
                letterSpacing: "0.05em",
              }}
            >
              Next: Choose Quantity
              <ArrowRight className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: QUANTITY SELECTION (APPEARS SOLELY) ================= */}
      {subStep === "quantity" && campaign && (
        <div className="px-4 flex-1 flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="bg-card rounded-[1.75rem] p-6 shadow-sm border border-border">
            <h2
              className="font-bold mb-2 text-center"
              style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em", fontSize: "2.2rem" }}
            >
              How Many Tickets?
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-6">
              Each ticket gets its own separate 6 lucky numbers!
            </p>

            {/* Stepper display */}
            <div className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-2xl p-4 mb-6">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-12 h-12 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center disabled:opacity-40 disabled:shadow-none hover:bg-muted active:scale-95 transition-all"
                aria-label="Decrease quantity"
              >
                <Minus className="w-5 h-5 text-foreground" />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-4xl font-extrabold text-foreground leading-none tabular-nums">
                  {quantity}
                </span>
                <span className="text-xs font-semibold text-muted-foreground mt-1">
                  ticket{quantity > 1 ? "s" : ""} ({quantity * 6} lucky numbers)
                </span>
              </div>

              <button
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10}
                className="w-12 h-12 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center disabled:opacity-40 disabled:shadow-none hover:bg-muted active:scale-95 transition-all"
                aria-label="Increase quantity"
              >
                <Plus className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Quick-select chips */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[1, 3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuantity(num)}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-extrabold transition-all border",
                    quantity === num
                      ? "bg-primary text-white border-primary shadow-sm scale-102"
                      : "bg-muted/40 border-border text-foreground hover:bg-muted"
                  )}
                >
                  {num} {num === 1 ? "Ticket" : "Tickets"}
                </button>
              ))}
            </div>

            {/* Breakdown stats */}
            <div className="pt-4 border-t border-dashed border-border flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Price per Ticket
                </p>
                <p className="text-base font-bold text-foreground">{price.toLocaleString()} Birr</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Winning Odds
                </p>
                <p className="text-base font-extrabold text-primary">
                  {quantity} in {campaign.totalSlots.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Sticky Next Button for Step 2 */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 pb-8 mt-auto shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
              <span className="text-2xl font-extrabold text-foreground">
                {totalPrice.toLocaleString()} <span className="text-sm">Birr</span>
              </span>
            </div>
            <button
              onClick={() => setSubStep("numbers")}
              className="w-full py-4 text-black rounded-2xl font-bold hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
              style={{
                backgroundColor: "#7BC143",
                boxShadow: "inset 0 0 0 3px #000000",
                fontFamily: "'Highstories', sans-serif",
                fontSize: "26px",
                letterSpacing: "0.05em",
              }}
            >
              Next: Pick Lucky Numbers
              <ArrowRight className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: LUCKY NUMBERS SELECTION (APPEARS SOLELY) ================= */}
      {subStep === "numbers" && campaign && (
        <div className="px-4 flex-1 flex flex-col gap-4 animate-in fade-in duration-200">
          <div
            className="relative overflow-hidden bg-card rounded-[1.75rem] p-4 shadow-sm border border-border flex-1"
            style={{
              backgroundImage: `url(${numbersPatternBg})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Multi-Ticket Navigation Tabs inside a rectangular card (when quantity > 1) */}
            {quantity > 1 && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 mb-4 shadow-sm border border-black/10">
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Select Numbers for {quantity} Tickets
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {ticketNumbers.filter((t) => t.length === 6).length}/{quantity} Ready
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                  {ticketNumbers.map((nums, idx) => {
                    const isCurrent = idx === activeTicketIndex;
                    const isDone = nums.length === 6;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveTicketIndex(idx)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-all border",
                          isCurrent
                            ? "bg-[#7BC143] text-black border-black shadow-sm"
                            : isDone
                            ? "bg-primary/15 border-primary/40 text-primary font-bold"
                            : "bg-muted/50 border-border text-foreground hover:bg-muted"
                        )}
                      >
                        <span>Ticket #{idx + 1}</span>
                        {isDone ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <span className="text-[10px] font-bold opacity-75">({nums.length}/6)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lucky Numbers Header & Action Buttons */}
            <div className="flex justify-between items-center mb-4 gap-2">
              <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: "#E6EBB2" }}>
                <h2
                  className="font-bold text-foreground"
                  style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em", fontSize: "1.6rem" }}
                >
                  {quantity > 1 ? `Ticket #${activeTicketIndex + 1} Numbers` : "Pick 6 Lucky Numbers"}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {quantity > 1
                    ? `Pick 6 numbers for ticket ${activeTicketIndex + 1} of ${quantity}`
                    : "Tap 6 numbers below or Quick Pick"}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={quickPickActive}
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
                  onClick={resetActive}
                  type="button"
                  className="flex items-center justify-center gap-1 text-black rounded-full hover:brightness-110 active:scale-[0.97] transition-all px-3 py-1.5 shadow-sm"
                  style={{
                    backgroundColor: "#FFFFFF",
                    boxShadow: "inset 0 0 0 2px #000000",
                    fontFamily: "'Highstories', sans-serif",
                    letterSpacing: "0.05em",
                    fontSize: "12px",
                  }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Selected 6 Number Slots for the Active Ticket */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 mb-4 shadow-sm border border-black/10">
              <div className="flex justify-between items-center mb-2 px-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Ticket #{activeTicketIndex + 1} Numbers ({currentTicketNumbers.length}/6)
                </p>
                {currentTicketNumbers.length === 6 && activeTicketIndex < quantity - 1 && (
                  <button
                    onClick={() => setActiveTicketIndex(activeTicketIndex + 1)}
                    className="text-[11px] font-extrabold text-primary flex items-center gap-0.5 hover:underline"
                  >
                    Next Ticket →
                  </button>
                )}
              </div>
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-full flex items-center justify-center text-xs font-black border-2 transition-all px-1",
                      currentTicketNumbers[i]
                        ? "bg-[#7BC143] border-black text-black shadow-sm scale-105"
                        : "bg-muted/60 border-dashed border-border text-muted-foreground"
                    )}
                    style={{ minWidth: "36px", height: "36px" }}
                  >
                    {currentTicketNumbers[i] ?? "?"}
                  </div>
                ))}
              </div>
            </div>

            {/* Numbers Selection Grid (1 - 5000) */}
            <div
              className="max-h-64 overflow-y-auto rounded-2xl p-3 shadow-inner"
              style={{ backgroundColor: "#E6EBB2" }}
            >
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: TOTAL_LUCKY_NUMBERS }, (_, i) => i + 1).map((num) => {
                  const isSelected = currentTicketNumbers.includes(num);
                  const isDisabled = !isSelected && currentTicketNumbers.length >= 6;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleNumber(num)}
                      disabled={isDisabled}
                      className={cn(
                        "aspect-square rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                        isSelected
                          ? "ring-4 ring-[#7BC143] bg-[#7BC143] text-black font-extrabold scale-105"
                          : "hover:bg-black/80 active:scale-95 bg-black text-white"
                      )}
                      style={{ opacity: isDisabled ? 0.35 : 1 }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Checkout Button for Step 3 */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 pb-8 mt-auto shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-muted-foreground">
                {quantity} ticket{quantity > 1 ? "s" : ""} &bull; {campaign.vehicleModel}
              </div>
              <div className="text-2xl font-extrabold text-foreground">
                {totalPrice.toLocaleString()} <span className="text-sm">Birr</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (isAllComplete) {
                  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                  setLocation(`/checkout/${campaign.id}`);
                } else if (firstIncompleteIndex !== -1) {
                  setActiveTicketIndex(firstIncompleteIndex);
                }
              }}
              className={cn(
                "w-full py-4 rounded-2xl font-bold hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2",
                isAllComplete ? "text-black" : "text-white text-base"
              )}
              style={
                isAllComplete
                  ? {
                      backgroundColor: "#7BC143",
                      boxShadow: "inset 0 0 0 3px #000000",
                      fontFamily: "'Highstories', sans-serif",
                      fontSize: "26px",
                      letterSpacing: "0.05em",
                    }
                  : {
                      backgroundColor: "#0A2218",
                      boxShadow: "inset 0 0 0 3px #000000",
                      fontFamily: "'Highstories', sans-serif",
                      fontSize: "20px",
                      letterSpacing: "0.05em",
                    }
              }
            >
              {isAllComplete ? (
                <>
                  Checkout
                  <ArrowRight className="w-5 h-5 text-black" />
                </>
              ) : (
                `Ticket #${firstIncompleteIndex + 1}: Pick 6 Numbers`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
