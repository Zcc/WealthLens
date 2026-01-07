import { GoogleGenAI, Type } from "@google/genai";
import { AssetAnalysisResult, AssetType, MacroCategory } from "../types.ts";

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeFinancialScreenshots = async (files: File[], customApiKey?: string): Promise<AssetAnalysisResult> => {
  // 优先使用用户提供的 Key，否则使用环境变量中的 Key
  const apiKey = customApiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key 缺失。请在设置中配置您的 Key，或确保环境设置了默认 API_KEY。");
  }

  const ai = new GoogleGenAI({ apiKey });
  const imageParts = await Promise.all(files.map(fileToGenerativePart));

  const prompt = `
    你是一位资深的私人财富管理专家。请分析上传的银行、股票、理财账户截图。
    
    任务要求：
    1. 提取资产信息，识别币种并统一折算为人民币 (CNY)。汇率参考：USD=7.25, HKD=0.93, JPY=0.048。
    2. 自动去重：识别重复的账号或余额。
    3. 识别机构 (entity)：必须识别出该项资产所属的银行（如招商银行、工商银行）或券商（如中信证券、富途证券）。
    4. 资产分类：
       - 类型 (type): 严格匹配枚举值 ['现金与活期', '股票', '理财/基金', '黄金/贵金属', '虚拟货币', '其他']。
       - 宏观类别 (macroCategory): 匹配 ['流动性资产', '投资性资产', '风险性资产', '稳健型资产']。
    5. 风险量化分析：
       - 计算前5大股票资产占总股票资产的比例 (stockConcentration)。
       - 计算资产占比最高的一家机构的比例 (entityConcentration)。
       - 计算现金及活期占总资产的比例 (cashRatio)。
       - 识别风险点并生成风险提示列表 (riskAlerts)。

    请输出 JSON 格式，字段必须包含 id (随机字符串), timestamp (当前毫秒戳), totalNetWorthCNY, summary, distributionAnalysis, investmentAdvice, riskMetrics (对象), breakdown (数组)。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: {
        parts: [...imageParts, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            timestamp: { type: Type.NUMBER },
            totalNetWorthCNY: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            distributionAnalysis: { type: Type.STRING },
            investmentAdvice: { type: Type.STRING },
            riskMetrics: {
              type: Type.OBJECT,
              properties: {
                stockConcentration: { type: Type.NUMBER },
                entityConcentration: { type: Type.NUMBER },
                cashRatio: { type: Type.NUMBER },
                riskAlerts: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["stockConcentration", "entityConcentration", "cashRatio", "riskAlerts"]
            },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  entity: { type: Type.STRING },
                  originalAmount: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  convertedAmountCNY: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: Object.values(AssetType) },
                  macroCategory: { type: Type.STRING, enum: Object.values(MacroCategory) },
                  description: { type: Type.STRING }
                },
                required: ["name", "entity", "originalAmount", "currency", "convertedAmountCNY", "type", "macroCategory"]
              }
            }
          },
          required: ["id", "timestamp", "totalNetWorthCNY", "breakdown", "summary", "distributionAnalysis", "investmentAdvice", "riskMetrics"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 未返回有效数据");
    return JSON.parse(text) as AssetAnalysisResult;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("资产分析失败，请检查 API Key 是否有效，或截图是否包含清晰的金额。");
  }
};