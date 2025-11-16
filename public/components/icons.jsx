const ICON_BASE_CLASS = 'material-symbols-rounded text-[1.35rem] leading-none';

const createIcon = (iconName) => {
    return ({ className = '', style } = {}) => (
        <span className={`${ICON_BASE_CLASS} ${className}`} style={style}>
            {iconName}
        </span>
    );
};

const ShieldIcon = createIcon('shield');
const HeartIcon = createIcon('favorite');
const CalendarIcon = createIcon('calendar_month');
const BookOpenIcon = createIcon('menu_book');
const UsersIcon = createIcon('groups');
const SparklesIcon = createIcon('auto_awesome');
const ActivityIcon = createIcon('monitor_heart');
const DropletsIcon = createIcon('water_drop');
const PillIcon = createIcon('medication');
const PhoneIcon = createIcon('call');
const MenuIcon = createIcon('menu');
const SendIcon = createIcon('send');
const SaveIcon = createIcon('save');
const AlertTriangleIcon = createIcon('warning');
const SunIcon = createIcon('sunny');
const MoonIcon = createIcon('dark_mode');
const XIcon = createIcon('close');
const MicIcon = createIcon('mic');
const ChatBubbleIcon = createIcon('chat');
const BuddyIcon = createIcon('diversity_3');
const WellnessLeafIcon = createIcon('spa');
const MemorySparkIcon = createIcon('bookmark');

window.AmilyIcons = {
    ShieldIcon,
    HeartIcon,
    CalendarIcon,
    BookOpenIcon,
    UsersIcon,
    SparklesIcon,
    ActivityIcon,
    DropletsIcon,
    PillIcon,
    PhoneIcon,
    MenuIcon,
    SendIcon,
    SaveIcon,
    AlertTriangleIcon,
    SunIcon,
    MoonIcon,
    XIcon,
    MicIcon,
    ChatBubbleIcon,
    BuddyIcon,
    WellnessLeafIcon,
    MemorySparkIcon,
};
