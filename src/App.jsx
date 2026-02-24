import React, { useState, useEffect, useRef } from 'react';

import { 
  Brain, 
  Layers, 
  Send, 
  Save, 
  Settings, 
  Copy, 
  CheckCircle2, 
  Loader2, 
  MessageSquare,
  AlertCircle,
  X,
  Database,
  AlertTriangle,
  HelpCircle,
  Check,
  Wand2,
  ShieldCheck,
  GitBranch,
  ArrowDown,
  Info
} from 'lucide-react';


// --- System Configuration & Prompts ---
const apiKey = ""; // Provided by the execution environment

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

--- OUTPUT RULES ---
- [Key constraints — what to include or exclude]
- State uncertainty explicitly if unsure
- Highlight any assumptions being made

---
[Task content / data goes here]

ADVANCED TECHNIQUES & RULES (Apply automatically):
1. Chain-of-thought: Inject "think step by step before responding" for reasoning tasks.
2. Few-shot: Embed brief examples if output consistency matters.
3. Formatting: STRICT LINE BREAKS. You MUST use double newlines (\n\n) before and after EVERY heading. Use newlines for every list item. Do NOT output a wall of text.
4. Variables & Placeholders: If the user provides bracketed text like [INSERT X], PRESERVE THE BRACKETS EXACTLY. Place them cleanly in the Context or Data section. Do NOT awkwardly inject them into the middle of Task sentences.

