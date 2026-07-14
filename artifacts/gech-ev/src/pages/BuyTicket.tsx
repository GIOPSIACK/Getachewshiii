import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetCampaign } from "@workspace/api-client-react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Minus, Plus, RefreshCw, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BuyTicket() {
  const [, params] = useRoute("/buy/:campaignId");
  const [, setLocation] = useLocation();
  const { state, updateState } = useCheckout();
  
  const campaignId = Number(params?.campaignId || state.campaignId || 1);
  const { data: campaign, isLoading } = useGetCampaign(campaignId, { 
    query: { enabled: !!campaignId } 
  });

  const [quantity, setQuantity] = useState(state.quantity || 1);
  const [luckyNumbers, setLuckyNumbers] = useState<number[]>(state.luckyNumbers || []);

  // Update context when unmounting or proceeding
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
      numbers.add(Math.floor(Math.random() * 49) + 1);
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

  const isComplete = luckyNumbers.length === 6;

  return (
    <div className="flex flex-col flex-1 pb-safe animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="px-4 pt-12 pb-4 flex items-center gap-4">
        <button 
          onClick={() => setLocation("/")}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Customize Ticket</h1>
      </div>

      <div className="px-4 flex-1 flex flex-col gap-6">
        {/* Quantity Selector */}
        <div className="bg-card rounded-[1.5rem] p-5 shadow-sm border border-border">
          <h2 className="text-base font-bold mb-4">How many tickets?</h2>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-foreground">
              {quantity} <span className="text-sm font-medium text-muted-foreground ml-1">x {campaign.ticketPrice.toLocaleString()} Birr</span>
            </div>
            
            <div className="flex items-center gap-4 bg-muted p-1.5 rounded-full">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="font-bold text-lg w-4 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10}
                className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Lucky Numbers Picker */}
        <div className="bg-card rounded-[1.5rem] p-5 shadow-sm border border-border flex-1">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold">Pick 6 Lucky Numbers</h2>
              <p className="text-xs text-muted-foreground mt-1">For your primary ticket</p>
            </div>
            <button 
              onClick={quickPick}
              className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Quick Pick
            </button>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all",
                  luckyNumbers[i] 
                    ? "bg-secondary border-secondary text-secondary-foreground shadow-sm scale-110" 
                    : "bg-muted/50 border-dashed border-border text-muted-foreground"
                )}
              >
                {luckyNumbers[i] || "?"}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 49 }, (_, i) => i + 1).map((num) => {
              const isSelected = luckyNumbers.includes(num);
              const isDisabled = !isSelected && luckyNumbers.length >= 6;
              return (
                <button
                  key={num}
                  onClick={() => toggleNumber(num)}
                  disabled={isDisabled}
                  className={cn(
                    "aspect-square rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                    isSelected 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : isDisabled 
                        ? "opacity-30 bg-muted text-muted-foreground"
                        : "bg-muted text-foreground hover:bg-border active:scale-95"
                  )}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-border p-4 pb-8 mt-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-muted-foreground">Total Price</div>
          <div className="text-2xl font-extrabold text-foreground">
            {(quantity * campaign.ticketPrice).toLocaleString()} <span className="text-sm">Birr</span>
          </div>
        </div>
        <button
          onClick={() => setLocation(`/checkout/${campaign.id}`)}
          disabled={!isComplete}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-sm hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {isComplete ? "Continue to Checkout" : "Pick 6 Numbers"}
        </button>
      </div>
    </div>
  );
}
