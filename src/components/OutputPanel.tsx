import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { 
  Copy, 
  Check, 
  Download, 
  TerminalWindow, 
  SealCheck, 
  SealPercent,
  Warning,
  Eye,
  BracketsAngle,
  CaretRight
} from '@phosphor-icons/react';
import { Flow } from '../types';

interface OutputPanelProps {
  flow: Flow;
  markdownContent: string;
  mermaidContent: string;
  warnings: string[];
  onTriggerToast: (message: string, type: 'success' | 'info' | 'warning') => void;
  onCollapse: () => void;
}

export default function OutputPanel({
  flow,
  markdownContent,
  mermaidContent,
  warnings,
  onTriggerToast,
  onCollapse,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'markdown' | 'mermaid'>('markdown');
  const [copied, setCopied] = useState(false);

  // Robust universal copy-to-clipboard (works inside sandboxed iframe)
  const handleCopy = async () => {
    const textToCopy = activeTab === 'markdown' ? markdownContent : mermaidContent;
    
    let success = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      }
    } catch {
      // fallback to custom selection
    }

    if (!success) {
      try {
        const textElement = document.createElement('textarea');
        textElement.value = textToCopy;
        textElement.style.position = 'fixed';
        textElement.style.opacity = '0';
        document.body.appendChild(textElement);
        textElement.focus();
        textElement.select();
        const copyResult = document.execCommand('copy');
        document.body.removeChild(textElement);
        success = copyResult;
      } catch {
        // failed
      }
    }

    if (success) {
      setCopied(true);
      onTriggerToast(`Copied ${activeTab === 'markdown' ? 'Markdown' : 'Mermaid'} to clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      onTriggerToast('Failed to copy. Please manually copy from the viewport.', 'warning');
    }
  };

  // Dynamic client-side download as physical .md file
  const handleDownload = () => {
    const fileName = `${(flow.title || 'untitled-flow').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    const fullContent = `---
title: ${flow.title || 'Untitled Flow'}
description: ${flow.description || ''}
exportedAt: ${new Date().toISOString()}
---

# Graph Flowchart: ${flow.title || 'Untitled Flow'}

${markdownContent}

## Mermaid Flow Diagram Code

\`\`\`mermaid
${mermaidContent}
\`\`\`
`;
    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onTriggerToast(`Downloaded "${fileName}" successfully!`, 'success');
  };

  return (
    <aside className="w-96 border-l border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80 backdrop-blur-md flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Tab Switcher & Action Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/40">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onCollapse}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors cursor-pointer mr-0.5"
              title="Collapse Right Panel"
            >
              <CaretRight size={16} weight="bold" />
            </button>
            <div className="flex items-center gap-1.5">
              <TerminalWindow size={16} className="text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                AI-Friendly Export
              </span>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-[10px] bg-indigo-500 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2.5 py-1.5 rounded-lg font-bold tracking-wide transition-all hover:bg-indigo-600 dark:hover:bg-zinc-200 active:scale-95 shadow-sm cursor-pointer"
            title="Download full process bundle (.md)"
          >
            <Download size={11} weight="bold" />
            <span>Download .MD</span>
          </button>
        </div>

        {/* Sliders for tabs */}
        <div className="flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80">
          <button
            onClick={() => setActiveTab('markdown')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold tracking-normal rounded-md transition-all cursor-pointer ${
              activeTab === 'markdown'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'
            }`}
          >
            <Eye size={12} weight={activeTab === 'markdown' ? 'bold' : 'regular'} />
            <span>Markdown Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('mermaid')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold tracking-normal rounded-md transition-all cursor-pointer ${
              activeTab === 'mermaid'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'
            }`}
          >
            <BracketsAngle size={12} weight={activeTab === 'mermaid' ? 'bold' : 'regular'} />
            <span>Mermaid DSL</span>
          </button>
        </div>
      </div>

      {/* Dynamic Content Terminal Viewport */}
      <div className="flex-1 overflow-y-auto p-5 select-text min-h-0 relative">
        {/* Copy Floating Pill overlay */}
        <div className="sticky top-0 z-10 flex justify-end mb-2 h-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] bg-indigo-500 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2.5 py-1.5 rounded-lg font-bold tracking-wide transition-all hover:bg-indigo-600 dark:hover:bg-zinc-200 active:scale-95 shadow-sm cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={11} weight="bold" />
                <span>COPIED!</span>
              </>
            ) : (
              <>
                <Copy size={11} weight="bold" />
                <span>COPY BLOCK</span>
              </>
            )}
          </button>
        </div>

        {activeTab === 'markdown' ? (
          /* Markdown Preview tab */
          <div className="markdown-body prose dark:prose-invert max-w-none text-zinc-850 dark:text-zinc-200 mt-5">
            <Markdown>{markdownContent}</Markdown>
          </div>
        ) : (
          /* Mermaid Raw source code view tab */
          <div className="mt-5">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 select-none">
              Raw Flowchart DSL:
            </h3>
            <pre className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 font-mono text-[10px] leading-relaxed overflow-x-auto border border-zinc-200 dark:border-zinc-800/80">
              {mermaidContent}
            </pre>
          </div>
        )}
      </div>

      {/* LLM Graph Validation Rule Checklist */}
      <div className="p-5 border-t border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/40 shrink-0 max-h-[220px] overflow-y-auto">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3 select-none flex items-center gap-1">
          <SealPercent size={13} weight="bold" />
          <span>Graph Validation Checks</span>
        </h4>

        {warnings.length === 0 ? (
          /* Success checks passing */
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <SealCheck size={18} weight="bold" className="shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[11px] font-bold leading-none mb-1">
                All Checks Passed!
              </h5>
              <p className="text-[10px] leading-normal opacity-85">
                Diagram is semantically aligned and ready to be read by any LLM.
              </p>
            </div>
          </div>
        ) : (
          /* Warning details list */
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Warning size={14} weight="bold" />
              <span className="text-[10px] font-bold">
                {warnings.length} layout rules need review:
              </span>
            </div>
            
            <ul className="space-y-1 pl-1">
              {warnings.map((warn, index) => (
                <li 
                  key={index}
                  className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5 leading-normal"
                >
                  <span className="text-amber-500/80 dark:text-amber-500">•</span>
                  <span>{warn}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
