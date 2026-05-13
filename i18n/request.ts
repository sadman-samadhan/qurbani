import { getRequestConfig } from "next-intl/server";

const locales = ["en", "bn"] as const;

export default getRequestConfig(async ({ locale }) => {
  const currentLocale = locales.includes(locale as any) ? (locale as string) : "en";

  return {
    locale: currentLocale,
    messages: (await import(`../messages/${currentLocale}.json`)).default
  };
});
