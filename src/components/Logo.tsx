interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function Logo({ className = '', size = 'medium' }: LogoProps) {
  const sizeClasses = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16',
  };

  return (
    <img
      src="/snsb_logo.jpg"
      alt="Scripps National Spelling Bee"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
    />
  );
}
