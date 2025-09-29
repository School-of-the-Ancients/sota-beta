import React from 'react';

const MuteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        {...props}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M12.75 6.036-7.5 3.75v16.5l7.5-2.25m0 0v-12.152M12.75 6.036a6.368 6.368 0 0 1 2.122.992M12.75 6.036a6.368 6.368 0 0 0-2.122.992m2.122-1.984L12.75 3.75m-2.122 1.984-1.255 1.255m2.51.75-1.255 1.255m0 0v9.142l-1.255-1.255M7.5 19.5l1.255-1.255m-1.255 1.255 1.255 1.255M4.5 9.75l1.255 1.255m5.645-3.003-1.255 1.255"
        />
    </svg>
);

export default MuteIcon;
