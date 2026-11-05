"use client";

import { useRef, useState } from "react";
import { ThemeRadioGroup } from "@/components/layout/ThemeSwitcher";
import { AiAvatar } from "./AiAvatar";
import { UserAvatar } from "./UserAvatar";
import { useAvatars } from "./AvatarProvider";
import { AI_AVATARS, type AiAvatarId } from "./catalog";
import { resizeToAvatar } from "./resizeImage";

const btn =
  "rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-60 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

/** Picture, AI avatar and theme settings for the account page. */
export function AvatarSettings() {
  const { aiAvatar, customImage, userImage, setAiAvatar, setCustomImage } = useAvatars();
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function report(msg: string, err = false) {
    setStatus(msg);
    setIsError(err);
  }
  const where = (w: "account" | "device") => (w === "account" ? "saved to your account" : "saved on this device only");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    report("Preparing your picture…");
    try {
      const data = await resizeToAvatar(file);
      const r = await setCustomImage(data);
      if (r.ok) report(`Your picture is updated and ${where(r.where)}.`);
      else report(r.error ?? "Could not save that picture.", true);
    } catch (err) {
      report(err instanceof Error ? err.message : "Could not use that picture.", true);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    const r = await setCustomImage(null);
    report(r.ok ? "Your uploaded picture was removed." : (r.error ?? "Could not remove the picture."), !r.ok);
    setBusy(false);
  }

  async function onPick(id: AiAvatarId) {
    const r = await setAiAvatar(id);
    const name = AI_AVATARS.find((a) => a.id === id)!.name;
    report(`AI avatar changed to ${name}, ${where(r.where)}.`, !r.ok);
  }

  return (
    <section id="avatars" aria-labelledby="avatars-h" className="mt-8 space-y-6 rounded-xl border border-gray-300 bg-white p-6 shadow-sm dark:border-zinc-600">
      <h2 id="avatars-h" className="font-semibold text-gray-900">Pictures and appearance</h2>

      <p role="status" aria-live="polite" className={`text-sm ${status ? "" : "sr-only"} ${isError ? "font-medium text-red-700" : "text-gray-800"}`}>
        {status}
      </p>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">Your picture</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <UserAvatar size={64} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
              {userImage ? "Change picture" : "Upload picture"}
            </button>
            {customImage && (
              <button type="button" className={btn} disabled={busy} onClick={onRemove}>
                Remove picture
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Choose a picture file" onChange={onFile} />
        </div>
        <p className="mt-2 text-xs text-gray-600">
          JPEG, PNG or WebP. It is resized to 256 by 256 pixels and kept under 150 KB. Without an uploaded picture we use your sign-in photo, or your initials.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900">AI avatar</legend>
        <p className="mt-1 text-xs text-gray-600">Shown next to the assistant&apos;s replies in the chat. Use the arrow keys to move between choices.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AI_AVATARS.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-gray-300 p-2 text-center text-xs font-medium text-gray-900 hover:bg-gray-100 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-700 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:has-[:checked]:border-teal-400 dark:has-[:checked]:bg-teal-950"
            >
              <input
                type="radio"
                name="ai-avatar"
                value={a.id}
                checked={aiAvatar === a.id}
                onChange={() => onPick(a.id)}
                className="sr-only"
              />
              <AiAvatar id={a.id} size={44} />
              <span>{a.name}</span>
              {aiAvatar === a.id && <span className="text-[11px] font-semibold text-teal-800">Selected</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="max-w-xs">
        <ThemeRadioGroup name="theme-account" />
      </div>
    </section>
  );
}
