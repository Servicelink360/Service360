import { IConfig } from "@app/interfaces/IConfig";

const readReactEnv = (key: string): string => {
  if (typeof process === "undefined" || !process.env) {
    return "";
  }
  const v = process.env[key];
  return typeof v === "string" ? v : "";
};

/** © SERVICELINK {current year} — year updates automatically. */
const buildFooterText = (): string => {
  const brand = readReactEnv("REACT_APP_FOOTER_BRAND") || "SERVICELINK";
  return `© ${brand} ${new Date().getFullYear()}`;
};

// UAT: DEV | UAT | PRODUCTION | DEBUG
const env: IConfig = {
  version: readReactEnv("REACT_APP_VERSION"),
  siteName: readReactEnv("REACT_APP_SITE_NAME"),
  footerText: buildFooterText(),
  orderApiURL: readReactEnv("REACT_APP_ORDER_API_URL"),
};

export default env;
