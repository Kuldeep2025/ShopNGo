"use client";

import { useEffect, useState } from "react";
import { ADS_EVENT, areAllHidden, setAllHidden } from "@/features/recommendations/adSlot";

/** Footer control: bring product suggestions back (or hide them all) on this device. */
export function SuggestionsToggle() {
  const [hidden, setHidden] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const sync = () => {
      try {
        setHidden(areAllHidden(window.localStorage));
      } catch {
        setHidden(false);
      }
    };
    sync();
    window.addEventListener(ADS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ADS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggle() {
    try {
      setAllHidden(window.localStorage, !hidden);
      window.dispatchEvent(new Event(ADS_EVENT));
    } catch {
      /* ignore */
    }
    setNote(hidden ? "Suggestions are back. Closed ones stay closed." : "Suggestions are hidden on this device.");
  }

  return (
    <>
      <button type="button" onClick={toggle} className="underline hover:text-teal-700 dark:hover:text-teal-400">
        {hidden ? "Show suggestions again" : "Hide product suggestions"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {note}
      </span>
    </>
  );
}
