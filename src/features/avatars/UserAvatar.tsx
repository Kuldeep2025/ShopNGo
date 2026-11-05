"use client";

import { useState } from "react";
import { useAvatars } from "./AvatarProvider";
import { initialsOf } from "./initials";

/** Round picture of the signed-in user: uploaded image, Firebase photo, or initials. Decorative. */
export function UserAvatar({ size = 36 }: { size?: number }) {
  const { userImage, displayName } = useAvatars();
  const [failed, setFailed] = useState<string | null>(null);
  const show = userImage && failed !== userImage;
  return show ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={userImage}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(userImage)}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-teal-800 font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }}
    >
      {initialsOf(displayName)}
    </span>
  );
}
