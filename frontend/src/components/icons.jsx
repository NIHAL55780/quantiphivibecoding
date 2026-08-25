const baseProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function WalletIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
      <path d="M3 7.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <path d="M21 10.5h-4a1.75 1.75 0 0 0 0 3.5h4z" />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg {...baseProps} width={18} height={18} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function AlertIcon(props) {
  return (
    <svg {...baseProps} width={18} height={18} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.2h.01" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...baseProps} width={18} height={18} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function InboxIcon(props) {
  return (
    <svg {...baseProps} width={40} height={40} strokeWidth={1.4} {...props}>
      <path d="M3 13h4l2 3h6l2-3h4" />
      <path d="M5.5 5h13l2.5 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...baseProps} width={16} height={16} {...props}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12.2A1.8 1.8 0 0 0 8.8 21h6.4a1.8 1.8 0 0 0 1.8-1.8L18 7" />
      <path d="M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7" />
    </svg>
  );
}
