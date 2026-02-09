import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Valentine site for Dhvani (React)
 * Flow: Mood -> Q1 -> Love meter -> Q3 -> Celebration
 *
 * Enhancements:
 * - Depth snowfall (snowflakes smaller/slower/lower opacity)
 * - Theme persistence (localStorage, SSR-safe)
 * - Animated page transitions (fade + directional slide)
 *
 * Existing features preserved:
 * - Falling emojis with drift, start mid-animation (no queued row at top)
 * - Runaway buttons (Step 2: Yes+No runaway; Step 4: No runaway, Yes normal)
 * - Secret bottom-right button
 * - Music toggle
 * - Color-wheel driven theme
 * - Circular back button on steps 2-5
 * - Global Poppins font
 */

const CONFIG = {
  valentineName: "Dhvani",
  pageTitle: "Dhvani, will you be my Valentine? 💝",
  floatingEmojis: {
    // snowflake weighted heavier by repetition
    hearts: ["❤️", "💖", "💝", "💗", "💓", "❄️", "❄️", "❄️", "❄️", "❄️", "❄️", "❄️"],
    bears: ["🧸", "🐻"],
  },
  questions: {
    first: {
      text: "Do you like me?",
      yesBtn: "Yes",
      noBtn: "No",
      secretAnswer: "I don't like you, I love you! ❤️",
    },
    second: {
      text: "How much do you love me?",
      startText: "This much!",
      nextBtn: "Next ❤️",
    },
    third: {
      text: "Will you be my Valentine on February 14th, 2026? 🌹",
      yesBtn: "Yes!",
      noBtn: "No",
    },
  },
  loveMessages: {
    extreme: "WOOOOW You love me that much?? 🥰🚀💝",
    high: "To infinity and beyond! 🚀💝",
    normal: "And beyond! 🥰",
  },
  celebration: {
    title: "Yay! I'm the luckiest person in the world! 🎉💝💖💝💓",
    message: "Now come get your gift, a big warm hug and a huge kiss!",
    emojis: "🎁💖🤗💝💋❤️💕",
  },
  basePalette: {
    buttonBackground: "#ff6b6b",
    textColor: "#ff4757",
    accentText: "#e11d48",
  },
  animations: {
    bounceSpeed: 0.5, // s
  },
  music: {
    enabled: true,
    autoplay: true,
    musicUrl:
      "https://res.cloudinary.com/dncywqfpb/video/upload/v1738399057/music_qrhjvy.mp3",
    startText: "🎵 Play Music",
    stopText: "🔇 Stop Music",
    volume: 0.5,
  },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

function safeGetLocalStorage(key) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function hexToRgb(hex) {
  const h = (hex || "").replace("#", "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
  }
  return { r: 255, g: 107, b: 107 };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToHex(r, g, b) {
  const to = (n) => n.toString(16).padStart(2, "0");
  return `#${to(clamp(r, 0, 255))}${to(clamp(g, 0, 255))}${to(clamp(b, 0, 255))}`;
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function deriveThemeFromHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  const bg1 = hslToHex(h, Math.max(35, s), 88);
  const bg2 = hslToHex(h + 18, Math.max(30, s * 0.85), 90);
  const text = hslToHex(h, Math.min(85, s + 10), 32);
  const accent = hslToHex(h + 6, Math.min(95, s + 15), 40);
  const button = hslToHex(h, Math.min(95, s + 12), Math.max(40, Math.min(55, l)));

  return {
    backgroundStart: bg1,
    backgroundEnd: bg2,
    cardBg: "rgba(255,255,255,0.92)",
    buttonColor: button,
    textColor: text,
    accentText: accent,
  };
}

function ensureVisibleButton(hex) {
  // If someone sets button to near-white, fall back.
  if (!hex || typeof hex !== "string") return "#ff6b6b";
  const h = hex.trim().toLowerCase();
  if (h === "#ffffff" || h === "#fff" || h === "white") return "#ff6b6b";
  return hex;
}

function FloatingElements({ config, extraBurstCount = 0 }) {
  const elements = useMemo(() => {
    const baseList = [
      ...config.floatingEmojis.hearts.map((e) => ({ emoji: e })),
      ...config.floatingEmojis.bears.map((e) => ({ emoji: e })),
    ];

    const burst = Array.from({ length: extraBurstCount }).map(() => {
      const emoji =
        config.floatingEmojis.hearts[
          Math.floor(Math.random() * config.floatingEmojis.hearts.length)
        ];
      return { emoji, burst: true };
    });

    const count = 48;

    const pick = () => {
      const all = [...baseList, ...burst];
      return all[Math.floor(Math.random() * all.length)].emoji;
    };

    return Array.from({ length: count }).map((_, idx) => {
      const emoji = pick();
      const isSnow = emoji === "❄️";

      const layer = rand(0, 1);
      const size = isSnow ? rand(10, 22) : rand(18, 34);
      const opacity = isSnow ? clamp(0.25 + layer * 0.65, 0.25, 0.9) : 1;
      const duration = isSnow ? rand(22, 46) - layer * 10 : rand(12, 26);

      // Start mid-animation so nothing appears queued at the top
      const delay = rand(-duration, 0);

      const drift = isSnow ? rand(10, 28) : rand(14, 40);

      return {
        id: `e-${idx}-${Math.random().toString(16).slice(2)}`,
        emoji,
        left: `${rand(0, 100)}vw`,
        delay: `${delay}s`,
        duration: `${duration}s`,
        size: `${size}px`,
        opacity,
        drift,
        spin: isSnow ? rand(-60, 60) : 0,
      };
    });
  }, [config.floatingEmojis.bears, config.floatingEmojis.hearts, extraBurstCount]);

  return (
    <div style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 0 }}>
      {elements.map((el) => (
        <div
          key={el.id}
          style={{
            position: "absolute",
            left: el.left,
            fontSize: el.size,
            opacity: el.opacity,
            userSelect: "none",
            animation: `floatDown ${el.duration} linear infinite`,
            animationDelay: el.delay,
            transform: "translateZ(0)",
            willChange: "transform",
            // @ts-ignore
            "--drift": `${el.drift}px`,
            // @ts-ignore
            "--spin": `${el.spin}deg`,
          }}
          aria-hidden="true"
        >
          {el.emoji}
        </div>
      ))}
    </div>
  );
}

