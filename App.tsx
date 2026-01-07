import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeFinancialScreenshots } from './services/gemini.ts';
import { AssetAnalysisResult, ProcessingStatus, AIProvider } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

// Components & Icons
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 1-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73v.18a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'privacy' | 'settings'>('upload');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AssetAnalysisResult | null>(null);
  const [history, setHistory] = useState<AssetAnalysisResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Settings State - General
  const [provider, setProvider] = useState<AIProvider>('gemini');
  
  // Settings State - Main (Logic/Gemini)
  const [customApiKey, setCustomApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [tempBaseUrl, setTempBaseUrl] = useState('');

  const [customModel, setCustomModel] = useState('');
  const [tempModel, setTempModel] = useState('');

  // Settings State - Vision (Optional Separate)
  const [customVisionModel, setCustomVisionModel] = useState('');
  const [tempVisionModel, setTempVisionModel] = useState('');

  const [customVisionApiKey, setCustomVisionApiKey] = useState('');
  const [tempVisionApiKey, setTempVisionApiKey] = useState('');

  const [customVisionBaseUrl, setCustomVisionBaseUrl] = useState('');
  const [tempVisionBaseUrl, setTempVisionBaseUrl] = useState('');

  // Progress State
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
    
    // Load settings
    const savedProvider = localStorage.getItem('ai_provider') as AIProvider;
    if (savedProvider) setProvider(savedProvider);

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) { setCustomApiKey(savedKey); setTempApiKey(savedKey); }
    
    const savedUrl = localStorage.getItem('gemini_base_url');
    if (savedUrl) { setCustomBaseUrl(savedUrl); setTempBaseUrl(savedUrl); }

    const savedModel = localStorage.getItem('openai_model_name');
    if (savedModel) { setCustomModel(savedModel); setTempModel(savedModel); }

    const savedVisionModel = localStorage.getItem('openai_vision_model');
    if (savedVisionModel) { setCustomVisionModel(savedVisionModel); setTempVisionModel(savedVisionModel); }

    const savedVisionKey = localStorage.getItem('openai_vision_api_key');
    if (savedVisionKey) { setCustomVisionApiKey(savedVisionKey); setTempVisionApiKey(savedVisionKey); }

    const savedVisionUrl = localStorage.getItem('openai_vision_base_url');
    if (savedVisionUrl) { setCustomVisionBaseUrl(savedVisionUrl); setTempVisionBaseUrl(savedVisionUrl); }

  }, []);

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const saveConfiguration = () => {
    localStorage.setItem('ai_provider', provider);

    // Helper to save/clear
    const sync = (key: string, val: string, setter: (v: string) => void) => {
      if (val.trim()) {
        localStorage.setItem(key, val.trim());
        setter(val.trim());
      } else {
        localStorage.removeItem(key);
        setter('');
      }
    };

    sync('gemini_api_key', tempApiKey, setCustomApiKey);
    sync('gemini_base_url', tempBaseUrl, setCustomBaseUrl);
    sync('openai_model_name', tempModel, setCustomModel);
    
    // Vision Settings
    sync('openai_vision_model', tempVisionModel, setCustomVisionModel);
    sync('openai_vision_api_key', tempVisionApiKey, setCustomVisionApiKey);
    sync('openai_vision_base_url', tempVisionBaseUrl, setCustomVisionBaseUrl);

    alert('配置已保存');
  };

  const resetConfiguration = () => {
    setTempApiKey(''); setTempBaseUrl(''); setTempModel('');
    setTempVisionModel(''); setTempVisionApiKey(''); setTempVisionBaseUrl('');
    setProvider('gemini');
    
    localStorage.removeItem('ai_provider');
    localStorage.removeItem('gemini_api_key'); 
    localStorage.removeItem('gemini_base_url');
    localStorage.removeItem('openai_model_name');
    localStorage.removeItem('openai_vision_model');
    localStorage.removeItem('openai_vision_api_key');
    localStorage.removeItem('openai_vision_base_url');
    
    setCustomApiKey(''); setCustomBaseUrl(''); setCustomModel('');
    setCustomVisionModel(''); setCustomVisionApiKey(''); setCustomVisionBaseUrl('');
    
    alert('已恢复默认配置 (Gemini)');
  };

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

    // 模拟进度的定时器
    let currentStep = 0;
    const steps = [
      { p: 10, text: '准备图像数据...', sub: '正在进行 Base64 编码与格式化' },
      ...files.map((f, i) => ({ 
        p: 15 + ((i + 1) / files.length) * 50, 
        text: `正在扫描第 ${i + 1}/${files.length} 张截图`, 
        sub: `AI 视觉分析: ${f.name}` 
      })),
      { p: 80, text: '正在跨机构对账...', sub: '提取数据并进行结构化分析' },
      { p: 90, text: '生成全景报告...', sub: '计算风险指标与资产建议' }
    ];

    const timer = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setLoadingText(steps[currentStep].text);
        setLoadingSubText(steps[currentStep].sub);
        currentStep++;
      } else {
        setProgress(prev => Math.min(prev + 0.5, 98));
      }
    }, 1500);

    try {
      const data = await analyzeFinancialScreenshots(files, {
        provider,
        apiKey: customApiKey,
        baseUrl: customBaseUrl,
        modelName: customModel,
        
        visionModelName: customVisionModel,
        visionApiKey: customVisionApiKey,
        visionBaseUrl: customVisionBaseUrl
      });
      clearInterval(timer);
      setProgress(100);
      setResult(data);
      const newHistory = [data, ...history].slice(0, 50);
      setHistory(newHistory);
      localStorage.setItem('wealth_history', JSON.stringify(newHistory));
      
      setTimeout(() => {
        setStatus('complete');
      }, 500);
    } catch (err: any) {
      clearInterval(timer);
      setErrorMsg(err.message || "分析失败，请检查配置或网络。");
      setStatus('error');
    }
  };

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
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg hover:shadow-inner transition-all ${activeTab === 'settings' ? 'bg-blue-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <SettingsIcon />
            </button>
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
                   分析通常需要 10-30 秒，取决于模型响应速度
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

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
             <div className="text-center">
                <div className="inline-block p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full mb-4">
                  <SettingsIcon />
                </div>
                <h2 className="text-3xl font-black">AI 引擎配置</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">自定义分析使用的模型服务</p>
             </div>

             <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
                
                {/* Provider Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">AI 提供商</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setProvider('gemini')}
                      className={`px-4 py-3 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 ${provider === 'gemini' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                      Google Gemini
                    </button>
                    <button 
                      onClick={() => setProvider('openai')}
                      className={`px-4 py-3 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 ${provider === 'openai' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.2 13c0 .7-.1 1.4-.3 2.1l-2.4-1.4c.1-.2.2-.5.2-.7 0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2c.2 0 .5-.1.7-.2l1.4 2.4c-.7.2-1.4.3-2.1.3-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6zM12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/></svg>
                      OpenAI / 开源模型
                    </button>
                  </div>
                </div>

                {/* --- Main Configuration Area --- */}
                <div className="space-y-6">
                    <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                           {provider === 'gemini' ? "Gemini 配置" : "主模型配置 (逻辑推理)"}
                        </h3>
                        {provider === 'openai' && <p className="text-xs text-slate-500 mt-1">负责接收文本数据、执行分析逻辑并生成 JSON 报告。通常需要较强推理能力的模型（如 GPT-4, DeepSeek）。</p>}
                    </div>

                    {/* API Key */}
                    <div className="space-y-3">
                       <div className="flex justify-between items-center">
                           <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">API Key {provider === 'openai' && <span className="text-rose-500">*</span>}</label>
                           {provider === 'gemini' && (
                             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                               获取 Key <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             </a>
                           )}
                       </div>
                       <input 
                         type="password" 
                         value={tempApiKey}
                         onChange={(e) => setTempApiKey(e.target.value)}
                         placeholder={provider === 'gemini' ? "AIzaSy..." : "sk-..."}
                         className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                       />
                    </div>

                    {/* Base URL */}
                    <div className="space-y-3">
                       <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                         Endpoint / Base URL
                         {provider === 'openai' && <span className="text-rose-500 ml-1">*</span>}
                         {provider === 'gemini' && <span className="text-slate-400 font-normal ml-1">(可选)</span>}
                       </label>
                       <input 
                         type="text" 
                         value={tempBaseUrl}
                         onChange={(e) => setTempBaseUrl(e.target.value)}
                         placeholder={provider === 'gemini' ? "https://my-proxy.com" : "例如: https://api.deepseek.com"}
                         className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                       />
                    </div>

                    {/* Model Name */}
                    <div className="space-y-3">
                       <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                         {provider === 'gemini' ? "模型名称 (可选)" : "模型名称 (必填)"}
                       </label>
                       <input 
                         type="text" 
                         value={tempModel}
                         onChange={(e) => setTempModel(e.target.value)}
                         placeholder={provider === 'gemini' ? "gemini-3-pro-preview" : "deepseek-chat, qwen-max"}
                         className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                       />
                    </div>
                </div>

                {/* --- Optional Separate Vision Config (OpenAI Only) --- */}
                {provider === 'openai' && (
                    <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                        <div className="pb-2">
                             <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                               视觉模型配置 (可选)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                若填写模型名称，系统将先使用此配置进行图片转文字 (OCR)，再将文字传给主模型分析。
                                <br/>可用于 Ollama 本地部署 LLaVA (Vision) + 远程 DeepSeek (Logic) 的组合。
                                <br/>若留空，则使用主模型直接处理图片。
                            </p>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">视觉模型名称</label>
                                <input 
                                   type="text" 
                                   value={tempVisionModel}
                                   onChange={(e) => setTempVisionModel(e.target.value)}
                                   placeholder="llava, qwen-vl-max"
                                   className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                 />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Vision API Key</label>
                                <input 
                                   type="password" 
                                   value={tempVisionApiKey}
                                   onChange={(e) => setTempVisionApiKey(e.target.value)}
                                   placeholder="同主 Key (若留空)"
                                   className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                 />
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Vision Base URL</label>
                                <input 
                                   type="text" 
                                   value={tempVisionBaseUrl}
                                   onChange={(e) => setTempVisionBaseUrl(e.target.value)}
                                   placeholder="同主 URL (若留空), 例如 http://localhost:11434"
                                   className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                 />
                            </div>
                         </div>
                    </div>
                )}
                
                <div className="pt-6 flex gap-4">
                   <button 
                     onClick={saveConfiguration}
                     className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                   >
                     保存配置
                   </button>
                   {(customApiKey || customBaseUrl || customModel || customVisionModel) && (
                     <button 
                       onClick={resetConfiguration}
                       className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 font-bold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                     >
                       重置
                     </button>
                   )}
                </div>
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