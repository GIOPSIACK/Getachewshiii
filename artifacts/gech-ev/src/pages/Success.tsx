import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { useCheckout } from "@/contexts/CheckoutContext";

export function Success() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const ticketId = searchParams.get("ticket");
  const { resetState } = useCheckout();

  useEffect(() => {
    resetState();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-[100dvh] bg-background">
      {/* Mimics the dark sheet / modal feel from the reference */}
      <div className="flex-1 flex flex-col px-4 pt-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-extrabold">Complete Your Purchase</h1>
          <p className="text-xs font-semibold text-muted-foreground">Step 3 of 3</p>
        </div>

        {/* Progress (all complete) */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-secondary" />
          ))}
        </div>

        {/* Success content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
          <div className="w-24 h-24 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-8 shadow-lg shadow-primary/20 animate-in zoom-in duration-500">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-extrabold text-foreground mb-4 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">
            Purchase Submitted!
          </h2>

          <p className="text-muted-foreground text-center text-sm leading-relaxed max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200">
            Your order{" "}
            {ticketId && (
              <span className="font-bold text-foreground">{ticketId}</span>
            )}{" "}
            has been submitted successfully. Payment verification may take up to 24 hours.
          </p>

          <div className="mt-10 w-full max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300">
            <button
              onClick={() => setLocation("/tickets")}
              className="w-full py-4 bg-secondary text-foreground rounded-2xl font-bold text-lg shadow-sm hover:brightness-105 active:scale-[0.98] transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
