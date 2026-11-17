// Makes Clerk's sign-in / sign-up form look like the rest of the site (colours and shapes from uxui.md).
// Clerk draws the form itself, so we style it through its `appearance` settings.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#b8461f", // laterite: the "Create account" button
    colorText: "#1b2a22",
    colorTextSecondary: "#5c665f",
    colorBackground: "#fffdf9",
    colorInputBackground: "#ffffff",
    colorInputText: "#1b2a22",
    borderRadius: "1rem",
    fontFamily: "inherit",
    fontSize: "1rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full bg-transparent p-0 shadow-none",
    // The page has its own heading, tabs and "keep browsing" link.
    header: "hidden",
    footer: "hidden",
    // "Use username" / "Use phone" links under the field.
    formFieldAction: "font-semibold text-laterite",
    formFieldLabel: "font-semibold",
    formButtonPrimary: "min-h-12 text-base font-semibold leading-relaxed shadow-none",
    socialButtonsBlockButton: "min-h-12",
  },
} as const;

// Set once on <ClerkProvider>: puts all of Clerk's styles in the "clerk" CSS layer (see globals.css),
// so the classes in clerkAppearance can override them.
export const clerkProviderAppearance = { cssLayerName: "clerk" } as const;
