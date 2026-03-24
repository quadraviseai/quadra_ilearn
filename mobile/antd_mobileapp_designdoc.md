import type { ThemeConfig } from 'antd';

export const quadrailearnTheme: ThemeConfig = {
  token: {
    // Brand colors
    colorPrimary: '#FF7A00',
    colorInfo: '#2563EB',
    colorSuccess: '#16A34A',
    colorWarning: '#F59E0B',
    colorError: '#DC2626',

    // Base colors
    colorBgBase: '#F8FAFC',
    colorTextBase: '#0F172A',

    // Text hierarchy
    colorText: '#0F172A',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#94A3B8',
    colorTextQuaternary: '#CBD5E1',

    // Backgrounds
    colorBgLayout: '#F8FAFC',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgSpotlight: '#F1F5F9',

    // Borders
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#E5E7EB',

    // Typography
    fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    lineHeight: 1.55,
    lineHeightLG: 1.6,

    // Border radius
    borderRadius: 16,
    borderRadiusSM: 8,
    borderRadiusLG: 20,

    // Control sizing
    controlHeight: 48,
    controlHeightSM: 40,
    controlHeightLG: 52,

    // Spacing feel
    padding: 16,
    paddingSM: 12,
    paddingLG: 20,
    paddingXL: 24,

    margin: 16,
    marginSM: 12,
    marginLG: 20,
    marginXL: 24,

    // Shadows - keep subtle
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    boxShadowSecondary: '0 8px 24px rgba(15, 23, 42, 0.10)',

    // Motion
    motionDurationFast: '0.15s',
    motionDurationMid: '0.22s',
    motionDurationSlow: '0.3s',
  },

  components: {
    Layout: {
      bodyBg: '#F8FAFC',
      headerBg: '#FFFFFF',
      footerBg: '#F8FAFC',
      siderBg: '#FFFFFF',
      triggerBg: '#FFFFFF',
      triggerColor: '#0F172A',
    },

    Button: {
      borderRadius: 999,
      controlHeight: 48,
      controlHeightLG: 52,
      fontWeight: 600,
      primaryShadow: '0 8px 24px rgba(255, 122, 0, 0.18)',
      defaultShadow: 'none',
      defaultBorderColor: '#E2E8F0',
      defaultColor: '#1D4E89',
      defaultBg: '#FFFFFF',
      colorPrimary: '#FF7A00',
      colorPrimaryHover: '#E86F00',
      colorPrimaryActive: '#CC6200',
    },

    Card: {
      borderRadiusLG: 16,
      colorBgContainer: '#FFFFFF',
      colorBorderSecondary: '#E2E8F0',
      boxShadowTertiary: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
      headerFontSize: 18,
      headerFontSizeSM: 16,
      headerHeight: 56,
      paddingLG: 16,
    },

    Input: {
      borderRadius: 12,
      controlHeight: 48,
      activeBorderColor: '#1D4E89',
      hoverBorderColor: '#94A3B8',
      colorBorder: '#E2E8F0',
      colorBgContainer: '#FFFFFF',
      colorTextPlaceholder: '#94A3B8',
      activeShadow: '0 0 0 2px rgba(29, 78, 137, 0.10)',
    },

    InputNumber: {
      borderRadius: 12,
      controlHeight: 48,
      activeBorderColor: '#1D4E89',
      hoverBorderColor: '#94A3B8',
      colorBorder: '#E2E8F0',
      activeShadow: '0 0 0 2px rgba(29, 78, 137, 0.10)',
    },

    Select: {
      borderRadius: 12,
      controlHeight: 48,
      colorBorder: '#E2E8F0',
      optionSelectedBg: '#EFF6FF',
      optionActiveBg: '#F8FAFC',
      activeBorderColor: '#1D4E89',
      hoverBorderColor: '#94A3B8',
      activeOutlineColor: 'rgba(29, 78, 137, 0.10)',
    },

    Tabs: {
      colorText: '#475569',
      colorTextHeading: '#0F172A',
      colorPrimary: '#1D4E89',
      itemColor: '#64748B',
      itemHoverColor: '#1D4E89',
      itemSelectedColor: '#1D4E89',
      inkBarColor: '#FF7A00',
      horizontalItemPadding: '12px 4px',
      titleFontSize: 14,
      titleFontSizeLG: 16,
      cardBg: '#FFFFFF',
    },

    Menu: {
      itemBg: '#FFFFFF',
      itemColor: '#475569',
      itemHoverColor: '#1D4E89',
      itemSelectedColor: '#1D4E89',
      itemSelectedBg: '#EFF6FF',
      itemBorderRadius: 12,
      activeBarBorderWidth: 0,
    },

    Table: {
      borderColor: '#E2E8F0',
      headerBg: '#F8FAFC',
      headerColor: '#0F172A',
      headerSplitColor: '#E2E8F0',
      rowHoverBg: '#F8FAFC',
      colorBgContainer: '#FFFFFF',
      fontSize: 14,
      cellPaddingBlock: 14,
      cellPaddingInline: 12,
    },

    List: {
      colorBorder: '#E2E8F0',
      itemPadding: '14px 0',
    },

    Statistic: {
      titleColor: '#475569',
      contentColor: '#0F172A',
      fontSize: 24,
    },

    Tag: {
      borderRadiusSM: 999,
      defaultBg: '#F1F5F9',
      defaultColor: '#475569',
      defaultBorderColor: '#E2E8F0',
    },

    Badge: {
      colorPrimary: '#FF7A00',
      colorSuccess: '#16A34A',
      colorError: '#DC2626',
      colorWarning: '#F59E0B',
      textFontSize: 12,
      dotSize: 8,
      indicatorHeight: 20,
    },

    Alert: {
      borderRadiusLG: 16,
      withDescriptionPadding: '16px 20px',
    },

    Modal: {
      borderRadiusLG: 20,
      contentBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      footerBg: '#FFFFFF',
      titleColor: '#0F172A',
      titleFontSize: 20,
    },

    Drawer: {
      colorBgElevated: '#FFFFFF',
      borderRadiusLG: 20,
      paddingLG: 20,
    },

    Divider: {
      colorSplit: '#E5E7EB',
    },

    Progress: {
      defaultColor: '#FF7A00',
      remainingColor: '#E2E8F0',
      lineBorderRadius: 999,
    },

    Steps: {
      colorPrimary: '#FF7A00',
      colorText: '#475569',
      colorTextDescription: '#94A3B8',
      titleLineHeight: 1.4,
      iconSize: 28,
      iconFontSize: 14,
      dotSize: 10,
      dotCurrentSize: 12,
    },

    Switch: {
      colorPrimary: '#FF7A00',
      colorPrimaryHover: '#E86F00',
      handleBg: '#FFFFFF',
      trackHeight: 28,
      trackMinWidth: 48,
    },

    Checkbox: {
      colorPrimary: '#1D4E89',
      colorPrimaryHover: '#163E6F',
      borderRadiusSM: 6,
    },

    Radio: {
      colorPrimary: '#1D4E89',
      colorPrimaryHover: '#163E6F',
      buttonBg: '#FFFFFF',
      buttonCheckedBg: '#EFF6FF',
      buttonCheckedColor: '#1D4E89',
      buttonSolidCheckedBg: '#1D4E89',
      buttonSolidCheckedColor: '#FFFFFF',
    },

    Segmented: {
      trackBg: '#F1F5F9',
      itemColor: '#475569',
      itemSelectedBg: '#FFFFFF',
      itemSelectedColor: '#1D4E89',
      itemHoverBg: '#FFFFFF',
      borderRadius: 12,
    },

    Avatar: {
      borderRadius: 999,
      colorTextLightSolid: '#FFFFFF',
      colorBgContainer: '#EFF6FF',
    },

    Notification: {
      borderRadiusLG: 16,
      colorBgElevated: '#FFFFFF',
    },

    Message: {
      borderRadiusLG: 12,
    },

    Result: {
      titleFontSize: 24,
      subtitleFontSize: 14,
      extraMargin: '24px 0 0 0',
    },
  },
};