import { Particles } from "@/components/ui/particles";

export function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Particles className="absolute inset-0" quantity={100} ease={80} color="#000000" refresh />
    </div>
  );
}