function RunawayButton({ children, onClick, disabled = false, style }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const [slot, setSlot] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState("idle"); // idle | vanish | appear
  const timeoutRef = useRef({ a: null, b: null });
  const [jumpKey, setJumpKey] = useState(0);

  const measure = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.ceil(r.width);
    const h = Math.ceil(r.height);
    if (w !== slot.w || h !== slot.h) setSlot({ w, h });
  };

  useLayoutEffect(() => {
    measure();
  }, []);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [slot.w, slot.h]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current.a) clearTimeout(timeoutRef.current.a);
      if (timeoutRef.current.b) clearTimeout(timeoutRef.current.b);
    };
  }, []);

  const teleport = () => {
    if (disabled) return;

    const padding = 16;
    const x = rand(padding, Math.max(padding, window.innerWidth - 170 - padding));
    const y = rand(padding, Math.max(padding, window.innerHeight - 70 - padding));

    setPhase("vanish");
    if (timeoutRef.current.a) clearTimeout(timeoutRef.current.a);
    if (timeoutRef.current.b) clearTimeout(timeoutRef.current.b);

    timeoutRef.current.a = setTimeout(() => {
      setPos({ x, y });
      setJumpKey((k) => k + 1);
      setPhase("appear");

      timeoutRef.current.b = setTimeout(() => {
        setPhase("idle");
      }, 220);
    }, 140);
  };

  const baseStyle = {
    background: "var(--button-color)",
    color: "white",
    border: "none",
    borderRadius: 999,
    padding: "10px 18px",
    fontSize: 18,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
    transition: "transform 160ms ease, filter 160ms ease",
    ...style,
  };

  const commonProps = {
    type: "button",
    disabled,
    onClick: (e) => {
      teleport();
      onClick?.(e);
    },
    onMouseEnter: teleport,
    onMouseDown: (e) => (e.currentTarget.style.transform = "scale(0.98)"),
    onMouseUp: (e) => (e.currentTarget.style.transform = "scale(1)"),
  };

  const showInFlow = !pos;

  return (
    <>
      <span
        style={{
          display: "inline-block",
          width: slot.w ? `${slot.w}px` : "auto",
          height: slot.h ? `${slot.h}px` : "auto",
        }}
      >
        <button
          ref={btnRef}
          {...commonProps}
          style={{
            ...baseStyle,
            visibility: showInFlow ? "visible" : "hidden",
            pointerEvents: showInFlow && phase === "idle" ? "auto" : "none",
            animation: phase === "vanish" && showInFlow ? "poofOut 140ms ease forwards" : "none",
          }}
        >
          {children}
        </button>
      </span>

      {pos && (
        <button
          key={`run-${jumpKey}`}
          {...commonProps}
          style={{
            ...baseStyle,
            position: "fixed",
            left: pos.x,
            top: pos.y,
            zIndex: 30,
            pointerEvents: phase === "idle" ? "auto" : "none",
            animation:
              phase === "vanish"
                ? "poofOut 140ms ease forwards"
                : phase === "appear"
                ? "poofIn 220ms cubic-bezier(0.2, 0.9, 0.2, 1) both"
                : "none",
          }}
        >
          {children}
        </button>
      )}
    </>
  );
}

