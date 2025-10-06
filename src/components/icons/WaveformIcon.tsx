
import React from 'react';

const WaveformIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M3 10h1v4H3v-4zm2 2h1v-1H5v1zm2-3h1v7H7v-7zm2-3h1v10H9V6zm2 2h1v5h-1V8zm2-3h1v10h-1V5zm2 2h1v6h-1V7zm2 3h1v1h-1v-1zm2-2h1v4h-1v-4z" />
  </svg>
);

export default WaveformIcon;
