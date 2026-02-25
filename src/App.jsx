import React, { useState, useEffect, useRef } from 'react';
import { 
Brain, Layers, Send, Save, Settings, Copy, CheckCircle2, Loader2, 
MessageSquare, AlertCircle, X, Database, AlertTriangle, HelpCircle, 
Check, Wand2, ShieldCheck, GitBranch, ArrowDown, Info, 
Moon, Sun, Undo2, Redo2, DownloadCloud, Play, RotateCcw,
Layout, Eye
} from 'lucide-react';

/**
 * --- PROMPT BUILDER PRO V2.2 (COMPLETE PRODUCTION) ---
 * Finalized set including:
 * - Fixed Tooltip positioning (preventing clipping)
 * - Navigation tabs info icons
 * - Mobile Optimized Layout (Bottom Nav)
 * - Negative Constraints (Exclusions)
 * - Visual Strength Meter
 */

const apiKey = ""; // Provided by the environment

const SYSTEM_PROMPT = `You are an elite AI Prompt Engineer. Your objective is to construct a highly optimized, professional prompt based on the user's inputs.

CRITICAL: You MUST use this exact structural framework for the final output, using these literal headings:

--- PERSONA ---
[Specific role, expertise, and perspective the AI should take on]

--- OBJECTIVE ---
[Clear, measurable goal — what success looks like]

--- CONTEXT ---
Background: [Relevant details]
Target audience: [Who this is for]
Key constraints: [Scope and limitations]

--- TASK ---
1. [Step one — specific action]
2. [Step two — specific action]
(continue numbered list as needed)

--- FORMAT ---
Structure: [bullets / table / email / paragraphs]
Length: [word count or section limits]
Tone: [formal / conversational / technical]

--- EXCLUSIONS (NEGATIVE CONSTRAINTS) ---
- [List things the AI must NOT do or include]

--- OUTPUT RULES ---
- [Key constraints — what to include or exclude]

---
[Task content / data goes here]`;

const STARTER_TEMPLATES = {
"Blank": { persona: '', objective: '', context: '', task: '', format: '', rules: '', exclusions: '' },
"Copywriter": {
    persona: "Expert Direct Response Copywriter for B2B SaaS",
    objective: "Write high-converting copy that drives immediate action",
    context: "Product: [INSERT PRODUCT]\nAudience: [INSERT AUDIENCE]",
    task: "1. Analyze pain points.\n2. Write headlines.\n3. Draft PAS copy.",
    format: "Structure: Markdown\nTone: Persuasive",
    rules: "- End with a clear CTA.",
    exclusions: "- No buzzwords\n- No passive voice"
},
"Code Reviewer": {
    persona: "Senior Staff Software Engineer",
    objective: "Conduct a thorough code review for performance and security",
    context: "Language: [INSERT LANGUAGE]",
    task: "1. Identify bugs.\n2. Suggest optimizations.\n3. Refactor.",
    format: "Structure: Markdown",
    rules: "- Explain WHY changes are needed.",
    exclusions: "- No deprecated libraries"
}
};

const InfoIcon = ({ text, pos = 'top' }) => (
<div className="relative group inline-flex items-center ml-1.5" onClick={e => e.stopPropagation()}>
<Info size={14} className="opacity-50 group-hover:opacity-100 transition-opacity cursor-help text-current" />
<div className={`absolute ${pos === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 sm:left-1/2 sm:-translate-x-1/2 hidden group-hover:block w-52 p-3 bg-slate-800 dark:bg-slate-700 text-white text-[10px] rounded-xl shadow-2xl z-[100] text-center pointer-events-none border border-slate-600 tracking-normal leading-relaxed font-normal normal-case`}>
{text}
<div className={`absolute ${pos === 'top' ? 'top-full' : 'bottom-full'} right-2 sm:left-1/2 sm:-translate-x-1/2 ${pos === 'top' ? '-mt-1 border-t-slate-800 dark:border-t-slate-700' : '-mb-1 border-b-slate-800 dark:border-b-slate-700'} border-4 border-transparent`}></div>
</div>
</div>
);

