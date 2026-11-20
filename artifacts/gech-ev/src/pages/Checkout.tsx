import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetCampaign, useListCampaigns, useUploadReceipt, useCreateTicket } from "@workspace/api-client-react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { X, Upload, Trash2, CreditCard, Smartphone, Check, ArrowLeft, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const MODEL_PRICES: Record<string, number> = {
  "BYD Yuan Plus": 3000,
  "Sinotruk HOWO 371": 7000,
};

export function Checkout() {
  const [, params] = useRoute("/checkout/:campaignId");
  const [, setLocation] = useLocation();
  const { state, updateState } = useCheckout();
  const { user, setUser } = useAuth();

  // Parse campaign ID safely
  const rawParamId = params?.campaignId;
  const parsedId = rawParamId ? Number(rawParamId) : NaN;
  const campaignId = !isNaN(parsedId) && parsedId > 0 ? parsedId : (state.campaignId || 1);

  // Fetch campaign by ID, and also use cached campaigns list as immediate fallback
  const { data: allCampaigns } = useListCampaigns();
  const { data: singleCampaign, isLoading: isSingleLoading } = useGetCampaign(campaignId, {
    query: { enabled: !!campaignId } as any,
  });

  const campaign = singleCampaign ?? allCampaigns?.find((c) => c.id === campaignId) ?? allCampaigns?.[0];

  const uploadReceipt = useUploadReceipt();
  const createTicket = useCreateTicket();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Ensure every step opens at the very top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");
  const [animKey, setAnimKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitError, setSubmitError] = useState("");

  // Loading state (only if neither single campaign nor cached campaigns are available)
  if (!campaign && isSingleLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-[100dvh] bg-background">
        <div className="px-4 pt-12 pb-4 flex items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold">Loading Checkout...</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Preparing your Ekub ticket order</p>
        </div>
      </div>
    );
  }

  // Fallback if campaign not found
  if (!campaign) {
    return (
      <div className="flex flex-col flex-1 min-h-[100dvh] bg-background p-6 items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold mb-1">Lottery Not Found</h2>
        <p className="text-xs text-muted-foreground mb-6 max-w-xs">
          The selected lottery is not available or has ended.
        </p>
        <button
          onClick={() => setLocation("/")}
          className="px-6 py-3 bg-primary text-black font-extrabold rounded-xl text-sm"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Safe variables
  const price = MODEL_PRICES[campaign.vehicleModel] ?? campaign.ticketPrice ?? 3000;
  const quantity = state.quantity > 0 ? state.quantity : 1;
  const totalPrice = price * quantity;
  const authPhone = user?.phone || "";
  const luckyNumbers = Array.isArray(state.luckyNumbers) ? state.luckyNumbers : [];

  // Safe payment details
  const rawPDetails = typeof campaign.paymentDetails === "string"
    ? JSON.parse(campaign.paymentDetails || "{}")
    : (campaign.paymentDetails || {});
  const telebirrNumber = rawPDetails.telebirrNumber || rawPDetails.telebirr || "0911223344";
  const cbeAccount = rawPDetails.cbeAccount || rawPDetails.cbeAccountNumber || "100012345678";
  const accountName = rawPDetails.accountName || "Gech EV Ekub";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Full = event.target?.result as string;
      setReceiptPreview(base64Full);
      try {
        const result = await uploadReceipt.mutateAsync({
          data: { imageData: base64Full.split(",")[1], mimeType: file.type },
        });
        updateState({ receiptImageUrl: result.url });
      } catch {
        updateState({ receiptImageUrl: base64Full });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptPreview(null);
    updateState({ receiptImageUrl: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const phoneUsed = (authPhone || state.buyerPhone).trim();
      const result = await createTicket.mutateAsync({
        data: {
          campaignId: campaign.id,
          buyerName: state.buyerName || "Customer",
          buyerPhone: phoneUsed,
          quantity: quantity,
          luckyNumbers: luckyNumbers,
          paymentMethod: state.paymentMethod || "telebirr",
          senderAccount: state.senderAccount || "N/A (not provided)",
          receiptImageUrl: state.receiptImageUrl,
        },
      });

      // Update AuthContext and persistent phone record
      const currentTgId = user?.telegramId || localStorage.getItem("gech:last_telegram_id") || "";
      setUser({
        telegramId: currentTgId,
        firstName: user?.firstName || state.buyerName,
        lastName: null,
        phone: phoneUsed,
      });

      if (currentTgId) {
        fetch("/api/auth/phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId: currentTgId, phone: phoneUsed }),
        }).catch(() => {});
      }

      setLocation(`/success?ticket=${result.ticketNumber}`);
    } catch (err: any) {
      const msg = err?.message || "Purchase failed. Please try again.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = (() => {
    if (step === 1) return state.buyerName.trim().length >= 2 && (authPhone || state.buyerPhone).trim().length >= 9;
    if (step === 2) return !!state.receiptImageUrl;
    return true;
  })();

  const goNext = () => {
    if (!canProceed) return;
    if (step < 3) {
      setSlideDir("left");
      setAnimKey((k) => k + 1);
      setStep((s) => (s + 1) as 1 | 2 | 3);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (step === 1) {
      setLocation(`/buy/${campaign.id}`);
    } else {
      setSlideDir("right");
      setAnimKey((k) => k + 1);
      setStep((s) => (s - 1) as 1 | 2 | 3);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-[100dvh] bg-background animate-in fade-in duration-300">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold leading-tight">Complete Your Purchase</h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">Step {step} of 3</p>
        </div>
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-border transition-colors shrink-0 mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step indicator — circles + connector */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-0">
          {[1, 2, 3].map((i, idx) => {
            const done = i < step;
            const current = i === step;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                {/* Circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shrink-0",
                    done
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : current
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm shadow-primary/30"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="w-4 h-4 stroke-[2.5]" /> : i}
                </div>

                {/* Connector line */}
                {idx < 2 && (
                  <div className="flex-1 h-0.5 mx-1 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: i < step ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Step labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          {["Details", "Payment", "Review"].map((label, i) => (
            <span
              key={label}
              className={cn(
                "text-[10px] font-semibold transition-colors",
                i + 1 === step ? "text-primary" : i + 1 < step ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div
        key={animKey}
        className={cn(
          "flex-1 px-4 overflow-y-auto animate-in duration-300",
          slideDir === "left"
            ? "slide-in-from-right-4 fade-in"
            : "slide-in-from-left-4 fade-in"
        )}
      >
        {/* ── STEP 1: DETAILS ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            {/* Order summary card */}
            <div className="bg-card border border-border rounded-[1.5rem] p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-extrabold text-base text-foreground">{campaign.vehicleModel}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {quantity} Ticket{quantity > 1 ? "s" : ""} × {price.toLocaleString()} Birr
                  </p>
                </div>
                <div className="bg-secondary text-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ml-3">
                  {quantity > 1
                    ? `${quantity} Tickets (${luckyNumbers.length} Numbers)`
                    : luckyNumbers.length > 0
                    ? luckyNumbers.slice(0, 3).join(", ") + (luckyNumbers.length > 3 ? "…" : "")
                    : "Numbers"}
                </div>
              </div>
              <div className="border-t border-dashed border-border pt-3">
                <p className="text-2xl font-extrabold text-primary">{totalPrice.toLocaleString()} Birr</p>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Full Name</label>
              <input
                type="text"
                value={state.buyerName}
                onChange={(e) => updateState({ buyerName: e.target.value })}
                placeholder="Enter your full name"
                className="w-full bg-card border border-border rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 text-base font-medium shadow-sm transition-shadow"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Phone Number</label>
              <input
                type="tel"
                value={authPhone || state.buyerPhone}
                onChange={(e) => !authPhone && updateState({ buyerPhone: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                placeholder="0911223344"
                readOnly={!!authPhone}
                className={`w-full bg-card border border-border rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 text-base font-medium shadow-sm tracking-wider ${authPhone ? "opacity-70 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: PAYMENT ── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <p className="text-sm font-semibold text-foreground">
              Select a payment method and transfer the exact total
            </p>

            {/* Telebirr */}
            <button
              onClick={() => updateState({ paymentMethod: "telebirr" })}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-[1.25rem] border-2 text-left transition-all duration-200",
                state.paymentMethod === "telebirr"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                state.paymentMethod === "telebirr" ? "bg-primary/15" : "bg-muted"
              )}>
                <Smartphone className={cn("w-6 h-6", state.paymentMethod === "telebirr" ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Telebirr</p>
                <p className="text-xs text-muted-foreground truncate">{accountName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm tabular-nums">{telebirrNumber}</p>
                {state.paymentMethod === "telebirr" && (
                  <div className="mt-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center ml-auto">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>

            {/* CBE */}
            <button
              onClick={() => updateState({ paymentMethod: "cbe" })}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-[1.25rem] border-2 text-left transition-all duration-200",
                state.paymentMethod === "cbe"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                state.paymentMethod === "cbe" ? "bg-primary/15" : "bg-muted"
              )}>
                <CreditCard className={cn("w-6 h-6", state.paymentMethod === "cbe" ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Commercial Bank of Ethiopia (CBE)</p>
                <p className="text-xs text-muted-foreground truncate">{accountName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-xs tabular-nums">{cbeAccount}</p>
                {state.paymentMethod === "cbe" && (
                  <div className="mt-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center ml-auto">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>

            {/* Upload zone */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Proof of Payment</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

              {receiptPreview ? (
                <div
                  className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted cursor-pointer shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeReceipt(); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-destructive text-white rounded-xl flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-3 px-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-white text-xs font-semibold">Payment receipt uploaded</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[3/2] rounded-2xl border-2 border-dashed border-secondary bg-secondary/10 flex flex-col items-center justify-center gap-3 hover:bg-secondary/20 active:scale-[0.99] transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-secondary/30 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm text-foreground">Upload Payment Receipt</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG up to 10MB</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW & CONFIRM ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="bg-card border border-border rounded-[1.5rem] shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-1">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                  Order Summary
                </p>
              </div>
              <div className="divide-y divide-border">
                <SummaryRow label="Lottery" value={campaign.vehicleModel} />
                <SummaryRow label="Tickets" value={`${quantity} × ${price.toLocaleString()} Birr`} />
                
                {/* Lucky Numbers per Ticket */}
                <div className="px-5 py-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-medium">Your Lucky Numbers</span>
                    <span className="text-xs font-bold text-primary">{quantity} Ticket{quantity > 1 ? "s" : ""}</span>
                  </div>
                  {quantity > 1 ? (
                    <div className="flex flex-col gap-2 pt-1">
                      {Array.from({ length: quantity }).map((_, tIdx) => {
                        const ticketNums = luckyNumbers.slice(tIdx * 6, (tIdx + 1) * 6);
                        return (
                          <div key={tIdx} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-1.5 border border-border/50">
                            <span className="text-xs font-bold text-foreground">Ticket #{tIdx + 1}:</span>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {ticketNums.map((n) => (
                                <span key={n} className="bg-primary/10 text-primary font-black text-[11px] px-2 py-0.5 rounded-lg border border-primary/20">
                                  #{n}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {luckyNumbers.map((n) => (
                        <span key={n} className="bg-secondary text-foreground text-[11px] font-bold px-2 py-0.5 rounded-full">
                          #{n}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <SummaryRow label="Name" value={state.buyerName} />
                <SummaryRow label="Phone" value={authPhone || state.buyerPhone} />
                <SummaryRow
                  label="Payment Method"
                  value={state.paymentMethod === "cbe" ? "Commercial Bank of Ethiopia (CBE)" : "Telebirr"}
                />
              </div>

              {/* Total row */}
              <div className="px-5 py-4 bg-primary/5 border-t border-primary/20 flex items-center justify-between">
                <span className="font-extrabold text-base text-foreground">Total</span>
                <span className="font-extrabold text-lg text-primary">{totalPrice.toLocaleString()} Birr</span>
              </div>
            </div>

            {/* Receipt preview */}
            {receiptPreview && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Proof of Payment</p>
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-muted shadow-sm">
                  <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {submitError && (
        <div className="mx-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive font-medium">
          {submitError}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 flex gap-3">
        <button
          onClick={goBack}
          className="px-6 py-4 bg-muted text-foreground rounded-2xl font-bold text-base hover:bg-border transition-colors active:scale-[0.97]"
        >
          Back
        </button>
        <button
          onClick={goNext}
          disabled={!canProceed || isSubmitting}
          className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base shadow-sm shadow-primary/25 hover:brightness-105 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : step === 3 ? (
            <><CreditCard className="w-4 h-4" /> Submit Order</>
          ) : (
            "Continue ›"
          )}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-bold text-foreground text-right max-w-[55%] truncate">{value}</span>
    </div>
  );
}
