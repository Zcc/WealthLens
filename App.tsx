import React, { useState, useRef } from 'react';
import { analyzeFinancialScreenshots } from './services/gemini';
import { AssetAnalysisResult, ProcessingStatus } from './types';
import { Dashboard } from './components/Dashboard';

// Icons
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
);

export default function App() {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<AssetAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      setErrorMsg(null);
      // Reset result if uploading new files
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-1.5">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              WealthLens 财富透镜
            </h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            AI 驱动的资产整合工具
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Intro / Upload Section */}
        {status === 'idle' || status === 'uploading' || status === 'analyzing' || status === 'error' || (status === 'complete' && result === null) ? (
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in-up">
                <div className="space-y-4">
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        一键生成您的全景资产视图
                    </h2>
                    <p className="text-lg text-slate-600">
                        上传银行或股票账户截图，AI 将自动提取数据、去重并生成统一的资产仪表盘。
                    </p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 transition-all hover:shadow-xl">
                    <div 
                        className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
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
                        <div className="bg-blue-50 p-4 rounded-full mb-4">
                            <UploadIcon />
                        </div>
                        <p className="text-slate-900 font-medium text-lg">
                            {files.length > 0 ? `已选择 ${files.length} 张图片` : "点击上传截图"}
                        </p>
                        <p className="text-slate-500 text-sm mt-2">
                            支持 JPG, PNG (最大 10MB)
                        </p>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-6 flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2 justify-center">
                                {files.slice(0, 5).map((f, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full truncate max-w-[150px]">
                                        {f.name}
                                    </span>
                                ))}
                                {files.length > 5 && <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">+{files.length - 5} 更多</span>}
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={status === 'analyzing'}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
                            >
                                {status === 'analyzing' ? (
                                    <>
                                        <Spinner />
                                        正在分析...
                                    </>
                                ) : (
                                    "开始分析"
                                )}
                            </button>
                        </div>
                    )}
                     {errorMsg && (
                        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                            {errorMsg}
                        </div>
                    )}
                </div>
            </div>
        ) : null}

        {/* Loading View */}
        {status === 'analyzing' && !result && (
            <div className="max-w-2xl mx-auto mt-12 space-y-8 animate-fade-in">
                {/* Progress Indicator Card */}
                <div className="bg-white p-10 rounded-2xl shadow-xl border border-blue-100 text-center relative overflow-hidden">
                    <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
                        <div className="absolute w-full h-full rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                         <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-3">正在智能分析您的资产...</h3>
                    <p className="text-slate-500 text-base mb-8 max-w-md mx-auto leading-relaxed">
                        AI 正在处理 <span className="font-semibold text-blue-600">{files.length}</span> 张截图，提取账户余额并进行汇率换算。<br/>请耐心等待，通常需要 10-30 秒。
                    </p>

                    <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-3 overflow-hidden relative shadow-inner">
                         <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-indeterminate-progress"></div>
                    </div>
                    
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

                {/* Skeleton Preview */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 opacity-60">
                    <div className="h-6 bg-slate-200 rounded w-1/3 mb-6 animate-pulse"></div>
                    <div className="space-y-4">
                         {[1, 2, 3].map(i => (
                             <div key={i} className="flex items-center justify-between p-4 border border-slate-50 rounded-lg">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse"></div>
                                     <div className="space-y-2">
                                         <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
                                         <div className="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
                                     </div>
                                 </div>
                                 <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div>
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        )}

        {/* Results View */}
        {status === 'complete' && result && (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">分析结果 (Result)</h2>
                    <button 
                        onClick={() => { setStatus('idle'); setFiles([]); setResult(null); }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        开始新的分析
                    </button>
                </div>
                <Dashboard data={result} />
             </div>
        )}
      </main>
    </div>
  );
}