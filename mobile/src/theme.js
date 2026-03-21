import { Platform } from "react-native";

export const colors = {
  ink: "#103e6f",
  inkSoft: "#315d88",
  slate: "#5f7089",
  slateSoft: "#8a9ab0",
  white: "#ffffff",
  black: "#182433",
  line: "rgba(16, 62, 111, 0.12)",
  lineSoft: "rgba(16, 62, 111, 0.08)",
  lineStrong: "rgba(16, 62, 111, 0.22)",
  mist: "#f2f6fb",
  cloud: "#f7f8fb",
  card: "#ffffff",
  surface: "#f5f7fb",
  section: "#ffffff",
  sectionAlt: "#f3f6fb",
  glass: "rgba(255,255,255,0.98)",
  glassStrong: "rgba(255,255,255,0.95)",
  glassSoft: "rgba(255,255,255,0.92)",
  glassMuted: "rgba(255,255,255,0.88)",
  glassChip: "rgba(255,255,255,0.75)",
  glassOverlay: "rgba(255,255,255,0.14)",
  glassOverlaySoft: "rgba(255,255,255,0.12)",
  glassTextSoft: "rgba(255,255,255,0.84)",
  glassTextMuted: "rgba(255,255,255,0.72)",
  glassTextFaint: "rgba(255,255,255,0.7)",
  accent: "#fb6404",
  accentStrong: "#c45105",
  accentSoft: "#fff0e4",
  accentGlow: "rgba(251, 100, 4, 0.18)",
  brandBlue: "#14579a",
  brandBlueDeep: "#0d4276",
  brandBlueSoft: "#eaf4ff",
  brandBlueOverlay: "rgba(20, 87, 154, 0.1)",
  coral: "#ff8f4d",
  gold: "#f2b247",
  goldSoft: "#fff4d8",
  goldOverlay: "rgba(242, 178, 71, 0.08)",
  heroWarm: "#fff4eb",
  heroCool: "#eef5ff",
  success: "#248f63",
  successSoft: "#e7f7ef",
  danger: "#c54f4f",
  dangerSoft: "#fdecec",
  shadow: "rgba(16, 62, 111, 0.12)",
};

export const gradients = {
  authHero: [colors.heroWarm, colors.heroCool],
  brand: [colors.accent, colors.coral],
  studentHero: [colors.ink, "#2f73ad", colors.accent],
  commerceHero: ["#fffbf7", "#eef5ff"],
  commerceBand: ["#ffffff", "#f5f7fb"],
  statAccent: ["#fff3e8", colors.white],
  statGold: ["#fff6dc", colors.white],
  statCoral: ["#ffe8dd", colors.white],
  headerGlass: ["rgba(255,255,255,0.96)", "rgba(234,244,255,0.86)"],
  sectionAccent: ["rgba(251, 100, 4, 0.18)", "rgba(20, 87, 154, 0.08)"],
  sectionDefault: ["rgba(20, 87, 154, 0.12)", "rgba(251, 100, 4, 0.04)"],
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radii = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: "0px 10px 18px rgba(16, 62, 111, 0.10)",
    },
    default: {
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
  }),
  glow: Platform.select({
    web: {
      boxShadow: "0px 12px 20px rgba(251, 100, 4, 0.20)",
    },
    default: {
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 5,
    },
  }),
};
