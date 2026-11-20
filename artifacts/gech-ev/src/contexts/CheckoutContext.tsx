import { createContext, useContext, useState, ReactNode } from "react";
import { TicketInputPaymentMethod } from "@workspace/api-client-react";

interface CheckoutState {
  campaignId: number;
  quantity: number;
  luckyNumbers: number[];
  buyerName: string;
  buyerPhone: string;
  paymentMethod: TicketInputPaymentMethod;
  senderAccount: string;
  receiptImageUrl: string | null;
}

interface CheckoutContextType {
  state: CheckoutState;
  updateState: (updates: Partial<CheckoutState>) => void;
  resetState: () => void;
}

const initialState: CheckoutState = {
  campaignId: 0,
  quantity: 1,
  luckyNumbers: [],
  buyerName: "",
  buyerPhone: "",
  paymentMethod: "telebirr",
  senderAccount: "",
  receiptImageUrl: null,
};

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CheckoutState>(initialState);

  const updateState = (updates: Partial<CheckoutState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const resetState = () => {
    setState(initialState);
  };

  return (
    <CheckoutContext.Provider value={{ state, updateState, resetState }}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
}
