// Unified Theme Manager - Dropdown only, no light/dark toggle
const ThemeManager = (() => {
  let currentThemeId = "default";
  let subscribers = [];

  // Bot ID to theme mapping (configured via config.csv theme-base field)
  const botThemeMap = {
    // Default bot uses light theme with brown accents
    "default": "light",
    // Cristo bot uses typewriter theme (classic typewriter style)
    "cristo": "typewriter",
    // Salesianos bot uses light theme with blue accents
    "salesianos": "light",
  };

  // Detect current bot from URL path
  function getCurrentBotId() {
    const path = window.location.pathname;
    // Match patterns like /bot/cristo, /cristo, etc.
    const match = path.match(/(?:\/bot\/)?([a-z0-9-]+)/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    return "default";
  }

  const themes = [
    { id: "default", name: "🎨 Default", file: "light.css" },
    { id: "light", name: "☀️ Light", file: "light.css" },
    { id: "orange", name: "🍊 Orange", file: "orange.css" },
    { id: "cyberpunk", name: "🌃 Cyberpunk", file: "cyberpunk.css" },
    { id: "retrowave", name: "🌴 Retrowave", file: "retrowave.css" },
    { id: "vapordream", name: "💭 Vapor Dream", file: "vapordream.css" },
    { id: "y2kglow", name: "✨ Y2K", file: "y2kglow.css" },
    { id: "3dbevel", name: "🔲 3D Bevel", file: "3dbevel.css" },
    { id: "arcadeflash", name: "🕹️ Arcade", file: "arcadeflash.css" },
    { id: "discofever", name: "🪩 Disco", file: "discofever.css" },
    { id: "grungeera", name: "🎸 Grunge", file: "grungeera.css" },
    { id: "jazzage", name: "🎺 Jazz", file: "jazzage.css" },
    { id: "mellowgold", name: "🌻 Mellow", file: "mellowgold.css" },
    { id: "midcenturymod", name: "🏠 Mid Century", file: "midcenturymod.css" },
    {
      id: "polaroidmemories",
      name: "📷 Polaroid",
      file: "polaroidmemories.css",
    },
    {
      id: "saturdaycartoons",
      name: "📺 Cartoons",
      file: "saturdaycartoons.css",
    },
    { id: "seasidepostcard", name: "🏖️ Seaside", file: "seasidepostcard.css" },
    { id: "typewriter", name: "⌨️ Typewriter", file: "typewriter.css" },
    { id: "xeroxui", name: "📠 Xerox", file: "xeroxui.css" },
    { id: "xtreegold", name: "📁 XTree", file: "xtreegold.css" },
  ];

  function loadTheme(id) {
    const theme = themes.find((t) => t.id === id);
    if (!theme) {
      console.warn("Theme not found:", id);
      return;
    }

    const old = document.getElementById("theme-css");
    if (old) old.remove();

    if (!theme.file) {
      currentThemeId = "default";
      const botId = getCurrentBotId();
      localStorage.setItem(`gb-theme-${botId}`, "default");
      // Re-enable sentient theme for default
      document.documentElement.setAttribute("data-theme", "sentient");
      updateDropdown();
      return;
    }

    const link = document.createElement("link");
    link.id = "theme-css";
    link.rel = "stylesheet";
    link.href = `/suite/public/themes/${theme.file}`;
    link.onload = () => {
      console.log("✓ Theme loaded:", theme.name);
      currentThemeId = id;
      const botId = getCurrentBotId();
      localStorage.setItem(`gb-theme-${botId}`, id);

      // Keep data-theme="sentient" on html so CSS selectors work
      // The inline styles will override the colors
      if (!document.documentElement.getAttribute("data-theme")) {
        document.documentElement.setAttribute("data-theme", "sentient");
      }

      // Remove data-theme from body to prevent base.css theme rules from overriding
      document.body.removeAttribute("data-theme");

      // Small delay to ensure CSS variables are applied
      setTimeout(() => {
        // Get the theme's colors from CSS variables
        const rootStyle = getComputedStyle(document.documentElement);
        const primary = rootStyle.getPropertyValue("--primary")?.trim() || "#3b82f6";
        const background = rootStyle.getPropertyValue("--background")?.trim() || "0 0% 100%";
        const foreground = rootStyle.getPropertyValue("--foreground")?.trim() || "222 47% 11%";
        const card = rootStyle.getPropertyValue("--card")?.trim() || "0 0% 98%";
        const border = rootStyle.getPropertyValue("--border")?.trim() || "214 32% 91%";

        // Convert HSL values to hex format for app compatibility
        const hslToHex = (h, s, l) => {
          l /= 100;
          const a = s * Math.min(l, 1 - l) / 100;
          const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
          };
          return `#${f(0)}${f(8)}${f(4)}`;
        };

        const parseHsl = (hslStr) => {
          const match = hslStr.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
          if (match) {
            return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
          }
          return null;
        };

        const bgHsl = parseHsl(background);
        const fgHsl = parseHsl(foreground);
        const cardHsl = parseHsl(card);
        const borderHsl = parseHsl(border);

        // Update the app's CSS variables with the theme colors
        // These inline styles override the theme-sentient.css values
        if (bgHsl) {
          const bgHex = hslToHex(...bgHsl);
          document.documentElement.style.setProperty("--bg", bgHex);
          document.documentElement.style.setProperty("--primary-bg", `hsl(${background})`);
          document.documentElement.style.setProperty("--header-bg", bgHex);
        }
        if (fgHsl) {
          const textHex = hslToHex(...fgHsl);
          document.documentElement.style.setProperty("--text", textHex);
          document.documentElement.style.setProperty("--primary-fg", `hsl(${foreground})`);
        }
        if (cardHsl) {
          const surfaceHex = hslToHex(...cardHsl);
          document.documentElement.style.setProperty("--surface", surfaceHex);
          document.documentElement.style.setProperty("--card-bg", surfaceHex);
        }
        if (borderHsl) {
          const borderHex = hslToHex(...borderHsl);
          document.documentElement.style.setProperty("--border", borderHex);
        }

        // Check if config.csv already set the primary color, we shouldn't wipe it
        // Only update color and suggestion variables if they aren't marked as bot-config
        if (document.documentElement.getAttribute("data-has-bot-colors") !== "true") {
          document.documentElement.style.setProperty("--chat-color1", `hsl(${primary})`);
          document.documentElement.style.setProperty("--chat-color2", `hsl(${card})`);
          document.documentElement.style.setProperty("--suggestion-color", `hsl(${primary})`);
          document.documentElement.style.setProperty("--suggestion-bg", `hsl(${card})`);
          document.documentElement.style.setProperty("--color1", `hsl(${primary})`);
          document.documentElement.style.setProperty("--color2", `hsl(${card})`);
        }

        console.log("✓ Theme colors applied:", { bg: background, primary: primary });
        updateDropdown();
        subscribers.forEach((cb) => cb({ themeId: id, themeName: theme.name }));
      }, 50);
    };
    link.onerror = () => console.error("✗ Failed:", theme.name);
    document.head.appendChild(link);
  }

  function updateDropdown() {
    // Dropdown removed
  }

  function createDropdown() {
    const select = document.createElement("select");
    select.id = "themeDropdown";
    select.className = "theme-dropdown";
    themes.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      select.appendChild(opt);
    });
    select.value = currentThemeId;
    select.onchange = (e) => loadTheme(e.target.value);
    return select;
  }

  function init() {
    // Ensure data-theme is set on html element so CSS selectors work
    if (!document.documentElement.getAttribute("data-theme")) {
      document.documentElement.setAttribute("data-theme", "sentient");
    }

    // First, load saved bot theme from config.csv (if available)
    loadSavedTheme();

    // Then load the UI theme (CSS theme)
    // Priority: 1) localStorage user preference, 2) bot-specific theme, 3) default
    const botId = getCurrentBotId();
    let saved = localStorage.getItem(`gb-theme-${botId}`);
    if (!saved || !themes.find((t) => t.id === saved)) {
      // No user preference, try bot-specific theme
      saved = botThemeMap[botId] || "light";
      // Save to localStorage so it persists
      localStorage.setItem(`gb-theme-${botId}`, saved);
    }
    if (!themes.find((t) => t.id === saved)) saved = "default";
    currentThemeId = saved;
    loadTheme(saved);

    // Dropdown injection removed
    // const container = document.getElementById("themeSelectorContainer");
    // if (container) container.appendChild(createDropdown());

    console.log("✓ Theme Manager initialized");
  }

  function setThemeFromServer(data) {
    // Save theme to localStorage for persistence across page loads
    const botId = getCurrentBotId();
    localStorage.setItem(`gb-theme-data-${botId}`, JSON.stringify(data));

    // Load base theme if specified
    if (data.theme_base) {
      loadTheme(data.theme_base);
    }

    if (data.logo_url) {
      // For img elements - set src and show, hide SVG
      const logoImg = document.querySelector('.logo-icon-img');
      const logoSvg = document.querySelector('.logo-icon-svg');
      if (logoImg && logoSvg) {
        logoImg.src = data.logo_url;
        logoImg.alt = data.title || 'Logo';
        logoImg.style.display = 'block';
        logoSvg.style.display = 'none';
      }

      // For elements that use background image
      document
        .querySelectorAll(".assistant-avatar")
        .forEach((el) => {
          el.style.backgroundImage = `url("${data.logo_url}")`;
          el.style.backgroundSize = "contain";
          el.style.backgroundRepeat = "no-repeat";
          el.style.backgroundPosition = "center";
        });
    }
    if (data.color1) {
      document.documentElement.style.setProperty("--color1", data.color1);
    }
    if (data.color2) {
      document.documentElement.style.setProperty("--color2", data.color2);
    }
    if (data.title) document.title = data.title;
    if (data.logo_text) {
      document.querySelectorAll(".logo span, .logo-text").forEach((el) => {
        el.textContent = data.logo_text;
      });
    }
  }

  // Load saved theme from localStorage on page load
  function loadSavedTheme() {
    const botId = getCurrentBotId();
    const savedTheme = localStorage.getItem(`gb-theme-data-${botId}`);
    if (savedTheme) {
      try {
        const data = JSON.parse(savedTheme);
        setThemeFromServer(data);
        console.log(`✓ Theme loaded from localStorage for ${botId}`);
      } catch (e) {
        console.warn("Failed to load saved theme:", e);
      }
    }
  }

  function applyCustomizations() {
    // Called by modules if needed
  }

  function subscribe(cb) {
    subscribers.push(cb);
  }

  return {
    init,
    loadTheme,
    setThemeFromServer,
    loadSavedTheme,
    applyCustomizations,
    subscribe,
    getAvailableThemes: () => themes,
  };
})();

window.ThemeManager = ThemeManager;
