import { describe, expect, it } from "vitest";
import { validateAvatarDataUrl } from "./validate";
import { initialsOf } from "./initials";
import { isAiAvatarId } from "./catalog";
import { parseChat, serializeChat, shouldSendOnKey, type ChatMessage } from "../ai/chatStore";

const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const url = (type: string, buf: Buffer) => `data:image/${type};base64,${buf.toString("base64")}`;

describe("validateAvatarDataUrl", () => {
  it("accepts a small JPEG", () => expect(validateAvatarDataUrl(url("jpeg", jpegHeader)).ok).toBe(true));
  it("rejects wrong signature", () => expect(validateAvatarDataUrl(url("png", jpegHeader)).ok).toBe(false));
  it("rejects svg and html", () => {
    expect(validateAvatarDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=").ok).toBe(false);
    expect(validateAvatarDataUrl("data:text/html;base64,PGI+").ok).toBe(false);
  });
  it("rejects over 150 KB", () => {
    const big = Buffer.concat([jpegHeader, Buffer.alloc(151 * 1024)]);
    expect(validateAvatarDataUrl(url("jpeg", big)).ok).toBe(false);
  });
  it("rejects non strings and junk", () => {
    expect(validateAvatarDataUrl(42).ok).toBe(false);
    expect(validateAvatarDataUrl("hello").ok).toBe(false);
  });
});

describe("helpers", () => {
  it("initials", () => {
    expect(initialsOf("Kuldeep Behera")).toBe("KB");
    expect(initialsOf("kuldbehera@gmail.com")).toBe("KU");
    expect(initialsOf("")).toBe("Y");
  });
  it("avatar ids", () => {
    expect(isAiAvatarId("owl")).toBe(true);
    expect(isAiAvatarId("hacker")).toBe(false);
  });
});

describe("chat store", () => {
  const m: ChatMessage = { id: "1", role: "user", text: "hello there", ts: new Date().toISOString() };
  it("round trips", () => expect(parseChat(serializeChat([m]))).toEqual([m]));
  it("ignores corrupt data", () => {
    expect(parseChat("{bad")).toEqual([]);
    expect(parseChat(JSON.stringify([{ nope: 1 }]))).toEqual([]);
    expect(parseChat(null)).toEqual([]);
  });
  it("Enter sends, Shift+Enter does not, composing does not", () => {
    expect(shouldSendOnKey({ key: "Enter", shiftKey: false })).toBe(true);
    expect(shouldSendOnKey({ key: "Enter", shiftKey: true })).toBe(false);
    expect(shouldSendOnKey({ key: "Enter", shiftKey: false, isComposing: true })).toBe(false);
    expect(shouldSendOnKey({ key: "a", shiftKey: false })).toBe(false);
  });
});