export default function App() {
const [theme, setTheme] = useState('light');
const [mobileTab, setMobileTab] = useState('drafting'); 
const [activeTab, setActiveTab] = useState('braindump');
const [braindumpText, setBraindumpText] = useState('');
const [structuredData, setStructuredData] = useState(STARTER_TEMPLATES["Blank"]);
const [selectedTemplate, setSelectedTemplate] = useState("Blank");
const [isGenerating, setIsGenerating] = useState(false);
const [generatedPrompt, setGeneratedPrompt] = useState('');
const [chatHistory, setChatHistory] = useState([]);
const [chatInput, setChatInput] = useState('');
const [promptHistory, setPromptHistory] = useState([]);
const [historyIndex, setHistoryIndex] = useState(-1);
const [isExtracting, setIsExtracting] = useState(false);
const [isTesting, setIsTesting] = useState(false);
const [testOutput, setTestOutput] = useState(null);
const [auditResult, setAuditResult] = useState(null);
const [toastMessage, setToastMessage] = useState(null);
const [showSettings, setShowSettings] = useState(false);
const [showTestWizard, setShowTestWizard] = useState(false);
const [showNotionModal, setShowNotionModal] = useState(false);
const [showNotionImportModal, setShowNotionImportModal] = useState(false);
const [testWizardVariables, setTestWizardVariables] = useState({});
const [pendingTestPrompt, setPendingTestPrompt] = useState("");
const [importPageId, setImportPageId] = useState('');
const [notionConfig, setNotionConfig] = useState({ 
    functionUrl: '/.netlify/functions/notion-save', 
    databaseId: '' 
});

const [notionMetadata, setNotionMetadata] = useState({ 
    title: 'New Prompt', 
    aiTool: 'ChatGPT', 
    category: 'Productivity', 
    tags: '', 
    status: 'Live', 
    rating: '5' 
});

const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

const updateGeneratedPrompt = (newPrompt) => {
if (newPrompt === generatedPrompt) return;
const newHistory = promptHistory.slice(0, historyIndex + 1);
    newHistory.push(newPrompt);
    setPromptHistory(newHistory.slice(-20));
    setHistoryIndex(newHistory.length - 1);
    setGeneratedPrompt(newPrompt);
if (window.innerWidth < 1024) setMobileTab('final');
};

const handleUndo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setGeneratedPrompt(promptHistory[historyIndex - 1]); } };
const handleRedo = () => { if (historyIndex < promptHistory.length - 1) { setHistoryIndex(historyIndex + 1); setGeneratedPrompt(promptHistory[historyIndex + 1]); } };

const showToast = (message) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 3000); };

const copyToClipboard = (text) => {
const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast("Copied to Clipboard");
};

const callGemini = async (userMessage, history = []) => {
    setIsGenerating(true);
try {
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [...history, { role: 'user', parts: [{ text: userMessage }] }], systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] } })
});
const data = await response.json();
      setIsGenerating(false);
return data.candidates?.[0]?.content?.parts?.[0]?.text;
} catch (e) { setIsGenerating(false); showToast("API Error"); return null; }
};

const callGeminiJSON = async (userMessage, schema) => {
try {
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: userMessage }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } })
});
const data = await response.json();
return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
} catch (e) { return null; }
};

const handleInitialGenerate = async () => {
const query = activeTab === 'braindump' ? `Build prompt from dump: ${braindumpText}` : `Build optimized prompt from: ${JSON.stringify(structuredData)}`;
const res = await callGemini(query);
if (res) updateGeneratedPrompt(res);
};

const handleExtractToStructured = async () => {
    setIsExtracting(true);
const schema = { type: "OBJECT", properties: { persona: {type:"STRING"}, objective: {type:"STRING"}, task: {type:"STRING"}, exclusions: {type:"STRING"}, context: {type:"STRING"}, format: {type:"STRING"}, rules: {type:"STRING"} } };
const res = await callGeminiJSON(`Extract values for the 7 fields from: "${braindumpText}"`, schema);
    setIsExtracting(false);
if (res) {
      setStructuredData(prev => ({ ...prev, ...res }));
      setActiveTab('structured');
      showToast("Framework Extracted");
}
};

