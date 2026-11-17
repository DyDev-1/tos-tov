"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

// "Log in" on desktop. Signed-in users see their Clerk avatar menu instead (profile, sign out).
// This runs in the browser, so the pages around it can stay static and fast.
// The full Sign up / Log in page comes in its own slice; for now Clerk opens a popup.
export function AuthButton() {
  const t = useTranslations("Header");

  return (
    <div className="hidden md:block">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-full border border-primary px-5 font-semibold text-primary transition-colors hover:bg-secondary"
          >
            {t("logIn")}
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
