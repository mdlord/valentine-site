import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import originalImage from "../original_image.png";
import animatedImage from "../animated_image.png";

/**
 * Valentine site for Dhvani (React)
 * Flow: Color picker -> Emojis -> New page -> Do you like me? -> How much do you like me? -> Will you be my valentine? -> Celebration
 *
 * Enhancements:
 * - Depth snowfall (snowflakes smaller/slower/lower opacity)
 * - Theme persistence (localStorage, SSR-safe)
 * - Animated page transitions (fade + directional slide)
 *
 * Existing features preserved:
 * - Falling emojis with drift, start mid-animation (no queued row at top)
 * - Runaway buttons (Step 1: Yes+No runaway; Step 3: No runaway, Yes normal)
 * - Secret bottom-right button
 * - Music toggle
 * - Theme switch (2 themes)
 * - Circular back button on steps 2-4
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
  themes: {
    classicBlush: {
      label: "Classic Blush",
      colors: {
        backgroundStart: "#ffafbd",
        backgroundEnd: "#ffc3a0",
        cardBg: "rgba(255,255,255,0.92)",
        buttonColor: "#ff6b6b",
        textColor: "#ff4757",
        accentText: "#e11d48",
      },
    },
    cottonCandy: {
      label: "Cotton Candy",
      colors: {
        backgroundStart: "#fbcfe8",
        backgroundEnd: "#c7d2fe",
        cardBg: "rgba(255,255,255,0.92)",
        buttonColor: "#7c3aed",
        textColor: "#6d28d9",
        accentText: "#9333ea",
      },
    },
  },
  defaultThemeKey: "classicBlush",
  animations: {
    floatDistance: 50, // px
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

function FloatingElements({ config, extraBurstCount = 0, emojiOverride }) {
  const buildElements = useMemo(() => {
    return () => {
      const baseEmojis = (emojiOverride && emojiOverride.length
        ? emojiOverride
        : [...config.floatingEmojis.hearts, ...config.floatingEmojis.bears]
      ).map((e) => ({ emoji: e }));

      const burst = Array.from({ length: extraBurstCount }).map(() => {
        const emoji =
          config.floatingEmojis.hearts[
            Math.floor(Math.random() * config.floatingEmojis.hearts.length)
          ];
        return { emoji, burst: true };
      });

      const count = 48;
      const pick = () => {
        const all = [...baseEmojis, ...burst];
        return all[Math.floor(Math.random() * all.length)].emoji;
      };

      return Array.from({ length: count }).map((_, idx) => {
        const emoji = pick();
        const isSnow = emoji === "❄️";

        const layer = rand(0, 1);
        const size = isSnow ? rand(10, 22) : rand(18, 34);
        const opacity = isSnow ? clamp(0.25 + layer * 0.65, 0.25, 0.9) : 1;
        const duration = isSnow ? rand(22, 46) - layer * 10 : rand(12, 26);

        // Start from the top. Small stagger so it feels natural.
        const delay = rand(0, Math.min(2.2, duration * 0.25));
        const drift = isSnow ? rand(10, 28) : rand(14, 40);

        return {
          id: `e-${idx}-${Math.random().toString(16).slice(2)}`,
          idx,
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.floatingEmojis.bears, config.floatingEmojis.hearts, extraBurstCount, emojiOverride]);

  const [elements, setElements] = useState(() => buildElements());
  const [fading, setFading] = useState(false);
  const nextRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // On emoji selection change: fade out current emojis one-by-one,
    // then swap to the new set (which will start from the top).
    if (timerRef.current) clearTimeout(timerRef.current);

    const next = buildElements();
    nextRef.current = next;

    setFading(true);

    const perItemStagger = 14; // ms
    const fadeDuration = 420; // ms
    const total = fadeDuration + elements.length * perItemStagger + 40;

    timerRef.current = setTimeout(() => {
      setElements(nextRef.current || next);
      setFading(false);
      nextRef.current = null;
    }, total);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildElements]);

  return (
    <div
      style={{
        pointerEvents: "none",
        position: "fixed",
        inset: 0,
        zIndex: 0,
      }}
    >
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
            animationFillMode: "both",
            transform: "translateZ(0)",
            willChange: "transform, opacity",
            // @ts-ignore
            "--drift": `${el.drift}px`,
            // @ts-ignore
            "--spin": `${el.spin}deg`,
            ...(fading
              ? {
                  animationName: `floatDown, elementFadeOut`,
                  animationDuration: `${el.duration}, 420ms`,
                  animationTimingFunction: `linear, ease`,
                  animationIterationCount: `infinite, 1`,
                  animationFillMode: `both, forwards`,
                  animationDelay: `${el.delay}, ${el.idx * 14}ms`,
                }
              : null),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Animate: vanish -> relocate -> appear
    setPhase("vanish");
    if (timeoutRef.current.a) clearTimeout(timeoutRef.current.a);
    if (timeoutRef.current.b) clearTimeout(timeoutRef.current.b);

    timeoutRef.current.a = setTimeout(() => {
      setPos({ x, y });
      setJumpKey((k) => k + 1); // remount fixed button to replay animation
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
      {/* Slot keeps layout stable so other button doesn't shift */}
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
            pointerEvents: showInFlow && phase === "idle" ? "auto" : showInFlow ? "none" : "none",
            animation: phase === "vanish" && showInFlow ? "poofOut 140ms ease forwards" : "none",
          }}
        >
          {children}
        </button>
      </span>

      {/* The actual runaway button (out of flow) */}
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

