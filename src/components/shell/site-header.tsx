import { AuthButton } from "./auth-button";
import { LanguageToggle } from "./language-toggle";
import { Logo } from "./logo";
import { MainNav } from "./main-nav";

// Top bar. Desktop: logo, centred Explore / Map / Saved, language toggle, Log in.
// Phone: only the logo and language toggle (navigation moves to the bottom tab bar).
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-2 md:grid-cols-[1fr_auto_1fr]">
        <Logo />
        <MainNav />
        <div className="flex items-center justify-end gap-3">
          <LanguageToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