const handleTestPromptClick = () => {
const regex = /\[([^\]]+)\]/g;
const uniqueVars = [...new Set([...generatedPrompt.matchAll(regex)].map(m => m[0]))];
if (uniqueVars.length > 0) {
const vars = {}; uniqueVars.forEach(v => vars[v] = '');
      setTestWizardVariables(vars); setPendingTestPrompt(generatedPrompt); setShowTestWizard(true);
} else {
      setIsTesting(true);
      callGemini(`Execute this: \n\n${generatedPrompt}`).then(res => { setIsTesting(false); setTestOutput(res); });
}
};

const handleRunTestWithVariables = () => {
    setShowTestWizard(false);
let finalPrompt = pendingTestPrompt;
Object.keys(testWizardVariables).forEach(key => finalPrompt = finalPrompt.split(key).join(testWizardVariables[key]));
    setIsTesting(true);
    callGemini(`Execute: \n\n${finalPrompt}`).then(res => { setIsTesting(false); setTestOutput(res); });
};

const handleAuditPrompt = async () => {
const schema = { type: "OBJECT", properties: { score: {type:"INTEGER"}, strengths: {type:"STRING"}, weaknesses: {type:"STRING"}, suggestion: {type:"STRING"} } };
const res = await callGeminiJSON(`Audit this: \n\n${generatedPrompt}`, schema);
if (res) { setAuditResult(res); showToast("Audit Complete"); }
};

const handleSaveToNotion = async () => {
if (!notionConfig.databaseId) return showToast("Check Settings.");
    setIsGenerating(true);
try {
const response = await fetch(notionConfig.functionUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: notionConfig.databaseId, promptText: generatedPrompt, metadata: notionMetadata })
});
if (response.ok) { showToast("Saved!"); setShowNotionModal(false); }
} catch (e) { showToast("Error."); }
    setIsGenerating(false);
};

