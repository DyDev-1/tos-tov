// Is a navigation link the "current page"? `pathname` has no language prefix (/map, not /en/map).
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Sign up and Log in are focused screens: no navigation, tab bar or "Add a place" button
// (as in the design). `pathname` has no language prefix.
export function isAuthPath(pathname: string): boolean {
  return isNavActive(pathname, "/sign-in") || isNavActive(pathname, "/sign-up");
}
