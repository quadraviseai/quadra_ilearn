export const colors = {
  ink: "#103e6f",
  inkSoft: "#315d88",
  slate: "#5f7089",
  slateSoft: "#8a9ab0",
  line: "rgba(16, 62, 111, 0.12)",
  lineStrong: "rgba(16, 62, 111, 0.22)",
  mist: "#f2f6fb",
  cloud: "#fcfaf2",
  card: "#ffffff",
  surface: "#f9fbff",
  accent: "#fb6404",
  accentStrong: "#c45105",
  accentSoft: "#fff0e4",
  accentGlow: "rgba(251, 100, 4, 0.18)",
  brandBlue: "#14579a",
  brandBlueDeep: "#0d4276",
  brandBlueSoft: "#eaf4ff",
  coral: "#ff8f4d",
  gold: "#f2b247",
  goldSoft: "#fff4d8",
  success: "#248f63",
  successSoft: "#e7f7ef",
  danger: "#c54f4f",
  dangerSoft: "#fdecec",
  shadow: "rgba(16, 62, 111, 0.12)",
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
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
};