return (
<div className={`${theme} min-h-screen font-sans`}>
<div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col transition-all duration-300 overflow-hidden">
{toastMessage && (
<div className="fixed top-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 z-[100] bg-indigo-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
<CheckCircle2 size={16} />
<span className="text-xs font-bold uppercase tracking-widest">{toastMessage}</span>
</div>
)}
<header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
<div className="flex items-center gap-2">
<div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-lg"><Layers size={18} /></div>
<h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">Prompt Builder <span className="hidden sm:inline text-indigo-600">Pro</span></h1>
</div>
<div className="flex items-center gap-1">
<button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
</button>
<button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
<Settings size={18} />
</button>
</div>
</header>
<main className="flex-1 w-full max-w-7xl mx-auto p-3 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start overflow-hidden mb-16 lg:mb-0">
<div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col h-[75vh] lg:h-[calc(100vh-120px)] overflow-hidden transition-colors ${mobileTab === 'drafting' ? 'flex' : 'hidden lg:flex'}`}>
<div className="flex border-b border-slate-200 dark:border-slate-700 p-1 bg-slate-50/50 dark:bg-slate-900/30">
<button onClick={() => setActiveTab('braindump')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all ${activeTab === 'braindump' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}>
<Brain size={12} /> Brain Dump
<InfoIcon text="Ideate freely: capture messy thoughts and let AI extract structure automatically." pos="bottom" />
</button>
<button onClick={() => setActiveTab('structured')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all ${activeTab === 'structured' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}>
<Layers size={12} /> Structured
<InfoIcon text="Engineer precisely: build components manually for maximum prompt control." pos="bottom" />
</button>
</div>
<div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-4 font-normal">
{activeTab === 'braindump' ? (
<div className="h-full flex flex-col gap-2">
<div className="flex justify-between items-center">
<label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center">
Ideation Area
<InfoIcon text="Capture raw notes. Click Extract to auto-fill the components below." pos="bottom" />
</label>
<button onClick={handleExtractToStructured} disabled={isExtracting || !braindumpText.trim()} className="text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg disabled:opacity-50">
{isExtracting ? <Loader2 size={10} className="animate-spin" /> : 'Extract'}
</button>
</div>
<textarea value={braindumpText} onChange={(e) => setBraindumpText(e.target.value)} placeholder="Type naturally..." className="flex-1 w-full p-4 border-2 border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:text-white leading-relaxed" />
</div>
) : (
<div className="space-y-5">
<div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
<select value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); setStructuredData(STARTER_TEMPLATES[e.target.value]); }} className="text-[10px] font-bold bg-transparent dark:text-white outline-none">
{Object.keys(STARTER_TEMPLATES).map(t => <option key={t} value={t}>{t} Framework</option>)}
</select>
</div>
{['persona', 'objective', 'context', 'task', 'format', 'exclusions', 'rules'].map((f) => (
<div key={f}>
<label className="block text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 flex items-center">
{f === 'exclusions' ? 'What NOT to do' : f.replace('rules', 'output rules')}
<InfoIcon text={
  f === 'persona' ? "Role and Expertise (e.g. Senior Copywriter)." :
  f === 'objective' ? "The primary goal for the AI." :
  f === 'task' ? "Step-by-step instructions." :
  f === 'exclusions' ? "Negative constraints to reduce fluff." :
  "Tone, length, and technical constraints."
} />
</label>
<textarea rows={2} value={structuredData[f]} onChange={(e) => setStructuredData({...structuredData, [f]: e.target.value})} className="w-full p-3 text-sm border-2 border-slate-100 dark:border-slate-700 bg-transparent dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
</div>
))}
</div>
)}
</div>
<div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex gap-2">
<button onClick={() => { setBraindumpText(''); setStructuredData(STARTER_TEMPLATES["Blank"]); }} className="p-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-300 transition-all">
<RotateCcw size={16} />
</button>
<button onClick={handleInitialGenerate} disabled={isGenerating} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 text-xs uppercase tracking-tighter">
{isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Brain size={16} />} Build Master Prompt
</button>
</div>
</div>
<div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col h-[75vh] lg:h-[calc(100vh-120px)] overflow-hidden transition-colors ${mobileTab === 'final' ? 'flex' : 'hidden lg:flex'}`}>
{generatedPrompt ? (
<>
<div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 custom-scrollbar font-normal">
<div className="flex justify-between items-center mb-4">
<div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
<button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 text-slate-400 hover:text-indigo-500 disabled:opacity-20 transition-colors"><Undo2 size={14}/></button>
<button onClick={handleRedo} disabled={historyIndex >= promptHistory.length - 1} className="p-1.5 text-slate-400 hover:text-indigo-500 disabled:opacity-20 transition-colors"><Redo2 size={14}/></button>
</div>
<div className="flex gap-1.5">
<button onClick={handleAuditPrompt} className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg shadow-sm transition-all"><ShieldCheck size={14}/></button>
<button onClick={handleTestPromptClick} className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg shadow-sm transition-all"><Play size={14}/></button>
<button onClick={() => copyToClipboard(generatedPrompt)} className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm transition-all"><Copy size={14}/></button>
<button onClick={() => setShowNotionModal(true)} className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg shadow-lg active:scale-90 transition-all"><Save size={14}/></button>
</div>
</div>
<textarea value={generatedPrompt} onChange={(e) => updateGeneratedPrompt(e.target.value)} className="w-full min-h-[400px] lg:min-h-[500px] bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed transition-all" spellCheck="false" />
{auditResult && (
<div className="mt-6 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-100 dark:border-purple-800 rounded-2xl p-4 shadow-sm animate-in zoom-in-95">
<div className="flex justify-between items-center mb-3 font-black">
<span className="text-xl text-purple-900 dark:text-purple-300">{auditResult.score}<span className="text-[10px] font-normal opacity-50">/100</span></span>
<button onClick={() => setAuditResult(null)}><X size={14}/></button>
</div>
<p className="text-[11px] mb-2"><strong>Strengths:</strong> {auditResult.strengths}</p>
<p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3"><strong>Weaknesses:</strong> {auditResult.weaknesses}</p>
<button onClick={() => { updateGeneratedPrompt(generatedPrompt + "\n\n" + auditResult.suggestion); setAuditResult(null); }} className="w-full bg-purple-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">Apply Enhancement</button>
</div>
)}
{testOutput && (
<div className="mt-6 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 text-[10px] font-mono whitespace-pre-wrap leading-relaxed animate-in slide-in-from-bottom-2">
<div className="flex justify-between items-center mb-2 font-bold text-emerald-700 uppercase"><span>Result Log</span><button onClick={() => setTestOutput(null)}><X size={14}/></button></div>
{testOutput}
</div>
)}
</div>
<div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
<form onSubmit={(e) => { e.preventDefault(); if(chatInput.trim()) callGemini(`Refine based on: ${chatInput}`, [{role:'user',parts:[{text:generatedPrompt}]}]).then(res => res && updateGeneratedPrompt(res)); setChatInput(''); }} className="flex gap-2">
<input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type refinement instructions..." className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-[11px] outline-none transition-all" />
<button type="submit" disabled={isGenerating || !chatInput.trim()} className="bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg transition-all active:scale-90">
{isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
</button>
</form>
</div>
</>
) : (
<div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center h-full space-y-4">
<div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-full border dark:border-slate-700 shadow-inner">
<MessageSquare size={32} className="opacity-10" />
</div>
<p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workbench Ready</p>
</div>
)}
</div>
</main>
<div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex z-50 shadow-2xl">
<button onClick={() => setMobileTab('drafting')} className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${mobileTab === 'drafting' ? 'text-indigo-600' : 'text-slate-400'}`}>
<Layout size={20} />
<span className="text-[9px] font-black uppercase tracking-tighter">Drafting</span>
</button>
<button onClick={() => setMobileTab('final')} className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${mobileTab === 'final' ? 'text-indigo-600' : 'text-slate-400'}`}>
<Eye size={20} />
<span className="text-[9px] font-black uppercase tracking-tighter">Final View</span>
</button>
</div>
{showSettings && (
<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 font-bold">
<div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border dark:border-slate-700">
<div className="flex justify-between p-6 border-b dark:border-slate-700">
<h2 className="font-black text-[10px] uppercase tracking-widest dark:text-white">API Settings</h2>
<button onClick={() => setShowSettings(false)}><X size={20}/></button>
</div>
<div className="p-6 space-y-4">
<div><label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Notion DB ID</label><input type="text" value={notionConfig.databaseId} onChange={e => setNotionConfig({...notionConfig, databaseId: e.target.value})} className="w-full p-3 border-2 border-slate-100 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500 text-sm font-normal font-mono"/></div>
<div><label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Function Link</label><input type="text" value={notionConfig.functionUrl} onChange={e => setNotionConfig({...notionConfig, functionUrl: e.target.value})} className="w-full p-3 border-2 border-slate-100 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500 text-xs font-normal"/></div>
</div>
<div className="p-4 border-t dark:border-slate-700 flex justify-end"><button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Done</button></div>
</div>
</div>
)}
{showNotionModal && (
<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 font-bold">
<div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border dark:border-slate-700">
<div className="flex justify-between p-6 border-b dark:border-slate-700">
<h2 className="font-black text-[10px] uppercase tracking-widest dark:text-white">Save to Library</h2>
<button onClick={() => setShowNotionModal(false)}><X size={20}/></button>
</div>
<div className="p-6 space-y-4">
<div><label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Prompt Name</label><input type="text" value={notionMetadata.title} onChange={e => setNotionMetadata({...notionMetadata, title: e.target.value})} className="w-full p-3 border-2 border-slate-100 dark:border-slate-700 rounded-xl bg-transparent dark:text-white text-sm outline-none font-normal" /></div>
</div>
<div className="p-6 border-t dark:border-slate-700 flex justify-end bg-slate-50/50 dark:bg-slate-900/20"><button onClick={handleSaveToNotion} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] shadow-xl uppercase tracking-widest">Push to Notion</button></div>
</div>
</div>
)}
</div>
</div>
);
}
