import { HeroFluid } from './HeroFluid';

/** Masthead for the patient flow: a drifting forest-green fluid wash. */
export function AppHeader() {
  return (
    <div className="relative -mx-5 -mt-8 min-h-28 overflow-hidden sm:-mx-8 sm:-mt-12">
      <HeroFluid />
    </div>
  );
}
