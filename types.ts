export enum AssetType {
  CASH = '现金与活期',
  STOCK = '股票',
  FUND = '理财/基金',
  GOLD = '黄金/贵金属',
  CRYPTO = '虚拟货币',
  OTHER = '其他'
}

export enum MacroCategory {
  LIQUIDITY = '流动性资产',
  INVESTMENT = '投资性资产',
  RISK = '风险性资产',
  STABLE = '稳健型资产'
}

export interface AssetItem {
  name: string;
  originalAmount: number;
  currency: string;
  convertedAmountCNY: number;
  type: AssetType;
  macroCategory: MacroCategory;
  description?: string;
}

export interface AssetAnalysisResult {
  totalNetWorthCNY: number;
  breakdown: AssetItem[];
  summary: string;
  distributionAnalysis: string; // 整体分布分析
  investmentAdvice: string; // 具体的投资建议
}

export type ProcessingStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';