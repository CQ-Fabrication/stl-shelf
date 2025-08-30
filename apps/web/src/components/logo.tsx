import * as React from 'react';

// Use a shared assets alias so we don't duplicate files
// We invert for contrast: light theme -> dark logo, dark theme -> light logo
// Vite treats imported SVGs as URLs by default
import logoLightUrl from '#assets/logo-light.svg';
import logoDarkUrl from '#assets/logo-dark.svg';

type LogoProps = React.ComponentProps<'img'> & {
  invertForContrast?: boolean;
};

export function Logo({ className, invertForContrast = true, ...imgProps }: LogoProps) {
  // CSS-only swap to avoid theme hydration flashes
  // When invertForContrast is true: show dark in light mode, light in dark mode
  const lightSrc = invertForContrast ? logoDarkUrl : logoLightUrl;
  const darkSrc = invertForContrast ? logoLightUrl : logoDarkUrl;

  return (
    <div className={className} aria-hidden={imgProps.alt ? undefined : true}>
      <img
        src={lightSrc}
        alt={imgProps.alt ?? 'STL Shelf logo'}
        className="block h-full w-auto dark:hidden"
        {...imgProps}
      />
      <img
        src={darkSrc}
        alt={imgProps.alt ?? 'STL Shelf logo'}
        className="hidden h-full w-auto dark:block"
        {...imgProps}
      />
    </div>
  );
}

