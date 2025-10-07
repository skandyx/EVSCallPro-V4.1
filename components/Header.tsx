import React, { useState, useEffect, useRef } from 'react';
import { WrenchScrewdriverIcon, ServerStackIcon, ComputerDesktopIcon, SunIcon, MoonIcon, ChevronDownIcon, BellAlertIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';
import { useStore } from '../src/store/useStore.ts';
import wsClient from '../src/services/wsClient.ts';

type Theme = 'light' | 'dark' | 'system';

interface Notification {
    id: number;
    agentId: string;
    agentName: string;
    agentLoginId: string;
    timestamp: string;
}

interface NotificationPopoverProps {
    notifications: Notification[];
    onClearAll: () => void;
    onRespond: (agentId: string, message: string, notificationId: number) => void;
}

const NotificationPopover: React.FC<NotificationPopoverProps> = ({ notifications, onClearAll, onRespond }) => {
    const { t } = useI18n();
    const [responseText, setResponseText] = useState('');
    const [targetNotificationId, setTargetNotificationId] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleRespondClick = (notificationId: number) => {
        setTargetNotificationId(notificationId);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleSendResponse = (e: React.FormEvent, notification: Notification) => {
        e.preventDefault();
        if (responseText.trim()) {
            onRespond(notification.agentId, responseText, notification.id);
            setResponseText('');
            setTargetNotificationId(null);
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-80 origin-top-right bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
            <div className="p-3 border-b dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('header.notifications.title')}</h3>
                {notifications.length > 0 && <button onClick={onClearAll} className="text-xs font-medium text-indigo-600 hover:underline">{t('header.notifications.markAllAsRead')}</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center p-8">{t('header.notifications.noNotifications')}</p>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} className="p-3 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                            <p className="text-sm text-slate-700 dark:text-slate-200">
                                {t('header.notifications.needsHelp', { agentName: notif.agentName, agentLoginId: notif.agentLoginId })}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                            {targetNotificationId === notif.id ? (
                                <form onSubmit={(e) => handleSendResponse(e, notif)} className="mt-2 flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={responseText}
                                        onChange={e => setResponseText(e.target.value)}
                                        placeholder={t('header.notifications.yourMessage')}
                                        className="w-full text-sm p-1.5 border rounded-md dark:bg-slate-900 dark:border-slate-600"
                                    />
                                    <button type="submit" className="text-sm bg-indigo-600 text-white px-3 rounded-md hover:bg-indigo-700">{t('header.notifications.send')}</button>
                                </form>
                            ) : (
                                <button onClick={() => handleRespondClick(notif.id)} className="mt-2 text-xs font-semibold text-indigo-600 hover:underline">{t('header.notifications.respond')}</button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


interface HeaderProps {
    activeView: 'app' | 'monitoring';
    onViewChange: (view: 'app' | 'monitoring') => void;
}

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return <div className="text-sm font-medium text-slate-500 dark:text-slate-400 font-mono">{time.toLocaleTimeString('fr-FR')}</div>;
};

const ThemeSwitcher: React.FC = () => {
    const { t } = useI18n();
    const theme = useStore(state => state.theme);
    const setTheme = useStore(state => state.setTheme);
    const options: { name: Theme; icon: React.FC<any>; titleKey: string }[] = [
        { name: 'system', icon: ComputerDesktopIcon, titleKey: 'header.theme.system' },
        { name: 'light', icon: SunIcon, titleKey: 'header.theme.light' },
        { name: 'dark', icon: MoonIcon, titleKey: 'header.theme.dark' },
    ];
    return <div className="flex items-center p-1 space-x-1 bg-slate-100 dark:bg-slate-700 rounded-full">{options.map(option => <button key={option.name} onClick={() => setTheme(option.name)} className={`p-1.5 rounded-full transition-colors ${theme === option.name ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`} title={t(option.titleKey)}><option.icon className="w-5 h-5" /></button>)}</div>;
};

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const languages = [ { code: 'fr', name: 'Français' }, { code: 'en', name: 'English' }, { code: 'ar', name: 'العربية' }];
    useEffect(() => {
        const close = () => setIsOpen(false);
        if (isOpen) window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [isOpen]);
    const getFlagSrc = (code: string) => code === 'fr' ? '/fr-flag.svg' : code === 'en' ? '/en-flag.svg' : '/sa-flag.svg';
    return <div className="relative"><button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="flex items-center p-1 space-x-2 bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"><span className="w-6 h-6 rounded-full overflow-hidden"><img src={getFlagSrc(language)} alt={language} className="w-full h-full object-cover" /></span><span className="hidden sm:inline">{language.toUpperCase()}</span><ChevronDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-1" /></button>{isOpen && <div className="absolute right-0 mt-2 w-36 origin-top-right bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"><div className="py-1">{languages.map(lang => <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><img src={getFlagSrc(lang.code)} alt={lang.name} className="w-5 h-auto rounded-sm" />{lang.name}</button>)}</div></div>}</div>;
}


const Header: React.FC<HeaderProps> = ({ activeView, onViewChange }) => {
    const { t } = useI18n();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const { currentUser, notifications, setNotifications } = useStore(state => ({
        currentUser: state.currentUser,
        notifications: state.notifications,
        setNotifications: (notifs: Notification[]) => state.handleWsEvent({ type: 'SET_NOTIFICATIONS', payload: notifs }), // A bit of a hack
    }));
    
    const onRespondToAgent = (agentId: string, message: string, notificationId: number) => {
         if (currentUser) {
            wsClient.send({
                type: 'supervisorResponseToAgent',
                payload: { 
                    agentId, 
                    message, 
                    from: `${currentUser.firstName} ${currentUser.lastName}`
                }
            });
            setNotifications(notifications.filter(n => n.id !== notificationId));
        }
    };
    
    const onClearNotifications = () => {
        setNotifications([]);
    };

    const TabButton: React.FC<{ viewName: 'app' | 'monitoring'; labelKey: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; }> = ({ viewName, labelKey, icon: Icon }) => (
        <button onClick={() => onViewChange(viewName)} className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeView === viewName ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <Icon className="w-5 h-5" /><span>{t(labelKey)}</span>
        </button>
    );

    return (
        <header className="flex-shrink-0 bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 flex justify-between items-center px-4">
            <nav className="flex space-x-2">
                <TabButton viewName="app" labelKey="header.tabs.application" icon={WrenchScrewdriverIcon} />
                <TabButton viewName="monitoring" labelKey="header.tabs.monitoring" icon={ServerStackIcon} />
            </nav>
            <div className="flex items-center gap-4">
                <Clock />
                <div className="relative">
                    <button onClick={() => setIsNotifOpen(p => !p)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
                        <BellAlertIcon className="w-6 h-6" />
                        {notifications.length > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{notifications.length}</span>
                            </span>
                        )}
                    </button>
                    {isNotifOpen && <NotificationPopover notifications={notifications} onClearAll={onClearNotifications} onRespond={onRespondToAgent} />}
                </div>
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>
        </header>
    );
};

export default Header;
