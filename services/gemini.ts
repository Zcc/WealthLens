import { GoogleGenAI, Type } from "@google/genai";
import { AssetAnalysisResult, AssetType, MacroCategory, AIProvider } from "../types.ts";

// Helper: Convert File to Base64
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error("Failed to read file"));
        return;
      }
      // Remove data:image/xxx;base64, prefix
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const SYSTEM_PROMPT_TEMPLATE = `
你是一位资深的私人财富管理专家。请分析用户提供的财务数据。

任务要求：
1. 提取/整理资产信息，识别币种并统一折算为人民币 (CNY)。汇率参考：USD=7.25, HKD=0.93, JPY=0.048。
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

请严格只输出 JSON 格式，不要包含 Markdown 代码块标记（如 \`\`\`json），确保 JSON 合法。
字段必须包含 id (随机字符串), timestamp (当前毫秒戳), totalNetWorthCNY, summary, distributionAnalysis, investmentAdvice, riskMetrics (对象), breakdown (数组)。
`;

const OCR_PROMPT = "请详细提取这张图片中的所有文字内容，特别是银行账户名称、余额数字、股票代码、持仓金额和币种符号。不要进行分析，只需忠实转录文字。";

// Helper: Clean and Parse JSON from potentially messy LLM output
const parseJSON = (text: string): any => {
  let cleanText = text.trim();
  // Remove markdown code blocks if present
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  
  // Try to find the first { and last }
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleanText);
};

// --- Strategy 1: Google Gemini SDK ---
const callGemini = async (files: File[], apiKey: string, baseUrl?: string, modelName?: string): Promise<AssetAnalysisResult> => {
  const ai = new GoogleGenAI({ 
    apiKey,
    baseUrl: baseUrl || undefined
  } as any);

  const imageParts = await Promise.all(files.map(async (file) => ({
    inlineData: {
      data: await fileToBase64(file),
      mimeType: file.type || 'image/png',
    }
  })));

  // Use user-provided model or default to a capable vision model
  const targetModel = modelName || 'gemini-3-pro-preview';

  const response = await ai.models.generateContent({
    model: targetModel, 
    contents: {
      parts: [...imageParts, { text: SYSTEM_PROMPT_TEMPLATE }]
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
};

// --- Helper: OpenAI Network Call ---
const openAIFetch = async (endpoint: string, apiKey: string, payload: any) => {
  // Ensure endpoint is correct
  let cleanEndpoint = endpoint.replace(/\/$/, "");
  if (!cleanEndpoint.endsWith("/v1/chat/completions") && !cleanEndpoint.endsWith("/chat/completions")) {
    cleanEndpoint = `${cleanEndpoint}/chat/completions`; 
  }

  const response = await fetch(cleanEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
};

// --- Configuration Interface ---
export interface AnalysisConfig {
  provider: AIProvider;
  
  // Main/Reasoning Config
  apiKey?: string;
  baseUrl?: string;
  modelName?: string; 
  
  // Separate Vision Config
  visionModelName?: string;
  visionApiKey?: string;
  visionBaseUrl?: string;
}

// --- Strategy 2: OpenAI Compatible API (Split or Unified) ---
const callOpenAICompatible = async (files: File[], config: AnalysisConfig): Promise<AssetAnalysisResult> => {
  const { apiKey, baseUrl, modelName: textModel, visionModelName } = config;

  if (!baseUrl) throw new Error("使用 OpenAI 兼容模式必须提供 Base URL / Endpoint。");
  if (!apiKey) throw new Error("API Key 缺失。");
  if (!textModel) throw new Error("必须提供推理模型名称。");

  // --- Case A: Separate Vision Model (Two-Step Process) ---
  if (visionModelName && visionModelName.trim() !== "") {
    // Determined which config to use for vision
    const visionBaseUrl = config.visionBaseUrl || baseUrl;
    const visionApiKey = config.visionApiKey || apiKey;

    console.log(`Using Split Strategy: Vision=${visionModelName} (on ${visionBaseUrl}), Logic=${textModel} (on ${baseUrl})`);
    
    // Step 1: Parallel OCR extraction
    const ocrPromises = files.map(async (file, index) => {
      const b64 = await fileToBase64(file);
      const mime = file.type || 'image/png';
      
      const payload = {
        model: visionModelName,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }
          ]
        }],
        max_tokens: 1500 // Limit OCR output tokens
      };
      
      try {
        const text = await openAIFetch(visionBaseUrl, visionApiKey, payload);
        return `[图片 ${index + 1} 提取内容]:\n${text}\n---`;
      } catch (err: any) {
         throw new Error(`视觉模型调用失败 (Model: ${visionModelName}): ${err.message}`);
      }
    });

    const extractedTexts = await Promise.all(ocrPromises);
    const combinedContext = extractedTexts.join("\n");

    // Step 2: Text Analysis (Logic Step)
    const payload = {
      model: textModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT_TEMPLATE },
        { role: "user", content: `以下是从 ${files.length} 张金融账户截图中提取的文字信息，请根据这些信息进行资产汇总和分析，并严格返回 JSON：\n\n${combinedContext}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    };

    const finalText = await openAIFetch(baseUrl, apiKey, payload);
    if (!finalText) throw new Error("逻辑模型未返回内容");
    return parseJSON(finalText);
  } 
  
  // --- Case B: Single Multimodal Model (Unified Process) ---
  else {
    console.log(`Using Unified Strategy: Model=${textModel}`);
    const content: any[] = [{ type: "text", text: SYSTEM_PROMPT_TEMPLATE }];
    
    for (const file of files) {
      const b64 = await fileToBase64(file);
      const mime = file.type || 'image/png';
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${b64}`,
          detail: "high"
        }
      });
    }

    const payload = {
      model: textModel,
      messages: [{ role: "user", content: content }],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    };

    const rawText = await openAIFetch(baseUrl, apiKey, payload);
    if (!rawText) throw new Error("AI 未返回内容");
    return parseJSON(rawText);
  }
};

export const analyzeFinancialScreenshots = async (files: File[], config: AnalysisConfig): Promise<AssetAnalysisResult> => {
  const apiKey = config.apiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key 缺失。请在设置中配置您的 Key。");
  }

  // Ensure config has the valid apiKey if passed from env
  const finalConfig = { ...config, apiKey };

  try {
    if (config.provider === 'openai') {
      return await callOpenAICompatible(files, finalConfig);
    } else {
      return await callGemini(files, finalConfig.apiKey!, finalConfig.baseUrl, finalConfig.modelName);
    }
  } catch (error: any) {
    console.error("Analysis Error Details:", error);
    
    let errorMessage = "资产分析失败，请重试。";
    const errStr = error.toString();

    if (errStr.includes("API key not valid") || errStr.includes("401")) {
      errorMessage = "鉴权失败：API Key 无效。";
    } else if (errStr.includes("403") || errStr.includes("quota")) {
      errorMessage = "权限不足或配额已耗尽 (403)。";
    } else if (errStr.includes("Failed to fetch") || errStr.includes("NetworkError")) {
      errorMessage = "网络连接失败。请检查 Base URL 是否正确，或是否需要开启代理。";
    } else if (errStr.includes("404")) {
      errorMessage = "请求路径错误 (404)。请检查 Base URL 或模型名称。";
    } else if (error.message) {
      errorMessage = `API 调用错误: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};