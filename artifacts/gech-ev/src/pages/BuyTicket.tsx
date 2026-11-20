import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetCampaign } from "@workspace/api-client-react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Minus, Plus, RefreshCw, ChevronLeft, ArrowRight, Check, Sparkles } from "lucide-react";
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

const TOTAL_LUCKY_NUMBERS = 5000;

export function BuyTicket() {
  const [, params] = useRoute("/buy/:campaignId");
  const [, setLocation] = useLocation();
  const { state, updateState } = useCheckout();
  
  const campaignId = Number(params?.campaignId || state.campaignId || 1);
  const { data: campaign, isLoading } = useGetCampaign(campaignId, {
    query: { enabled: !!campaignId } as any,
  });

  const [subStep, setSubStep] = useState<"quantity" | "numbers">("quantity");
  const [quantity, setQuantity] = useState(state.quantity || 1);
  const [luckyNumbers, setLuckyNumbers] = useState<number[]>(state.luckyNumbers || []);

  // Scroll to top whenever subStep changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [subStep]);

  // Update context when state changes
  useEffect(() => {
    updateState({ campaignId, quantity, luckyNumbers });
  }, [quantity, luckyNumbers, campaignId]);

  const toggleNumber = (num: number) => {
    if (luckyNumbers.includes(num)) {
      setLuckyNumbers(luckyNumbers.filter(n => n !== num));
    } else if (luckyNumbers.length < 6) {
      setLuckyNumbers([...luckyNumbers, num].sort((a, b) => a - b));
    }
  };

  const quickPick = () => {
    const numbers = new Set<number>();
    while (numbers.size < 6) {
      numbers.add(Math.floor(Math.random() * TOTAL_LUCKY_NUMBERS) + 1);
    }
    setLuckyNumbers(Array.from(numbers).sort((a, b) => a - b));
  };

  if (isLoading || !campaign) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const price = MODEL_PRICES[campaign.vehicleModel] ?? campaign.ticketPrice;
  const totalPrice = quantity * price;
  const isComplete = luckyNumbers.length === 6;

  return (
    <div className="flex flex-col flex-1 pb-safe animate-in fade-in slide-in-from-right-4 duration-300">
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
                } else {
                  setLocation("/");
                }
              }}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm shrink-0"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em" }}>
                {subStep === "quantity" ? "Step 1: Choose Quantity" : "Step 2: Pick Lucky Numbers"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {subStep === "quantity" ? "Select how many entries you want" : "Select 6 unique lucky numbers"}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {subStep === "quantity" ? "1/2" : "2/2"}
          </span>
        </div>
      </div>

      {/* Selected Vehicle Card Badge */}
      <div className="px-4 mb-4">
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
            <img
              src={getVehicleImage(campaign)}
              alt={campaign.vehicleModel}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-foreground text-sm truncate">{campaign.vehicleModel}</p>
            <p className="text-xs text-primary font-bold">{price.toLocaleString()} Birr / ticket</p>
            <p className="text-[11px] text-muted-foreground">{campaign.title}</p>
          </div>
        </div>
      </div>

      {/* ================= STEP 1: QUANTITY SELECTION (APPEARS SOLELY) ================= */}
      {subStep === "quantity" && (
        <div className="px-4 flex-1 flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="bg-card rounded-[1.75rem] p-6 shadow-sm border border-border">
            <h2 className="font-bold mb-2 text-center" style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em", fontSize: "2.2rem" }}>
              How Many Tickets?
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-6">
              Increase your entries to boost your winning chances!
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
                  ticket{quantity > 1 ? "s" : ""}
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
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Price per Ticket</p>
                <p className="text-base font-bold text-foreground">{price.toLocaleString()} Birr</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Winning Odds</p>
                <p className="text-base font-extrabold text-primary">
                  1 in {Math.max(1, Math.round(campaign.totalSlots / quantity)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Sticky Next Button */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border p-4 pb-8 mt-auto shadow-sm">
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

      {/* ================= STEP 2: LUCKY NUMBERS SELECTION (APPEARS SOLELY) ================= */}
      {subStep === "numbers" && (
        <div className="px-4 flex-1 flex flex-col gap-5 animate-in fade-in duration-200">
          <div
            className="relative overflow-hidden bg-card rounded-[1.75rem] p-5 shadow-sm border border-border flex-1"
            style={{
              backgroundImage: `url(${numbersPatternBg})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Lucky Numbers Header & Action Buttons */}
            <div className="flex justify-between items-center mb-5 gap-3">
              <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: "#E6EBB2" }}>
                <h2
                  className="font-bold text-foreground"
                  style={{ fontFamily: "'Highstories', sans-serif", letterSpacing: "0.05em", fontSize: "1.8rem" }}
                >
                  Pick 6 Lucky Numbers
                </h2>
                <p className="text-[11px] text-muted-foreground">Tap numbers below or Quick Pick</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button 
                  onClick={quickPick}
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
                  onClick={() => setLuckyNumbers([])}
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

            {/* Selected 6 Number Slots */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 mb-5 shadow-sm border border-black/10">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 text-center">
                Selected Numbers ({luckyNumbers.length}/6)
              </p>
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "rounded-full flex items-center justify-center text-xs font-black border-2 transition-all px-1",
                      luckyNumbers[i] 
                        ? "bg-[#7BC143] border-black text-black shadow-sm scale-105" 
                        : "bg-muted/60 border-dashed border-border text-muted-foreground"
                    )}
                    style={{ minWidth: "36px", height: "36px" }}
                  >
                    {luckyNumbers[i] ?? "?"}
                  </div>
                ))}
              </div>
            </div>

            {/* Numbers Selection Grid (1 - 5000) */}
            <div
              className="max-h-72 overflow-y-auto rounded-2xl p-3 shadow-inner"
              style={{ backgroundColor: "#E6EBB2" }}
            >
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: TOTAL_LUCKY_NUMBERS }, (_, i) => i + 1).map((num) => {
                  const isSelected = luckyNumbers.includes(num);
                  const isDisabled = !isSelected && luckyNumbers.length >= 6;
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

          {/* Sticky Checkout Button */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border p-4 pb-8 mt-auto shadow-sm">
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
                if (isComplete) {
                  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                  setLocation(`/checkout/${campaign.id}`);
                }
              }}
              disabled={!isComplete}
              className={cn(
                "w-full py-4 rounded-2xl font-bold hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
                isComplete ? "text-black" : "text-white text-base"
              )}
              style={
                isComplete
                  ? {
                      backgroundColor: "#7BC143",
                      boxShadow: "inset 0 0 0 3px #000000",
                      fontFamily: "'Highstories', sans-serif",
                      fontSize: "28px",
                      letterSpacing: "0.05em",
                    }
                  : {
                      backgroundColor: "#0A2218",
                      boxShadow: "inset 0 0 0 3px #000000",
                      fontFamily: "'Highstories', sans-serif",
                      fontSize: "22px",
                      letterSpacing: "0.05em",
                    }
              }
            >
              {isComplete ? (
                <>
                  Continue to Checkout
                  <ArrowRight className="w-5 h-5 text-black" />
                </>
              ) : (
                `Pick ${6 - luckyNumbers.length} More Number${6 - luckyNumbers.length === 1 ? "" : "s"}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