function PrimaryButton({ children, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "var(--button-color)",
        color: "white",
        border: "none",
        borderRadius: 999,
        padding: "10px 18px",
        fontSize: 18,
        fontWeight: 500,
        cursor: "pointer",
        boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
        transition: "transform 160ms ease, filter 160ms ease",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
    >
      {children}
    </button>
  );
}

function MusicControls({ config }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const enabled = config.music?.enabled;

  useEffect(() => {
    if (!enabled) return;
    const a = audioRef.current;
    if (!a) return;

    a.volume = clamp(config.music?.volume ?? 0.5, 0, 1);
    a.src = config.music?.musicUrl || "";

    const tryAutoplay = async () => {
      if (!config.music?.autoplay) return;
      try {
        await a.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    };

    tryAutoplay();
  }, [config.music?.autoplay, config.music?.musicUrl, config.music?.volume, enabled]);

  if (!enabled) return null;

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (a.paused) {
      try {
        await a.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      a.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div style={{ position: "fixed", right: 20, top: 20, zIndex: 20 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          background: "var(--button-color)",
          color: "white",
          border: "none",
          borderRadius: 999,
          padding: "10px 14px",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
        }}
      >
        {isPlaying ? config.music.stopText : config.music.startText}
      </button>
      <audio ref={audioRef} loop preload="auto" />
    </div>
  );
}

function ThemeWheel({ color, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-color)" }}>Pick a vibe ✨</div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <input
          aria-label="Theme color"
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 54,
            height: 54,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
          }}
        />

        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            background: "linear-gradient(135deg, var(--background-color-1), var(--background-color-2))",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
          }}
          title="Background preview"
        />

        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            background: "var(--button-color)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
          }}
          title="Button preview"
        />
      </div>

      <div style={{ fontSize: 12, opacity: 0.8 }}>Color wheel changes the whole theme</div>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      title="Back"
      style={{
        background: "var(--button-color)",
        color: "white",
        width: 36,
        height: 36,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
      }}
    >
      ←
    </button>
  );
}