function PrimaryButton({ children, onClick, style, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
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
        transition: "transform 160ms ease, filter 160ms ease, opacity 160ms ease",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.filter = "brightness(1.03)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "brightness(1)";
      }}
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
  const wheelRef = useRef(null);

  const { h } = useMemo(() => {
    const { r, g, b } = hexToRgb(color);
    return rgbToHsl(r, g, b);
  }, [color]);

  const handlePick = (e) => {
    const rect = wheelRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    const hue = (angle + 360) % 360;
    const hex = hslToHex(hue, 85, 55);
    onChange(hex);
  };

  const indicatorStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "white",
    border: `2px solid ${color}`,
    transform: `rotate(${h}deg) translate(58px) rotate(-${h}deg)`,
    boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-color)" }}>Pick a vibe ✨</div>

      <div
        ref={wheelRef}
        onMouseDown={handlePick}
        onMouseMove={(e) => e.buttons === 1 && handlePick(e)}
        style={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
          cursor: "crosshair",
          boxShadow: `0 18px 40px rgba(0,0,0,0.18), 0 0 24px ${color}`,
          position: "relative",
          animation: "wheelPulse 2.4s ease-in-out infinite",
        }}
      >
        <div style={indicatorStyle} />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: "linear-gradient(135deg, var(--background-color-1), var(--background-color-2))",
            boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
          }}
          title="Background preview"
        />
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: "var(--button-color)",
            boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
          }}
          title="Button preview"
        />
      </div>

      <div style={{ fontSize: 12, opacity: 0.75 }}>Drag around the wheel to change the mood</div>
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

// --- Step 3: Photo -> Animated -> Puzzle (3x3 sliding puzzle) ---
// Use project images imported through Vite so URLs are always valid.
const STEP3_REAL_PHOTO_SRC = originalImage;
const STEP3_ANIM_PHOTO_SRC = animatedImage;

const PUZZLE_ADJ = {
  0: [1, 3],
  1: [0, 2, 4],
  2: [1, 5],
  3: [0, 4, 6],
  4: [1, 3, 5, 7],
  5: [2, 4, 8],
  6: [3, 7],
  7: [4, 6, 8],
  8: [5, 7, 9],
  9: [8],
};

function isSolvedExtendedPuzzle(arr) {
  for (let i = 0; i < 9; i++) if (arr[i] !== i + 1) return false;
  return arr[9] === 0;
}

function makeShuffledExtendedBoard() {
  // 3x3 tiles + one external empty slot (index 9). Build by legal moves only.
  const board = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  let empty = 9;
  let prevEmpty = -1;

  const steps = 120;
  for (let i = 0; i < steps; i++) {
    const neighbors = PUZZLE_ADJ[empty];
    const options = neighbors.filter((n) => n !== prevEmpty);
    const picks = options.length ? options : neighbors;
    const next = picks[Math.floor(Math.random() * picks.length)];

    [board[empty], board[next]] = [board[next], board[empty]];
    prevEmpty = empty;
    empty = next;
  }

  if (isSolvedExtendedPuzzle(board)) {
    const next = PUZZLE_ADJ[empty][0];
    [board[empty], board[next]] = [board[next], board[empty]];
  }

  return board;
}

