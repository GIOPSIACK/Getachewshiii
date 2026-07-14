import { Link, useLocation } from "wouter";
import { Home, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [location] = useLocation();

  const activeIndex = tabs.findIndex(({ href }) =>
    href === "/" ? location === "/" : location.startsWith(href)
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-3">
      {/* Floating island */}
      <div className="max-w-md mx-auto rounded-[1.75rem] border border-border/60 bg-white/90 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.18)]">
        <div className="relative flex justify-around items-center h-16 px-4">
          {/* Sliding pill indicator */}
          <div
            className="absolute top-2 h-11 w-[30%] rounded-2xl bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
            style={{ left: `${activeIndex * 33.333 + 1.7}%` }}
          />

          {tabs.map(({ href, label, icon: Icon }, i) => {
            const active = i === activeIndex;
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center w-[33%] gap-1 transition-all duration-200"
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-300",
                    active ? "text-primary scale-110" : "text-muted-foreground"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Safe area spacer */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