export default function App() {
  const config = CONFIG;
  useDocumentTitle(config.pageTitle);

  const [themeColor, setThemeColor] = useState(() => {
    return safeGetLocalStorage("valentine_theme_color") || config.basePalette.buttonBackground;
  });

  useEffect(() => {
    safeSetLocalStorage("valentine_theme_color", themeColor);
  }, [themeColor]);

  const [step, setStep] = useState(1); // 1 Mood, 2 Q1, 3 Love meter, 4 Q3, 5 Celebration
  const [loveValue, setLoveValue] = useState(100);
  const [burst, setBurst] = useState(0);

  const derived = useMemo(() => deriveThemeFromHex(themeColor), [themeColor]);

  const [direction, setDirection] = useState(1); // 1 forward, -1 back

  const goStep = (next) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--background-color-1", derived.backgroundStart);
    root.style.setProperty("--background-color-2", derived.backgroundEnd);
    root.style.setProperty("--card-bg", derived.cardBg);
    root.style.setProperty("--button-color", ensureVisibleButton(derived.buttonColor));
    root.style.setProperty("--text-color", derived.textColor);
    root.style.setProperty("--accent-text", derived.accentText);
    root.style.setProperty("--bounce-speed", `${config.animations.bounceSpeed}s`);
  }, [config.animations.bounceSpeed, derived]);

  const extraLoveMessage = useMemo(() => {
    if (loveValue <= 100) return null;
    if (loveValue >= 5000) return { text: config.loveMessages.extreme, super: true };
    if (loveValue > 1000) return { text: config.loveMessages.high, super: false };
    return { text: config.loveMessages.normal, super: false };
  }, [config.loveMessages, loveValue]);

  const meterWidthStyle = useMemo(() => {
    if (loveValue <= 100) return { width: "100%" };
    const overflow = (loveValue - 100) / 9900;
    const w = typeof window !== "undefined" ? window.innerWidth : 900;
    const extraPx = overflow * w * 0.8;
    return {
      width: `calc(100% + ${Math.round(extraPx)}px)`,
      transition: "width 0.3s",
    };
  }, [loveValue]);

  const celebrate = () => {
    setBurst(70);
    goStep(5);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
        background: "linear-gradient(135deg, var(--background-color-1), var(--background-color-2))",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
        * { font-family: 'Poppins', sans-serif; font-weight: 500; box-sizing: border-box; }

        @keyframes floatDown {
          0%   { transform: translateY(-120px) translateX(0px) rotate(0deg); }
          25%  { transform: translateY(25vh) translateX(var(--drift)) rotate(calc(var(--spin) * 0.25)); }
          50%  { transform: translateY(50vh) translateX(calc(var(--drift) * -1)) rotate(calc(var(--spin) * 0.5)); }
          75%  { transform: translateY(75vh) translateX(calc(var(--drift) * 0.6)) rotate(calc(var(--spin) * 0.75)); }
          100% { transform: translateY(100vh) translateX(calc(var(--drift) * -0.6)) rotate(var(--spin)); }
        }

        @keyframes bounce {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }

        @keyframes pageIn {
          0% {
            opacity: 0;
            transform: translateX(calc(var(--dir) * 18px)) translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
        }

        @keyframes poofOut {
          0% { opacity: 1; transform: scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: scale(0.78); filter: blur(2px); }
        }

        @keyframes poofIn {
          0% { opacity: 0; transform: scale(0.72); filter: blur(2px); }
          60% { opacity: 1; transform: scale(1.06); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
      `}</style>

      <FloatingElements config={config} extraBurstCount={burst} />
      <MusicControls config={config} />

      <main
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            width: "min(720px, 92vw)",
            borderRadius: 28,
            padding: 30,
            background: "var(--card-bg)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.16)",
            border: "1px solid rgba(255,255,255,0.45)",
            position: "relative",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          {step > 1 && (
            <div style={{ position: "absolute", left: 18, top: 18 }}>
              <BackButton
                onClick={() => {
                  setBurst(0);
                  goStep(Math.max(1, step - 1));
                }}
              />
            </div>
          )}

          <h1
            style={{
              color: "var(--accent-text)",
              margin: "0 0 18px",
              fontSize: 38,
              lineHeight: 1.1,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {step === 1 ? "Hello lover…" : `${config.valentineName}, my love…`}
          </h1>

          <div
            key={step}
            style={{
              // @ts-ignore
              "--dir": direction,
              animation: "pageIn 320ms ease",
              marginTop: 12,
            }}
          >
            {step === 1 && (
              <section>
                <div style={{ color: "var(--text-color)", fontSize: 18, fontWeight: 600 }}>
                  Set the mood ✨
                </div>
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
                  Pick a color vibe — it will change the background, text, and buttons.
                </div>

                <div style={{ marginTop: 18 }}>
                  <ThemeWheel color={themeColor} onChange={setThemeColor} />
                </div>

                <div style={{ marginTop: 22 }}>
                  <PrimaryButton onClick={() => goStep(2)}>Next →</PrimaryButton>
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <h2 style={{ color: "var(--text-color)", fontSize: 22, fontWeight: 600, margin: 0 }}>
                  {config.questions.first.text}
                </h2>

                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    gap: 12,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <RunawayButton onClick={() => goStep(3)}>{config.questions.first.yesBtn}</RunawayButton>
                  <RunawayButton>{config.questions.first.noBtn}</RunawayButton>
                </div>

                <div
                  style={{
                    position: "fixed",
                    bottom: 20,
                    right: 20,
                    zIndex: 20,
                    transform: "scale(0.75)",
                    opacity: 0.25,
                    transition: "opacity 200ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.25")}
                >
                  <button
                    type="button"
                    onClick={() => goStep(3)}
                    title="psst..."
                    style={{
                      background: "var(--button-color)",
                      color: "white",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
                    }}
                  >
                    {config.questions.first.secretAnswer}
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section>
                <h2 style={{ color: "var(--text-color)", fontSize: 22, fontWeight: 600, margin: 0 }}>
                  {config.questions.second.text}
                </h2>

                <div style={{ marginTop: 18 }}>
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    value={loveValue}
                    onChange={(e) => setLoveValue(parseInt(e.target.value, 10))}
                    style={{
                      ...meterWidthStyle,
                      height: 22,
                      borderRadius: 999,
                      cursor: "pointer",
                      background: "linear-gradient(to right, var(--button-color), rgba(255,255,255,0.85))",
                      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.12)",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                    }}
                  />

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "var(--text-color)", fontSize: 16, fontWeight: 600 }}>
                      {config.questions.second.startText} ({loveValue}%)
                    </div>

                    {extraLoveMessage && (
                      <div
                        style={{
                          color: "var(--accent-text)",
                          background: "rgba(255, 255, 255, 0.75)",
                          border: "1px solid rgba(0,0,0,0.06)",
                          borderRadius: 14,
                          padding: "8px 10px",
                          fontSize: extraLoveMessage.super ? 18 : 14,
                          fontWeight: 600,
                          animation: "bounce var(--bounce-speed) infinite alternate",
                        }}
                      >
                        {extraLoveMessage.text}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <PrimaryButton onClick={() => goStep(4)}>{config.questions.second.nextBtn}</PrimaryButton>
                </div>
              </section>
            )}

            {step === 4 && (
              <section>
                <h2 style={{ color: "var(--text-color)", fontSize: 22, fontWeight: 600, margin: 0 }}>
                  {config.questions.third.text}
                </h2>

                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    gap: 12,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <PrimaryButton onClick={celebrate}>{config.questions.third.yesBtn}</PrimaryButton>
                  <RunawayButton>{config.questions.third.noBtn}</RunawayButton>
                </div>
              </section>
            )}

            {step === 5 && (
              <section>
                <h2 style={{ color: "var(--text-color)", fontSize: 22, fontWeight: 600, margin: 0 }}>
                  {config.celebration.title}
                </h2>
                <p style={{ color: "var(--text-color)", marginTop: 12, fontSize: 16, fontWeight: 600 }}>
                  {config.celebration.message}
                </p>
                <p
                  style={{
                    color: "var(--accent-text)",
                    marginTop: 18,
                    fontSize: 46,
                    fontWeight: 600,
                    animation: "bounce var(--bounce-speed) infinite alternate",
                    textShadow: "2px 2px 6px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {config.celebration.emojis}
                </p>

                <div style={{ marginTop: 22 }}>
                  <PrimaryButton
                    onClick={() => {
                      setLoveValue(100);
                      setBurst(0);
                      goStep(1);
                    }}
                  >
                    Replay 🔁
                  </PrimaryButton>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
