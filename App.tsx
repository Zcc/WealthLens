import React, { useState, useRef, useEffect } from 'react';
import { analyzeFinancialScreenshots } from './services/gemini.ts';
import { AssetAnalysisResult, ProcessingStatus } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import html2canvas from 'html2canvas';

// Icons
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
);
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
);
const ImageDownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
);

export default function App() {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<AssetAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      setErrorMsg(null);
      if (status === 'complete') {
        setStatus('idle');
        setResult(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setStatus('analyzing');
    setErrorMsg(null);
    try {
      const data = await analyzeFinancialScreenshots(files);
      setResult(data);
      setStatus('complete');
    } catch (err: any) {
      setErrorMsg(err.message || "发生意外错误，请重试。");
      setStatus('error');
    }
  };

  const handleDownloadCSV = () => {
    if (!result) return;
    const headers = ['资产名称', '原币金额', '币种', '人民币价值', '类型', '宏观分类', '描述'];
    const rows = result.breakdown.map(item => [
      item.name,
      item.originalAmount,
      item.currency,
      item.convertedAmountCNY,
      item.type,
      item.macroCategory,
      item.description || ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const stringCell = String(cell);
        return `"${stringCell.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wealth_analysis_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = async () => {
    if (!reportRef.current || isExportingImage) return;
    
    setIsExportingImage(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        useCORS: true,
        scale: 2, // Higher resolution
        backgroundColor: isDarkMode ? '#020617' : '#f8fafc', // Match bg-slate-950 or bg-slate-50
        logging: false,
        onclone: (clonedDoc) => {
          // Hide elements that shouldn't be in the screenshot if needed
          const header = clonedDoc.querySelector('header');
          if (header) header.style.display = 'none';
        }
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `wealth_report_${new Date().toISOString().slice(0,10)}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('图片导出失败，请重试');
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-1.5 shadow-sm shadow-blue-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              WealthLens 财富透镜
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
              AI 驱动的个人资产专家
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Intro / Upload Section */}
        {(status === 'idle' || status === 'error' || (status === 'complete' && result === null)) ? (
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in-up">
                <div className="space-y-4">
                    <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        一键生成您的全景资产视图
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        上传银行或股票账户截图，AI 将自动提取数据、去重并生成统一的资产仪表盘。
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl">
                    <div 
                        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileChange} 
                        />
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400">
                            <UploadIcon />
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium text-lg">
                            {files.length > 0 ? `已选择 ${files.length} 张图片` : "点击上传截图"}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                            支持 JPG, PNG (单张最大 10MB)
                        </p>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-6 flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2 justify-center">
                                {files.slice(0, 5).map((f, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-full truncate max-w-[150px] font-medium border border-slate-200 dark:border-slate-700">
                                        {f.name}
                                    </span>
                                ))}
                                {files.length > 5 && <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-700">+{files.length - 5} 更多</span>}
                            </div>
                            <button
                                onClick={handleAnalyze}
                                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                开始 AI 深度分析
                            </button>
                        </div>
                    )}
                     {errorMsg && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-900/50 font-medium">
                            {errorMsg}
                        </div>
                    )}
                </div>
            </div>
        ) : null}

        {/* Loading View */}
        {status === 'analyzing' && (
            <div className="max-w-2xl mx-auto mt-12 space-y-8 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-xl border border-blue-100 dark:border-slate-800 text-center relative overflow-hidden transition-colors duration-300">
                    <div className="mx-auto w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 relative">
                        <div className="absolute w-full h-full rounded-full border-4 border-blue-100 dark:border-blue-900/50 border-t-blue-600 dark:border-t-blue-400 animate-spin"></div>
                         <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">正在智能分析您的资产...</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-base mb-8 max-w-md mx-auto leading-relaxed font-medium">
                        AI 正在处理 <span className="font-semibold text-blue-600 dark:text-blue-400">{files.length}</span> 张截图，提取账户余额并进行汇率换算。<br/>请耐心等待，通常需要 10-30 秒。
                    </p>

                    <div className="w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden relative shadow-inner">
                         <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 rounded-full animate-indeterminate-progress"></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 opacity-60 transition-colors duration-300">
                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-6 animate-pulse"></div>
                    <div className="space-y-4">
                         {[1, 2, 3].map(i => (
                             <div key={i} className="flex items-center justify-between p-4 border border-slate-50 dark:border-slate-800/50 rounded-lg">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse"></div>
                                     <div className="space-y-2">
                                         <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                                         <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                                     </div>
                                 </div>
                                 <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        )}

        {/* Results View */}
        {status === 'complete' && result && (
             <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 mb-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">分析结果 (Analysis Summary)</h2>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={handleDownloadCSV}
                            className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none transition-all active:scale-95"
                        >
                            <svg className="-ml-1 mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            下载 CSV
                        </button>
                        <button 
                            onClick={handleDownloadImage}
                            disabled={isExportingImage}
                            className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isExportingImage ? (
                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            ) : (
                                <span className="mr-2 text-slate-500 dark:text-slate-400"><ImageDownloadIcon /></span>
                            )}
                            下载报告图片
                        </button>
                        <button 
                            onClick={() => { setStatus('idle'); setFiles([]); setResult(null); }}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none transition-all active:scale-95"
                        >
                            重新分析
                        </button>
                    </div>
                </div>
                <div ref={reportRef} className="rounded-2xl overflow-hidden p-1">
                   <Dashboard data={result} />
                </div>
             </div>
        )}
      </main>
      <style>{`
          @keyframes indeterminate-progress {
              0% { left: -100%; width: 50%; }
              50% { left: 100%; width: 50%; }
              100% { left: 100%; width: 50%; }
          }
          .animate-indeterminate-progress {
              animation: indeterminate-progress 1.5s infinite linear;
          }
      `}</style>
    </div>
  );
}