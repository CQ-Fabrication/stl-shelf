import type * as React from "react";
import logoDarkUrl from "@stl-shelf/assets/logo-dark.svg";
import logoLightUrl from "@stl-shelf/assets/logo-light.svg";

type LogoProps = React.ComponentProps<"img"> & {
  invertForContrast?: boolean;
};

export function Logo({
  className,
  invertForContrast = true,
  ...imgProps
}: LogoProps) {
  // CSS-only swap to avoid theme hydration flashes
  // When invertForContrast is true: show dark in light mode, light in dark mode
  const lightSrc = invertForContrast ? logoDarkUrl : logoLightUrl;
  const darkSrc = invertForContrast ? logoLightUrl : logoDarkUrl;

  return (
    <div aria-hidden={imgProps.alt ? undefined : true} className={className}>
      <img
        alt={imgProps.alt ?? "STL Shelf logo"}
        className="block h-full w-auto dark:hidden"
        src={lightSrc}
        {...imgProps}
      />
      <img
        alt={imgProps.alt ?? "STL Shelf logo"}
        className="hidden h-full w-auto dark:block"
        src={darkSrc}
        {...imgProps}
      />
    </div>
  );
}
