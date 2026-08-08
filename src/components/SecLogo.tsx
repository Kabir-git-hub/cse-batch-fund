import React from 'react';

export const SEC_LOGO_URL = 'https://i.postimg.cc/L62Ty7vN/logo.jpg';

interface SecLogoProps {
  className?: string;
  size?: number;
}

export const SecLogo: React.FC<SecLogoProps> = ({ className = 'w-10 h-10', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <img
      src={SEC_LOGO_URL}
      alt="SEC Logo"
      className={`${className} object-contain rounded-full shrink-0`}
      style={style}
      referrerPolicy="no-referrer"
    />
  );
};

export default SecLogo;