function Step3Puzzle({ onDone }) {
  const [realOk, setRealOk] = useState(true);
  const [animOk, setAnimOk] = useState(true);
  const [stage, setStage] = useState("real");
  // stages: real -> morphing -> anim -> puzzle -> solved
  const [board, setBoard] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  const [moves, setMoves] = useState(0);
  const containerSize = useMemo(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 900;
    return Math.max(260, Math.min(420, Math.floor(w * 0.78)));
  }, []);

  const tileSize = Math.floor(containerSize / 3);

  const posByValue = useMemo(() => {
    const map = new Map();
    board.forEach((v, idx) => map.set(v, idx));
    return map;
  }, [board]);

  const canMove = (tileValue) => {
    if (tileValue === 0) return false;
    const tileIdx = posByValue.get(tileValue);
    const emptyIdx = posByValue.get(0);
    return PUZZLE_ADJ[tileIdx].includes(emptyIdx);
  };

  const moveTile = (tileValue) => {
    if (stage !== "puzzle") return;
    if (!canMove(tileValue)) return;

    const tileIdx = posByValue.get(tileValue);
    const emptyIdx = posByValue.get(0);

    setBoard((prev) => {
      const next = [...prev];
      next[emptyIdx] = tileValue;
      next[tileIdx] = 0;
      return next;
    });
    setMoves((m) => m + 1);
  };

  useEffect(() => {
    if (stage !== "puzzle") return;
    if (isSolvedExtendedPuzzle(board)) {
      setStage("solved");
    }
  }, [board, stage]);

  const startMorph = () => {
    setStage("morphing");
    // Let the CSS transition play, then show the animated version
    setTimeout(() => setStage("anim"), 950);
  };

  const startPuzzle = () => {
    setMoves(0);
    setBoard(makeShuffledExtendedBoard());
    setStage("puzzle");
  };

  const posForIndex = (idx) => {
    if (idx <= 8) return { col: idx % 3, row: Math.floor(idx / 3) };
    return { col: 3, row: 2 };
  };

  return (
    <section>
      <h2 style={{ color: "var(--text-color)", fontSize: 22, fontWeight: 600, margin: 0 }}>
        A little memory… and a little game 🧩
      </h2>

      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
        Watch us transform… then solve the puzzle to continue.
      </div>

      <div
        style={{
          marginTop: 18,
          width: containerSize,
          height: containerSize,
          marginLeft: "auto",
          marginRight: "auto",
          borderRadius: 22,
          overflow: stage === "puzzle" || stage === "solved" ? "visible" : "hidden",
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.55)",
          background: "rgba(255,255,255,0.35)",
        }}
      >
        {/* Real photo */}
        <img
          src={STEP3_REAL_PHOTO_SRC}
          alt="Us"
          onError={() => setRealOk(false)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: stage === "real" ? 1 : stage === "morphing" ? 0 : 0,
            filter: stage === "morphing" ? "blur(6px) saturate(1.1)" : "none",
            transform: stage === "morphing" ? "scale(1.03)" : "scale(1)",
            transition: "opacity 900ms ease, filter 900ms ease, transform 900ms ease",
          }}
        />

        {/* Animated photo */}
        <img
          src={STEP3_ANIM_PHOTO_SRC}
          alt="Us (animated)"
          onError={() => setAnimOk(false)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity:
              stage === "anim" || stage === "puzzle" || stage === "solved" ? 1 : stage === "morphing" ? 1 : 0,
            filter: stage === "morphing" ? "blur(2px) saturate(1.15)" : "none",
            transform: stage === "morphing" ? "scale(1.01)" : "scale(1)",
            transition: "opacity 900ms ease, filter 900ms ease, transform 900ms ease",
          }}
        />

        {/* Puzzle overlay */}
        {(stage === "puzzle" || stage === "solved") && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(0px)",
            }}
          >
            {/* Tiles */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tile) => {
              const idx = posByValue.get(tile);
              const { row, col } = posForIndex(idx);

              // Correct position for background slice
              const correctIdx = tile - 1;
              const cr = Math.floor(correctIdx / 3);
              const cc = correctIdx % 3;

              const x = col * tileSize;
              const y = row * tileSize;

              const bgX = -cc * tileSize;
              const bgY = -cr * tileSize;

              const movable = stage === "puzzle" && canMove(tile);

              return (
                <button
                  key={tile}
                  type="button"
                  onClick={() => moveTile(tile)}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: tileSize,
                    height: tileSize,
                    transform: `translate(${x}px, ${y}px)`,
                    transition: "transform 180ms cubic-bezier(0.2, 0.9, 0.2, 1)",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    borderRadius: 14,
                    cursor: movable ? "pointer" : "default",
                    boxShadow: movable
                      ? "0 18px 34px rgba(0,0,0,0.22)"
                      : "0 12px 24px rgba(0,0,0,0.16)",
                    outline: "none",
                    backgroundImage: `url(${STEP3_ANIM_PHOTO_SRC})`,
                    backgroundSize: `${tileSize * 3}px ${tileSize * 3}px`,
                    backgroundPosition: `${bgX}px ${bgY}px`,
                    filter: stage === "solved" ? "brightness(1.06)" : "none",
                    opacity: stage === "solved" ? 0.98 : 1,
                  }}
                  aria-label={`Tile ${tile}`}
                  disabled={stage !== "puzzle"}
                />
              );
            })}

            {/* Empty tile outline hint */}
            <div
              style={{
                position: "absolute",
                left: posForIndex(posByValue.get(0)).col * tileSize,
                top: posForIndex(posByValue.get(0)).row * tileSize,
                width: tileSize,
                height: tileSize,
                borderRadius: 14,
                border: "2px dashed rgba(255,255,255,0.58)",
                background: "rgba(255,255,255,0.84)",
                boxShadow: "inset 0 10px 20px rgba(0,0,0,0.08)",
                boxSizing: "border-box",
                pointerEvents: "none",
                transition: "left 180ms cubic-bezier(0.2, 0.9, 0.2, 1), top 180ms cubic-bezier(0.2, 0.9, 0.2, 1)",
              }}
            />

            {/* Overlay text */}
            <div
              style={{
                position: "absolute",
                left: 14,
                bottom: 14,
                right: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                background: "rgba(0,0,0,0.22)",
                border: "1px solid rgba(255,255,255,0.22)",
                borderRadius: 16,
                padding: "10px 12px",
                color: "white",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {stage === "solved" ? "Solved! 💖" : "Solve the puzzle"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.95 }}>Moves: {moves}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        {stage === "real" && <PrimaryButton onClick={startMorph}>Transform ✨</PrimaryButton>}
        {stage === "anim" && <PrimaryButton onClick={startPuzzle}>Start Puzzle 🧩</PrimaryButton>}
        {stage === "puzzle" && (
          <PrimaryButton
            onClick={() => {
              setMoves(0);
              setBoard(makeShuffledExtendedBoard());
            }}
            style={{ background: "rgba(255,255,255,0.22)", color: "white", border: "1px solid rgba(255,255,255,0.38)" }}
          >
            Shuffle
          </PrimaryButton>
        )}
        {stage === "puzzle" && moves >= 30 && (
          <PrimaryButton
            onClick={() => {
              onDone?.();
            }}
          >
            eh, lets move on
          </PrimaryButton>
        )}
        {stage === "solved" && (
          <PrimaryButton
            onClick={() => {
              onDone?.();
            }}
          >
            Next →
          </PrimaryButton>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Tip: click a tile next to the empty square to move it.
      </div>
    </section>
  );
}

export default function App() {
  const config = CONFIG;
  useDocumentTitle(config.pageTitle);

  // Theme persistence (SSR-safe) — driven by the color wheel
  const [themeColor, setThemeColor] = useState(() => {
    return (
      safeGetLocalStorage("valentine_theme_color") ||
      config.themes[config.defaultThemeKey].colors.buttonColor
    );
  });

  useEffect(() => {
    safeSetLocalStorage("valentine_theme_color", themeColor);
  }, [themeColor]);

  const [step, setStep] = useState(1); // 1 Color picker, 2 Emojis, 3 New page, 4 Q1, 5 Love meter, 6 Valentine, 7 Celebration
  const [loveValue, setLoveValue] = useState(100);
  const [burst, setBurst] = useState(0);
  const [selectedEmojis, setSelectedEmojis] = useState(() => CONFIG.floatingEmojis.hearts);

  const derived = useMemo(() => deriveThemeFromHex(themeColor), [themeColor]);

  // Animated transitions: track direction
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

  // Love meter expands beyond 100% for comedic effect
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
    goStep(7);
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

        /* Runaway button "vanish" + "reappear" */
        @keyframes poofOut {
          0% { opacity: 1; transform: scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: scale(0.78); filter: blur(2px); }
        }

        @keyframes poofIn {
          0% { opacity: 0; transform: scale(0.72); filter: blur(2px); }
          60% { opacity: 1; transform: scale(1.06); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }

        @keyframes blobFloat {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(0,-10px,0) scale(1.03); }
        }

        @keyframes iconBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes wheelPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.08); }
        }

        @keyframes layerFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes layerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes elementFadeOut {
          from { opacity: 1; filter: blur(0px); transform: translateY(0px) scale(1); }
          to { opacity: 0; filter: blur(1.5px); transform: translateY(10px) scale(0.96); }
        }
      `}</style>

      <FloatingElements config={config} extraBurstCount={burst} emojiOverride={selectedEmojis} />
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
                  Choose the emojis that should fall ✨
                </h2>

                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
                  Tap to select. Your selection will fall from the sky.
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginTop: 16,
                  }}
                >
                  {[
                    "❤️","💖","🍆","🍆","🍑","👉👌","👙","💦","😈","😏","🔥","👀","😘","💋","🌹","🧸","🐻","❄️","🎁","✨",
                  ].map((emoji, idx) => {
                    const active = selectedEmojis.includes(emoji);
                    return (
                      <button
                        key={`${emoji}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedEmojis((prev) =>
                            prev.includes(emoji)
                              ? prev.filter((e) => e !== emoji)
                              : [...prev, emoji]
                          );
                        }}
                        style={{
                          fontSize: 24,
                          padding: 10,
                          borderRadius: 14,
                          border: active
                            ? "2px solid var(--button-color)"
                            : "2px solid rgba(0,0,0,0.08)",
                          background: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.7)",
                          cursor: "pointer",
                          transition:
                            "transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1), box-shadow 200ms ease, background 200ms ease, border-color 200ms ease",
                          boxShadow: active ? "0 10px 22px rgba(0,0,0,0.12)" : "none",
                          transform: active ? "translateY(-2px) scale(1.03)" : "translateY(0px) scale(1)",
                        }}
                        aria-pressed={active}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 22 }}>
                  <PrimaryButton onClick={() => goStep(3)}>Next →</PrimaryButton>
                </div>
              </section>
            )}

            {step === 3 && (
              <Step3Puzzle onDone={() => goStep(4)} />
            )}

            {step === 4 && (
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
                  <RunawayButton onClick={() => goStep(5)}>{config.questions.first.yesBtn}</RunawayButton>
                  <RunawayButton>{config.questions.first.noBtn}</RunawayButton>
                </div>

                {/* Secret button bottom-right */}
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
                    onClick={() => goStep(5)}
                    title="psst..."
                    style={{
                      background: "var(--button-color)",
                      color: "white",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
                    }}
                  >
                    {config.questions.first.secretAnswer}
                  </button>
                </div>
              </section>
            )}

            {step === 5 && (
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
                  {loveValue < 2000 && (
                    <div
                      style={{
                        marginBottom: 10,
                        color: "var(--accent-text)",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      You haven&apos;t met the expected level of anticipated lovingness yet.
                      Please crank it to at least 2000% to continue.
                    </div>
                  )}
                  <PrimaryButton disabled={loveValue < 2000} onClick={() => goStep(6)}>
                    {config.questions.second.nextBtn}
                  </PrimaryButton>
                </div>
              </section>
            )}

            {step === 6 && (
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

            {step === 7 && (
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
