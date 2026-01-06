import React, { useMemo } from 'react';
import { AssetAnalysisResult, MacroCategory } from '../types.ts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardProps {
  data: AssetAnalysisResult;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
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

  // Group assets by macro category for the table
  const groupedAssets = useMemo(() => {
    const groups: Record<string, typeof data.breakdown> = {};
    data.breakdown.forEach(item => {
      if (!groups[item.macroCategory]) {
        groups[item.macroCategory] = [];
      }
      groups[item.macroCategory].push(item);
    });
    return groups;
  }, [data.breakdown]);

  // Sort categories: Liquidity -> Stable -> Investment -> Risk -> Others
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
          // If not found in order (e.g. unexpected category), put at end
          const valA = indexA === -1 ? 999 : indexA;
          const valB = indexB === -1 ? 999 : indexB;
          return valA - valB;
      });
  }, [groupedAssets]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 总览卡片 */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">预估净资产总计</h2>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">
              {formatCurrency(data.totalNetWorthCNY)}
            </div>
          </div>
          <div className="flex-1 max-w-xl bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.243a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707zM16.243 13.536a1 1 0 011.414-1.414l.707.707a1 1 0 01-1.414 1.414l-.707-.707z" /></svg>
               AI 快速总结
             </div>
             <p className="text-sm text-slate-600 leading-relaxed italic">"{data.summary}"</p>
          </div>
        </div>
      </div>

      {/* 图表分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-1">宏观资产结构</h3>
          <p className="text-xs text-slate-400 mb-4">按流动性与风险偏好划分</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={macroData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {macroData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-1">详细资产类别</h3>
          <p className="text-xs text-slate-400 mb-4">资产构成的二级分类</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI 深度分析板块 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
             <div className="bg-blue-600 p-2 rounded-lg text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-800">资产分布分析</h3>
          </div>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
            {data.distributionAnalysis}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
             <div className="bg-emerald-600 p-2 rounded-lg text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-800">专业投资建议</h3>
          </div>
          <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
            {data.investmentAdvice}
          </div>
        </div>
      </div>

      {/* 资产列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">资产项目明细</h3>
            <span className="text-xs text-slate-400">共识别到 {data.breakdown.length} 个资产项</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">资产详情</th>
                <th className="px-6 py-4">具体类型</th>
                <th className="px-6 py-4 text-right">折合人民币</th>
              </tr>
            </thead>
            
            {sortedCategories.map(category => (
                <tbody key={category} className="divide-y divide-slate-50 border-b border-slate-100 last:border-0">
                    <tr className="bg-slate-50/30">
                        <td colSpan={3} className="px-6 py-2 text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50/50">
                            {category}
                        </td>
                    </tr>
                    {groupedAssets[category].map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{item.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{item.originalAmount.toLocaleString()} {item.currency} · {item.description}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                    ${item.type === '股票' ? 'bg-blue-100 text-blue-700' : ''}
                                    ${item.type === '现金与活期' ? 'bg-green-100 text-green-700' : ''}
                                    ${item.type === '理财/基金' ? 'bg-purple-100 text-purple-700' : ''}
                                    ${item.type === '黄金/贵金属' ? 'bg-yellow-100 text-yellow-700' : ''}
                                    ${['股票', '现金与活期', '理财/基金', '黄金/贵金属'].indexOf(item.type) === -1 ? 'bg-slate-100 text-slate-600' : ''}
                                `}>
                                    {item.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="font-bold text-slate-900">{formatCurrency(item.convertedAmountCNY)}</div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            ))}
          </table>
        </div>
      </div>
    </div>
  );
};