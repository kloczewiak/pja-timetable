import { useCookies } from "next-client-cookies";
import { createContext, useContext } from "react";

type CookieContextType = {
  getCookie: (name: string) => string | undefined;
  setCookie: (name: string, value: string) => void;
};

const CookieContext = createContext<CookieContextType | undefined>(undefined);

export function ReactiveCookiesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookies = useCookies();

  const getCookie = (name: string) => cookies.get(name);
  const setCookie = (name: string, value: string) => {
    cookies.set(name, value);
  };

  const value = { getCookie, setCookie };

  return (
    <CookieContext.Provider value={value}>{children}</CookieContext.Provider>
  );
}

export function useReactiveCookies() {
  const context = useContext(CookieContext);
  if (context === undefined) {
    throw new Error(
      "useReactiveCookies must be used within a ReactiveCookiesProvider",
    );
  }
  return context;
}

export function useReactiveCookie<T>(name: string, defaultValue?: T) {
  const { getCookie, setCookie } = useReactiveCookies();

  const cookie = getCookie(name);
  const thisCookie: T = cookie ? JSON.parse(cookie) : defaultValue;
  const setThisCookie = (value: T) => setCookie(name, JSON.stringify(value));

  return [thisCookie, setThisCookie] as const;
}