Do NOT include meta-commentary in your output. Just output the final, highly optimized prompt following the exact structure above.`;

const InfoIcon = ({ text, pos = 'top' }) => (
  <div className="relative group inline-flex items-center ml-1.5" onClick={e => e.stopPropagation()}>
    <Info size={14} className="opacity-50 group-hover:opacity-100 transition-opacity cursor-help text-current" />
    <div className={`absolute ${pos === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 sm:left-1/2 sm:-translate-x-1/2 hidden group-hover:block w-48 p-2.5 bg-slate-800 text-white text-[11px] font-normal leading-relaxed rounded-lg shadow-xl z-[100] text-center pointer-events-none normal-case tracking-normal`}>
      {text}
    </div>
  </div>
);

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('braindump');
  const [braindumpText, setBraindumpText] = useState('');
  const [structuredData, setStructuredData] = useState({
    persona: '', objective: '', context: '', task: '', format: '', rules: ''
  });
  const [analysisData, setAnalysisData] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testOutput, setTestOutput] = useState(null);
  const [isAutoTagging, setIsAutoTagging] = useState(false);

  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [isSplitting, setIsSplitting] = useState(false);

  const [isCopied, setIsCopied] = useState(false);
  const [copiedStepIndex, setCopiedStepIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  // --- Test Wizard State ---
  const [showTestWizard, setShowTestWizard] = useState(false);
  const [testWizardVariables, setTestWizardVariables] = useState({});
  const [pendingTestPrompt, setPendingTestPrompt] = useState("");

  const [editingSuggestion, setEditingSuggestion] = useState(false);
  const [editableSuggestion, setEditableSuggestion] = useState('');
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [notionConfig, setNotionConfig] = useState({
    functionUrl: '/.netlify/functions/notion-save', 
    databaseId: ''
  });
  const [notionMetadata, setNotionMetadata] = useState({
    title: 'New Prompt',
    aiTool: 'ChatGPT',
    category: 'Productivity',
    tags: 'automation, planning',
    status: 'Draft',
    rating: '3'
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isGenerating]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- Bulletproof Formatting Enforcer ---
  const enforceFormatting = (text) => {
    if (!text) return text;
    let fixed = text;
    fixed = fixed.replace(/(?:====== )?ORIGINAL PROMPT TO SPLIT(?: ======)?:?[\s\S]*/gi, '');
    fixed = fixed.replace(/\s*(### PROMPT \d+:?.*?)\s*/gi, '\n\n$1\n\n');
    fixed = fixed.replace(/\s*(-{2,}\s*\*?Instructions for user.*?\*?\s*-{2,})\s*/gi, '\n\n$1\n\n');
    fixed = fixed.replace(/\s*(-{2,}\s*(?:PERSONA|OBJECTIVE|CONTEXT|TASK|FORMAT|OUTPUT RULES)\s*-{2,})\s*/gi, '\n\n$1\n');
    fixed = fixed.replace(/([.!?])\s+(?=\d+\.\s+[*A-Z])/g, '$1\n');
    fixed = fixed.replace(/([.!?])\s+(?=[*-]\s+[*A-Z])/g, '$1\n');
    return fixed.replace(/\n{3,}/g, '\n\n').trim();
  };

  const callGemini = async (userMessage, history = []) => {
    setIsGenerating(true);
    let attempts = 0;
    const maxRetries = 5;
    const delays = [1000, 2000, 4000, 8000, 16000];

    const payload = {
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
    };

    while (attempts < maxRetries) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          setIsGenerating(false);
          return text;
        } else {
          throw new Error('No text in response');
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          setIsGenerating(false);
          showToast("Failed to generate prompt. Please try again.");
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, delays[attempts - 1]));
      }
    }
  };

  const callGeminiJSON = async (userMessage, schema) => {
    let attempts = 0;
    const maxRetries = 5;
    const delays = [1000, 2000, 4000, 8000, 16000];

    const payload = {
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    };

    while (attempts < maxRetries) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return JSON.parse(text);
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) return null;
        await new Promise(resolve => setTimeout(resolve, delays[attempts - 1]));
      }
    }
  };

  const handleExtractToStructured = async () => {
    if (!braindumpText.trim()) return showToast("Please enter some thoughts first.");
    setIsExtracting(true);
    setAnalysisData(null);

    const fieldObj = {
      type: "OBJECT",
      properties: {
        value: { type: "STRING", description: "The extracted text, or a suggested default assumption if information is missing." },
        confidence: { type: "INTEGER", description: "Rate confidence from 1 to 10 based on how explicitly the user provided this info." },
        question: { type: "STRING", description: "If confidence < 7, ask a short, targeted question to clarify. Otherwise leave empty." }
      }
    };

    const schema = {
      type: "OBJECT",
      properties: {
        decompositionWarning: { type: "STRING" },
        persona: fieldObj,
        objective: fieldObj,
        context: fieldObj,
        task: fieldObj,
        format: fieldObj,
        rules: fieldObj
      }
    };
    const extractionPrompt = `Analyze the following brain dump for a prompt. Extract data into the 6 framework fields. Evaluate if it violates the Prompt Decomposition Rule. Brain Dump: "${braindumpText}"`;

    const result = await callGeminiJSON(extractionPrompt, schema);
    setIsExtracting(false);
    if (result) {
      setStructuredData({
        persona: result.persona?.value || '',
        objective: result.objective?.value || '',
        context: result.context?.value || '',
        task: result.task?.value || '',
        format: result.format?.value || '',
        rules: result.rules?.value || ''
      });
      setAnalysisData(result);
      setActiveTab('structured');
      showToast("✨ Analysis complete!");
    } else {
      showToast("Failed to extract details.");
    }
  };

  const executeTest = async (promptToRun) => {
    setIsTesting(true);
    setTestOutput(null);
    const responseText = await callGemini(`You are a system testing a prompt generated by a user. Please act exactly as the prompt describes and provide the final output. Here is the prompt:\n\n${promptToRun}`);
    setIsTesting(false);
    if (responseText) {
      setTestOutput(responseText);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      showToast("Failed to test prompt.");
    }
  };

  const handleTestPromptClick = () => {
    const regex = /\[([^\]]+)\]/g;
    const matches = [...generatedPrompt.matchAll(regex)].map(m => m[0]);
    const uniqueVars = [...new Set(matches)];

    if (uniqueVars.length > 0) {
      const initialVars = {};
      uniqueVars.forEach(v => initialVars[v] = '');
      setTestWizardVariables(initialVars);
      setPendingTestPrompt(generatedPrompt);
      setShowTestWizard(true);
    } else {
      executeTest(generatedPrompt);
    }
  };

  const handleRunTestWithVariables = () => {
    setShowTestWizard(false);
    let finalPrompt = pendingTestPrompt;
    Object.keys(testWizardVariables).forEach(key => {
      const val = testWizardVariables[key] || key; 
      finalPrompt = finalPrompt.split(key).join(val);
    });
    executeTest(finalPrompt);
  };

  const handleAutoFillMetadata = async () => {
    setIsAutoTagging(true);
    const schema = {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" }, category: { type: "STRING" }, tags: { type: "STRING" }
      }
    };
    const result = await callGeminiJSON(`Generate suitable metadata for a Notion database: \n\n${generatedPrompt}`, schema);
    setIsAutoTagging(false);
    if (result) {
      setNotionMetadata(prev => ({ ...prev, ...result }));
      showToast("✨ Metadata auto-filled!");
    }
  };

  const handleAutoCompleteFields = async () => {
    setIsAutoCompleting(true);
    const schema = {
      type: "OBJECT",
      properties: {
        persona: { type: "STRING" }, objective: { type: "STRING" }, context: { type: "STRING" },
        task: { type: "STRING" }, format: { type: "STRING" }, rules: { type: "STRING" }
      }
    };
    const query = `Based on these partial parameters, infer and fill the missing fields:
    Persona: ${structuredData.persona}\nObjective: ${structuredData.objective}\nContext: ${structuredData.context}\nTask: ${structuredData.task}\nFormat: ${structuredData.format}\nRules: ${structuredData.rules}`;
    const result = await callGeminiJSON(query, schema);
    setIsAutoCompleting(false);
    if (result) {
      setStructuredData(prev => ({
        persona: prev.persona || result.persona || '', objective: prev.objective || result.objective || '',
        context: prev.context || result.context || '', task: prev.task || result.task || '',
        format: prev.format || result.format || '', rules: prev.rules || result.rules || ''
      }));
      showToast("✨ Missing fields auto-completed!");
    }
  };

  const handleAuditPrompt = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    const schema = {
      type: "OBJECT",
      properties: {
        score: { type: "INTEGER" }, strengths: { type: "STRING" }, weaknesses: { type: "STRING" },
        suggestion: { type: "STRING" }, decompositionAdvice: { type: "STRING" }
      }
    };
    const result = await callGeminiJSON(`Audit this prompt for effectiveness. Evaluate if it violates the Prompt Decomposition Rule:\n\n${generatedPrompt}`, schema);
    setIsAuditing(false);
    if (result) {
      setAuditResult(result);
      setEditableSuggestion(result.suggestion || '');
      setEditingSuggestion(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      showToast("✨ Prompt Audit complete!");
    }
  };

  const handleApplySuggestion = async () => {
    setIsApplyingSuggestion(true);
    const userMessage = `Please refine the prompt by incorporating this specific suggestion: "${editableSuggestion}". Ensure you maintain the strict framework headings and proper line breaks.`;
    const updatedHistory = [...chatHistory, { role: 'user', parts: [{ text: userMessage }] }];
    setChatHistory(updatedHistory);
    const responseText = await callGemini(userMessage, chatHistory);
    setIsApplyingSuggestion(false);
    if (responseText) {
      setGeneratedPrompt(enforceFormatting(responseText));
      setChatHistory([...updatedHistory, { role: 'model', parts: [{ text: responseText }] }]);
      setAuditResult(null); 
      setEditingSuggestion(false);
      showToast("✨ Suggestion applied to prompt!");
    } else {
      showToast("Failed to apply suggestion.");
    }
  };

  const handleSplitPrompt = async () => {
    setIsSplitting(true);
    const splitQuery = `You are an elite Prompt Engineer. The following prompt is trying to do too many things at once.
    Break it down into a logical "Prompt Chain" (2 or 3 separate prompts). 
    🚨 RULES FOR VARIABLES & FORMATTING (CRITICAL!) 🚨
    1. Retain any [BRACKETED VARIABLES] from the original prompt exactly as they are.
    2. Place these variables CLEANLY in the CONTEXT section of Prompt 1. 
    3. DO NOT awkwardly sprinkle the brackets into the middle of the Task sentences.
    4. STRICT FORMATTING: You MUST use Markdown newlines. Insert double newlines (\\n\\n) before and after EVERY heading.
    5. DO NOT output the original prompt at the end. ONLY output the newly generated prompts.

    ### PROMPT 1: [Goal of first prompt]
    --- PERSONA ---
    [Persona text]

    ---
    Instructions for user: Feed the output of Prompt 1 into Prompt 2.
    ---

    ### PROMPT 2: [Goal of second prompt]

    ====== ORIGINAL PROMPT TO SPLIT ======
    \n\n${generatedPrompt}`;

    const responseText = await callGemini(splitQuery, chatHistory);
    setIsSplitting(false);
    if (responseText) {
      setGeneratedPrompt(enforceFormatting(responseText));
      setAuditResult(null);
      setChatHistory([...chatHistory, { role: 'user', parts: [{ text: "Split this into chained prompts." }] }, { role: 'model', parts: [{ text: responseText }] }]);
      showToast("✨ Prompt successfully split into a chain!");
    }
  };

  const handleInitialGenerate = async () => {
    let query = '';
    if (activeTab === 'braindump') {
      if (!braindumpText.trim()) return showToast("Please enter some thoughts first.");
      query = `Please build a comprehensive prompt based on this brain dump using the strict framework provided:\n${braindumpText}`;
    } else {
      const { persona, objective, context, task, format, rules } = structuredData;
      if (!objective.trim() && !task.trim()) return showToast("Please fill in at least Objective or Task.");
      query = `Please build a final optimized prompt using the strict requested framework. Inputs:
      Persona: ${persona}\nObjective: ${objective}\nContext: ${context}\nTask: ${task}\nFormat: ${format}\nOutput Rules: ${rules}`;
    }

    const responseText = await callGemini(query, []);
    if (responseText) {
      setGeneratedPrompt(enforceFormatting(responseText));
      setChatHistory([{ role: 'user', parts: [{ text: query }] }, { role: 'model', parts: [{ text: responseText }] }]);
    }
  };

  const handleChatRefinement = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;
    const userMessage = chatInput;
    setChatInput('');
    const updatedHistory = [...chatHistory, { role: 'user', parts: [{ text: `Refine the prompt based on this feedback: ${userMessage}` }] }];
    setChatHistory(updatedHistory);
    const responseText = await callGemini(`Refine the prompt based on this feedback: ${userMessage}. Ensure you still output the entire prompt using the exact strict framework headings with proper line breaks.`, chatHistory);
    if (responseText) {
      setGeneratedPrompt(enforceFormatting(responseText));
      setChatHistory([...updatedHistory, { role: 'model', parts: [{ text: responseText }] }]);
    }
  };

  const copyFullToClipboard = () => {
    const el = document.createElement('textarea');
    el.value = generatedPrompt;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setIsCopied(true);
    showToast("Copied full prompt!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copySpecificText = (text, index) => {
    const el = document.createElement('textarea');
    el.value = text.trim();
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopiedStepIndex(index);
    showToast(`Copied Step ${index + 1}!`);
    setTimeout(() => setCopiedStepIndex(null), 2000);
  };

  const handleSaveToNotion = async () => {
    if (!notionConfig.databaseId) {
      setShowNotionModal(false);
      setShowSettings(true);
      showToast("Please configure your Notion Database ID first.");
      return;
    }
    setIsGenerating(true); 
    try {
      const response = await fetch(notionConfig.functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseId: notionConfig.databaseId, promptText: generatedPrompt, metadata: notionMetadata })
      });
      if (response.ok) { showToast("Saved to Notion Library!"); setShowNotionModal(false); } 
      else { showToast(`Notion Error`); }
    } catch (error) { showToast("CORS/Fetch Error."); } 
    finally { setIsGenerating(false); }
  };

  // --- UI RENDERER: Parse Chained Prompts into Pipeline Cards ---
  const renderOutputArea = () => {
    if (generatedPrompt.includes('### PROMPT 1')) {
      const parts = generatedPrompt.split(/(?=### PROMPT \d+:?)/i).filter(p => p.trim());
      return (
        <div className="space-y-6">
          <div className="bg-indigo-50 text-indigo-800 p-3 rounded-md text-sm flex items-center gap-2 border border-indigo-100">
            <GitBranch size={16} /> 
            <span><strong>Pipeline View:</strong> This prompt has been split into a chain. Run Step 1, then feed its output into Step 2.</span>
          </div>
          {parts.map((part, index) => {
            const isInstruction = !part.toUpperCase().includes('### PROMPT');
            if (isInstruction) {
              return (
                <div key={index} className="flex flex-col items-center text-slate-400 py-2">
                  <ArrowDown size={20} />
                  <span className="text-xs font-semibold mt-1 bg-white px-2 text-slate-500">{part.replace(/-/g, '').trim()}</span>
                  <ArrowDown size={20} className="mt-1" />
                </div>
              );
            }
            return (
              <div key={index} className="relative group bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                      {part.split('\n')[0].replace('### PROMPT', 'Prompt')}
                    </span>
                  </div>
                  <button 
                    onClick={() => copySpecificText(part, index)} 
                    className="text-xs font-semibold flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    {copiedStepIndex === index ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copiedStepIndex === index ? 'Copied' : 'Copy Step'}
                  </button>
                </div>
                <textarea
                  value={part}
                  onChange={(e) => {
                    const newParts = [...parts];
                    newParts[index] = e.target.value;
                    setGeneratedPrompt(newParts.join('\n\n'));
                  }}
                  className="w-full min-h-[350px] p-4 font-mono text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                  spellCheck="false"
                />
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="relative group">
        <textarea
          value={generatedPrompt}
          onChange={(e) => setGeneratedPrompt(e.target.value)}
          className="w-full min-h-[350px] bg-white border border-slate-200 rounded-lg p-5 shadow-sm whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y transition-all"
          spellCheck="false"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="bg-slate-800 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">Editable</span>
        </div>
      </div>
    );
  };

  const structuredFields = [
    { id: 'persona', label: 'Persona', placeholder: 'Specific role, expertise, and perspective' },
    { id: 'objective', label: 'Objective', placeholder: 'Clear, measurable goal — what success looks like' },
    { id: 'context', label: 'Context', placeholder: 'Background details, Target audience, Key constraints' },
    { id: 'task', label: 'Task', placeholder: '1. Step one\n2. Step two' },
    { id: 'format', label: 'Format', placeholder: 'Structure: bullets\nLength: 200 words\nTone: professional' },
    { id: 'rules', label: 'Output Rules', placeholder: 'Constraints, what to exclude, assumptions' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Layers size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Prompt Builder Pro</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
          <Settings size={20} />
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start h-[calc(100vh-80px)]">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button onClick={() => setActiveTab('braindump')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'braindump' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Brain size={16} /> Brain Dump
            </button>
            <button onClick={() => setActiveTab('structured')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'structured' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Layers size={16} /> Structured
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'braindump' ? (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700">What do you want the AI to do?</label>
                  <button onClick={handleExtractToStructured} disabled={isExtracting || !braindumpText.trim()} className="text-xs font-medium bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-200 flex items-center gap-1 transition-colors disabled:opacity-50">
                    {isExtracting ? <Loader2 size={14} className="animate-spin" /> : '✨'} Extract & Analyze
                    <InfoIcon text="Analyzes your raw thoughts, extracts key prompt components, and suggests missing details." pos="bottom" />
                  </button>
                </div>
                <textarea value={braindumpText} onChange={(e) => setBraindumpText(e.target.value)} placeholder="E.g., I need a prompt that helps me write a weekly newsletter..." className="flex-1 w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none text-sm" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mb-4">
                  <p className="text-xs text-indigo-800">Fill in what you know, AI can fill the rest.</p>
                  <button onClick={handleAutoCompleteFields} disabled={isAutoCompleting} className="text-xs font-medium bg-white text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-md hover:bg-indigo-50 flex items-center gap-1 shadow-sm disabled:opacity-50">
                    {isAutoCompleting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Auto-Complete
                    <InfoIcon text="Uses AI to infer and fill in any blank structured fields based on what you've already written." pos="bottom" />
                  </button>
                </div>
                {analysisData?.decompositionWarning && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800 text-sm">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                    <div><strong className="block mb-1 font-bold text-amber-900">Decomposition Recommended</strong>{analysisData.decompositionWarning}</div>
                  </div>
                )}
                {structuredFields.map((field) => {
                  const fieldAnalysis = analysisData?.[field.id];
                  const isConfident = fieldAnalysis ? fieldAnalysis.confidence >= 7 : true;
                  const showQuestion = fieldAnalysis && !isConfident && fieldAnalysis.question;
                  return (
                    <div key={field.id} className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-bold text-slate-700 uppercase">{field.label}</label>
                        {analysisData && (
                          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isConfident ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isConfident ? <Check size={12} /> : <HelpCircle size={12} />} {isConfident ? 'Confident' : 'Needs Review'}
                          </div>
                        )}
                      </div>
                      {showQuestion && (
                        <div className="mb-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-md flex gap-2">
                          <HelpCircle size={16} className="shrink-0 mt-0.5 text-blue-600" />
                          <div><span className="font-semibold block mb-0.5">Clarification Needed:</span>{fieldAnalysis.question}</div>
                        </div>
                      )}
                      <textarea rows={3} value={structuredData[field.id]} onChange={(e) => setStructuredData({...structuredData, [field.id]: e.target.value})} placeholder={field.placeholder} className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-y ${showQuestion ? 'border-amber-300 bg-amber-50/30' : 'border-slate-300'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button onClick={handleInitialGenerate} disabled={isGenerating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow flex items-center justify-center gap-2 disabled:opacity-70">
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Brain size={18} />} Generate Master Prompt
              <InfoIcon text="Drafts the final, highly optimized prompt using our strict structural framework." pos="top" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
          {generatedPrompt ? (
            <>
              <div className="flex-1 overflow-y-auto p-5 bg-slate-50 border-b border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Final Output</h3>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button onClick={handleSplitPrompt} disabled={isSplitting} className="text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-md hover:bg-blue-200 flex items-center gap-1 shadow-sm">
                      {isSplitting ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />} Chain Prompts
                      <InfoIcon text="Splits a single bloated prompt into a sequence of chained, step-by-step prompts." pos="bottom" />
                    </button>
                    <button onClick={handleAuditPrompt} disabled={isAuditing} className="text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-md hover:bg-purple-200 flex items-center gap-1 shadow-sm">
                      {isAuditing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Audit
                      <InfoIcon text="Evaluates your generated prompt for edge cases, missing constraints, and overall effectiveness." pos="bottom" />
                    </button>
                    {!generatedPrompt.includes('### PROMPT 1') && (
                      <button onClick={handleTestPromptClick} disabled={isTesting} className="text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-md hover:bg-emerald-200 flex items-center gap-1 shadow-sm">
                        {isTesting ? <Loader2 size={14} className="animate-spin" /> : '✨'} Test
                        <InfoIcon text="Runs your generated prompt right here so you can preview the actual output." pos="bottom" />
                      </button>
                    )}
                    <button onClick={copyFullToClipboard} className="text-xs font-medium bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50 flex items-center gap-1 shadow-sm">
                      {isCopied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />} Copy All
                      <InfoIcon text="Copies the entire generated prompt sequence to your clipboard." pos="bottom" />
                    </button>
                    <button onClick={() => setShowNotionModal(true)} className="text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 flex items-center gap-1 shadow-sm">
                      <Database size={14} /> Save
                      <InfoIcon text="Saves this prompt configuration to your connected Notion database." pos="bottom" />
                    </button>
                  </div>
                </div>
                {renderOutputArea()}
                {chatHistory.length > 2 && (
                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Refinement History</h4>
                    <div className="space-y-3">
                      {chatHistory.slice(2).map((msg, idx) => (
                        <div key={idx} className={`text-sm p-3 rounded-lg ${msg.role === 'user' ? 'bg-indigo-50 border border-indigo-100 ml-8' : 'bg-white border border-slate-200 mr-8'}`}>
                          <span className="font-semibold block mb-1 text-xs opacity-50">{msg.role === 'user' ? 'You' : 'AI'}</span>{msg.parts[0].text}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </div>
                )}

                {auditResult && (
                  <div className="mt-6 border-t border-purple-200 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-purple-700 uppercase flex items-center gap-1">✨ Prompt Audit</h4>
                      <button onClick={() => setAuditResult(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-slate-800 space-y-3">
                      <div className="flex items-center gap-2"><span className="font-bold text-lg text-purple-900">{auditResult.score}/100</span><span className="text-xs uppercase font-semibold text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full bg-white">Score</span></div>
                      {auditResult.decompositionAdvice && (
                        <div className="bg-amber-100 border border-amber-300 p-3 rounded text-amber-900 shadow-sm">
                          <div className="flex justify-between items-start mb-1"><strong className="flex items-center gap-1"><AlertTriangle size={16}/> Decomposition Recommended</strong>
                            <button onClick={handleSplitPrompt} disabled={isSplitting} className="text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 px-2 py-1 rounded flex items-center gap-1">
                              {isSplitting ? <Loader2 size={12} className="animate-spin" /> : <GitBranch size={12} />} Split for me
                            </button>
                          </div><p className="whitespace-pre-wrap">{auditResult.decompositionAdvice}</p>
                        </div>
                      )}
                      <div><strong className="block text-purple-800 mb-1">Strengths:</strong><p className="whitespace-pre-wrap">{auditResult.strengths}</p></div>
                      <div><strong className="block text-amber-700 mb-1">Weaknesses / Edge Cases:</strong><p className="whitespace-pre-wrap text-amber-900">{auditResult.weaknesses}</p></div>
                      <div className="bg-white p-3 rounded border border-purple-100">
                        <strong className="block text-purple-800 mb-2">💡 Suggestion:</strong>
                        {!editingSuggestion ? (
                          <div className="space-y-3">
                            <p className="text-slate-700">{auditResult.suggestion}</p>
                            <button onClick={() => setEditingSuggestion(true)} className="text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-200 transition-colors flex items-center gap-1">
                              <Wand2 size={12} /> Edit & Incorporate
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea value={editableSuggestion} onChange={(e) => setEditableSuggestion(e.target.value)} className="w-full p-2.5 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-y" rows={3} />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingSuggestion(false)} className="text-xs font-semibold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded transition-colors">Cancel</button>
                              <button onClick={handleApplySuggestion} disabled={isApplyingSuggestion} className="text-xs font-semibold bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 transition-colors flex items-center gap-1 disabled:opacity-70">
                                {isApplyingSuggestion ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                {isApplyingSuggestion ? 'Applying...' : 'Apply to Prompt'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white">
                <form onSubmit={handleChatRefinement} className="flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Refine your prompt..." className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" disabled={isGenerating} />
                  <button type="submit" disabled={isGenerating || !chatInput.trim()} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-70">
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center h-full">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-600 mb-1">No prompt generated yet</p>
            </div>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={18}/> Configuration</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-semibold mb-1">Notion Database ID</label><input type="text" value={notionConfig.databaseId} onChange={(e) => setNotionConfig({...notionConfig, databaseId: e.target.value})} className="w-full p-2 border rounded text-sm font-mono"/></div>
              <div><label className="block text-sm font-semibold mb-1">Netlify Function URL</label><input type="text" value={notionConfig.functionUrl} onChange={(e) => setNotionConfig({...notionConfig, functionUrl: e.target.value})} className="w-full p-2 border rounded text-sm font-mono"/></div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm">Done</button>
            </div>
          </div>
        </div>
      )}

      {showNotionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold flex items-center gap-2"><Database size={18}/> Save to Notion</h2>
              <button onClick={() => setShowNotionModal(false)} className="text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-4 flex justify-end">
              <button onClick={handleSaveToNotion} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {showTestWizard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-emerald-50 text-emerald-900">
              <h2 className="text-lg font-bold flex items-center gap-2"><Wand2 size={18}/> Test Run Wizard</h2>
              <button onClick={() => setShowTestWizard(false)} className="text-emerald-700 hover:text-emerald-900"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-sm text-slate-600 mb-2 font-medium">
                We found template variables in your prompt. Fill them out to test how the prompt runs, without modifying your saved Notion template!
              </p>
              {Object.keys(testWizardVariables).map((varName) => (
                <div key={varName}>
                  <label className="block text-sm font-bold mb-1 text-slate-700">{varName}</label>
                  <input
                    type="text"
                    value={testWizardVariables[varName]}
                    onChange={(e) => setTestWizardVariables({...testWizardVariables, [varName]: e.target.value})}
                    placeholder={`Enter value...`}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowTestWizard(false)} className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleRunTestWithVariables} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md font-medium text-sm flex items-center gap-2 shadow-sm transition-colors">
                ✨ Run Test
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
