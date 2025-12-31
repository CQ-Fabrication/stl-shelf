import type * as React from 'react'

const CDN_LOGO_DARK = 'https://cdn.stl-shelf.com/logo-dark.svg'
const CDN_LOGO_LIGHT = 'https://cdn.stl-shelf.com/logo-light.svg'

type LogoProps = React.ComponentProps<'img'> & {
  invertForContrast?: boolean
}

export function Logo({
  className,
  invertForContrast = true,
  ...imgProps
}: LogoProps) {
  // CSS-only swap to avoid theme hydration flashes
  // Logo names refer to text color, not background:
  // - logo-dark.svg = dark text (for light backgrounds)
  // - logo-light.svg = light text (for dark backgrounds)
  const lightThemeSrc = invertForContrast ? CDN_LOGO_DARK : CDN_LOGO_LIGHT
  const darkThemeSrc = invertForContrast ? CDN_LOGO_LIGHT : CDN_LOGO_DARK

  return (
    <div aria-hidden={imgProps.alt ? undefined : true} className={className}>
      <img
        alt={imgProps.alt ?? 'STL Shelf logo'}
        className="block h-full w-auto dark:hidden"
        src={lightThemeSrc}
        {...imgProps}
      />
      <img
        alt={imgProps.alt ?? 'STL Shelf logo'}
        className="hidden h-full w-auto dark:block"
        src={darkThemeSrc}
        {...imgProps}
      />
    </div>
  )
}
