"use client";
import { useEffect, useState } from "react";
import { Currency } from "./useCurrencyConversion";

const KEY_CURRENCY = "sk_currency";
const KEY_ENABLED = "sk_currency_enabled";

export function useCurrencySettings() {
  const [currency, setCurrencyState] = useState<Currency>("KES");
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    const c = localStorage.getItem(KEY_CURRENCY) as Currency | null;
    const e = localStorage.getItem(KEY_ENABLED);
    if (c) setCurrencyState(c);
    if (e !== null) setEnabledState(e === "true");
  }, []);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem(KEY_CURRENCY, c);
  }

  function setEnabled(v: boolean) {
    setEnabledState(v);
    localStorage.setItem(KEY_ENABLED, String(v));
  }

  return { currency, setCurrency, enabled, setEnabled };
}
