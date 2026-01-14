/**
 * Formatting helpers used across the app
 */
export const formatCurrency = (value: number, format: 'billions' | 'millions' = 'billions') => {
  if (!Number.isFinite(value)) return '€0';
  if (format === 'billions') {
    const billions = value / 1_000_000_000;
    // show one decimal if >=1B, otherwise show millions
    if (Math.abs(billions) >= 1) return `€${billions.toFixed(1)}B`;
    const millions = value / 1_000_000;
    return `€${millions.toFixed(0)}M`;
  }
  // millions format
  const millions = value / 1_000_000;
  return `€${millions.toFixed(0)}M`;
};

export const formatRiskScore = (score: number) => `${Math.round(score)}/100`;

export const formatEnergyGWh = (gwh: number) => {
  if (!Number.isFinite(gwh)) return '0 GWh';
  return `${Math.round(gwh).toLocaleString('en-US')} GWh`;
};

export const formatCO2 = (tonnes: number) => {
  if (!Number.isFinite(tonnes)) return '0 t';
  if (Math.abs(tonnes) >= 1_000_000) return `${Math.round(tonnes / 1_000).toLocaleString('en-US')}K t`;
  return `${Math.round(tonnes).toLocaleString('en-US')} t`;
};

export default { formatCurrency, formatRiskScore, formatEnergyGWh, formatCO2 };
