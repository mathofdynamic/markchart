import React, { useState, useEffect, useRef } from 'react';
import {
  Moon,
  Sun,
  Pencil,
  Check,
  TreeStructure,
  CornersOut,
  CornersIn,
  GitFork,
  Cpu,
  Graph,
  FlowArrow,
  Stack,
  Lightning,
  ShieldCheck,
  Gear,
  Database,
  PlugsConnected,
  Code,
  SignOut,
  Sparkle,
  FileArrowDown,
  ShareNetwork
} from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';

const AVAILABLE_ICONS = [
  { name: 'TreeStructure', component: TreeStructure, label: 'Tree' },
  { name: 'GitFork', component: GitFork, label: 'Branch' },
  { name: 'Cpu', component: Cpu, label: 'Logic' },
  { name: 'Graph', component: Graph, label: 'Network' },
  { name: 'FlowArrow', component: FlowArrow, label: 'Sequence' },
  { name: 'Stack', component: Stack, label: 'Layers' },
  { name: 'Lightning', component: Lightning, label: 'Trigger' },
  { name: 'ShieldCheck', component: ShieldCheck, label: 'Rules' },
  { name: 'Gear', component: Gear, label: 'System' },
  { name: 'Database', component: Database, label: 'Dataset' },
  { name: 'PlugsConnected', component: PlugsConnected, label: 'Pipeline' },
  { name: 'Code', component: Code, label: 'Program' },
];

const iconMap: Record<string, React.ComponentType<any>> = {
  TreeStructure,
  GitFork,
  Cpu,
  Graph,
  FlowArrow,
  Stack,
  Lightning,
  ShieldCheck,
  Gear,
  Database,
  PlugsConnected,
  Code
};

