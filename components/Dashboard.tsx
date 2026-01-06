import React, { useMemo, useState, useRef } from 'react';
import { AssetAnalysisResult, MacroCategory, AssetType, AssetItem } from '../types.ts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';

interface DashboardProps {
  data: AssetAnalysisResult;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const DARK_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#94a3b8'];

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const currentColors = isDarkMode ? DARK_COLORS : COLORS;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
  };

  const exportToCSV = () => {
    const headers = ['资产名称', '所属机构', '资产类型', '宏观分类', '原币金额', '币种', '折合人民币(CNY)', '描述'];
    const rows = data.breakdown.map(item => [
      item.name,
      item.entity,
      item.type,
      item.macroCategory,
      item.originalAmount,
      item.currency,
      item.convertedAmountCNY,
      item.description || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    // 添加 BOM 防止 Excel 乱码
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `WealthLens_资产报告_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsImage = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2, // 提高清晰度
        useCORS: true,
        backgroundColor: isDarkMode ? '#020617' : '#f8fafc',
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.setAttribute("href", image);
      link.setAttribute("download", `WealthLens_全景报告_${new Date().getTime()}.png`);
      link.click();
    } catch (error) {
      console.error("Export image failed:", error);
      alert("生成图片失败，请稍后重试。");
    } finally {
      setIsExporting(false);
    }
  };

  // 1. 各资产类型占比
  const typeChartData = useMemo(() => {
    const map = new Map<string, number>();
    data.breakdown.forEach(item => {
      map.set(item.type, (map.get(item.type) || 0) + item.convertedAmountCNY);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  // 2. 机构分布占比
  const entityChartData = useMemo(() => {
    const map = new Map<string, number>();
    data.breakdown.forEach(item => {
      map.set(item.entity, (map.get(item.entity) || 0) + item.convertedAmountCNY);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // 3. 过滤当前选中的机构明细
  const displayedItems = useMemo(() => {
    if (!selectedEntity) return data.breakdown;
    return data.breakdown.filter(item => item.entity === selectedEntity);
  }, [data, selectedEntity]);

  return (
    <div className="space-y-6 pb-10">
      {/* 操作工具栏 */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          下载 CSV
        </button>
        <button 
          onClick={exportAsImage}
          disabled={isExporting}
          className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isExporting ? (
             <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          ) : (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
          {isExporting ? '生成中...' : '导出报告图片'}
        </button>
      </div>

      <div ref={dashboardRef} className="space-y-8 p-1 rounded-2xl">
        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">总资产</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(data.totalNetWorthCNY)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">现金比例</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{(data.riskMetrics.cashRatio * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">单一机构集中度</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{(data.riskMetrics.entityConcentration * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">股票集中度</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{(data.riskMetrics.stockConcentration * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* 图表板块 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">资产类别分布</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5}>
                    {typeChartData.map((_, index) => <Cell key={index} fill={currentColors[index % currentColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend iconType="circle" verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">机构/券商分布 (点击下钻)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entityChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12}} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                    onClick={(entry) => setSelectedEntity(selectedEntity === entry.name ? null : entry.name)}
                    className="cursor-pointer"
                  >
                    {entityChartData.map((entry, index) => (
                      <Cell 
                        key={index} 
                        fill={selectedEntity === entry.name ? '#3b82f6' : (isDarkMode ? '#1e293b' : '#e2e8f0')} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 资产列表 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">资产项目明细</h3>
                {selectedEntity && (
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    机构: {selectedEntity}
                    <button onClick={() => setSelectedEntity(null)} className="hover:text-blue-900 dark:hover:text-blue-100">×</button>
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-medium">共 {displayedItems.length} 项</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 font-medium border-b dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">资产名称/描述</th>
                  <th className="px-6 py-4">机构</th>
                  <th className="px-6 py-4">分类</th>
                  <th className="px-6 py-4 text-right">估值 (CNY)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {displayedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">{item.description}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.entity}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border dark:border-slate-700">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.convertedAmountCNY)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 风险提示 & AI 建议 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/50">
            <h3 className="text-rose-800 dark:text-rose-400 font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              配置风险提示
            </h3>
            <ul className="space-y-3">
              {data.riskMetrics.riskAlerts.map((alert, i) => (
                <li key={i} className="text-sm text-rose-700 dark:text-rose-300 flex gap-2">
                  <span className="text-rose-400">•</span> {alert}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50">
            <h3 className="text-blue-800 dark:text-blue-400 font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI 投资调仓建议
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed italic">
              {data.investmentAdvice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};