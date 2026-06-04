import { useEffect, useState } from "react";
import { INLINE_TRANSLATIONS, TEXT_TRANSLATIONS } from "@/features/i18n/translations";

export type GroveLanguage = "ar" | "en";

export const LANGUAGE_KEY = "grove-language";
export const LANGUAGE_EVENT = "grove-language-change";

const textOriginals = new WeakMap<Text, string>();
const ATTRS = ["placeholder", "title", "aria-label"];
let translating = false;

export function getLanguage(): GroveLanguage {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "ar";
}

export function setLanguage(language: GroveLanguage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  translateDocument(language);
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: language }));
}

export function applySavedLanguage() {
  if (typeof document === "undefined") return;
  const language = getLanguage();
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  translateDocument(language);
}

export function setupLanguageObserver() {
  if (typeof document === "undefined") return () => {};

  const observer = new MutationObserver(() => {
    if (translating) return;
    window.requestAnimationFrame(() => translateDocument(getLanguage()));
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  translateDocument(getLanguage());
  return () => observer.disconnect();
}

function translateDocument(language: GroveLanguage) {
  if (typeof document === "undefined" || !document.body) return;
  translating = true;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  let current = walker.nextNode() as Text | null;
  while (current) {
    const original = textOriginals.get(current) ?? current.nodeValue ?? "";
    if (!textOriginals.has(current)) textOriginals.set(current, original);
    current.nodeValue = language === "en" ? translateString(original) : original;
    current = walker.nextNode() as Text | null;
  }

  document.querySelectorAll<HTMLElement>("input, textarea, button, [title], [aria-label]").forEach((element) => {
    ATTRS.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;
      const key = `data-i18n-original-${attr}`;
      const original = element.getAttribute(key) ?? value;
      if (!element.hasAttribute(key)) element.setAttribute(key, original);
      element.setAttribute(attr, language === "en" ? translateString(original) : original);
    });
  });

  translating = false;
}

function translateString(value: string) {
  const trimmed = value.trim();
  const translated = TEXT_TRANSLATIONS[trimmed];
  let next = translated ? value.replace(trimmed, translated) : value;
  INLINE_TRANSLATIONS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  return next;
}

export function useLanguage() {
  const [language, setCurrentLanguage] = useState<GroveLanguage>(getLanguage);

  useEffect(() => {
    applySavedLanguage();

    function sync(event: Event) {
      setCurrentLanguage((event as CustomEvent<GroveLanguage>).detail ?? getLanguage());
    }

    window.addEventListener(LANGUAGE_EVENT, sync);
    return () => window.removeEventListener(LANGUAGE_EVENT, sync);
  }, []);

  return [language, setLanguage] as const;
}
