# WealthLens 财富透镜 - AI 驱动的资产聚合与分析工具

WealthLens 是一款基于 Google Gemini 3 系列模型开发的个人财务管理工具。用户只需上传银行账户、证券持仓或理财产品的截图，系统即可自动提取数据、统一汇率、去重汇总，并生成直观的资产分布报告与专业投资建议。

## ✨ 核心功能

- **多源数据识别**：支持各类银行、券商、理财 App 的截图识别。
- **智能去重汇总**：AI 自动识别重复的账号或余额信息，确保数据准确。
- **统一币种折算**：自动将 USD、HKD、JPY 等多币种按实时参考汇率折算为人民币 (CNY)。
- **资产宏观分类**：将资产自动归类为：
  - **流动性资产**：现金、活期、货币基金。
  - **稳健型资产**：黄金、定期、债券。
  - **投资性资产**：股票、混合基金、指数基金。
  - **风险性资产**：虚拟货币、高波动衍生品。
- **可视化仪表盘**：提供资产占比饼图、二级分类柱状图及资产明细表。
- **AI 深度分析**：
  - **分布分析**：评估当前资产配置的流动性与风险水平。
  - **投资建议**：基于当前持仓提供可操作的资产配置优化思路。
- **数据导出**：支持一键下载 CSV 格式的资产明细表。

## 🛠️ 技术栈

- **Frontend**: React 19, Tailwind CSS
- **Charts**: Recharts
- **AI Engine**: Google Gemini API (`gemini-3-flash-preview`)
- **Language**: TypeScript

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd wealthlens
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置 API Key
本项目需要使用 Google Gemini API。
- 在项目根目录创建 `.env` 文件（或在部署环境的变量中配置）：
  ```env
  API_KEY=你的_GEMINI_API_KEY
  ```
- **获取 API Key**: 访问 [Google AI Studio](https://aistudio.google.com/) 获取。

### 4. 运行开发服务器
```bash
npm run dev
```
打开浏览器访问 `http://localhost:3000` 即可开始使用。

## 📥 数据导出
在分析完成后，点击结果页面顶部的 **“下载 CSV”** 按钮，系统将生成一份包含资产名称、原币金额、币种、人民币价值、分类及描述的表格文件。

## 🔒 隐私声明
WealthLens 是一个前端驱动的工具。您的截图数据将直接发送至 Google Gemini API 进行处理，我们不会在任何第三方服务器上存储您的金融截图或提取的财务数据。

## 📄 许可证
[MIT License](LICENSE)