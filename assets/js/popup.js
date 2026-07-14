(function () {
  "use strict";

  const PACK_DOMAINS = Object.freeze(["twitch.tv", "streamrunners.fr"]);
  const ONBOARDING_VERSION_KEY = "lastOnboardingAppVersion";
  const LANGUAGE_KEY = "uiLanguage";
  const DEFAULT_LANGUAGE = "fr";
  const SUPPORTED_LANGUAGES = Object.freeze(["fr", "en"]);
  const TOAST_MS = 3000;

  const DEFAULTS = Object.freeze({
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    ch_ua: '"Chromium";v="143", "Google Chrome";v="143", "Not.A/Brand";v="99"',
    ch_platform: '"Windows"',
    ch_mobile: "?0"
  });

  const state = {
    language: DEFAULT_LANGUAGE,
    translations: {},
    appReady: false,
    onboardingFinalPackActivated: null
  };

  function getStorage(area) {
    return area === "local" ? chrome.storage.local : chrome.storage.sync;
  }

  function storageGet(area, keys) {
    return new Promise((resolve, reject) => {
      getStorage(area).get(keys, (result) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(result);
      });
    });
  }

  function storageSet(area, items) {
    return new Promise((resolve, reject) => {
      getStorage(area).set(items, () => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
  }

  function storageSyncGet(keys) {
    return storageGet("sync", keys);
  }

  function storageSyncSet(items) {
    return storageSet("sync", items);
  }

  function storageLocalGet(keys) {
    return storageGet("local", keys);
  }

  function storageLocalSet(items) {
    return storageSet("local", items);
  }

  function getExtensionVersion() {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return "0";
    }
  }

  function resolveTextKey(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
      if (!current || typeof current !== "object" || !(parts[i] in current)) {
        return null;
      }
      current = current[parts[i]];
    }
    return typeof current === "string" ? current : null;
  }

  function t(key, params) {
    const raw = resolveTextKey(state.translations, key);
    const base = raw === null ? key : raw;
    if (!params) return base;
    return base.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, token) =>
      Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : `{${token}}`
    );
  }

  async function fetchLanguageFile(lang) {
    const response = await fetch(chrome.runtime.getURL(`assets/language/${lang}.json`));
    if (!response.ok) throw new Error("language_load_failed");
    return response.json();
  }

  function setText(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.textContent = t(key);
  }

  function setHtml(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = t(key);
  }

  function setManyText(selectors, key) {
    document.querySelectorAll(selectors).forEach((el) => {
      el.textContent = t(key);
    });
  }

  function setLabeledContent(selector, key, iconClass) {
    const el = document.querySelector(selector);
    if (!el) return;
    const safeIconClass = typeof iconClass === "string" ? iconClass : "";
    el.innerHTML = `<i class="${safeIconClass}" aria-hidden="true"></i>${t(key)}`;
  }

  function applyStaticTranslations() {
    setText(".brand-text span", "brand.subtitle");

    const navLabels = document.querySelectorAll(".tab-btn .tab-btn-label");
    if (navLabels.length >= 6) {
      navLabels[0].textContent = t("nav.home");
      navLabels[1].textContent = t("nav.presets");
      navLabels[2].textContent = t("nav.settings");
      navLabels[3].textContent = t("nav.community");
      navLabels[4].textContent = t("nav.help");
      navLabels[5].textContent = t("nav.about");
    }

    setText("#onboarding-step-1 .onboarding-title", "onboarding.step1.title");
    setText("#onboarding-step-1 .onboarding-text", "onboarding.step1.text");
    setText("#onboarding-next", "common.continue");

    setText("#onboarding-step-2 .onboarding-title", "onboarding.step2.title");
    setText("#onboarding-step-2 .onboarding-text", "onboarding.step2.text");
    setText("#onboarding-next-2", "common.continue");

    setText("#onboarding-step-3 .onboarding-title", "onboarding.step3.title");
    setHtml("#onboarding-step-3 .onboarding-text", "onboarding.step3.text");
    setText("#onboarding-next-3", "common.continue");

    setText("#onboarding-step-4 .onboarding-title", "onboarding.step4.title");
    setHtml("#onboarding-step-4 .onboarding-text", "onboarding.step4.text");
    setHtml("#onboarding-step-4 .onboarding-text--tight", "onboarding.step4.text_extra");
    setText("#onboarding-apply-pack", "onboarding.step4.enable");
    setText("#onboarding-skip-pack", "onboarding.step4.skip");

    setText("#onboarding-step-5 .onboarding-title", "onboarding.step5.title");
    setText("#onboarding-finish", "onboarding.step5.finish");

    setText("#dashboard .page-title", "dashboard.title");
    setText("#dashboard .page-subtitle", "dashboard.subtitle");
    setLabeledContent("#add-site", "dashboard.add_site_button", "fa-solid fa-plus btn-inline-icon");
    setText("#dashboard .section-label", "dashboard.active_list");
    setHtml("#empty-msg", "dashboard.empty");

    setText("#presets .page-title", "presets.title");
    setLabeledContent(
      "#presets .card h3",
      "presets.pack.title",
      "fa-solid fa-puzzle-piece heading-icon"
    );
    setHtml("#presets .card p:first-of-type", "presets.pack.description");
    setHtml("#presets .card-note", "presets.pack.note");

    setText("#settings .page-title", "settings.title");
    setText("#settings .page-subtitle", "settings.subtitle");
    setText("#settings .card h3", "settings.headers_title");
    setText("#settings .card p", "settings.headers_description");
    setText("label[for='ua-input']", "settings.fields.ua");
    setText("label[for='ch-ua-input']", "settings.fields.ch_ua");
    setText("label[for='ch-platform-input']", "settings.fields.platform");
    setText("label[for='ch-mobile-input']", "settings.fields.mobile");
    setText("#save-ua", "settings.save");
    setText("#reset-ua", "settings.reset");
    setHtml("#settings .form-hint p", "settings.warning");

    setText("#community .page-title", "community.title");
    setText("#community .page-subtitle", "community.subtitle");
    setLabeledContent(
      "#community .card--discord h3",
      "community.discord.title",
      "fa-brands fa-discord heading-icon"
    );
    setText("#community .card--discord p", "community.discord.description");
    setLabeledContent(
      "#community .card--discord a",
      "community.discord.button",
      "fa-brands fa-discord btn-inline-icon"
    );
    setLabeledContent(
      "#community .card--patreon h3",
      "community.patreon.title",
      "fa-brands fa-patreon heading-icon"
    );
    setText("#community .card--patreon p", "community.patreon.description");
    setLabeledContent(
      "#community .card--patreon a",
      "community.patreon.button",
      "fa-brands fa-patreon btn-inline-icon"
    );

    setText("#tutorial .page-title", "tutorial.title");
    setText("#tutorial .page-subtitle", "tutorial.subtitle");
    const tutorialSteps = document.querySelectorAll("#tutorial .step");
    if (tutorialSteps.length >= 3) {
      const step1Title = tutorialSteps[0].querySelector("h4");
      const step2Title = tutorialSteps[1].querySelector("h4");
      const step3Title = tutorialSteps[2].querySelector("h4");
      const step1Text = tutorialSteps[0].querySelector("p");
      const step2Text = tutorialSteps[1].querySelector("p");
      const step3Text = tutorialSteps[2].querySelector("p");
      if (step1Title) step1Title.textContent = t("tutorial.step1.title");
      if (step2Title) step2Title.textContent = t("tutorial.step2.title");
      if (step3Title) step3Title.textContent = t("tutorial.step3.title");
      if (step1Text) step1Text.textContent = t("tutorial.step1.text");
      if (step2Text) step2Text.innerHTML = t("tutorial.step2.text");
      if (step3Text) step3Text.innerHTML = t("tutorial.step3.text");
    }

    setText("#about .page-title", "about.title");
    const aboutCards = document.querySelectorAll("#about .card");
    if (aboutCards.length >= 2) {
      const card1Title = aboutCards[0].querySelector("h3");
      const card1Text = aboutCards[0].querySelector("p");
      const card2Title = aboutCards[1].querySelector("h3");
      const card2Text = aboutCards[1].querySelector("p");
      if (card1Title) card1Title.textContent = t("about.card1.title");
      if (card1Text) card1Text.innerHTML = t("about.card1.text");
      if (card2Title) card2Title.textContent = t("about.card2.title");
      if (card2Text) card2Text.innerHTML = t("about.card2.text");
    }
    setHtml("#about .about-footer p", "about.footer");
    setText("#footer-link-website", "footer.website");
    setText("#footer-link-project", "footer.project_page");

    ["language-select", "onboarding-language-select"].forEach((selectId) => {
      const languageSelect = document.getElementById(selectId);
      if (!languageSelect) return;
      languageSelect.setAttribute("aria-label", t("language.selector_aria"));
      const frOption = languageSelect.querySelector("option[value='fr']");
      const enOption = languageSelect.querySelector("option[value='en']");
      if (frOption) frOption.textContent = t("language.option.fr");
      if (enOption) enOption.textContent = t("language.option.en");
    });
  }

  function isPackActive(sites) {
    return PACK_DOMAINS.every((domain) => sites.includes(domain));
  }

  function normalizeSites(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function applyPackToSites(sites) {
    const next = sites.slice();
    let changed = false;
    for (let i = 0; i < PACK_DOMAINS.length; i++) {
      if (!next.includes(PACK_DOMAINS[i])) {
        next.push(PACK_DOMAINS[i]);
        changed = true;
      }
    }
    return { sites: next, changed };
  }

  function stripPackFromSites(sites) {
    return sites.filter((site) => !PACK_DOMAINS.includes(site));
  }

  function showNotification(message, type) {
    const container = document.getElementById("notification-area");
    if (!container) return;

    const kind = type === "error" ? "error" : "success";
    const toast = document.createElement("div");
    toast.className = `toast ${kind}`;

    const icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    icon.className =
      kind === "success"
        ? "fa-solid fa-check toast-icon toast-icon-success"
        : "fa-solid fa-circle-exclamation toast-icon toast-icon-error";

    const content = document.createElement("span");
    content.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(content);
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.3s ease";
      window.setTimeout(() => toast.remove(), 300);
    }, TOAST_MS);
  }

  function updatePackButtonUI(isActive) {
    const packBtn = document.getElementById("btn-config-twitch");
    if (!packBtn) return;

    if (isActive) {
      packBtn.innerHTML = `<i class="fa-solid fa-power-off btn-inline-icon" aria-hidden="true"></i>${t(
        "presets.pack.disable_button"
      )}`;
      packBtn.classList.remove("btn-primary");
      packBtn.classList.add("btn-secondary");
      return;
    }

    packBtn.innerHTML = `<i class="fa-solid fa-bolt btn-inline-icon" aria-hidden="true"></i>${t(
      "presets.pack.enable_button"
    )}`;
    packBtn.classList.remove("btn-secondary");
    packBtn.classList.add("btn-primary");
  }

  async function removeSite(site) {
    try {
      const result = await storageSyncGet(["sites"]);
      const current = normalizeSites(result.sites);
      await storageSyncSet({ sites: current.filter((entry) => entry !== site) });
      await displaySites();
      showNotification(t("notify.site_removed"));
    } catch {
      showNotification(t("notify.site_update_failed"), "error");
    }
  }

  async function disablePackFromList() {
    try {
      const result = await storageSyncGet(["sites"]);
      await storageSyncSet({ sites: stripPackFromSites(normalizeSites(result.sites)) });
      await displaySites();
      showNotification(t("notify.pack_disabled"));
    } catch {
      showNotification(t("notify.site_update_failed"), "error");
    }
  }

  function createDeleteButton(titleKey, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-icon";
    button.title = t(titleKey);
    button.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
    button.addEventListener("click", handler);
    return button;
  }

  function createSiteRow(site, isPack) {
    const row = document.createElement("li");
    row.className = isPack ? "site-item site-item--pack" : "site-item";

    const info = document.createElement("div");
    info.className = "site-info";

    const dot = document.createElement("div");
    dot.className = "status-dot";

    const name = document.createElement("span");
    name.className = "site-name";
    name.textContent = isPack ? t("presets.pack.row_label") : site;

    info.appendChild(dot);
    info.appendChild(name);
    row.appendChild(info);

    const deleteButton = isPack
      ? createDeleteButton("presets.pack.row_remove_title", disablePackFromList)
      : createDeleteButton("dashboard.remove_site_title", () => removeSite(site));
    row.appendChild(deleteButton);

    return row;
  }

  async function displaySites() {
    const list = document.getElementById("site-list");
    const emptyMessage = document.getElementById("empty-msg");
    if (!list) return;

    try {
      const result = await storageSyncGet(["sites"]);
      const sites = normalizeSites(result.sites);
      const activePack = isPackActive(sites);
      const otherSites = activePack ? stripPackFromSites(sites) : sites.slice();

      updatePackButtonUI(activePack);
      list.textContent = "";

      if (sites.length === 0) {
        if (emptyMessage) emptyMessage.style.display = "block";
        return;
      }

      if (emptyMessage) emptyMessage.style.display = "none";

      if (activePack) {
        list.appendChild(createSiteRow("", true));
      }

      for (let i = 0; i < otherSites.length; i++) {
        list.appendChild(createSiteRow(otherSites[i], false));
      }
    } catch {
      showNotification(t("notify.load_sites_failed"), "error");
    }
  }

  async function togglePack() {
    try {
      const result = await storageSyncGet(["sites"]);
      const sites = normalizeSites(result.sites);
      if (isPackActive(sites)) {
        await storageSyncSet({ sites: stripPackFromSites(sites) });
        showNotification(t("notify.pack_disabled"));
      } else {
        const next = applyPackToSites(sites);
        if (!next.changed) {
          showNotification(t("notify.pack_already_enabled"));
          return;
        }
        await storageSyncSet({ sites: next.sites });
        showNotification(t("notify.pack_enabled"));
      }
      await displaySites();
    } catch {
      showNotification(t("notify.pack_toggle_failed"), "error");
    }
  }

  function initTabs() {
    const nav = document.querySelector(".nav-tabs");
    if (!nav) return;

    nav.addEventListener("click", (event) => {
      const button = event.target.closest(".tab-btn");
      if (!button || !nav.contains(button)) return;

      const tabId = button.getAttribute("data-tab");
      if (!tabId) return;

      nav.querySelectorAll(".tab-btn").forEach((tabButton) => tabButton.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      const panel = document.getElementById(tabId);
      if (panel) panel.classList.add("active");
    });
  }

  function initPackButton() {
    const button = document.getElementById("btn-config-twitch");
    if (!button) return;
    button.addEventListener("click", () => {
      togglePack();
    });
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function addCurrentSite() {
    let tab;
    try {
      tab = await getActiveTab();
    } catch {
      showNotification(t("notify.active_tab_unavailable"), "error");
      return;
    }

    if (!tab || !tab.url || tab.url.startsWith("chrome://")) {
      showNotification(t("notify.internal_page_blocked"), "error");
      return;
    }

    let hostname = "";
    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      showNotification(t("notify.invalid_page_address"), "error");
      return;
    }

    if (!hostname) {
      showNotification(t("notify.invalid_page_address"), "error");
      return;
    }

    try {
      const result = await storageSyncGet(["sites"]);
      const sites = normalizeSites(result.sites);
      if (sites.includes(hostname)) {
        showNotification(t("notify.site_already_exists"), "error");
        return;
      }
      sites.push(hostname);
      await storageSyncSet({ sites });
      await displaySites();
      showNotification(t("notify.site_added"));
    } catch {
      showNotification(t("notify.save_site_failed"), "error");
    }
  }

  function initAddSite() {
    const button = document.getElementById("add-site");
    if (!button) return;
    button.addEventListener("click", () => {
      addCurrentSite();
    });
  }

  async function loadUaInputs() {
    const result = await storageSyncGet(["customUA", "customCH_UA", "customCH_Platform", "customCH_Mobile"]);
    const uaInput = document.getElementById("ua-input");
    const chUaInput = document.getElementById("ch-ua-input");
    const chPlatformInput = document.getElementById("ch-platform-input");
    const chMobileInput = document.getElementById("ch-mobile-input");
    if (!uaInput || !chUaInput || !chPlatformInput || !chMobileInput) return;

    uaInput.value = result.customUA || DEFAULTS.ua;
    chUaInput.value = result.customCH_UA || DEFAULTS.ch_ua;
    chPlatformInput.value = result.customCH_Platform || DEFAULTS.ch_platform;
    chMobileInput.value = result.customCH_Mobile || DEFAULTS.ch_mobile;
  }

  async function saveUaInputs() {
    const uaInput = document.getElementById("ua-input");
    const chUaInput = document.getElementById("ch-ua-input");
    const chPlatformInput = document.getElementById("ch-platform-input");
    const chMobileInput = document.getElementById("ch-mobile-input");
    if (!uaInput || !chUaInput || !chPlatformInput || !chMobileInput) return;

    await storageSyncSet({
      customUA: uaInput.value.trim(),
      customCH_UA: chUaInput.value.trim(),
      customCH_Platform: chPlatformInput.value.trim(),
      customCH_Mobile: chMobileInput.value.trim()
    });
  }

  async function resetUaInputs() {
    const uaInput = document.getElementById("ua-input");
    const chUaInput = document.getElementById("ch-ua-input");
    const chPlatformInput = document.getElementById("ch-platform-input");
    const chMobileInput = document.getElementById("ch-mobile-input");
    if (!uaInput || !chUaInput || !chPlatformInput || !chMobileInput) return;

    uaInput.value = DEFAULTS.ua;
    chUaInput.value = DEFAULTS.ch_ua;
    chPlatformInput.value = DEFAULTS.ch_platform;
    chMobileInput.value = DEFAULTS.ch_mobile;
    await storageSyncSet({
      customUA: DEFAULTS.ua,
      customCH_UA: DEFAULTS.ch_ua,
      customCH_Platform: DEFAULTS.ch_platform,
      customCH_Mobile: DEFAULTS.ch_mobile
    });
  }

  function initUaPanel() {
    const saveButton = document.getElementById("save-ua");
    const resetButton = document.getElementById("reset-ua");
    if (!saveButton || !resetButton) return;

    loadUaInputs().catch(() => {});

    saveButton.addEventListener("click", async () => {
      try {
        await saveUaInputs();
        showNotification(t("notify.ua_saved"));
      } catch {
        showNotification(t("notify.ua_save_failed"), "error");
      }
    });

    resetButton.addEventListener("click", async () => {
      try {
        await resetUaInputs();
        showNotification(t("notify.ua_reset"));
      } catch {
        showNotification(t("notify.ua_reset_failed"), "error");
      }
    });
  }

  function refreshOnboardingFinalStep() {
    const packLine = document.getElementById("onboarding-step-5-pack-line");
    const jokeLine = document.getElementById("onboarding-step-5-joke");
    const panel = document.getElementById("onboarding-step-5-panel");
    if (!packLine || !jokeLine || !panel || state.onboardingFinalPackActivated === null) return;

    panel.classList.toggle("onboarding-panel--success", state.onboardingFinalPackActivated);
    packLine.textContent = state.onboardingFinalPackActivated
      ? t("onboarding.step5.pack_enabled")
      : t("onboarding.step5.pack_skipped");
    jokeLine.textContent = t("onboarding.step5.joke");
  }

  function initOnboarding() {
    const overlay = document.getElementById("onboarding-overlay");
    const steps = [
      document.getElementById("onboarding-step-1"),
      document.getElementById("onboarding-step-2"),
      document.getElementById("onboarding-step-3"),
      document.getElementById("onboarding-step-4"),
      document.getElementById("onboarding-step-5")
    ];
    const next1 = document.getElementById("onboarding-next");
    const next2 = document.getElementById("onboarding-next-2");
    const next3 = document.getElementById("onboarding-next-3");
    const onboardingLanguageSelect = document.getElementById("onboarding-language-select");
    const applyButton = document.getElementById("onboarding-apply-pack");
    const skipButton = document.getElementById("onboarding-skip-pack");
    const finishButton = document.getElementById("onboarding-finish");
    const kicker = document.getElementById("onboarding-kicker");
    const dots = document.getElementById("onboarding-dots");
    const onboardingKickers = ["1 / 5", "2 / 5", "3 / 5", "4 / 5", "5 / 5"];

    if (
      !overlay ||
      steps.some((step) => !step) ||
      !next1 ||
      !next2 ||
      !next3 ||
      !onboardingLanguageSelect ||
      !applyButton ||
      !skipButton ||
      !finishButton
    ) {
      return;
    }

    const updateChrome = (stepNumber) => {
      if (kicker && stepNumber >= 1 && stepNumber <= 5) {
        kicker.textContent = onboardingKickers[stepNumber - 1];
      }
      if (!dots) return;
      dots.querySelectorAll(".onboarding-dot").forEach((dot, index) => {
        const currentStep = index + 1;
        dot.classList.toggle("is-done", currentStep < stepNumber);
        dot.classList.toggle("is-current", currentStep === stepNumber);
      });
    };

    const setStep = (stepNumber) => {
      for (let i = 0; i < steps.length; i++) {
        steps[i].classList.toggle("active", i + 1 === stepNumber);
      }
      const activeScreen = steps[stepNumber - 1];
      if (activeScreen) {
        const panel = activeScreen.querySelector(".onboarding-panel");
        if (panel) {
          panel.style.animation = "none";
          void panel.offsetWidth;
          panel.style.removeProperty("animation");
        }
      }
      updateChrome(stepNumber);
    };

    const open = () => {
      overlay.style.opacity = "1";
      overlay.style.transition = "";
      overlay.style.display = "flex";
      onboardingLanguageSelect.value = state.language;
      setStep(1);
    };

    const close = () => {
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.3s ease";
      window.setTimeout(() => {
        overlay.style.display = "none";
      }, 300);
    };

    const showFinalStep = (packActivated) => {
      state.onboardingFinalPackActivated = packActivated;
      refreshOnboardingFinalStep();
      setStep(5);
    };

    const persistDone = async () => {
      const version = getExtensionVersion();
      try {
        await storageLocalSet({ [ONBOARDING_VERSION_KEY]: version });
        await storageSyncSet({ onboardingCompleted: true });
      } catch {
      }
      close();
    };

    Promise.all([storageLocalGet([ONBOARDING_VERSION_KEY]), storageSyncGet(["onboardingCompleted"])])
      .then(([localRes, syncRes]) => {
        const version = getExtensionVersion();
        const lastVersion = localRes[ONBOARDING_VERSION_KEY];
        const completed = syncRes.onboardingCompleted === true;
        if (!completed || lastVersion !== version) open();
      })
      .catch(() => {});

    next1.addEventListener("click", () => setStep(2));
    next2.addEventListener("click", () => setStep(3));
    next3.addEventListener("click", () => setStep(4));
    onboardingLanguageSelect.addEventListener("change", async (event) => {
      const selectedLanguage = event.target.value;
      try {
        await setLanguage(selectedLanguage, true);
      } catch {
        showNotification(t("notify.language_change_failed"), "error");
      }
    });

    applyButton.addEventListener("click", async () => {
      try {
        const result = await storageSyncGet(["sites"]);
        const next = applyPackToSites(normalizeSites(result.sites));
        if (next.changed) {
          await storageSyncSet({ sites: next.sites });
        }
        await displaySites();
        showFinalStep(true);
      } catch {
        showNotification(t("notify.pack_enable_failed"), "error");
      }
    });

    skipButton.addEventListener("click", () => {
      showFinalStep(false);
    });

    finishButton.addEventListener("click", () => {
      persistDone();
    });
  }

  function renderFooterCopyright() {
    const year = new Date().getFullYear();
    const line = t("footer.copyright", { year });
    const appFooter = document.getElementById("app-footer-copy");
    const onboardingFooter = document.getElementById("onboarding-bar-copy");
    if (appFooter) appFooter.textContent = line;
    if (onboardingFooter) onboardingFooter.textContent = line;
  }

  function renderVersion() {
    const version = getExtensionVersion();
    const badge = document.getElementById("version-badge");
    const aboutVersion = document.getElementById("about-version");
    const versionText = t("common.version_label", { version });
    if (badge) {
      badge.textContent = `v${version}`;
      badge.removeAttribute("hidden");
      badge.setAttribute("aria-label", versionText);
    }
    if (aboutVersion) {
      aboutVersion.textContent = versionText;
      aboutVersion.removeAttribute("hidden");
    }
  }

  function injectLanguageSelector() {
    const topBar = document.querySelector(".top-bar");
    const versionBadge = document.getElementById("version-badge");
    if (!topBar || !versionBadge) return;

    const wrapper = document.createElement("div");
    wrapper.className = "top-bar-meta";

    const selectWrap = document.createElement("div");
    selectWrap.className = "language-select-wrap";

    const select = document.createElement("select");
    select.id = "language-select";
    select.className = "language-select";

    const fr = document.createElement("option");
    fr.value = "fr";
    fr.textContent = t("language.option.fr");

    const en = document.createElement("option");
    en.value = "en";
    en.textContent = t("language.option.en");

    select.appendChild(fr);
    select.appendChild(en);
    select.value = state.language;
    select.setAttribute("aria-label", t("language.selector_aria"));

    const caret = document.createElement("i");
    caret.className = "fa-solid fa-chevron-down language-select-caret";
    caret.setAttribute("aria-hidden", "true");

    selectWrap.appendChild(select);
    selectWrap.appendChild(caret);
    wrapper.appendChild(selectWrap);
    versionBadge.parentElement.removeChild(versionBadge);
    wrapper.appendChild(versionBadge);
    topBar.appendChild(wrapper);

    select.addEventListener("change", async (event) => {
      const nextLanguage = event.target.value;
      try {
        await setLanguage(nextLanguage, true);
      } catch {
        showNotification(t("notify.language_change_failed"), "error");
      }
    });
  }

  async function setLanguage(lang, persist) {
    const normalized = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

    try {
      state.translations = await fetchLanguageFile(normalized);
      state.language = normalized;
    } catch {
      if (normalized !== DEFAULT_LANGUAGE) {
        state.translations = await fetchLanguageFile(DEFAULT_LANGUAGE);
        state.language = DEFAULT_LANGUAGE;
      } else {
        throw new Error("language_unavailable");
      }
    }

    document.documentElement.setAttribute("lang", state.language);
    applyStaticTranslations();
    renderVersion();
    renderFooterCopyright();
    refreshOnboardingFinalStep();

    if (state.appReady) {
      await displaySites();
    }

    const select = document.getElementById("language-select");
    if (select) select.value = state.language;
    const onboardingSelect = document.getElementById("onboarding-language-select");
    if (onboardingSelect) onboardingSelect.value = state.language;

    if (persist) {
      storageSyncSet({ [LANGUAGE_KEY]: state.language }).catch(() => {});
    }
  }

  async function initLanguage() {
    let storedLanguage = DEFAULT_LANGUAGE;
    try {
      const result = await storageSyncGet([LANGUAGE_KEY]);
      if (typeof result[LANGUAGE_KEY] === "string") {
        storedLanguage = result[LANGUAGE_KEY];
      }
    } catch {
    }
    await setLanguage(storedLanguage, false);
  }

  async function boot() {
    await initLanguage();
    injectLanguageSelector();
    initTabs();
    initPackButton();
    initAddSite();
    initUaPanel();
    await displaySites();
    initOnboarding();
    state.appReady = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      boot().catch(() => {});
    });
  } else {
    boot().catch(() => {});
  }
})();
