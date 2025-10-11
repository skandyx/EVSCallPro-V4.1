import React, { useState, useEffect, useMemo } from 'react';
import type { SavedScript, ScriptBlock, DisplayCondition, Page, ButtonAction, Contact, ContactNote, User, Campaign } from '../types.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { ImageIcon } from './Icons.tsx';

interface AgentPreviewProps {
  script: SavedScript;
  onClose: () => void;
  embedded?: boolean;
  contact?: Contact | null;
  contactNotes?: ContactNote[];
  users?: User[];
  newNote?: string;
  setNewNote?: (note: string) => void;
  onSaveNote?: () => void;
  campaign?: Campaign | null;
  onInsertContact?: (campaignId: string, contactData: Record<string, any>, phoneNumber: string) => Promise<void>;
  onUpdateContact?: (contact: Contact) => Promise<void>;
  onClearContact?: () => void;
}

const checkCondition = (condition: DisplayCondition | null, values: Record<string, any>): boolean => {
    if (!condition || !condition.blockFieldName) return true;
    const targetValue = values[condition.blockFieldName];
    if (Array.isArray(targetValue)) {
        return targetValue.includes(condition.value);
    }
    return targetValue === condition.value;
};

const AgentPreview: React.FC<AgentPreviewProps> = ({ 
    script, onClose, embedded = false, contact = null, 
    contactNotes = [], users = [], newNote = '', setNewNote = () => {}, onSaveNote = () => {},
    campaign = null, onInsertContact = async () => {}, onUpdateContact = async () => {}, onClearContact = () => {}
}) => {
  const { t } = useI18n();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [currentPageId, setCurrentPageId] = useState<string>(script.startPageId);

  // Effect to correctly initialize form values when a new contact is presented.
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    if (contact) {
        // 1. Map standard fields from the Contact object to their corresponding snake_case fieldName
        initialValues['first_name'] = contact.firstName || '';
        initialValues['last_name'] = contact.lastName || '';
        initialValues['phone_number'] = contact.phoneNumber || '';
        initialValues['postal_code'] = contact.postalCode || '';
        
        // 2. Merge custom fields, which are already keyed by their fieldName
        if (contact.customFields) {
            for (const key in contact.customFields) {
                initialValues[key] = contact.customFields[key];
            }
        }
    }
    setFormValues(initialValues);
    setCurrentPageId(script.startPageId);
  }, [contact, script.startPageId]);


  const handleValueChange = (fieldName: string, value: any) => {
      setFormValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleCheckboxChange = (fieldName: string, option: string, checked: boolean) => {
    setFormValues(prev => {
        const existing: string[] = prev[fieldName] || [];
        if (checked) {
            return { ...prev, [fieldName]: [...existing, option] };
        } else {
            return { ...prev, [fieldName]: existing.filter(item => item !== option) };
        }
    });
  };
  
  const getSanitizedFormValues = () => {
    const data: Record<string, any> = {};
    const allBlocks = script.pages.flatMap(p => p.blocks);
    for (const fieldName in formValues) {
        if(allBlocks.some(b => b.fieldName === fieldName)) {
            data[fieldName] = formValues[fieldName];
        }
    }
    return data;
  }

  const handleButtonClick = async (action: ButtonAction) => {
    switch(action.type) {
        case 'save': {
            const dataToSave = getSanitizedFormValues();
            if (contact && onUpdateContact) {
                // This is an existing contact, so we update it.
                // We merge existing contact data with form data to create the updated object.
                const standardFieldMap: Record<string, keyof Contact> = {
                    first_name: 'firstName',
                    last_name: 'lastName',
                    phone_number: 'phoneNumber',
                    postal_code: 'postalCode',
                };
                const updatedContact: any = { ...contact, customFields: { ...contact.customFields } };
                for(const key in dataToSave) {
                    if (standardFieldMap[key]) {
                        updatedContact[standardFieldMap[key]] = dataToSave[key];
                    } else {
                        updatedContact.customFields[key] = dataToSave[key];
                    }
                }
                await onUpdateContact(updatedContact);
                alert(t('agentPreview.dataSaved'));

            } else if (onInsertContact && campaign) {
                // This is a new contact, we use the insert logic.
                const phoneBlock = script.pages.flatMap(p => p.blocks).find(b => b.fieldName === 'phone_number');
                const phoneNumber = phoneBlock ? dataToSave[phoneBlock.fieldName] : '';
                 if (!phoneNumber || !/^\d{10,}$/.test(phoneNumber.replace(/\s/g, ''))) {
                    alert(t('agentPreview.invalidPhone'));
                    return;
                }
                onInsertContact(campaign.id, dataToSave, phoneNumber)
                    .then(() => alert(t('agentPreview.contactInserted')))
                    .catch(err => alert(t('agentPreview.insertError', { message: err.message })));
            }
            break;
        }
        case 'insert_contact':
            if (onClearContact) onClearContact();
            break;
        case 'navigate':
            if (action.pageId) setCurrentPageId(action.pageId);
            break;
        case 'next': {
            const currentIndex = script.pages.findIndex(p => p.id === currentPageId);
            if (currentIndex < script.pages.length - 1) {
                setCurrentPageId(script.pages[currentIndex + 1].id);
            }
            break;
        }
        case 'previous': {
            const currentIndex = script.pages.findIndex(p => p.id === currentPageId);
            if (currentIndex > 0) {
                setCurrentPageId(script.pages[currentIndex - 1].id);
            }
            break;
        }
        default:
            break;
    }
  };

  const renderBlock = (block: ScriptBlock) => {
    const commonContainerProps = {
      style: {
        backgroundColor: block.backgroundColor,
        color: block.textColor,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize ? `${block.fontSize}px` : undefined,
        border: '1px solid #e2e8f0'
      },
      className: "p-3 rounded-md h-full flex flex-col justify-center"
    };

    const commonInputStyles = {
        backgroundColor: block.contentBackgroundColor,
        color: block.contentTextColor
    };
    
    // A contact is considered "existing" if it has a database ID.
    // A manually inserted contact gets its ID after the first save.
    const isExistingContact = contact && contact.id && !contact.id.startsWith('contact-import-');

    switch (block.type) {
        // FIX: Removed hardcoded `text-lg` class to respect the dynamic `fontSize` property for true WYSIWYG between editor and preview.
        case 'label':
            return <div {...commonContainerProps}><p className="font-bold whitespace-pre-wrap break-words">{block.content.text}</p></div>;
        case 'text':
            return <div {...commonContainerProps}><p className="whitespace-pre-wrap break-words">{block.content.text}</p></div>;
        case 'input':
            return (
                <div {...commonContainerProps}>
                    <label className="block font-semibold mb-1">{block.name}</label>
                    <input
                        type={block.content.format || 'text'}
                        placeholder={block.content.placeholder}
                        style={commonInputStyles}
                        className="w-full p-2 border rounded-md border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        value={formValues[block.fieldName] || ''}
                        onChange={e => handleValueChange(block.fieldName, e.target.value)}
                        disabled={block.readOnly}
                    />
                </div>
            );
        case 'textarea':
             const textareaContainerProps = {
                 ...commonContainerProps,
                 className: "p-3 rounded-md h-full flex flex-col" // No justify-center
             };
             return (
                <div {...textareaContainerProps}>
                    <label className="block font-semibold mb-1 flex-shrink-0">{block.name}</label>
                    <textarea
                        placeholder={block.content.placeholder}
                        style={commonInputStyles}
                        className="w-full p-2 border rounded-md border-slate-300 flex-1 resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                        value={formValues[block.fieldName] || ''}
                        onChange={e => handleValueChange(block.fieldName, e.target.value)}
                        disabled={block.readOnly}
                    />
                </div>
            );
         case 'history':
            const findAgentLogin = (agentId: string) => {
                const agent = users.find(u => u.id === agentId);
                return agent ? agent.loginId : 'Inconnu';
            };
            return (
                <div {...commonContainerProps}>
                    <h4 className="font-semibold mb-2 border-b pb-1 text-slate-700 flex-shrink-0">{t('agentPreview.notesHistory')}</h4>
                    <div className="space-y-3 overflow-y-auto text-xs flex-1 pr-1">
                        {contactNotes.length > 0 ? [...contactNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((note) => (
                             <div key={note.id} className="p-2 rounded bg-slate-50">
                                 <div className="flex justify-between items-baseline text-slate-500 mb-1">
                                     <span className="font-semibold">{findAgentLogin(note.agentId)}</span>
                                     <span>{new Date(note.createdAt).toLocaleString('fr-FR')}</span>
                                 </div>
                                 <p className="text-slate-800 whitespace-pre-wrap">{note.note}</p>
                             </div>
                        )) : <p className="text-center italic text-slate-400 pt-4">{t('agentPreview.noNotes')}</p>}
                    </div>
                    <div className="mt-2 pt-2 border-t flex-shrink-0">
                        <textarea
                            placeholder={t('agentPreview.addNotePlaceholder')}
                            className="w-full p-2 border rounded-md text-sm"
                            rows={3}
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                        />
                        <button onClick={onSaveNote} className="mt-2 w-full text-sm bg-indigo-100 text-indigo-700 font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-200 disabled:opacity-50" disabled={!newNote.trim()}>
                            {t('agentPreview.saveNote')}
                        </button>
                    </div>
                </div>
            );
        case 'radio':
            return (
                <div {...commonContainerProps}>
                    <p className="font-semibold mb-2">{block.content.question}</p>
                    <div className="space-y-1">
                        {block.content.options.map((opt: string) => (
                            <label key={opt} className={`flex items-center ${block.readOnly ? 'cursor-not-allowed text-slate-400' : ''}`}>
                                <input type="radio" name={block.fieldName} value={opt} checked={formValues[block.fieldName] === opt} onChange={e => handleValueChange(block.fieldName, e.target.value)} className="mr-2" disabled={block.readOnly} />
                                {opt}
                            </label>
                        ))}
                    </div>
                </div>
            );
        case 'checkbox':
            return (
                <div {...commonContainerProps}>
                    <p className="font-semibold mb-2">{block.content.question}</p>
                    <div className="space-y-1">
                        {block.content.options.map((opt: string) => (
                            <label key={opt} className={`flex items-center ${block.readOnly ? 'cursor-not-allowed text-slate-400' : ''}`}>
                                <input type="checkbox" name={`${block.fieldName}-${opt}`} value={opt} checked={Array.isArray(formValues[block.fieldName]) && formValues[block.fieldName].includes(opt)} onChange={e => handleCheckboxChange(block.fieldName, opt, e.target.checked)} className="mr-2" disabled={block.readOnly} />
                                {opt}
                            </label>
                        ))}
                    </div>
                </div>
            );
        case 'dropdown':
             return (
                <div {...commonContainerProps}>
                    <label className="block font-semibold mb-1">{block.name}</label>
                    <select
                        style={commonInputStyles}
                        className="w-full p-2 border rounded-md border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        value={formValues[block.fieldName] || ''}
                        onChange={e => handleValueChange(block.fieldName, e.target.value)}
                        disabled={block.readOnly}
                    >
                        <option value="">{t('agentPreview.selectOption')}</option>
                        {block.content.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
            );
        case 'date':
            return (
                <div {...commonContainerProps}>
                    <label className="block font-semibold mb-1">{block.name}</label>
                    <input
                        type="date"
                        style={commonInputStyles}
                        className="w-full p-2 border rounded-md border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        value={formValues[block.fieldName] || ''}
                        onChange={e => handleValueChange(block.fieldName, e.target.value)}
                        disabled={block.readOnly}
                    />
                </div>
            );
        case 'phone':
             return (
                <div {...commonContainerProps}>
                    <label className="block font-semibold mb-1">{block.name}</label>
                    <input
                        type="tel"
                        placeholder={block.content.placeholder}
                        style={commonInputStyles}
                        className="w-full p-2 border rounded-md border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        value={formValues[block.fieldName] || ''}
                        onChange={e => handleValueChange(block.fieldName, e.target.value)}
                        disabled={block.readOnly || (isExistingContact && block.fieldName === 'phone_number')}
                    />
                </div>
            );
        case 'web-view':
            return (
                <div {...commonContainerProps} className="p-0 rounded-md h-full flex flex-col overflow-hidden">
                    <iframe src={block.content.url} className="w-full h-full border-0" title={block.name}></iframe>
                </div>
            );
        case 'email':
            return (
                <div {...commonContainerProps}>
                    <label className="block font-semibold mb-1">{block.name}</label>
                    <input
                        type="email"
                        placeholder={block.content.placeholder}
                        style={commonInputStyles}
                        className="w-full p-2 border rounded-md border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        value={formValues[block.fieldName] || ''}
                        onChange={e => handleValueChange(block.fieldName, e.target.value)}
                        disabled={block.readOnly}
                    />
                </div>
            );
        case 'time':
            return (
                <div {...commonContainerProps}>
                    <label className="block font-semibold mb-1">{block.name}</label>
                    <input
                        type="time"
                        style={commonInputStyles}
                        className="w-full p-2 border rounded-md border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        value={formValues[block.fieldName] || ''}
                        onChange={e => handleValueChange(block.fieldName, e.target.value)}
                        disabled={block.readOnly}
                    />
                </div>
            );
        case 'button':
            return (
                <div {...commonContainerProps} className="p-2 rounded-md h-full flex flex-col justify-center">
                    <button
                        style={commonInputStyles}
                        className="w-full p-2 border rounded-md font-semibold hover:opacity-80 transition-opacity"
                        onClick={() => handleButtonClick(block.content.action)}
                    >
                        {block.content.text}
                    </button>
                </div>
            );
        case 'image':
            return (
                <div {...commonContainerProps} className="p-0 overflow-hidden">
                    {block.content.src
                        ? <img src={block.content.src} alt={block.name} className="w-full h-full object-contain" />
                        : <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 text-slate-400"><ImageIcon className="w-8 h-8" /><span className="text-xs mt-1">Image</span></div>
                    }
                </div>
            );
        default:
            return <div {...commonContainerProps}>{t('agentPreview.unsupportedBlock', { type: block.type })}</div>
    }
  }
  
  const currentPage = script.pages.find(p => p.id === currentPageId);

  const canvasHeight = useMemo(() => {
    if (!currentPage?.blocks || currentPage.blocks.length === 0) {
        return '400px'; // A default height
    }
    const lowestPoint = Math.max(
        0,
        ...currentPage.blocks
            .filter(block => block.isVisible !== false && checkCondition(block.displayCondition, formValues))
            .map(block => block.y + block.height)
    );
    return `${lowestPoint + 20}px`; // Add some padding
  }, [currentPage, formValues]);

  const ScriptCanvas = (
    <div 
      className="rounded-lg p-4 relative"
      style={{ 
        backgroundColor: script.backgroundColor,
        height: canvasHeight
      }}
    >
      {currentPage?.blocks
          .filter(block => block.type !== 'group' && block.isVisible !== false && checkCondition(block.displayCondition, formValues))
          .map(block => (
              <div key={block.id} style={{ position: 'absolute', left: block.x, top: block.y, width: block.width, height: block.height }}>
                  {renderBlock(block)}
              </div>
          ))
      }
    </div>
  );

  if (embedded) {
    // Embedded mode for AgentView
    return (
      <div className="h-full w-full flex flex-col">
        <header className="p-3 border-b border-slate-200 flex-shrink-0">
            <h2 className="text-base font-bold text-slate-800 truncate">{script.name}</h2>
            <p className="text-xs text-slate-500">{t('agentPreview.embedded.page')} {currentPage?.name}</p>
        </header>
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50">
          {ScriptCanvas}
        </div>
      </div>
    );
  }

  // Modal mode for ScriptBuilder preview
  return (
    <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{t('agentPreview.modal.title', { scriptName: script.name })}</h2>
            <p className="text-sm text-slate-500">{t('agentPreview.modal.currentPage', { pageName: currentPage?.name })}</p>
          </div>
          <button onClick={onClose} className="bg-slate-100 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-200">
            {t('agentPreview.modal.backToEditor')}
          </button>
        </header>

        <div className="flex-1 overflow-hidden p-4">
          {ScriptCanvas}
        </div>
      </div>
    </div>
  );
};

export default AgentPreview;