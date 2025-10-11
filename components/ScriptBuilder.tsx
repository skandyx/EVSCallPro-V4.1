

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { SavedScript, Page, ScriptBlock, BlockType } from '../types.ts';
import {
    PlusIcon, TrashIcon, EyeIcon, SettingsIcon, PaletteIcon, XMarkIcon, ArrowLeftIcon, ArrowRightIcon,
    TextBlockIcon, InputIcon, RadioIcon, CheckboxIcon, DropdownIcon, WebBrowserIcon, DateIcon,
    PhoneIcon, EmailIcon, TimeIcon, ButtonIcon, LabelIcon, GroupIcon, MinusIcon, ResetViewIcon,
    AlignLeftIcon, AlignCenterIcon, AlignRightIcon, TextareaIcon, UserJourneyIcon as HistoryIcon,
    ImageIcon, ArrowUpTrayIcon as UploadIcon
} from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

// Props definition
interface ScriptBuilderProps {
    script: SavedScript;
    onSave: (script: SavedScript) => void;
    onClose: () => void;
    onPreview: (script: SavedScript) => void;
}

const FONT_FAMILIES = ['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New'];

const sanitizeForTechnicalName = (name: string): string => {
  let technicalName = name.trim()
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^\p{L}\p{N}_]/gu, ''); // Keep only unicode letters, numbers, and underscore

  if (/^\d/.test(technicalName)) {
      technicalName = '_' + technicalName;
  }
  
  if (!technicalName) {
      return `field_${Date.now()}`;
  }
  return technicalName;
};

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`${enabled ? 'bg-primary' : 'bg-slate-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
        role="switch"
        aria-checked={enabled}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);

const ScriptBuilder: React.FC<ScriptBuilderProps> = ({ script, onSave, onClose, onPreview }) => {
    const { t } = useI18n();
    const [editedScript, setEditedScript] = useState<SavedScript>(() => JSON.parse(JSON.stringify(script)));
    const [activePageId, setActivePageId] = useState<string>(script.startPageId);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [propertiesTab, setPropertiesTab] = useState<'content' | 'style'>('content');
    const [tempBlockName, setTempBlockName] = useState('');
    // FIX: Added temporary state for text content to improve responsiveness of the properties panel textarea.
    const [tempContentText, setTempContentText] = useState('');
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragInfo = useRef<any>(null);
    const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, zoom: 1 });
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });

    const BLOCK_PALETTE = useMemo(() => [
        { type: 'group' as BlockType, icon: GroupIcon, label: t('scriptBuilder.palette.group'), default: { width: 400, height: 250, backgroundColor: 'rgba(226, 232, 240, 0.5)', content: {} } },
        // FIX: Added 'as const' to ensure TypeScript infers a literal type for 'textAlign', resolving a type error.
        { type: 'label' as BlockType, icon: LabelIcon, label: t('scriptBuilder.palette.label'), default: { width: 300, height: 40, content: { text: t('scriptBuilder.defaults.label') }, fontSize: 18, textAlign: 'left' as const } },
        // FIX: Added 'as const' to ensure TypeScript infers a literal type for 'textAlign', resolving a type error.
        { type: 'text' as BlockType, icon: TextBlockIcon, label: t('scriptBuilder.palette.text'), default: { width: 300, height: 80, content: { text: t('scriptBuilder.defaults.text') }, textAlign: 'left' as const } },
        { type: 'input' as BlockType, icon: InputIcon, label: t('scriptBuilder.palette.input'), default: { width: 300, height: 70, content: { placeholder: t('scriptBuilder.defaults.placeholder'), format: 'text' }, readOnly: false } },
        { type: 'textarea' as BlockType, icon: TextareaIcon, label: t('scriptBuilder.palette.textarea'), default: { width: 300, height: 120, content: { placeholder: t('scriptBuilder.defaults.placeholder') }, readOnly: false } },
        { type: 'email' as BlockType, icon: EmailIcon, label: t('scriptBuilder.palette.email'), default: { width: 300, height: 70, content: { placeholder: t('scriptBuilder.defaults.emailPlaceholder') }, readOnly: false } },
        { type: 'phone' as BlockType, icon: PhoneIcon, label: t('scriptBuilder.palette.phone'), default: { width: 300, height: 70, content: { placeholder: t('scriptBuilder.defaults.phonePlaceholder') }, readOnly: false } },
        { type: 'date' as BlockType, icon: DateIcon, label: t('scriptBuilder.palette.date'), default: { width: 200, height: 70, content: {}, readOnly: false } },
        { type: 'time' as BlockType, icon: TimeIcon, label: t('scriptBuilder.palette.time'), default: { width: 200, height: 70, content: {}, readOnly: false } },
        { type: 'radio' as BlockType, icon: RadioIcon, label: t('scriptBuilder.palette.radio'), default: { width: 300, height: 120, content: { question: t('scriptBuilder.defaults.question'), options: [t('scriptBuilder.defaults.radioOption1'), t('scriptBuilder.defaults.radioOption2')] }, readOnly: false } },
        { type: 'checkbox' as BlockType, icon: CheckboxIcon, label: t('scriptBuilder.palette.checkbox'), default: { width: 300, height: 120, content: { question: t('scriptBuilder.defaults.question'), options: [t('scriptBuilder.defaults.checkboxOptionA'), t('scriptBuilder.defaults.checkboxOptionB')] }, readOnly: false } },
        { type: 'dropdown' as BlockType, icon: DropdownIcon, label: t('scriptBuilder.palette.dropdown'), default: { width: 300, height: 70, content: { options: [t('scriptBuilder.defaults.dropdownValue1'), t('scriptBuilder.defaults.dropdownValue2')] }, readOnly: false } },
        // FIX: Added 'as const' to ensure TypeScript infers a literal type for 'textAlign', resolving a type error.
        { type: 'button' as BlockType, icon: ButtonIcon, label: t('scriptBuilder.palette.button'), default: { width: 200, height: 50, content: { text: t('scriptBuilder.defaults.buttonText'), action: { type: 'none' } }, backgroundColor: '#4f46e5', textColor: '#ffffff', textAlign: 'center' as const } },
        { type: 'history' as BlockType, icon: HistoryIcon, label: t('scriptBuilder.palette.history'), default: { width: 400, height: 200, content: {} } },
        { type: 'image' as BlockType, icon: ImageIcon, label: t('scriptBuilder.palette.image'), default: { width: 200, height: 150, content: { src: null } } },
    ], [t]);


    const activePage = editedScript.pages.find(p => p.id === activePageId);
    const selectedBlock = activePage?.blocks.find(b => b.id === selectedBlockId);

    useEffect(() => {
        if (selectedBlock) {
            setTempBlockName(selectedBlock.name);
            // FIX: Populate the temporary content state when a block is selected.
            if (selectedBlock.content && typeof selectedBlock.content.text === 'string') {
                setTempContentText(selectedBlock.content.text);
            } else {
                setTempContentText('');
            }
        }
    }, [selectedBlock]);

    const updateScript = (updater: (draft: SavedScript) => void) => {
        setEditedScript(prev => {
            const draft = JSON.parse(JSON.stringify(prev));
            updater(draft);
            return draft;
        });
    };
    
    const handleBlockUpdate = (blockId: string, updates: Partial<ScriptBlock>) => {
        updateScript(draft => {
            const page = draft.pages.find(p => p.id === activePageId);
            if (page) {
                const blockIndex = page.blocks.findIndex(b => b.id === blockId);
                if (blockIndex > -1) {
                    page.blocks[blockIndex] = { ...page.blocks[blockIndex], ...updates };
                }
            }
        });
    };

    const handleBlockContentUpdate = (blockId: string, contentUpdates: any) => {
        updateScript(draft => {
            const page = draft.pages.find(p => p.id === activePageId);
            if(page) {
                const block = page.blocks.find(b => b.id === blockId);
                if(block) {
                    block.content = {...block.content, ...contentUpdates};
                }
            }
        });
    }

    const handleDeleteBlock = (blockId: string) => {
        updateScript(draft => {
            const page = draft.pages.find(p => p.id === activePageId);
            if (!page) return;

            const blockToDelete = page.blocks.find(b => b.id === blockId);
            if (!blockToDelete || blockToDelete.isStandard) return; // Cannot delete standard blocks

            if (blockToDelete.type === 'group') {
                 page.blocks.forEach(block => {
                    if (block.parentId === blockId) {
                        block.parentId = null;
                    }
                });
            }
            
            page.blocks = page.blocks.filter(b => b.id !== blockId);
        });
        setSelectedBlockId(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('blockType') as BlockType;
        const canvasBounds = canvasRef.current?.getBoundingClientRect();
        if (!type || !canvasBounds || !activePage) return;

        const paletteItem = BLOCK_PALETTE.find(item => item.type === type);
        if (!paletteItem) return;

        const x = (e.clientX - canvasBounds.left - viewTransform.x) / viewTransform.zoom;
        const y = (e.clientY - canvasBounds.top - viewTransform.y) / viewTransform.zoom;

        let parentId: string | null = null;
        for (const block of activePage.blocks) {
            if (block.type === 'group' && x > block.x && x < block.x + block.width && y > block.y && y < block.y + block.height) {
                parentId = block.id;
                break;
            }
        }
        
        const parent = parentId ? activePage.blocks.find(b => b.id === parentId) : null;
        
        const baseName = paletteItem.label;
        const existingNames = new Set(activePage.blocks.map(b => b.name));
        let counter = 1;
        let uniqueName = baseName;
        if(existingNames.has(uniqueName)) {
             uniqueName = `${baseName} ${counter}`;
             while (existingNames.has(uniqueName)) {
                counter++;
                uniqueName = `${baseName} ${counter}`;
            }
        }

        const uniqueFieldName = sanitizeForTechnicalName(uniqueName);

        const newBlock: ScriptBlock = {
            id: `block-${Date.now()}`,
            name: uniqueName,
            fieldName: uniqueFieldName,
            type,
            x: parent ? x - parent.x : x,
            y: parent ? y - parent.y : y,
            width: paletteItem.default.width || 200,
            height: paletteItem.default.height || 50,
            content: JSON.parse(JSON.stringify(paletteItem.default.content || {})),
            displayCondition: null,
            parentId,
            ...paletteItem.default
        };

        updateScript(draft => {
            draft.pages.find(p => p.id === activePageId)?.blocks.push(newBlock);
        });
    };
    
    const handleMouseDownOnBlock = (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        setSelectedBlockId(blockId);
        setPropertiesTab('content');
        const block = activePage?.blocks.find(b => b.id === blockId);
        if (!block || isPanning.current) return;

        dragInfo.current = {
            type: 'move',
            blockId,
            startX: e.clientX,
            startY: e.clientY,
            startBlockX: block.x,
            startBlockY: block.y,
        };
    };

    const handleMouseDownOnResizeHandle = (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        const block = activePage?.blocks.find(b => b.id === blockId);
        if (!block) return;
        dragInfo.current = {
            type: 'resize',
            blockId,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: block.width,
            startHeight: block.height,
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isPanning.current) {
            const x = e.clientX - panStart.current.x;
            const y = e.clientY - panStart.current.y;
            setViewTransform(v => ({...v, x, y}));
            return;
        }

        if (!dragInfo.current) return;
        const { type, blockId, startX, startY } = dragInfo.current;
        const dx = (e.clientX - startX) / viewTransform.zoom;
        const dy = (e.clientY - startY) / viewTransform.zoom;

        if (type === 'move') {
            const { startBlockX, startBlockY } = dragInfo.current;
             updateScript(draft => {
                 const page = draft.pages.find(p => p.id === activePageId);
                 if (page) {
                    const mainBlock = page.blocks.find(b => b.id === blockId);
                    if (mainBlock) {
                        mainBlock.x = startBlockX + dx;
                        mainBlock.y = startBlockY + dy;
                    }
                 }
            });
        } else if (type === 'resize') {
            const { startWidth, startHeight } = dragInfo.current;
            const newWidth = Math.max(50, startWidth + dx);
            const newHeight = Math.max(40, startHeight + dy);
            handleBlockUpdate(blockId, { width: newWidth, height: newHeight });
        }
    }, [activePageId, viewTransform.zoom]);

    const handleMouseUp = useCallback(() => {
        isPanning.current = false;
        if(canvasRef.current) canvasRef.current.style.cursor = 'grab';
        dragInfo.current = null;
    }, []);
    
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.target !== e.currentTarget) return;
        setSelectedBlockId(null);
        isPanning.current = true;
        panStart.current = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    };
    
    useEffect(() => {
        const currentCanvas = canvasRef.current;
        const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e);
        const mouseUpHandler = () => handleMouseUp();
        
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
        
        return () => {
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(viewTransform.zoom + scaleAmount, 0.2), 3);
        const canvasBounds = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - canvasBounds.left;
        const mouseY = e.clientY - canvasBounds.top;
        const newX = mouseX - (mouseX - viewTransform.x) * (newZoom / viewTransform.zoom);
        const newY = mouseY - (mouseY - viewTransform.y) * (newZoom / viewTransform.zoom);
        setViewTransform({ x: newX, y: newY, zoom: newZoom });
    };

    const handleAddPage = () => {
        const newPageId = `page-${Date.now()}`;
        const newPageName = `Page ${editedScript.pages.length + 1}`;
        const newPage: Page = { id: newPageId, name: newPageName, blocks: [] };
        updateScript(draft => {
            draft.pages.push(newPage);
        });
        setActivePageId(newPageId);
    };

    const handleDeletePage = (pageId: string) => {
        if (editedScript.pages.length <= 1) {
            alert(t('scriptBuilder.cannotDeleteLastPage'));
            return;
        }
        if (pageId === editedScript.startPageId) {
            alert(t('scriptBuilder.cannotDeleteStartPage'));
            return;
        }
        if (window.confirm(t('scriptBuilder.confirmDeletePage'))) {
            updateScript(draft => {
                const pageIndex = draft.pages.findIndex(p => p.id === pageId);
                if (pageIndex > -1) {
                    draft.pages.splice(pageIndex, 1);
                    const newActivePageIndex = Math.max(0, pageIndex - 1);
                    setActivePageId(draft.pages[newActivePageIndex].id);
                }
            });
        }
    };

    const activePageIndex = editedScript.pages.findIndex(p => p.id === activePageId);

    const goToPrevPage = () => {
        if (activePageIndex > 0) {
            setActivePageId(editedScript.pages[activePageIndex - 1].id);
        }
    };
    
    const goToNextPage = () => {
        if (activePageIndex < editedScript.pages.length - 1) {
            setActivePageId(editedScript.pages[activePageIndex + 1].id);
        }
    };


    const handleAddOption = (blockId: string) => {
        updateScript(draft => {
            const page = draft.pages.find(p => p.id === activePageId);
            if (page) {
                const block = page.blocks.find(b => b.id === blockId);
                if (block && Array.isArray(block.content.options)) {
                    block.content.options.push(t('scriptBuilder.properties.newOption'));
                }
            }
        });
    };
    
    const handleOptionChange = (blockId: string, index: number, value: string) => {
        updateScript(draft => {
            const page = draft.pages.find(p => p.id === activePageId);
            if (page) {
                const block = page.blocks.find(b => b.id === blockId);
                if (block && Array.isArray(block.content.options) && block.content.options[index] !== undefined) {
                    block.content.options[index] = value;
                }
            }
        });
    };
    
    const handleDeleteOption = (blockId: string, index: number) => {
        updateScript(draft => {
            const page = draft.pages.find(p => p.id === activePageId);
            if (page) {
                const block = page.blocks.find(b => b.id === blockId);
                if (block && Array.isArray(block.content.options)) {
                    block.content.options.splice(index, 1);
                }
            }
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedBlockId) return;

        if (!file.type.startsWith('image/')) {
            alert(t('scriptBuilder.image.invalidType'));
            return;
        }
        if (file.size > 1 * 1024 * 1024) { // 1MB limit
            alert(t('scriptBuilder.image.tooLarge'));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            handleBlockContentUpdate(selectedBlockId, { src: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    if (!activePage) return <div>{t('scriptBuilder.pageNotFound')}</div>;

    const renderPropertiesPanel = () => {
        if (selectedBlock) {
             const handleNameChangeValidation = (newName: string) => {
                const trimmedName = newName.trim();
                if (!trimmedName) {
                    setTempBlockName(selectedBlock.name);
                    return;
                }
                
                if (selectedBlock.isStandard) {
                    handleBlockUpdate(selectedBlock.id, { name: trimmedName });
                    return;
                }

                const isNameTaken = activePage.blocks.some(b => b.id !== selectedBlock.id && b.name === trimmedName);
                if (isNameTaken) {
                    alert(t('scriptBuilder.nameAlreadyExists', { name: trimmedName }));
                    setTempBlockName(selectedBlock.name);
                    return;
                }
                
                const newFieldName = sanitizeForTechnicalName(trimmedName);
                const isFieldNameTaken = activePage.blocks.some(b => b.id !== selectedBlock.id && b.fieldName === newFieldName);
                if (isFieldNameTaken) {
                    alert(t('scriptBuilder.technicalNameAlreadyExists', { fieldName: newFieldName }));
                    setTempBlockName(selectedBlock.name);
                } else {
                    handleBlockUpdate(selectedBlock.id, { name: trimmedName, fieldName: newFieldName });
                }
            };
            const isInputType = ['input', 'email', 'phone', 'date', 'time', 'radio', 'checkbox', 'dropdown', 'textarea'].includes(selectedBlock.type);

             return (
                <div className="flex flex-col h-full">
                     <div>
                        <label className="font-medium text-xs text-slate-500">{t('scriptBuilder.properties.blockNameLabel')}</label>
                        <input
                            type="text"
                            value={tempBlockName}
                            onChange={e => setTempBlockName(e.target.value)}
                            onBlur={e => handleNameChangeValidation(e.target.value)}
                            className="w-full mt-1 p-1 border rounded-md font-bold text-lg text-slate-800 focus:ring-2 focus:ring-indigo-300"
                        />
                         <p className="text-xs text-slate-400 mt-1">{t('scriptBuilder.properties.technicalName')} <span className="font-mono bg-slate-100 p-0.5 rounded">{selectedBlock.fieldName}</span></p>
                    </div>

                    <div className="border-b border-slate-200 mt-3">
                        <nav className="-mb-px flex space-x-4">
                            <button onClick={() => setPropertiesTab('content')} className={`py-2 px-1 border-b-2 font-medium text-sm ${propertiesTab === 'content' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t('scriptBuilder.properties.tabs.content')}</button>
                            <button onClick={() => setPropertiesTab('style')} className={`py-2 px-1 border-b-2 font-medium text-sm ${propertiesTab === 'style' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t('scriptBuilder.properties.tabs.style')}</button>
                        </nav>
                    </div>
                    <div className="py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                        {propertiesTab === 'content' && (
                           <div className="space-y-4">
                            { selectedBlock.type === 'image' && (
                                <div className="space-y-2">
                                    <label className="font-medium">{t('scriptBuilder.image.upload')}</label>
                                    <input type="file" accept="image/png, image/jpeg, image/gif, image/svg+xml" onChange={handleImageUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                                    {selectedBlock.content.src && <img src={selectedBlock.content.src} alt="Aperçu" className="mt-2 rounded border max-w-full h-auto" />}
                                </div>
                           )}
                           { selectedBlock.isStandard && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border">
                                    <div>
                                        <label className="font-medium">{t('scriptBuilder.properties.showField')}</label>
                                        <p className="text-xs text-slate-400">{t('scriptBuilder.properties.showFieldHelp')}</p>
                                    </div>
                                    <ToggleSwitch 
                                        enabled={selectedBlock.isVisible !== false} 
                                        onChange={isEnabled => handleBlockUpdate(selectedBlock.id, { isVisible: isEnabled })}
                                    />
                                </div>
                           )}
                           {/* FIX: The textarea for editing block content now uses a temporary state ('tempContentText') and updates on blur. This prevents the input from feeling "locked" or unresponsive due to re-renders on every keystroke. */}
                           { (selectedBlock.type === 'label' || selectedBlock.type === 'text') && <textarea value={tempContentText} onChange={(e) => setTempContentText(e.target.value)} onBlur={(e) => handleBlockContentUpdate(selectedBlockId!, { text: e.target.value })} className="w-full p-2 border rounded-md" rows={4}/> }
                           { (selectedBlock.type === 'input' || selectedBlock.type === 'email' || selectedBlock.type === 'phone' || selectedBlock.type === 'textarea') && <div className="space-y-4"><div><label className="font-medium">{t('scriptBuilder.properties.placeholder')}</label><input type="text" value={selectedBlock.content.placeholder} onChange={e=>handleBlockContentUpdate(selectedBlockId!, {placeholder: e.target.value})} className="w-full mt-1 p-2 border rounded-md"/></div> {selectedBlock.type === 'input' && <div><label className="font-medium">{t('scriptBuilder.properties.format')}</label><select value={selectedBlock.content.format} onChange={e => handleBlockContentUpdate(selectedBlockId!, { format: e.target.value })} className="w-full mt-1 p-2 border rounded-md bg-white"><option value="text">{t('scriptBuilder.properties.formats.text')}</option><option value="number">{t('scriptBuilder.properties.formats.number')}</option><option value="password">{t('scriptBuilder.properties.formats.password')}</option></select></div>}</div>}
                           { (selectedBlock.type === 'button') && <><div><label className="font-medium">{t('scriptBuilder.properties.buttonText')}</label><input type="text" value={selectedBlock.content.text} onChange={e=>handleBlockContentUpdate(selectedBlockId!, {text: e.target.value})} className="w-full mt-1 p-2 border rounded-md"/></div></> }
                           { (selectedBlock.type === 'radio' || selectedBlock.type === 'checkbox') && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="font-medium">{t('scriptBuilder.properties.question')}</label>
                                        <input 
                                            type="text" 
                                            value={selectedBlock.content.question} 
                                            onChange={e => handleBlockContentUpdate(selectedBlockId!, { question: e.target.value })}
                                            className="w-full mt-1 p-2 border rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-medium block">{t('scriptBuilder.properties.options')}</label>
                                        <div className="space-y-2 mt-1">
                                            {(selectedBlock.content.options || []).map((option: string, index: number) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={e => handleOptionChange(selectedBlockId!, index, e.target.value)}
                                                        className="w-full p-2 border rounded-md text-sm"
                                                    />
                                                    <button onClick={() => handleDeleteOption(selectedBlockId!, index)} className="p-1 text-slate-400 hover:text-red-600">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => handleAddOption(selectedBlockId!)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2 inline-flex items-center gap-1">
                                            <PlusIcon className="w-4 h-4" /> {t('scriptBuilder.properties.addOption')}
                                        </button>
                                    </div>
                                </div>
                            )}
                            { selectedBlock.type === 'dropdown' && (
                                <div>
                                    <label className="font-medium block">{t('scriptBuilder.properties.options')}</label>
                                    <div className="space-y-2 mt-1">
                                        {(selectedBlock.content.options || []).map((option: string, index: number) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input type="text" value={option} onChange={e => handleOptionChange(selectedBlockId!, index, e.target.value)} className="w-full p-2 border rounded-md text-sm"/>
                                                <button onClick={() => handleDeleteOption(selectedBlockId!, index)} className="p-1 text-slate-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => handleAddOption(selectedBlockId!)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2 inline-flex items-center gap-1">
                                        <PlusIcon className="w-4 h-4" /> {t('scriptBuilder.properties.addOption')}
                                    </button>
                                </div>
                            )}
                            { selectedBlock.type === 'history' && <p className="text-slate-500 italic text-center p-4">{t('scriptBuilder.properties.historyHelp')}</p>}
                           { selectedBlock.type === 'group' && (
                                <div>
                                    <h4 className="font-medium text-slate-700 mb-2">{t('scriptBuilder.properties.blocksInGroup')}</h4>
                                    {(() => {
                                        const childBlocks = activePage.blocks.filter(b => b.parentId === selectedBlock.id);
                                        if (childBlocks.length > 0) {
                                            return (
                                                <ul className="space-y-2 border-t pt-2 mt-2">
                                                    {childBlocks.map(child => (
                                                        <li key={child.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-md hover:bg-slate-100">
                                                            <span className="text-slate-800 truncate text-xs">{child.name}</span>
                                                            <button onClick={() => handleDeleteBlock(child.id)} className="text-slate-400 hover:text-red-600 p-1" title={t('scriptBuilder.properties.deleteBlockTooltip', { name: child.name })}>
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            );
                                        } else {
                                            return <p className="text-slate-500 italic text-center text-xs py-4">{t('scriptBuilder.properties.dragBlocksHere')}</p>;
                                        }
                                    })()}
                                </div>
                           )}
                           {isInputType && (
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div>
                                        <label className="font-medium">{t('scriptBuilder.properties.readOnly')}</label>
                                        <p className="text-xs text-slate-400">{t('scriptBuilder.properties.readOnlyHelp')}</p>
                                    </div>
                                    <ToggleSwitch 
                                        enabled={!!selectedBlock.readOnly} 
                                        onChange={isEnabled => handleBlockUpdate(selectedBlock.id, { readOnly: isEnabled })}
                                    />
                                </div>
                            )}
                           </div>
                        )}
                        {propertiesTab === 'style' && (
                             <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="font-medium">{t('scriptBuilder.properties.width')}</label>
                                        <input type="number" value={Math.round(selectedBlock.width)} onChange={e => handleBlockUpdate(selectedBlockId!, { width: parseInt(e.target.value) })} className="w-full mt-1 p-2 border rounded-md"/>
                                    </div>
                                    <div>
                                        <label className="font-medium">{t('scriptBuilder.properties.height')}</label>
                                        <input type="number" value={Math.round(selectedBlock.height)} onChange={e => handleBlockUpdate(selectedBlockId!, { height: parseInt(e.target.value) })} className="w-full mt-1 p-2 border rounded-md"/>
                                    </div>
                                </div>
                                {['label', 'text', 'button', 'input', 'email', 'phone', 'textarea'].includes(selectedBlock.type) &&
                                <>
                                <div><label className="font-medium">{t('scriptBuilder.properties.font')}</label><select value={selectedBlock.fontFamily || 'Arial'} onChange={e => handleBlockUpdate(selectedBlockId!, { fontFamily: e.target.value })} className="w-full mt-1 p-2 border rounded-md bg-white">{FONT_FAMILIES.map(f => <option key={f}>{f}</option>)}</select></div>
                                <div>
                                    <label className="font-medium">{t('scriptBuilder.properties.size')}</label>
                                    <input type="number" value={selectedBlock.fontSize || 14} onChange={e => handleBlockUpdate(selectedBlockId!, { fontSize: parseInt(e.target.value) })} className="w-full mt-1 p-2 border rounded-md"/>
                                </div>
                                <div>
                                <label className="font-medium block mb-1">{t('scriptBuilder.properties.alignment')}</label>
                                <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">{['left', 'center', 'right'].map(align => <button key={align} onClick={() => handleBlockUpdate(selectedBlockId!, { textAlign: align as any })} className={`p-1.5 rounded w-full flex justify-center ${selectedBlock.textAlign === align ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}>{align === 'left' ? <AlignLeftIcon className="w-5 h-5"/> : align === 'center' ? <AlignCenterIcon className="w-5 h-5"/> : <AlignRightIcon className="w-5 h-5"/>}</button>)}</div>
                                </div>
                                </>
                                }
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="font-medium">{t('scriptBuilder.properties.background')}</label><input type="color" value={selectedBlock.backgroundColor || (selectedBlock.type === 'group' ? 'transparent' : '#ffffff')} onChange={e => handleBlockUpdate(selectedBlockId!, { backgroundColor: e.target.value })} className="w-full h-8 p-1 mt-1 border rounded" /></div>
                                    <div><label className="font-medium">{t('scriptBuilder.properties.text')}</label><input type="color" value={selectedBlock.textColor || '#000000'} onChange={e => handleBlockUpdate(selectedBlockId!, { textColor: e.target.value })} className="w-full h-8 p-1 mt-1 border rounded" /></div>
                                </div>
                                {selectedBlock.type === 'button' && (
                                    <div className="pt-4 border-t">
                                        <h4 className="font-medium text-slate-700 mb-2">{t('scriptBuilder.properties.buttonAction')}</h4>
                                        <div>
                                            <label className="font-medium">{t('scriptBuilder.properties.action')}</label>
                                            <select 
                                                value={selectedBlock.content.action.type} 
                                                onChange={e => handleBlockContentUpdate(selectedBlockId!, { action: { ...selectedBlock.content.action, type: e.target.value } })} 
                                                className="w-full mt-1 p-2 border rounded-md bg-white"
                                            >
                                                <option value="none">{t('scriptBuilder.actions.none')}</option>
                                                <option value="next">{t('scriptBuilder.actions.next')}</option>
                                                <option value="previous">{t('scriptBuilder.actions.previous')}</option>
                                                <option value="navigate">{t('scriptBuilder.actions.navigate')}</option>
                                                <option value="save">{t('scriptBuilder.actions.save')}</option>
                                                <option value="insert_contact">{t('scriptBuilder.actions.insertContact')}</option>
                                            </select>
                                        </div>

                                        {selectedBlock.content.action.type === 'navigate' && (
                                            <div className="mt-2">
                                                <label className="font-medium">{t('scriptBuilder.properties.destinationPage')}</label>
                                                <select 
                                                    value={selectedBlock.content.action.pageId || ''}
                                                    onChange={e => handleBlockContentUpdate(selectedBlockId!, { action: { ...selectedBlock.content.action, pageId: e.target.value } })}
                                                    className="w-full mt-1 p-2 border rounded-md bg-white"
                                                >
                                                    <option value="">{t('scriptBuilder.properties.selectPage')}</option>
                                                    {editedScript.pages.filter(p => p.id !== activePageId).map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                             </div>
                        )}
                    </div>
                    {!selectedBlock.isStandard &&
                        <div className="mt-auto pt-4 border-t border-slate-200">
                            <button onClick={() => handleDeleteBlock(selectedBlock.id)} className="w-full flex items-center justify-center gap-2 text-sm text-red-600 font-semibold bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors">
                                <TrashIcon className="w-4 h-4" />
                                {t('scriptBuilder.properties.deleteBlockButton', { name: selectedBlock.name })}
                            </button>
                        </div>
                    }
                </div>
            )
        }
        return ( /* Page properties... */ <div></div> )
    };

    const renderBlockOnCanvas = (block: ScriptBlock) => {
        const isSelected = selectedBlockId === block.id;
        const parent = block.parentId ? activePage.blocks.find(b => b.id === block.parentId) : null;
        const absoluteX = parent ? parent.x + block.x : block.x;
        const absoluteY = parent ? parent.y + block.y : block.y;
        
        const isGroup = block.type === 'group';

        const style: React.CSSProperties = {
            position: 'absolute', left: absoluteX, top: absoluteY, width: block.width, height: block.height,
            backgroundColor: block.backgroundColor, 
            color: block.textColor, fontFamily: block.fontFamily,
            fontSize: block.fontSize ? `${block.fontSize}px` : undefined, textAlign: block.textAlign
        };
        
        const borderClasses = isSelected 
            ? 'ring-2 ring-offset-2 ring-indigo-500' 
            : isGroup 
            ? 'border-2 border-dashed border-slate-400' 
            : 'shadow-md border border-slate-300';
            
        const bgClass = isGroup ? '' : 'bg-white';
        const baseClasses = `p-3 rounded-md cursor-move flex flex-col`;

        const renderContent = () => {
             switch(block.type) {
                case 'group': return null;
                // FIX: Removed hardcoded `text-lg` class to ensure the font size is controlled by the style properties, making the editor WYSIWYG.
                case 'label': return <div className="h-full flex flex-col justify-center"><p className="font-bold whitespace-pre-wrap break-words">{block.content.text}</p></div>;
                case 'text': return <div className="h-full flex flex-col justify-center"><p className="whitespace-pre-wrap break-words">{block.content.text}</p></div>;
                case 'input': case 'email': case 'phone': return <div><label className="block font-semibold mb-1">{block.name}</label><input type="text" placeholder={block.content.placeholder} disabled className="w-full p-2 border rounded-md bg-slate-100"/></div>
                case 'textarea': return <div className="h-full flex flex-col"><label className="block font-semibold mb-1 flex-shrink-0">{block.name}</label><textarea placeholder={block.content.placeholder} disabled className="w-full p-2 border rounded-md bg-slate-100 flex-1 resize-none"/></div>
                case 'history': return <div className="h-full flex flex-col"><label className="block font-semibold text-xs border-b pb-1">{t('scriptBuilder.palette.history')}</label><div className="text-xs text-slate-400 italic flex-1 flex items-center justify-center">{t('scriptBuilder.canvas.historyPreview')}</div></div>
                case 'date': case 'time': return <div><label className="block font-semibold mb-1">{block.name}</label><input type={block.type} disabled className="w-full p-2 border rounded-md bg-slate-100"/></div>
                case 'dropdown': return <div><label className="block font-semibold mb-1">{block.name}</label><select disabled className="w-full p-2 border rounded-md bg-slate-100"><option>{block.content.options[0] || 'Option'}</option></select></div>
                case 'radio': return <div><p className="font-semibold mb-2">{block.content.question}</p><div className="space-y-1">{(block.content.options || []).slice(0, 2).map((opt: string) => (<div key={opt} className="flex items-center"><input type="radio" disabled className="mr-2"/><label className="truncate">{opt}</label></div>))}</div></div>
                case 'checkbox': return <div><p className="font-semibold mb-2">{block.content.question}</p><div className="space-y-1">{(block.content.options || []).slice(0, 2).map((opt: string) => (<div key={opt} className="flex items-center"><input type="checkbox" disabled className="mr-2"/><label className="truncate">{opt}</label></div>))}</div></div>
                case 'button': return <div className="h-full flex flex-col justify-center"><button disabled className="w-full p-2 border rounded-md font-semibold" style={{backgroundColor: block.backgroundColor, color: block.textColor}}>{block.content.text}</button></div>
                case 'image': 
                    return block.content.src 
                        ? <img src={block.content.src} alt={block.name} className="w-full h-full object-contain" />
                        : <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 text-slate-400"><ImageIcon className="w-8 h-8" /><span className="text-xs mt-1">Image</span></div>;
                default: return <div className="h-full flex flex-col justify-center"><span className="p-1 text-xs text-center truncate pointer-events-none">{block.content?.label || block.content?.text || block.content?.question || block.type}</span></div>;
             }
        }
        
        return (
            <div
                key={block.id} style={style}
                className={`${baseClasses} ${bgClass} ${borderClasses}`}
                onMouseDown={(e) => handleMouseDownOnBlock(e, block.id)}
            >
                {renderContent()}
                 {isSelected && (
                    <>
                        <div
                            onMouseDown={(e) => handleMouseDownOnResizeHandle(e, block.id)}
                            className="absolute -right-1 -bottom-1 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full cursor-nwse-resize"
                        />
                        {!block.isStandard &&
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"
                                title={t('scriptBuilder.canvas.deleteBlock')}
                            >
                                <TrashIcon className="w-3 h-3" />
                            </button>
                        }
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-200">
            <header className="flex-shrink-0 bg-white shadow-md p-3 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <input type="text" value={editedScript.name} onChange={e => updateScript(d => { d.name = e.target.value; })} className="text-xl font-bold p-1 border-b-2 border-transparent focus:border-indigo-500 outline-none"/>
                    <div className="flex items-center gap-2">
                        <label htmlFor="script-bg-color" className="text-sm font-medium text-slate-600">{t('scriptBuilder.background')}</label>
                        <input
                            id="script-bg-color"
                            type="color"
                            value={editedScript.backgroundColor}
                            onChange={e => updateScript(d => { d.backgroundColor = e.target.value; })}
                            className="w-8 h-8 p-0 border rounded-md bg-transparent cursor-pointer"
                            title={t('scriptBuilder.changeBackgroundColor')}
                        />
                    </div>
                </div>
                <div className="space-x-2">
                    <button onClick={() => onPreview(editedScript)} className="font-semibold py-2 px-4 rounded-lg inline-flex items-center bg-slate-200 hover:bg-slate-300"><EyeIcon className="w-5 h-5 mr-2" /> {t('scriptBuilder.preview')}</button>
                    <button onClick={onClose} className="font-semibold py-2 px-4 rounded-lg">{t('common.close')}</button>
                    <button onClick={() => onSave(editedScript)} className="font-bold py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">{t('common.save')}</button>
                </div>
            </header>
            <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                {/* Left Panel */}
                <aside className="col-span-2 bg-white p-3 border-r flex flex-col gap-4">
                    <h3 className="font-semibold">{t('scriptBuilder.elements')}</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {BLOCK_PALETTE.map(item => (
                            <div key={item.type} draggable onDragStart={e => e.dataTransfer.setData('blockType', item.type)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-md cursor-grab flex flex-col items-center text-center">
                                <item.icon className="w-6 h-6 mb-1 text-slate-600" />
                                <span className="text-xs">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </aside>
                {/* Center Canvas */}
                <div className="col-span-7 flex flex-col relative bg-slate-300">
                    <div 
                        className="flex-1 relative overflow-hidden cursor-grab"
                        ref={canvasRef}
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        onMouseDown={handleCanvasMouseDown}
                        onWheel={handleWheel}
                    >
                        <div className="absolute top-0 left-0" style={{ transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.zoom})`, transformOrigin: 'top left', backgroundColor: editedScript.backgroundColor, backgroundImage: `radial-gradient(#d1d5db 1px, transparent 0)`, backgroundSize: `16px 16px`, width: '4000px', height: '4000px' }}>
                             {activePage.blocks
                                .sort((a, b) => {
                                    if (a.type === 'group') return -1;
                                    if (b.type === 'group') return 1;
                                    return 0;
                                })
                                .map(renderBlockOnCanvas)}
                        </div>
                    </div>
                    {/* Page Tabs & Zoom controls */}
                    <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md flex items-center border divide-x">
                        <button onClick={goToPrevPage} className="p-2 hover:bg-slate-100 disabled:opacity-50" disabled={activePageIndex === 0}><ArrowLeftIcon className="w-5 h-5"/></button>
                        <span className="font-medium text-sm px-3">{t('scriptBuilder.page_of_pages', { currentPage: activePageIndex + 1, totalPages: editedScript.pages.length })}</span>
                        <button onClick={goToNextPage} className="p-2 hover:bg-slate-100 disabled:opacity-50" disabled={activePageIndex >= editedScript.pages.length - 1}><ArrowRightIcon className="w-5 h-5"/></button>
                        <button onClick={handleAddPage} className="p-2 hover:bg-slate-100"><PlusIcon className="w-5 h-5"/></button>
                        <button onClick={() => handleDeletePage(activePageId)} className="p-2 hover:bg-red-100 disabled:opacity-50 text-slate-600 hover:text-red-600" disabled={editedScript.pages.length <= 1 || editedScript.startPageId === activePageId}><TrashIcon className="w-5 h-5"/></button>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow-md flex items-center border">
                        <button onClick={() => setViewTransform(v => ({...v, zoom: v.zoom * 1.2}))} className="p-2 hover:bg-slate-100" title={t('scriptBuilder.zoomIn')}><PlusIcon className="w-5 h-5"/></button>
                        <span className="text-sm font-semibold p-2 w-16 text-center">{Math.round(viewTransform.zoom * 100)}%</span>
                        <button onClick={() => setViewTransform(v => ({...v, zoom: v.zoom / 1.2}))} className="p-2 hover:bg-slate-100 border-x" title={t('scriptBuilder.zoomOut')}><MinusIcon className="w-5 h-5"/></button>
                        <button onClick={() => setViewTransform({x:20, y:20, zoom:1})} className="p-2 hover:bg-slate-100" title={t('scriptBuilder.resetView')}><ResetViewIcon className="w-5 h-5"/></button>
                    </div>
                </div>

                {/* Right Properties Panel */}
                <aside className="col-span-3 bg-white p-4 border-l overflow-y-auto">
                    {renderPropertiesPanel()}
                </aside>
            </main>
        </div>
    );
};

export default ScriptBuilder;