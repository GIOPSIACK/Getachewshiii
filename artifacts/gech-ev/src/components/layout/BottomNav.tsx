import { Link, useLocation } from "wouter";
import { Home, Ticket, User, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [location] = useLocation();

  const activeIndex = tabs.findIndex(({ href }) =>
    href === "/" ? location === "/" : location.startsWith(href)
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-3 pointer-events-none">
      {/* Floating island container */}
      <div className="max-w-md mx-auto rounded-[1.75rem] border border-border/60 bg-white/95 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.18)] p-1.5 pointer-events-auto">
        <div className="grid grid-cols-4 items-center h-14">
          {tabs.map(({ href, label, icon: Icon }, i) => {
            const active = i === activeIndex;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-col items-center justify-center h-full py-1 rounded-2xl transition-all duration-200 select-none",
                  active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 rounded-2xl bg-primary/15 pointer-events-none"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200 relative z-10",
                    active ? "scale-110 text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold transition-colors duration-200 mt-0.5 relative z-10",
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