interface TopBarProps {
  title: string;
  description: string;
  icon?: string;
  onTitleChange: (newTitle: string) => void;
  onDescriptionChange: (newDesc: string) => void;
  onIconChange?: (newIcon: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onOpenAIGenerate?: () => void;
  onOpenSettings?: () => void;
  onOpenImport?: () => void;
  onShare?: () => void;
}

export default function TopBar({
  title,
  description,
  icon = 'TreeStructure',
  onTitleChange,
  onDescriptionChange,
  onIconChange,
  darkMode,
  onToggleDarkMode,
  isFocusMode = false,
  onToggleFocusMode,
  onOpenAIGenerate,
  onOpenSettings,
  onOpenImport,
  onShare,
}: TopBarProps) {
  const { user, ready, loading, renderButton, signOut } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Manage the GIS button inside a permanently-mounted container so React never
  // has to unmount GIS-injected DOM (which leaves an orphaned iframe). Render it
  // when signed out, and clear it once signed in.
  useEffect(() => {
    const el = googleBtnRef.current;
    if (!el) return;
    if (user) {
      el.innerHTML = '';
    } else if (ready) {
      renderButton(el, darkMode ? 'filled_black' : 'outline');
    }
  }, [user, ready, darkMode, renderButton]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [localDesc, setLocalDesc] = useState(description);
  const descInputRef = useRef<HTMLInputElement>(null);

  const [isChangingIcon, setIsChangingIcon] = useState(false);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    setLocalDesc(description);
  }, [description]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDesc && descInputRef.current) {
      descInputRef.current.focus();
    }
  }, [isEditingDesc]);

  const submitTitle = () => {
    setIsEditingTitle(false);
    if (localTitle.trim() === '') {
      setLocalTitle(title);
    } else {
      onTitleChange(localTitle.trim());
    }
  };

  const submitDesc = () => {
    setIsEditingDesc(false);
    onDescriptionChange(localDesc.trim());
  };

  // Find the selected icon component or fallback to TreeStructure
  const SelectedIconComponent = iconMap[icon] || TreeStructure;

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80 px-6 backdrop-blur-md z-50 select-none">
      {/* Brand & Editable Metadata */}
      <div className="flex items-center gap-4 flex-1">
        {/* Editable Icon Container */}
        <div className="relative">
          <button
            onClick={() => onIconChange && setIsChangingIcon(!isChangingIcon)}
            disabled={!onIconChange}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 shadow-md transition-all duration-150 active:scale-95 cursor-pointer relative overflow-hidden group/icon"
            title="Click to change flow icon"
          >
            <SelectedIconComponent size={22} weight="bold" />
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
              EDIT
            </div>
          </button>

          {/* Icon Selection Dropdown */}
          {isChangingIcon && onIconChange && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsChangingIcon(false)}
              />
              <div className="absolute top-12 left-0 z-50 mt-1 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">
                  Choose Flow Icon
                </div>
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {AVAILABLE_ICONS.map((i) => {
                    const IconComp = i.component;
                    const isSelected = i.name === icon;
                    return (
                      <button
                        key={i.name}
                        onClick={() => {
                          onIconChange(i.name);
                          setIsChangingIcon(false);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border border-transparent transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-500/30 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                            : 'bg-zinc-50 border-zinc-100 text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:bg-zinc-950/50 dark:border-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                        }`}
                        title={i.label}
                      >
                        <IconComp size={18} weight={isSelected ? "bold" : "regular"} />
                        <span className="text-[8px] font-semibold tracking-wide truncate max-w-full mt-1.5">
                          {i.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="flex flex-col flex-1 max-w-xl">
          {/* Editable Title */}
          <div className="flex items-center gap-2 group min-h-[22px]">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={submitTitle}
                onKeyDown={(e) => e.key === 'Enter' && submitTitle()}
                className="text-sm font-bold text-zinc-900 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
              />
            ) : (
              <>
                <h1 
                  onClick={() => setIsEditingTitle(true)}
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-1 rounded select-none"
                  title="Click to edit flowchart title"
                >
                  {title || 'Untitled Flow'}
                </h1>
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all rounded"
                >
                  <Pencil size={12} />
                </button>
              </>
            )}
          </div>

          {/* Editable Description */}
          <div className="flex items-center gap-2 group min-h-[16px]">
            {isEditingDesc ? (
              <input
                ref={descInputRef}
                type="text"
                value={localDesc}
                placeholder="Add description..."
                onChange={(e) => setLocalDesc(e.target.value)}
                onBlur={submitDesc}
                onKeyDown={(e) => e.key === 'Enter' && submitDesc()}
                className="text-[11px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
              />
            ) : (
              <>
                <p 
                  onClick={() => setIsEditingDesc(true)}
                  className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-1 rounded truncate max-w-[45ch] select-none"
                  title="Click to edit flowchart description"
                >
                  {description || <span className="italic opacity-60">Add a quick process description...</span>}
                </p>
                <button 
                  onClick={() => setIsEditingDesc(true)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all rounded"
                >
                  <Pencil size={10} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Control Buttons (Google Login + Dark Mode Switch) */}
      <div className="flex items-center gap-3">
        {/* AI flow generation — styled to match the bar's other pill controls. */}
        {onOpenAIGenerate && (
          <button
            onClick={onOpenAIGenerate}
            className="group flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-2 text-xs font-semibold border border-zinc-200 bg-white text-zinc-700 hover:text-indigo-600 hover:bg-zinc-50 hover:border-indigo-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-indigo-400 dark:hover:bg-zinc-800/60 dark:hover:border-indigo-900/50 shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
            title="Generate a flowchart from a description with AI"
          >
            <Sparkle size={15} weight="fill" className="text-indigo-500 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Generate with AI</span>
            <span className="sm:hidden">AI</span>
          </button>
        )}

        {/* Import from Markdown / Mermaid */}
        {onOpenImport && (
          <button
            onClick={onOpenImport}
            className="group flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-2 text-xs font-semibold border border-zinc-200 bg-white text-zinc-700 hover:text-indigo-600 hover:bg-zinc-50 hover:border-indigo-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-indigo-400 dark:hover:bg-zinc-800/60 dark:hover:border-indigo-900/50 shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
            title="Import a flow from Markdown or Mermaid text/file"
          >
            <FileArrowDown size={15} weight="bold" className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
            <span className="hidden sm:inline">Import</span>
          </button>
        )}

        {/* Share the current flow as a public read-only link */}
        {onShare && (
          <button
            onClick={onShare}
            className="group flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-2 text-xs font-semibold border border-zinc-200 bg-white text-zinc-700 hover:text-indigo-600 hover:bg-zinc-50 hover:border-indigo-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-indigo-400 dark:hover:bg-zinc-800/60 dark:hover:border-indigo-900/50 shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
            title="Share this flow as a public, view-only link"
          >
            <ShareNetwork size={15} weight="bold" className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Separator */}
        <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800"></div>

        {/* Auth: signed-in user chip, or Google sign-in button.
            The GIS container is always mounted (toggled with `hidden`) so React
            never unmounts GIS-injected DOM. */}
        <div className="flex items-center gap-2">
          <div ref={googleBtnRef} className={user ? 'hidden' : ''} />

          {!user && !ready && (
            <div className="h-9 w-[150px] rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 animate-pulse" />
          )}

          {user && (
            <>
              <div
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 pl-1.5 pr-3 py-1.5 shadow-sm"
                title={user.email}
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                    {(user.name || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 max-w-[14ch] truncate">
                  {user.name || user.email}
                </span>
              </div>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="rounded-full p-2.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-500/10 dark:text-zinc-400 dark:hover:text-indigo-400 transition-all duration-150 active:scale-90 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm cursor-pointer"
                  title="API keys & settings"
                >
                  <Gear size={15} weight="bold" />
                </button>
              )}
              <button
                onClick={signOut}
                className="rounded-full p-2.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 dark:text-zinc-400 transition-all duration-150 active:scale-90 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm cursor-pointer"
                title="Sign out"
              >
                <SignOut size={15} weight="bold" />
              </button>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800"></div>

        {/* Focus Mode Toggle Button */}
        {onToggleFocusMode && (
          <button
            onClick={onToggleFocusMode}
            className={`rounded-full p-2.5 transition-all duration-150 active:scale-90 border shadow-sm cursor-pointer ${
              isFocusMode 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400'
                : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900'
            }`}
            title={isFocusMode ? 'Exit Focus Mode (F or Esc)' : 'Enter Focus/Full-Screen Canvas (F)'}
          >
            {isFocusMode ? <CornersIn size={15} weight="bold" /> : <CornersOut size={15} weight="bold" />}
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleDarkMode}
          className="rounded-full p-2.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-all duration-150 active:scale-90 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun size={15} weight="bold" /> : <Moon size={15} weight="bold" />}
        </button>
      </div>
    </header>
  );
}
