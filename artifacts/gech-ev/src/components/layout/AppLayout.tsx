import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");
  const isSuccess = location.startsWith("/success");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
      <main className={`flex-1 flex flex-col w-full max-w-md mx-auto bg-background min-h-[100dvh] ${!isAdmin && !isSuccess ? "pb-24" : ""}`}>
        {children}
      </main>
      {!isAdmin && !isSuccess && <BottomNav />}
    </div>
  );
}
