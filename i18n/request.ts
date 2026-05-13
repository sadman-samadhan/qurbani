import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const locales = ["en", "bn"] as const;

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const raw = cookieStore.get("locale")?.value;
  const locale = locales.includes(raw as any) ? (raw as string) : "bn";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
