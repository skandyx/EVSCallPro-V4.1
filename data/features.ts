// data/features.ts
import type { Feature } from '../types.ts';
import UserManager from '../components/UserManager.tsx';
import GroupManager from '../components/GroupManager.tsx';
import TrunkManager from '../components/TrunkManager.tsx';
import DidManager from '../components/DidManager.tsx';
import OutboundCampaignsManager from '../components/OutboundCampaignsManager.tsx';
import QualificationsManager from '../components/QualificationsManager.tsx';
import ScriptFeature from '../components/ScriptFeature.tsx';
import IvrFeature from '../components/IvrFeature.tsx';
import AudioManager from '../components/AudioManager.tsx';
import RecordsManager from '../components/RecordsManager.tsx';
// FIX: Corrected import path for SupervisionDashboard
import SupervisionDashboard from '../components/SupervisionDashboard.tsx';
import ReportingDashboard from '../components/ReportingDashboard.tsx';
import MaintenanceManager from '../components/MaintenanceManager.tsx';
import MonitoringDashboard from '../components/MonitoringDashboard.tsx';
// FIX: Corrected import path for HistoryViewer
import HistoryViewer from '../components/HistoryViewer.tsx';
// FIX: Corrected import path for SessionViewer
import SessionViewer from '../components/SessionViewer.tsx';
import HelpCenter from '../components/HelpCenter.tsx';
import PlanningManager from '../components/PlanningManager.tsx';
import ModuleSettingsManager from '../components/ModuleSettingsManager.tsx';
import SiteManager from '../components/SiteManager.tsx';
import SystemConnectionManager from '../components/SystemConnectionManager.tsx';
import ApiDocs from '../components/ApiDocs.tsx';
import DatabaseManager from '../components/DatabaseManager.tsx';
import BillingManager from '../components/BillingManager.tsx';
import SystemSettingsManager from '../components/SystemSettingsManager.tsx';
import LanguageManager from '../components/LanguageManager.tsx';

