// FitConsole icons — 24x24 stroke icons that inherit the text color.
// Usage:  import { DashboardIcon } from "./Icons";
//         <DashboardIcon />                     // 18px, currentColor
//         <DashboardIcon size={24} />           // custom size
//         <DashboardIcon title="Dashboard" />   // when the icon stands alone (accessible label)

function Icon({ size = 18, title, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---------- Brand ---------- */
// Logo mark: put it on a var(--fc-primary) square with white stroke.
export const LogoIcon = (p) => (
  <Icon strokeWidth="2.4" {...p}><path d="M6 4v16M18 4v16M3 8v8M21 8v8M6 12h12" /></Icon>
);

/* ---------- Navigation ---------- */
export const DashboardIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
  </Icon>
);
export const HomeIcon = (p) => (
  <Icon {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></Icon>
);
export const ClientsIcon = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6" />
    <path d="M17 11a3 3 0 1 0 0-6M22 21c0-3-2-5-5-5.5" />
  </Icon>
);
export const TrainerIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="7" r="4" /><path d="M5 21c0-4 3-7 7-7s7 3 7 7" /></Icon>
);
export const CourseIcon = (p) => ( // dumbbell
  <Icon {...p}><path d="M6 4v16M18 4v16M3 8v8M21 8v8M6 12h12" /></Icon>
);
export const PaymentIcon = (p) => (
  <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></Icon>
);
export const CashIcon = (p) => (
  <Icon {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></Icon>
);
export const RupeeIcon = (p) => (
  <Icon {...p}><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3c6.667 0 6.667-10 0-10" /></Icon>
);
export const AttendanceIcon = (p) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4M9 15l2 2 4-4" /></Icon>
);
export const CalendarIcon = (p) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></Icon>
);
export const ReportIcon = (p) => (
  <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></Icon>
);
export const MessageIcon = (p) => (
  <Icon {...p}><path d="M4 5h16v11H8l-4 4z" /></Icon>
);
export const SettingsIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
);
export const LogoutIcon = (p) => (
  <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icon>
);

/* ---------- Diet & progress ---------- */
export const AiSparkIcon = (p) => ( // AI diet plan / Gemini draft
  <Icon {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></Icon>
);
export const DietIcon = (p) => ( // apple
  <Icon {...p}><path d="M12 7c-2-2-7-2-7 4 0 5 3 10 5 10 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 5-5 5-10 0-6-5-6-7-4z" /><path d="M12 7c0-2 1-4 3-4" /></Icon>
);
export const WeightIcon = (p) => ( // scale
  <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 9a5 5 0 0 1 8 0M12 9l1.5-2" /></Icon>
);
export const WaterIcon = (p) => (
  <Icon {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></Icon>
);
export const SleepIcon = (p) => (
  <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Icon>
);
export const FlameIcon = (p) => ( // calories
  <Icon {...p}><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-4 3 0-2-1-4-2-6-2 3-4 6-4 12a7 7 0 0 0 7 7z" /></Icon>
);
export const ProgressIcon = (p) => (
  <Icon {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></Icon>
);
export const TrendUpIcon = (p) => (
  <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>
);
export const TrendDownIcon = (p) => (
  <Icon {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></Icon>
);

/* ---------- Documents ---------- */
export const IdCardIcon = (p) => (
  <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2.5" /><path d="M14 10h4M14 14h4" /></Icon>
);
export const WaiverIcon = (p) => ( // signed document
  <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 17c1-2 2-2 3 0s2 2 3 0" /></Icon>
);
export const UploadIcon = (p) => (
  <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></Icon>
);
export const DownloadIcon = (p) => ( // Excel export
  <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></Icon>
);

/* ---------- Actions ---------- */
export const PlusIcon = (p) => (<Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>);
export const EditIcon = (p) => (<Icon {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /></Icon>);
export const TrashIcon = (p) => (<Icon {...p}><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" /></Icon>);
export const SearchIcon = (p) => (<Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></Icon>);
export const FilterIcon = (p) => (<Icon {...p}><path d="M3 5h18l-7 8v6l-4 2v-8z" /></Icon>);
export const BellIcon = (p) => ( // payment reminder
  <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></Icon>
);
export const SendIcon = (p) => (<Icon {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></Icon>);
export const CheckIcon = (p) => (<Icon {...p}><path d="M20 6L9 17l-5-5" /></Icon>);
export const CloseIcon = (p) => (<Icon {...p}><path d="M18 6L6 18M6 6l12 12" /></Icon>);
export const ChevronRightIcon = (p) => (<Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>);
export const ChevronDownIcon = (p) => (<Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>);
export const MenuIcon = (p) => (<Icon {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Icon>);
export const PhoneIcon = (p) => (
  <Icon {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></Icon>
);
export const AlertIcon = (p) => ( // overdue / error
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></Icon>
);
export const ClockIcon = (p) => ( // expiring soon
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);
