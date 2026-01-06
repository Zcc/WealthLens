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

export const analyzeFinancialScreenshots = async (files: File[]): Promise<AssetAnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageParts = await Promise.all(files.map(fileToGenerativePart));

  const prompt = `
    你是一位资深的私人财富管理专家。请分析上传的银行、股票、理财账户截图。
    
    任务要求：
    1. 提取资产信息，识别币种并统一折算为人民币 (CNY)。汇率参考：USD=7.25, HKD=0.93, JPY=0.048。
    2. 自动去重：识别重复的账号或余额。
    3. 资产分类：
       - 类型 (type): '现金与活期', '股票', '理财/基金', '黄金/贵金属', '虚拟货币', '其他'。
       - 宏观类别 (macroCategory): 
         * '流动性资产' (现金、活期、货币基金)
         * '投资性资产' (股票、指数基金、混合基金)
         * '风险性资产' (加密货币、高波动衍生品)
         * '稳健型资产' (黄金、定期存款、债券、稳健型理财)
    4. 深度分析：
       - 整体分布分析 (distributionAnalysis): 分析当前的资产配置结构是否合理，流动性是否充足，风险是否过高。
       - 投资建议 (investmentAdvice): 基于当前资产配置情况，给出具体的、可操作的优化建议（如：增加配置、分散风险、现金流管理等）。

    请使用简体中文回复，并严格遵守 JSON 格式。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [...imageParts, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalNetWorthCNY: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            distributionAnalysis: { type: Type.STRING },
            investmentAdvice: { type: Type.STRING },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  originalAmount: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  convertedAmountCNY: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: Object.values(AssetType) },
                  macroCategory: { type: Type.STRING, enum: Object.values(MacroCategory) },
                  description: { type: Type.STRING }
                },
                required: ["name", "originalAmount", "currency", "convertedAmountCNY", "type", "macroCategory"]
              }
            }
          },
          required: ["totalNetWorthCNY", "breakdown", "summary", "distributionAnalysis", "investmentAdvice"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 未返回有效数据");
    return JSON.parse(text) as AssetAnalysisResult;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("资产分析失败，请检查图片清晰度或重试。");
  }
};