import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Particles } from "./ui/particles";

export function HeroBackground() {
  const { theme } = useTheme();
  const [color, setColor] = useState("#ffffff");

  useEffect(() => {
    setColor(theme === "dark" ? "#ffffff" : "#000000");
  }, [theme]);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Particles
        className="absolute inset-0"
        quantity={100}
        ease={80}
        color={color}
        refresh
      />
    </div>
  );
}
