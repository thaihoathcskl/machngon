import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

export const OFFICIAL_BRAND_LOGO_SRC = '/assets/images/logo.png';

interface BrandLogoProps {
  /** Visual size preset maintaining strict 1:1 aspect ratio without stretching */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Render the wordmark "MẠCH NGÔN" beside the official emblem */
  showWordmark?: boolean;
  /** Render compact subtitle under wordmark (e.g. Auth / Footer) */
  subtitle?: string;
  /** True when rendered on a dark contrast surface such as the editorial dark footer */
  inverted?: boolean;
  /** Optional override logo image path */
  customImageSrc?: string;
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 'h-8 w-8', px: 32, text: 'text-base', pad: 'p-0.5 rounded-lg' },
  sm: { box: 'h-10 w-10', px: 40, text: 'text-base sm:text-lg', pad: 'p-1 rounded-xl' },
  md: { box: 'h-12 w-12', px: 48, text: 'text-lg sm:text-xl', pad: 'p-1 rounded-xl' },
  lg: { box: 'h-16 w-16', px: 64, text: 'text-2xl', pad: 'p-1.5 rounded-2xl' },
} as const;

/**
 * Official MẠCH NGÔN Brand Emblem & Lockup (exact Hình 4 transparent Retina PNG):
 * Stylized MN monogram, open book, quill feather, stars and artistic arc.
 * Never stretched, never redesigned. Automatically cradles cleanly on dark surfaces
 * using a subtle warm parchment medallion matching the emblem's native palette.
 */
export function BrandLogo({
  size = 'sm',
  showWordmark = true,
  subtitle,
  inverted = false,
  customImageSrc,
  className = '',
}: BrandLogoProps) {
  const { isDark } = useTheme();
  const dims = SIZE_MAP[size];
  const src = customImageSrc || OFFICIAL_BRAND_LOGO_SRC;
  const needsLightCradle = inverted || isDark;
  const wordmarkColor = inverted ? 'text-[var(--color-bg)]' : 'text-[var(--color-text)]';

  return (
    <span className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}>
      <span
        className={`inline-flex items-center justify-center shrink-0 ${dims.box} ${
          needsLightCradle
            ? `bg-[#FAF4E8] ring-1 ring-[#D4AF6A]/45 shadow-sm ${dims.pad}`
            : ''
        }`}
      >
        <img
          src={src}
          alt="Logo chính thức Mạch Ngôn"
          width={dims.px}
          height={dims.px}
          decoding="async"
          className="h-full w-full object-contain aspect-square select-none pointer-events-none"
        />
      </span>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display font-bold tracking-tight whitespace-nowrap ${dims.text} ${wordmarkColor}`}
          >
            MẠCH NGÔN
          </span>
          {subtitle && (
            <span className="mt-1 text-[11px] font-normal opacity-75 whitespace-nowrap">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
