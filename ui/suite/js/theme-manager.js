// Unified Theme Manager - Dropdown only, no light/dark toggle
const ThemeManager = (() => {
  let currentThemeId = "default";
  let subscribers = [];

  // Bot ID to theme mapping (configured via config.csv theme-base field)
  const botThemeMap = {
    // Default bot uses light theme with brown accents
    "default": "light",
    // Cristo bot uses mellowgold theme with earth tones
    "cristo": "mellowgold",
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
      localStorage.setItem("gb-theme", "default");
      updateDropdown();
      return;
    }

    const link = document.createElement("link");
    link.id = "theme-css";
    link.rel = "stylesheet";
    link.href = `/public/themes/${theme.file}`;
    link.onload = () => {
      console.log("✓ Theme loaded:", theme.name);
      currentThemeId = id;
      localStorage.setItem("gb-theme", id);
      updateDropdown();
      subscribers.forEach((cb) => cb({ themeId: id, themeName: theme.name }));
    };
    link.onerror = () => console.error("✗ Failed:", theme.name);
    document.head.appendChild(link);
  }

  function updateDropdown() {
    const dd = document.getElementById("themeDropdown");
    if (dd) dd.value = currentThemeId;
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
    // First, load saved bot theme from config.csv (if available)
    loadSavedTheme();

    // Then load the UI theme (CSS theme)
    // Priority: 1) localStorage user preference, 2) bot-specific theme, 3) default
    let saved = localStorage.getItem("gb-theme");
    if (!saved || !themes.find((t) => t.id === saved)) {
      // No user preference, try bot-specific theme
      const botId = getCurrentBotId();
      saved = botThemeMap[botId] || "light";
      // Save to localStorage so it persists
      localStorage.setItem("gb-theme", saved);
    }
    if (!themes.find((t) => t.id === saved)) saved = "default";
    currentThemeId = saved;
    loadTheme(saved);

    const container = document.getElementById("themeSelectorContainer");
    if (container) container.appendChild(createDropdown());

    console.log("✓ Theme Manager initialized");
  }

  function setThemeFromServer(data) {
    // Save theme to localStorage for persistence across page loads
    localStorage.setItem("gb-theme-data", JSON.stringify(data));

    // Load base theme if specified
    if (data.theme_base) {
      loadTheme(data.theme_base);
    }

    if (data.logo_url) {
      document
        .querySelectorAll(".logo-icon, .assistant-avatar")
        .forEach((el) => {
          el.style.backgroundImage = `url("${data.logo_url}")`;
          el.style.backgroundSize = "contain";
          el.style.backgroundRepeat = "no-repeat";
          el.style.backgroundPosition = "center";
          // Clear emoji text content when logo image is applied
          if (el.classList.contains("logo-icon")) {
            el.textContent = "";
          }
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
    const savedTheme = localStorage.getItem("gb-theme-data");
    if (savedTheme) {
      try {
        const data = JSON.parse(savedTheme);
        setThemeFromServer(data);
        console.log("✓ Theme loaded from localStorage");
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
