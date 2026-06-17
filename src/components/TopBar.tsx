import React, { useState, useEffect, useRef } from 'react';
import { 
  GoogleLogo, 
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
  Code
} from '@phosphor-icons/react';

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
  onSignInClick: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export default function TopBar({
  title,
  description,
  icon = 'TreeStructure',
  onTitleChange,
  onDescriptionChange,
  onIconChange,
  onSignInClick,
  darkMode,
  onToggleDarkMode,
  isFocusMode = false,
  onToggleFocusMode,
}: TopBarProps) {
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
        {/* Sign In with Google */}
        <button 
          onClick={onSignInClick}
          className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-all duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 shadow-sm cursor-pointer"
        >
          <GoogleLogo size={14} weight="bold" className="text-zinc-800 dark:text-zinc-100" />
          <span>Sign In with Google</span>
        </button>

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
