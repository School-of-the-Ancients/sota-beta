import React from 'react';

interface DiceIconProps {
  className?: string;
}

const DiceIcon: React.FC<DiceIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
    <circle cx="8.5" cy="8.5" r="1.25" />
    <circle cx="15.5" cy="8.5" r="1.25" />
    <circle cx="8.5" cy="15.5" r="1.25" />
    <circle cx="12" cy="12" r="1.25" />
    <circle cx="15.5" cy="15.5" r="1.25" />
  </svg>
);

export default DiceIcon;