export const features: Feature[] = [
    {
        id: 'users',
        titleKey: 'features.users.title',
        category: 'Agent',
        descriptionKey: 'features.users.description',
        component: UserManager,
        userJourney: {
            titleKey: 'features.users.userJourney.title',
            stepsKeys: [
                'features.users.userJourney.steps.0',
                'features.users.userJourney.steps.1',
                'features.users.userJourney.steps.2',
                'features.users.userJourney.steps.3',
                'features.users.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.users.specs.title',
            pointsKeys: [
                'features.users.specs.points.0',
                'features.users.specs.points.1',
                'features.users.specs.points.2',
                'features.users.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.users.simplificationTip.title',
            contentKey: 'features.users.simplificationTip.content'
        }
    },
    {
        id: 'groups',
        titleKey: 'features.groups.title',
        category: 'Agent',
        descriptionKey: 'features.groups.description',
        component: GroupManager,
         userJourney: {
            titleKey: 'features.groups.userJourney.title',
            stepsKeys: [
                'features.groups.userJourney.steps.0',
                'features.groups.userJourney.steps.1',
                'features.groups.userJourney.steps.2',
                'features.groups.userJourney.steps.3',
                'features.groups.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.groups.specs.title',
            pointsKeys: [
                'features.groups.specs.points.0',
                'features.groups.specs.points.1',
                'features.groups.specs.points.2',
            ],
        },
        simplificationTip: {
            titleKey: 'features.groups.simplificationTip.title',
            contentKey: 'features.groups.simplificationTip.content'
        }
    },
    {
        id: 'planning',
        titleKey: 'features.planning.title',
        category: 'Agent',
        descriptionKey: 'features.planning.description',
        component: PlanningManager,
         userJourney: {
            titleKey: 'features.planning.userJourney.title',
            stepsKeys: [
                'features.planning.userJourney.steps.0',
                'features.planning.userJourney.steps.1',
                'features.planning.userJourney.steps.2',
                'features.planning.userJourney.steps.3',
                'features.planning.userJourney.steps.4',
                'features.planning.userJourney.steps.5',
            ],
        },
        specs: {
            titleKey: 'features.planning.specs.title',
            pointsKeys: [
                'features.planning.specs.points.0',
                'features.planning.specs.points.1',
                'features.planning.specs.points.2',
                'features.planning.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.planning.simplificationTip.title',
            contentKey: 'features.planning.simplificationTip.content'
        }
    },
    {
        id: 'outbound',
        titleKey: 'features.outbound.title',
        category: 'Outbound',
        descriptionKey: 'features.outbound.description',
        component: OutboundCampaignsManager,
        userJourney: {
            titleKey: "features.outbound.userJourney.title",
            stepsKeys: [
                'features.outbound.userJourney.steps.0',
                'features.outbound.userJourney.steps.1',
                'features.outbound.userJourney.steps.2',
                'features.outbound.userJourney.steps.3',
                'features.outbound.userJourney.steps.4',
                'features.outbound.userJourney.steps.5',
            ],
        },
        specs: {
            titleKey: 'features.outbound.specs.title',
            pointsKeys: [
                'features.outbound.specs.points.0',
                'features.outbound.specs.points.1',
                'features.outbound.specs.points.2',
                'features.outbound.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.outbound.simplificationTip.title',
            contentKey: 'features.outbound.simplificationTip.content'
        }
    },
    {
        id: 'scripts',
        titleKey: 'features.scripts.title',
        category: 'Outbound',
        descriptionKey: 'features.scripts.description',
        component: ScriptFeature,
        userJourney: {
            titleKey: "features.scripts.userJourney.title",
            stepsKeys: [
                'features.scripts.userJourney.steps.0',
                'features.scripts.userJourney.steps.1',
                'features.scripts.userJourney.steps.2',
                'features.scripts.userJourney.steps.3',
                'features.scripts.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.scripts.specs.title',
            pointsKeys: [
                'features.scripts.specs.points.0',
                'features.scripts.specs.points.1',
                'features.scripts.specs.points.2',
                'features.scripts.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.scripts.simplificationTip.title',
            contentKey: 'features.scripts.simplificationTip.content'
        }
    },
    {
        id: 'ivr',
        titleKey: 'features.ivr.title',
        category: 'Inbound',
        descriptionKey: 'features.ivr.description',
        component: IvrFeature,
        userJourney: {
            titleKey: "features.ivr.userJourney.title",
            stepsKeys: [
                'features.ivr.userJourney.steps.0',
                'features.ivr.userJourney.steps.1',
                'features.ivr.userJourney.steps.2',
                'features.ivr.userJourney.steps.3',
                'features.ivr.userJourney.steps.4',
                'features.ivr.userJourney.steps.5',
            ],
        },
        specs: {
            titleKey: 'features.ivr.specs.title',
            pointsKeys: [
                'features.ivr.specs.points.0',
                'features.ivr.specs.points.1',
                'features.ivr.specs.points.2',
            ],
        },
        simplificationTip: {
            titleKey: 'features.ivr.simplificationTip.title',
            contentKey: 'features.ivr.simplificationTip.content'
        }
    },
    {
        id: 'audio',
        titleKey: 'features.audio.title',
        category: 'Sound',
        descriptionKey: 'features.audio.description',
        component: AudioManager,
        userJourney: {
            titleKey: 'features.audio.userJourney.title',
            stepsKeys: [
                'features.audio.userJourney.steps.0',
                'features.audio.userJourney.steps.1',
                'features.audio.userJourney.steps.2',
                'features.audio.userJourney.steps.3',
                'features.audio.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.audio.specs.title',
            pointsKeys: [
                'features.audio.specs.points.0',
                'features.audio.specs.points.1',
                'features.audio.specs.points.2',
                'features.audio.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.audio.simplificationTip.title',
            contentKey: 'features.audio.simplificationTip.content'
        }
    },
    {
        id: 'records',
        titleKey: 'features.records.title',
        category: 'Sound',
        descriptionKey: 'features.records.description',
        component: RecordsManager,
         userJourney: {
            titleKey: 'features.records.userJourney.title',
            stepsKeys: [
                'features.records.userJourney.steps.0',
                'features.records.userJourney.steps.1',
                'features.records.userJourney.steps.2',
                'features.records.userJourney.steps.3',
                'features.records.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.records.specs.title',
            pointsKeys: [
                'features.records.specs.points.0',
                'features.records.specs.points.1',
                'features.records.specs.points.2',
                'features.records.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.records.simplificationTip.title',
            contentKey: 'features.records.simplificationTip.content'
        }
    },
    {
        id: 'qualifications',
        titleKey: 'features.qualifications.title',
        category: 'Configuration',
        descriptionKey: 'features.qualifications.description',
        component: QualificationsManager,
        userJourney: {
            titleKey: "features.qualifications.userJourney.title",
            stepsKeys: [
                'features.qualifications.userJourney.steps.0',
                'features.qualifications.userJourney.steps.1',
                'features.qualifications.userJourney.steps.2',
                'features.qualifications.userJourney.steps.3',
                'features.qualifications.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.qualifications.specs.title',
            pointsKeys: [
                'features.qualifications.specs.points.0',
                'features.qualifications.specs.points.1',
                'features.qualifications.specs.points.2',
                'features.qualifications.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.qualifications.simplificationTip.title',
            contentKey: 'features.qualifications.simplificationTip.content'
        }
    },
    {
        id: 'supervision',
        titleKey: 'features.supervision.title',
        category: 'Supervision & Reporting',
        descriptionKey: 'features.supervision.description',
        component: SupervisionDashboard,
        userJourney: {
            titleKey: "features.supervision.userJourney.title",
            stepsKeys: [
                'features.supervision.userJourney.steps.0',
                'features.supervision.userJourney.steps.1',
                'features.supervision.userJourney.steps.2',
                'features.supervision.userJourney.steps.3',
                'features.supervision.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.supervision.specs.title',
            pointsKeys: [
                'features.supervision.specs.points.0',
                'features.supervision.specs.points.1',
                'features.supervision.specs.points.2',
                'features.supervision.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.supervision.simplificationTip.title',
            contentKey: 'features.supervision.simplificationTip.content'
        }
    },
    {
        id: 'reporting',
        titleKey: 'features.reporting.title',
        category: 'Supervision & Reporting',
        descriptionKey: 'features.reporting.description',
        component: ReportingDashboard,
        userJourney: {
            titleKey: "features.reporting.userJourney.title",
            stepsKeys: [
                'features.reporting.userJourney.steps.0',
                'features.reporting.userJourney.steps.1',
                'features.reporting.userJourney.steps.2',
                'features.reporting.userJourney.steps.3',
                'features.reporting.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.reporting.specs.title',
            pointsKeys: [
                'features.reporting.specs.points.0',
                'features.reporting.specs.points.1',
                'features.reporting.specs.points.2',
                'features.reporting.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.reporting.simplificationTip.title',
            contentKey: 'features.reporting.simplificationTip.content'
        }
    },
    {
        id: 'history',
        titleKey: 'features.history.title',
        category: 'Supervision & Reporting',
        descriptionKey: 'features.history.description',
        component: HistoryViewer,
        userJourney: {
            titleKey: "features.history.userJourney.title",
            stepsKeys: [
                'features.history.userJourney.steps.0',
                'features.history.userJourney.steps.1',
                'features.history.userJourney.steps.2',
                'features.history.userJourney.steps.3',
                'features.history.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.history.specs.title',
            pointsKeys: [
                'features.history.specs.points.0',
                'features.history.specs.points.1',
                'features.history.specs.points.2',
                'features.history.specs.points.3',
                'features.history.specs.points.4',
            ],
        },
        simplificationTip: {
            titleKey: 'features.history.simplificationTip.title',
            contentKey: 'features.history.simplificationTip.content'
        }
    },
    {
        id: 'sessions',
        titleKey: 'features.sessions.title',
        category: 'Supervision & Reporting',
        descriptionKey: 'features.sessions.description',
        component: SessionViewer,
        userJourney: {
            titleKey: "features.sessions.userJourney.title",
            stepsKeys: [
                'features.sessions.userJourney.steps.0',
                'features.sessions.userJourney.steps.1',
                'features.sessions.userJourney.steps.2',
                'features.sessions.userJourney.steps.3',
            ],
        },
        specs: {
            titleKey: 'features.sessions.specs.title',
            pointsKeys: [
                'features.sessions.specs.points.0',
                'features.sessions.specs.points.1',
                'features.sessions.specs.points.2',
                'features.sessions.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.sessions.simplificationTip.title',
            contentKey: 'features.sessions.simplificationTip.content'
        }
    },
     {
        id: 'trunks',
        titleKey: 'features.trunks.title',
        category: 'Paramètres',
        descriptionKey: 'features.trunks.description',
        component: TrunkManager,
        userJourney: {
            titleKey: 'features.trunks.userJourney.title',
            stepsKeys: [
                'features.trunks.userJourney.steps.0',
                'features.trunks.userJourney.steps.1',
                'features.trunks.userJourney.steps.2',
                'features.trunks.userJourney.steps.3',
            ],
        },
        specs: {
            titleKey: 'features.trunks.specs.title',
            pointsKeys: [
                'features.trunks.specs.points.0',
                'features.trunks.specs.points.1',
                'features.trunks.specs.points.2',
            ],
        },
        simplificationTip: {
            titleKey: 'features.trunks.simplificationTip.title',
            contentKey: 'features.trunks.simplificationTip.content'
        }
    },
     {
        id: 'dids',
        titleKey: 'features.dids.title',
        category: 'Paramètres',
        descriptionKey: 'features.dids.description',
        component: DidManager,
         userJourney: {
            titleKey: 'features.dids.userJourney.title',
            stepsKeys: [
                'features.dids.userJourney.steps.0',
                'features.dids.userJourney.steps.1',
                'features.dids.userJourney.steps.2',
                'features.dids.userJourney.steps.3',
                'features.dids.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.dids.specs.title',
            pointsKeys: [
                'features.dids.specs.points.0',
                'features.dids.specs.points.1',
                'features.dids.specs.points.2',
            ],
        },
        simplificationTip: {
            titleKey: 'features.dids.simplificationTip.title',
            contentKey: 'features.dids.simplificationTip.content'
        }
    },
    {
        id: 'sites-config',
        titleKey: 'features.sites-config.title',
        category: 'Paramètres',
        descriptionKey: 'features.sites-config.description',
        component: SiteManager,
        userJourney: {
            titleKey: 'features.sites-config.userJourney.title',
            stepsKeys: [
                'features.sites-config.userJourney.steps.0',
                'features.sites-config.userJourney.steps.1',
                'features.sites-config.userJourney.steps.2',
                'features.sites-config.userJourney.steps.3',
                'features.sites-config.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.sites-config.specs.title',
            pointsKeys: [
                'features.sites-config.specs.points.0',
                'features.sites-config.specs.points.1',
                'features.sites-config.specs.points.2',
            ],
        },
        simplificationTip: {
            titleKey: 'features.sites-config.simplificationTip.title',
            contentKey: 'features.sites-config.simplificationTip.content'
        }
    },
    {
        id: 'module-settings',
        titleKey: 'features.module-settings.title',
        category: 'Paramètres',
        descriptionKey: 'features.module-settings.description',
        component: ModuleSettingsManager,
        userJourney: {
            titleKey: 'features.module-settings.userJourney.title',
            stepsKeys: [
                'features.module-settings.userJourney.steps.0',
                'features.module-settings.userJourney.steps.1',
                'features.module-settings.userJourney.steps.2',
                'features.module-settings.userJourney.steps.3',
            ],
        },
        specs: {
            titleKey: 'features.module-settings.specs.title',
            pointsKeys: [
                'features.module-settings.specs.points.0',
                'features.module-settings.specs.points.1',
                'features.module-settings.specs.points.2',
                'features.module-settings.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.module-settings.simplificationTip.title',
            contentKey: 'features.module-settings.simplificationTip.content'
        }
    },
     {
        id: 'languages',
        titleKey: 'features.languages.title',
        category: 'Paramètres',
        descriptionKey: 'features.languages.description',
        component: LanguageManager,
        userJourney: {
            titleKey: 'features.languages.userJourney.title',
            stepsKeys: [
                'features.languages.userJourney.steps.0',
                'features.languages.userJourney.steps.1',
                'features.languages.userJourney.steps.2',
            ],
        },
        specs: {
            titleKey: 'features.languages.specs.title',
            pointsKeys: [
                'features.languages.specs.points.0',
                'features.languages.specs.points.1',
            ],
        },
        simplificationTip: {
            titleKey: 'features.languages.simplificationTip.title',
            contentKey: 'features.languages.simplificationTip.content'
        }
    },
    {
        id: 'database-client',
        titleKey: 'features.database-client.title',
        category: 'Paramètres',
        descriptionKey: 'features.database-client.description',
        component: DatabaseManager,
        userJourney: {
            titleKey: 'features.database-client.userJourney.title',
            stepsKeys: [
                'features.database-client.userJourney.steps.0',
                'features.database-client.userJourney.steps.1',
                'features.database-client.userJourney.steps.2',
                'features.database-client.userJourney.steps.3',
                'features.database-client.userJourney.steps.4',
            ],
        },
        specs: {
            titleKey: 'features.database-client.specs.title',
            pointsKeys: [
                'features.database-client.specs.points.0',
                'features.database-client.specs.points.1',
                'features.database-client.specs.points.2',
                'features.database-client.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.database-client.simplificationTip.title',
            contentKey: 'features.database-client.simplificationTip.content'
        }
    },
    {
        id: 'system-connection',
        titleKey: 'features.system-connection.title',
        category: 'Paramètres',
        descriptionKey: 'features.system-connection.description',
        component: SystemConnectionManager,
        userJourney: {
            titleKey: 'features.system-connection.userJourney.title',
            stepsKeys: [
                'features.system-connection.userJourney.steps.0',
                'features.system-connection.userJourney.steps.1',
                'features.system-connection.userJourney.steps.2',
                'features.system-connection.userJourney.steps.3',
                'features.system-connection.userJourney.steps.4',
                'features.system-connection.userJourney.steps.5',
            ],
        },
        specs: {
            titleKey: 'features.system-connection.specs.title',
            pointsKeys: [
                'features.system-connection.specs.points.0',
                'features.system-connection.specs.points.1',
                'features.system-connection.specs.points.2',
                'features.system-connection.specs.points.3',
            ],
        },
        simplificationTip: {
            titleKey: 'features.system-connection.simplificationTip.title',
            contentKey: 'features.system-connection.simplificationTip.content'
        }
    },
    {
        id: 'maintenance',
        titleKey: 'features.maintenance.title',
        category: 'Système',
        descriptionKey: 'features.maintenance.description',
        component: MaintenanceManager,
        userJourney: { titleKey: '', stepsKeys: [] },
        specs: { titleKey: '', pointsKeys: [] },
        simplificationTip: { titleKey: '', contentKey: '' }
    },
    {
        id: 'help',
        titleKey: 'features.help.title',
        category: 'Système',
        descriptionKey: 'features.help.description',
        component: HelpCenter,
        userJourney: { titleKey: '', stepsKeys: [] },
        specs: { titleKey: '', pointsKeys: [] },
        simplificationTip: { titleKey: '', contentKey: '' }
    },
    {
        id: 'api-docs',
        titleKey: 'features.api-docs.title',
        category: 'Paramètres',
        descriptionKey: 'features.api-docs.description',
        component: ApiDocs,
        userJourney: {
            titleKey: 'features.api-docs.userJourney.title',
            stepsKeys: [
                'features.api-docs.userJourney.steps.0',
                'features.api-docs.userJourney.steps.1',
                'features.api-docs.userJourney.steps.2',
                'features.api-docs.userJourney.steps.3',
            ],
        },
        specs: {
            titleKey: 'features.api-docs.specs.title',
            pointsKeys: [
                'features.api-docs.specs.points.0',
                'features.api-docs.specs.points.1',
                'features.api-docs.specs.points.2',
            ],
        },
        simplificationTip: {
            titleKey: 'features.api-docs.simplificationTip.title',
            contentKey: 'features.api-docs.simplificationTip.content'
        }
    },
    {
        id: 'billing',
        titleKey: 'features.billing.title',
        category: 'Paramètres',
        descriptionKey: 'features.billing.description',
        component: BillingManager,
        userJourney: { titleKey: '', stepsKeys: [] },
        specs: { titleKey: '', pointsKeys: [] },
        simplificationTip: { titleKey: '', contentKey: '' }
    },
    {
        id: 'system-settings',
        titleKey: 'features.system-settings.title',
        category: 'Paramètres',
        descriptionKey: 'features.system-settings.description',
        component: SystemSettingsManager,
        userJourney: { titleKey: '', stepsKeys: [] },
        specs: { titleKey: '', pointsKeys: [] },
        simplificationTip: { titleKey: '', contentKey: '' }
    },
];
