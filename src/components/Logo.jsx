import * as React from "react";

const Logo = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
    style={{ color: 'white', ...props.style }}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2v10c0 1.105-.895 2-2 2H5c-1.105 0-2-.895-2-2V7z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 4.5c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2v12.5c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2V4.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2v15c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2V2z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.5 19h16"
    />
  </svg>
);

export default Logo;
