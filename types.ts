
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

export type AIProvider = 'gemini' | 'openai';

export interface AssetItem {
  name: string;
  entity: string; // 银行或券商名称
  originalAmount: number;
  currency: string;
  convertedAmountCNY: number;
  type: AssetType;
  macroCategory: MacroCategory;
  description?: string;
}

export interface AssetAnalysisResult {
  id: string;
  timestamp: number;
  totalNetWorthCNY: number;
  breakdown: AssetItem[];
  summary: string;
  distributionAnalysis: string;
  investmentAdvice: string;
  riskMetrics: {
    stockConcentration: number; // 前5大股票占比
    entityConcentration: number; // 单一机构最高占比
    cashRatio: number; // 现金比例
    riskAlerts: string[]; // 风险提示列表
  };
}

export type ProcessingStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
