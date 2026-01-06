import React, { useMemo, useState } from 'react';
import { AssetAnalysisResult, MacroCategory, AssetType } from '../types.ts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardProps {
  data: AssetAnalysisResult;
}

type Filter = {
  type: 'macro' | 'detailed';
  value: string;
} | null;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const DARK_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#94a3b8'];

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [activeFilter, setActiveFilter] = useState<Filter>(null);
  
  // 检查是否为暗黑模式
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const currentColors = isDarkMode ? DARK_COLORS : COLORS;

  // 按宏观类别统计 (流动性、投资等)
  const macroData = useMemo(() => {
    const map = new Map<string, number>();
    data.breakdown.forEach(item => {
      const current = map.get(item.macroCategory) || 0;
      map.set(item.macroCategory, current + item.convertedAmountCNY);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  // 按具体类型统计
  const typeData = useMemo(() => {
    const map = new Map<string, number>();
    data.breakdown.forEach(item => {
      const current = map.get(item.type) || 0;
      map.set(item.type, current + item.convertedAmountCNY);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Filter the breakdown list based on activeFilter
  const filteredBreakdown = useMemo(() => {
    if (!activeFilter) return data.breakdown;
    if (activeFilter.type === 'macro') {
      return data.breakdown.filter(item => item.macroCategory === activeFilter.value);
    }
    return data.breakdown.filter(item => item.type === activeFilter.value);
  }, [data.breakdown, activeFilter]);

  // Group assets by macro category for the table
  const groupedAssets = useMemo(() => {
    const groups: Record<string, typeof data.breakdown> = {};
    filteredBreakdown.forEach(item => {
      if (!groups[item.macroCategory]) {
        groups[item.macroCategory] = [];
      }
      groups[item.macroCategory].push(item);
    });
    return groups;
  }, [filteredBreakdown]);

  // Sort categories
  const sortedCategories = useMemo(() => {
      const order = [
          MacroCategory.LIQUIDITY, 
          MacroCategory.STABLE, 
          MacroCategory.INVESTMENT, 
          MacroCategory.RISK
      ];
      return Object.keys(groupedAssets).sort((a, b) => {
          const indexA = order.indexOf(a as MacroCategory);
          const indexB = order.indexOf(b as MacroCategory);
          const valA = indexA === -1 ? 999 : indexA;
          const valB = indexB === -1 ? 999 : indexB;
          return valA - valB;
      });
  }, [groupedAssets]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
  };

  const handlePieClick = (data: any) => {
    if (activeFilter?.type === 'macro' && activeFilter.value === data.name) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ type: 'macro', value: data.name });
    }
  };

  const handleBarClick = (data: any) => {
    if (activeFilter?.type === 'detailed' && activeFilter.value === data.name) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ type: 'detailed', value: data.name });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* 总览卡片 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">预估净资产总计</h2>
            <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter transition-colors">
              {formatCurrency(data.totalNetWorthCNY)}
            </div>
          </div>
          <div className="flex-1 max-w-xl bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
             <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.243a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707zM16.243 13.536a1 1 0 011.414-1.414l.707.707a1 1 0 01-1.414 1.414l-.707-.707z" /></svg>
               AI 快速总结
             </div>
             <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">"{data.summary}"</p>
          </div>
        </div>
      </div>

      {/* 图表分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">宏观资产结构</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">点击扇形以过滤下方列表</p>
            </div>
            {activeFilter?.type === 'macro' && (
              <button onClick={() => setActiveFilter(null)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">清除过滤</button>
            )}
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={macroData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={65} 
                  outerRadius={90} 
                  paddingAngle={5} 
                  dataKey="value"
                  onClick={handlePieClick}
                  className="cursor-pointer outline-none"
                >
                  {macroData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={currentColors[index % currentColors.length]} 
                      fillOpacity={activeFilter?.type === 'macro' && activeFilter.value !== entry.name ? 0.3 : 1}
                      stroke={activeFilter?.type === 'macro' && activeFilter.value === entry.name ? (isDarkMode ? '#ffffff' : '#1e293b') : 'none'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', 
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}
                  formatter={(value: number) => formatCurrency(value)} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">详细资产类别</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">点击柱状条以过滤下方列表</p>
            </div>
            {activeFilter?.type === 'detailed' && (
              <button onClick={() => setActiveFilter(null)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">清除过滤</button>
            )}
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12}} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: isDarkMode ? '#1e293b' : '#f8fafc'}}
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', 
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    borderRadius: '12px'
                  }}
                  formatter={(value: number) => formatCurrency(value)} 
                />
                <Bar 
                  dataKey="value" 
                  radius={[6, 6, 0, 0]} 
                  barSize={42}
                  onClick={handleBarClick}
                  className="cursor-pointer outline-none"
                >
                   {typeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isDarkMode ? '#6366f1' : '#4f46e5'} 
                      fillOpacity={activeFilter?.type === 'detailed' && activeFilter.value !== entry.name ? 0.3 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI 深度分析板块 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-4">
             <div className="bg-blue-600 dark:bg-blue-500 p-2 rounded-lg text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">资产分布分析</h3>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {data.distributionAnalysis}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-4">
             <div className="bg-emerald-600 dark:bg-emerald-500 p-2 rounded-lg text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">专业投资建议</h3>
          </div>
          <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {data.investmentAdvice}
          </div>
        </div>
      </div>

      {/* 资产列表 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300" id="asset-list">
        <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">资产项目明细</h3>
              {activeFilter && (
                <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800 animate-pulse">
                  <span>过滤中: {activeFilter.value}</span>
                  <button onClick={() => setActiveFilter(null)} className="hover:text-blue-900 dark:hover:text-blue-100">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">显示 {filteredBreakdown.length} / {data.breakdown.length} 个资产项</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">资产详情</th>
                <th className="px-6 py-4">具体类型</th>
                <th className="px-6 py-4 text-right">折合人民币</th>
              </tr>
            </thead>
            
            {sortedCategories.length > 0 ? (
              sortedCategories.map(category => (
                <tbody key={category} className="divide-y divide-slate-50 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-opacity duration-300">
                    <tr className="bg-slate-50/30 dark:bg-slate-800/20">
                        <td colSpan={3} className="px-6 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50/50 dark:bg-blue-900/20">
                            {category}
                        </td>
                    </tr>
                    {groupedAssets[category].map((item, index) => (
                        <tr key={`${category}-${index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors animate-fade-in">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{item.originalAmount.toLocaleString()} {item.currency} · {item.description}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold shadow-sm
                                    ${item.type === AssetType.STOCK ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' : ''}
                                    ${item.type === AssetType.CASH ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300' : ''}
                                    ${item.type === AssetType.FUND ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' : ''}
                                    ${item.type === AssetType.GOLD ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300' : ''}
                                    ${item.type === AssetType.CRYPTO ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300' : ''}
                                    ${item.type === AssetType.OTHER ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : ''}
                                `}>
                                    {item.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.convertedAmountCNY)}</div>
                            </td>
                        </tr>
                    ))}
                </tbody>
              ))
            ) : (
              <tbody>
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center text-slate-400 dark:text-slate-500">
                    没有符合过滤条件的资产项
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};