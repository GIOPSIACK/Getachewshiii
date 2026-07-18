import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Phone } from "lucide-react";
import glogoSrc from "@/assets/glogo.jpg";
import jesterSrc from "@/assets/jester.png";

export function Profile() {
  const { user, setUser } = useAuth();
  const phone = user?.phone || "";
  const phoneIsAvailable = Boolean(user?.phone);

  const [didHydrate, setDidHydrate] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [pollingError, setPollingError] = useState("");

  const telegramUserId = useMemo(() => {
    const tg = (window as any).Telegram?.WebApp;
    const fallbackUser = tg?.initDataUnsafe?.user;
    if (!fallbackUser?.id) return null;
    return String(fallbackUser.id);
  }, []);

  const handleManualPhoneSubmit = async () => {
    if (!manualPhone.trim()) {
      setPhoneError("Please enter a phone number");
      return;
    }

    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    if (!phoneRegex.test(manualPhone.replace(/\s/g, ""))) {
      setPhoneError("Please enter a valid phone number");
      return;
    }

    const id = user?.telegramId ?? telegramUserId;
    if (!id) {
      setPhoneError("Cannot determine your Telegram ID");
      return;
    }

    setIsSubmittingPhone(true);
    setPhoneError("");

    try {
      const res = await fetch("/api/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: id, phone: manualPhone.trim() }),
      });

      if (res.ok) {
        setUser({
          telegramId: id,
          firstName: user?.firstName ?? null,
          lastName: null,
          phone: manualPhone.trim(),
        });
        setShowManualEntry(false);
        setManualPhone("");
      } else {
        const data = await res.json();
        setPhoneError(data.error || "Failed to save phone number");
      }
    } catch (error) {
      console.error("Failed to submit phone:", error);
      setPhoneError("Network error. Please try again.");
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  useEffect(() => {
    if (phoneIsAvailable) {
      setDidHydrate(true);
      return;
    }

    // Prefer AuthContext telegramId when available (set by Home).
    const id = user?.telegramId ?? telegramUserId;

    // If we can't determine telegram id yet, avoid infinite loading.
    if (id == null) {
      setDidHydrate(true);
      return;
    }

    let cancelled = false;

    const idString: string = id;

    async function hydratePhone() {
      console.log("Profile: Starting phone hydration for telegramId:", idString);
      
      // Wait long enough for the Telegram webhook to persist phone to DB.
      // (Webhook timing can lag behind the user's tap on "Share phone".)
      for (let attempt = 0; attempt < 60; attempt++) {
        if (cancelled) return;

        try {
          const userRes = await fetch(`/api/user?id=${encodeURIComponent(idString)}`);
          console.log(`Profile: Attempt ${attempt + 1} - Response status:`, userRes.status);
          
          if (userRes.ok) {
            const userData = await userRes.json();
            console.log(`Profile: Attempt ${attempt + 1} - User data:`, userData);
            
            if (userData?.phone) {
              const nextFirstName: string | null =
                (userData.firstName ?? user?.firstName ?? null) as string | null;

              console.log("Profile: Phone found! Setting user state.");
              setUser({
                telegramId: idString,
                firstName: nextFirstName,
                lastName: null,
                phone: String(userData.phone),
              });

              if (!cancelled) setDidHydrate(true);
              return;
            } else {
              console.log(`Profile: Attempt ${attempt + 1} - No phone in response`);
            }
          } else {
            console.log(`Profile: Attempt ${attempt + 1} - Request failed with status:`, userRes.status);
          }
        } catch (error) {
          console.error(`Profile: Attempt ${attempt + 1} failed to fetch user:`, error);
        }

        // ~1s between attempts => ~60s total wait
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Profile: Polling exhausted - phone not found");
      setPollingError("Phone number not found in database. Please share it via the bot first.");
      if (!cancelled) setDidHydrate(true);
    }

    hydratePhone();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramUserId, phone, setUser]);

  return (
    <div className="flex flex-col flex-1 min-h-[100dvh]">
      <div className="px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <img src={glogoSrc} alt="Gech Ekub Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
          <span style={{ fontFamily: "'Hegiena', sans-serif" }} className="text-xl leading-tight tracking-tight">
            Gech Ekub
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-8">
        {phone ? (
          <div className="bg-primary/10 border border-primary/20 rounded-[1.5rem] p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center shrink-0 shadow-sm">
              <Phone className="w-7 h-7 text-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">User Phone Number</p>
              <p className="text-xl font-extrabold text-foreground tracking-wide">{phone}</p>
            </div>
          </div>
        ) : didHydrate ? (
          showManualEntry ? (
            <div className="bg-card border border-border rounded-[1.5rem] p-6">
              <h3 className="font-bold text-base mb-4 text-center">Enter Your Phone Number</h3>
              <div className="space-y-4">
                <div>
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="+251911234567"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isSubmittingPhone}
                  />
                  {phoneError && (
                    <p className="text-red-500 text-xs mt-2">{phoneError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowManualEntry(false);
                      setManualPhone("");
                      setPhoneError("");
                    }}
                    disabled={isSubmittingPhone}
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted text-foreground font-medium hover:bg-muted/80 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualPhoneSubmit}
                    disabled={isSubmittingPhone}
                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingPhone ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-[1.5rem] p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-base mb-1">No phone number saved</h3>
              <p className="text-sm text-muted-foreground mb-2">Please share your phone number via the Telegram bot first.</p>
              {pollingError && (
                <p className="text-xs text-red-500 mb-4">{pollingError}</p>
              )}
              <button
                onClick={() => setShowManualEntry(true)}
                className="px-6 py-2.5 rounded-xl border border-border bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
              >
                Enter Manually (Last Resort)
              </button>
            </div>
          )
        ) : (
          <div className="bg-card border border-border rounded-[1.5rem] p-8 flex items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">Loading phone number…</p>
          </div>
        )}
      </div>

      <div className="pb-24 text-center">
        <img src={jesterSrc} alt="Gech Ekub Jester" className="w-full block mb-3" />
        <p className="text-[11px] text-muted-foreground leading-relaxed px-4">
          � 2026 Gech EV Makina Ekub. All Rights Reserved.{"\n"}
          <span className="text-primary font-medium">Designed & Developed by Gech Team</span>
        </p>
      </div>
    </div>
  );
}
