const PATCH_FLAG = "__OH_YES_LOCALE_COMPARE_PATCHED__";

const originalLocaleCompare = String.prototype.localeCompare;

const toLocaleList = (
  locales?: string | readonly string[] | Intl.Locale | readonly Intl.Locale[],
) => {
  if (!locales) return [];
  if (Array.isArray(locales)) {
    return locales.map((item) => String(item).toLowerCase());
  }
  return [String(locales).toLowerCase()];
};

const isZhLocale = (
  locales?: string | readonly string[] | Intl.Locale | readonly Intl.Locale[],
) => {
  const list = toLocaleList(locales);
  if (list.length === 0) return false;
  return list.some((item) => item.startsWith("zh"));
};

const startsWithLatinOrDigit = (text: string) => {
  const first = text.trim().charAt(0);
  if (!first) return false;
  return /[A-Za-z0-9]/.test(first);
};

const latinFirstCompare = (
  left: string,
  right: string,
  locales?: string | readonly string[] | Intl.Locale | readonly Intl.Locale[],
  options?: Intl.CollatorOptions,
) => {
  const leftLatin = startsWithLatinOrDigit(left);
  const rightLatin = startsWithLatinOrDigit(right);
  if (leftLatin !== rightLatin) {
    return leftLatin ? -1 : 1;
  }
  return originalLocaleCompare.call(left, right, locales as never, options);
};

const globalObject = globalThis as Record<string, unknown>;

if (!globalObject[PATCH_FLAG]) {
  String.prototype.localeCompare = function (
    this: string,
    that: string,
    locales?: string | readonly string[] | Intl.Locale | readonly Intl.Locale[],
    options?: Intl.CollatorOptions,
  ) {
    const left = String(this ?? "");
    const right = String(that ?? "");
    if (isZhLocale(locales)) {
      return latinFirstCompare(left, right, locales, options);
    }
    return originalLocaleCompare.call(left, right, locales as never, options);
  };
  globalObject[PATCH_FLAG] = true;
}

