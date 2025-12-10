interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

export function Logo({ className = '', size = 'medium' }: LogoProps) {
  const sizeClasses = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16',
    xlarge: 'h-24',
  };

  return (
    <img
      src="/images.png"
      alt="Scripps National Spelling Bee"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
    />
  );
}
