(function () {
  "use strict";

  const DEFAULT_LOCALE = "en";
  const STORAGE_KEY = "gb-locale";
  const CACHE_TTL_MS = 3600000;

  const MINIMAL_FALLBACK = {
    "label-loading": "Loading...",
    "status-error": "Error",
    "action-retry": "Retry",
  };

  let currentLocale = DEFAULT_LOCALE;
  let translations = {};
  let isInitialized = false;

  function detectBrowserLocale() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const browserLang =
      navigator.language || navigator.userLanguage || DEFAULT_LOCALE;
    const shortLang = browserLang.split("-")[0];

    const supportedLocales = ["en", "pt-BR", "es", "zh-CN"];

    if (supportedLocales.includes(browserLang)) {
      return browserLang;
    }

    const match = supportedLocales.find((loc) => loc.startsWith(shortLang));
    return match || DEFAULT_LOCALE;
  }

  function getCacheKey(locale) {
    return `gb-i18n-cache-${locale}`;
  }

  function getCachedTranslations(locale) {
    try {
      const cached = localStorage.getItem(getCacheKey(locale));
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          return data;
        }
      }
    } catch (e) {
      console.warn("i18n: Failed to read cache", e);
    }
    return null;
  }

  function setCachedTranslations(locale, data) {
    try {
      localStorage.setItem(
        getCacheKey(locale),
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch (e) {
      console.warn("i18n: Failed to write cache", e);
    }
  }

  async function fetchTranslations(locale) {
    try {
      const response = await fetch(`/api/i18n/${locale}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.translations || {};
    } catch (e) {
      console.warn(`i18n: Failed to fetch translations for ${locale}`, e);
      return null;
    }
  }

  async function loadTranslations(locale) {
    const cached = getCachedTranslations(locale);
    if (cached) {
      translations = cached;
      currentLocale = locale;
      return true;
    }

    const fetched = await fetchTranslations(locale);
    if (fetched && Object.keys(fetched).length > 0) {
      translations = fetched;
      currentLocale = locale;
      setCachedTranslations(locale, fetched);
      return true;
    }

    if (locale !== DEFAULT_LOCALE) {
      console.warn(`i18n: Falling back to ${DEFAULT_LOCALE}`);
      return loadTranslations(DEFAULT_LOCALE);
    }

    translations = MINIMAL_FALLBACK;
    return false;
  }

  function t(key, params) {
    let text = translations[key] || MINIMAL_FALLBACK[key] || key;

    if (params && typeof params === "object") {
      Object.keys(params).forEach((param) => {
        text = text.replace(
          new RegExp(`\\{\\s*\\$?${param}\\s*\\}`, "g"),
          params[param],
        );
        text = text.replace(
          new RegExp(`\\{\\s*${param}\\s*\\}`, "g"),
          params[param],
        );
      });
    }

    return text;
  }

  function translateElement(element) {
    const key = element.getAttribute("data-i18n");
    if (key) {
      const paramsAttr = element.getAttribute("data-i18n-params");
      let params = null;

      if (paramsAttr) {
        try {
          params = JSON.parse(paramsAttr);
        } catch (e) {
          console.warn("i18n: Invalid params JSON", paramsAttr);
        }
      }

      element.textContent = t(key, params);
    }

    const placeholderKey = element.getAttribute("data-i18n-placeholder");
    if (placeholderKey) {
      element.setAttribute("placeholder", t(placeholderKey));
    }

    const titleKey = element.getAttribute("data-i18n-title");
    if (titleKey) {
      element.setAttribute("title", t(titleKey));
    }

    const ariaLabelKey = element.getAttribute("data-i18n-aria-label");
    if (ariaLabelKey) {
      element.setAttribute("aria-label", t(ariaLabelKey));
    }
  }

  function translatePage(root) {
    const container = root || document;

    const elements = container.querySelectorAll(
      "[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]",
    );

    elements.forEach(translateElement);
  }

  async function setLocale(locale) {
    if (locale === currentLocale && isInitialized) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, locale);
    await loadTranslations(locale);
    translatePage();

    document.documentElement.setAttribute("lang", locale.split("-")[0]);

    window.dispatchEvent(
      new CustomEvent("localeChanged", {
        detail: { locale: currentLocale },
      }),
    );
  }

  function setupBodyListeners() {
    if (!document.body) {
      return;
    }

    document.body.addEventListener("htmx:afterSwap", (event) => {
      translatePage(event.detail.target);
    });

    document.body.addEventListener("htmx:afterSettle", (event) => {
      translatePage(event.detail.target);
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (
              node.hasAttribute &&
              (node.hasAttribute("data-i18n") ||
                node.hasAttribute("data-i18n-placeholder") ||
                node.hasAttribute("data-i18n-title") ||
                node.hasAttribute("data-i18n-aria-label"))
            ) {
              translateElement(node);
            }
            if (node.querySelectorAll) {
              translatePage(node);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  async function init() {
    if (isInitialized) {
      return;
    }

    const locale = detectBrowserLocale();
    await loadTranslations(locale);

    isInitialized = true;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        translatePage();
        setupBodyListeners();
      });
    } else {
      translatePage();
      setupBodyListeners();
    }
  }

  async function getAvailableLocales() {
    try {
      const response = await fetch("/api/i18n/locales");
      if (response.ok) {
        const data = await response.json();
        return data.locales || ["en"];
      }
    } catch (e) {
      console.warn("i18n: Failed to fetch available locales", e);
    }
    return ["en", "pt-BR", "es"];
  }

  function getCurrentLocale() {
    return currentLocale;
  }

  function clearCache() {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("gb-i18n-cache-")) {
        localStorage.removeItem(key);
      }
    });
  }

  window.i18n = {
    t,
    init,
    setLocale,
    getCurrentLocale,
    getAvailableLocales,
    translatePage,
    translateElement,
    clearCache,
  };

  init().catch((e) => console.error("i18n: Initialization failed", e));
})();
