import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeFinancialScreenshots } from './services/gemini.ts';
import { AssetAnalysisResult, ProcessingStatus } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

// Components & Icons
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'privacy'>('upload');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AssetAnalysisResult | null>(null);
  const [history, setHistory] = useState<AssetAnalysisResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // 新增进度相关状态
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('准备分析...');
  const [loadingSubText, setLoadingSubText] = useState('正在初始化 AI 引擎');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('wealth_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch(e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleFileSelection = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const addedFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/'));
    setFiles(prev => [...prev, ...addedFiles]);
    setErrorMsg(null);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setFiles(prev => {
      const newFiles = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFiles.length) return prev;
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      return newFiles;
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelection(e.dataTransfer.files);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    
    setStatus('analyzing');
    setErrorMsg(null);
    setProgress(5);
    setLoadingText('正在分析资产...');

    // 模拟进度的定时器，让用户感知到动作
    let currentStep = 0;
    const steps = [
      { p: 10, text: '准备图像数据...', sub: '正在进行 Base64 安全编码' },
      ...files.map((f, i) => ({ 
        p: 15 + ((i + 1) / files.length) * 50, 
        text: `正在扫描第 ${i + 1}/${files.length} 张截图`, 
        sub: `提取关键信息: ${f.name.length > 20 ? f.name.substring(0, 17) + '...' : f.name}` 
      })),
      { p: 75, text: '正在跨机构对账...', sub: '识别重复项目并转换币种' },
      { p: 85, text: '正在进行风险量化...', sub: '计算集中度与现金比例' },
      { p: 92, text: '生成专家建议...', sub: 'AI 正在分析资产结构优化方案' }
    ];

    const timer = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setLoadingText(steps[currentStep].text);
        setLoadingSubText(steps[currentStep].sub);
        currentStep++;
      } else {
        // 保持在 95% 左右直到真实结果返回
        setProgress(prev => Math.min(prev + 0.5, 98));
      }
    }, 1500);

    try {
      const data = await analyzeFinancialScreenshots(files);
      clearInterval(timer);
      setProgress(100);
      setResult(data);
      const newHistory = [data, ...history].slice(0, 50);
      setHistory(newHistory);
      localStorage.setItem('wealth_history', JSON.stringify(newHistory));
      
      // 延迟一下让用户看到 100% 状态
      setTimeout(() => {
        setStatus('complete');
      }, 500);
    } catch (err: any) {
      clearInterval(timer);
      setErrorMsg(err.message || "分析失败，请检查网络或图片质量。");
      setStatus('error');
    }
  };

  const trendData = useMemo(() => {
    return history.slice().reverse().map(h => ({
      date: new Date(h.timestamp).toLocaleDateString(),
      value: h.totalNetWorthCNY
    }));
  }, [history]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-20">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 cursor-pointer" onClick={() => setActiveTab('upload')}>
              WealthLens
            </h1>
            <nav className="hidden md:flex gap-4">
               {['upload', 'history', 'privacy'].map((tab) => (
                 <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${activeTab === tab ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                 >
                   {tab === 'upload' ? '新分析' : tab === 'history' ? '历史趋势' : '隐私说明'}
                 </button>
               ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleDarkMode} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:shadow-inner transition-all">
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'upload' && (
          <div className="animate-fade-in-up">
            {status === 'complete' && result ? (
               <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <h2 className="text-lg font-bold">全景资产快照已生成</h2>
                    </div>
                    <button onClick={() => { setStatus('idle'); setFiles([]); setResult(null); }} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">
                      重新开始
                    </button>
                  </div>
                  <Dashboard data={result} />
               </div>
            ) : status === 'analyzing' ? (
              <div className="max-w-xl mx-auto py-16 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border dark:border-slate-800 px-8 text-center animate-fade-in">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
                  <div 
                    className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"
                    style={{ animationDuration: '1s' }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center font-black text-blue-600 dark:text-blue-400">
                    {Math.round(progress)}%
                  </div>
                </div>
                
                <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-white">{loadingText}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-10">{loadingSubText}</p>
                
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 border border-slate-200 dark:border-slate-700">
                   <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                   ></div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                   <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                   AI 分析通常需要 10-20 秒，请稍候
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-10">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">上传金融截图</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">支持银行余额、股票持仓、基金账户等截图。不保存原始图片，仅提取数据。</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all group ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => handleFileSelection(e.target.files)} />
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 group-hover:scale-110 transition-transform"><UploadIcon /></div>
                    <p className="text-lg font-bold">{isDragging ? "松手即可上传" : "点击或拖拽截图到此处"}</p>
                    <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">支持多张图片合并分析</p>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-8 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">待分析文件 ({files.length})</h3>
                        <button onClick={() => setFiles([])} className="text-xs font-bold text-rose-500 hover:underline">清空全部</button>
                      </div>
                      <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {files.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 animate-fade-in">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                              <span className="text-sm font-medium truncate">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); moveFile(index, 'up'); }} disabled={index === 0} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); moveFile(index, 'down'); }} disabled={index === files.length - 1} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); removeFile(index); }} className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded ml-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleAnalyze} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1">
                        开始全景分析
                      </button>
                    </div>
                  )}
                  {errorMsg && <p className="mt-4 text-center text-rose-500 font-bold text-sm">{errorMsg}</p>}
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/40 p-4 rounded-2xl flex items-center gap-4 border border-slate-200 dark:border-slate-800">
                   <div className="text-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-full">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                   </div>
                   <div className="text-xs">
                     <p className="font-bold text-slate-800 dark:text-slate-200">隐私承诺</p>
                     <p className="text-slate-500">本工具仅提取截图中的文字数值，不上传原始截图文件至持久化存储，分析完成后立即销毁图片引用。</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black">历史资产趋势</h2>
                  <p className="text-slate-500 font-medium">通过快照记录财富增长轨迹</p>
                </div>
                <button onClick={() => { if(confirm('确定清空所有历史快照吗？')) { setHistory([]); localStorage.removeItem('wealth_history'); } }} className="text-xs font-bold text-rose-500 hover:underline">清空记录</button>
             </div>

             {history.length > 1 ? (
               <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest">总资产变动曲线</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                        <YAxis hide />
                        <ChartTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>
             ) : history.length === 0 ? (
                <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed dark:border-slate-800">
                  暂无历史记录，开始第一次分析吧！
                </div>
             ) : (
                <div className="p-10 text-center text-slate-500 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                   快照数据过少，无法生成趋势。继续上传新截图以追踪变化。
                </div>
             )}

             <div className="space-y-4">
                <h3 className="text-lg font-bold">时间轴快照</h3>
                <div className="grid gap-4">
                  {history.map((h) => (
                    <div key={h.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-blue-200 transition-all group">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xs text-center">
                           {new Date(h.timestamp).getDate()}<br/>{new Date(h.timestamp).getMonth() + 1}月
                         </div>
                         <div>
                            <div className="font-bold">{new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(h.totalNetWorthCNY)}</div>
                            <div className="text-xs text-slate-400">{h.breakdown.length} 个资产项 · {h.riskMetrics.riskAlerts.length} 条风险提示</div>
                         </div>
                       </div>
                       <button onClick={() => { setResult(h); setStatus('complete'); setActiveTab('upload'); }} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">查看详情 →</button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
             <div className="text-center">
                <div className="inline-block p-4 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500 rounded-full mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h2 className="text-3xl font-black">隐私与安全说明</h2>
             </div>

             <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border dark:border-slate-800 space-y-6">
                <section>
                  <h3 className="text-lg font-bold mb-2">数据处理原则</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    本应用遵循“隐私优先”原则。上传的截图仅用于前端解析，识别后的结构化数据存储在您的浏览器本地（LocalStorage），图片文件本身不会存储在任何服务器。
                  </p>
                </section>
                <section>
                   <h3 className="text-lg font-bold mb-2">关于 Gemini AI 分析</h3>
                   <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                     当您发起分析时，图片数据会通过安全链路发送至 Google Gemini API 节点进行 OCR 和语义分析。这是为了提供高精度的币种转换和风险建议。分析过程不包含对卡号、身份证号等敏感信息的针对性抓取。
                   </p>
                </section>
                <section>
                   <h3 className="text-lg font-bold mb-2">建议的安全操作</h3>
                   <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside space-y-2">
                     <li>截屏前请遮挡完整的卡号或账户名</li>
                     <li>不要在公共网络环境下分析大额敏感截图</li>
                     <li>如有疑虑，可随时通过“清空历史”功能移除本地存储的所有数据</li>
                   </ul>
                </section>
             </div>
          </div>
        )}
      </main>

      <style>{`
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fade-in 0.5s ease-out; }
          .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes indeterminate-progress { 0% { left: -100%; width: 50%; } 50% { left: 100%; width: 50%; } 100% { left: 100%; width: 50%; } }
          .animate-indeterminate-progress { animation: indeterminate-progress 1.5s infinite linear; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}</style>
    </div>
  );
}