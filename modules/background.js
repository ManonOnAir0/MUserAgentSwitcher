const DEFAULTS = {
  ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  ch_ua: '"Chromium";v="143", "Google Chrome";v="143", "Not.A/Brand";v="99"',
  ch_platform: '"Windows"',
  ch_mobile: "?0"
};

const STORAGE_KEYS = [
  "sites",
  "customUA",
  "customCH_UA",
  "customCH_Platform",
  "customCH_Mobile"
];

const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "xmlhttprequest",
  "script",
  "image",
  "media",
  "other"
];

const TWITCH_EXCLUDED_TOP_DOMAINS = ["twitch.tv"];

const HEADER_SPECS = [
  ["User-Agent", "customUA", "ua"],
  ["Sec-CH-UA", "customCH_UA", "ch_ua"],
  ["Sec-CH-UA-Platform", "customCH_Platform", "ch_platform"],
  ["Sec-CH-UA-Mobile", "customCH_Mobile", "ch_mobile"]
];

const maxDynamicRules =
  typeof chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES === "number"
    ? chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES
    : 5000;

let updateQueue = Promise.resolve();

function updateRules() {
  updateQueue = updateQueue.then(applyNetRequestRules).catch(() => {});
}

function buildRequestHeaders(stored) {
  return HEADER_SPECS.map(([headerName, storageKey, defaultKey]) => ({
    header: headerName,
    operation: "set",
    value: stored[storageKey] || DEFAULTS[defaultKey]
  }));
}

function collectCappedSites(sites) {
  return sites
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .slice(0, maxDynamicRules);
}

function conditionForSite(site) {
  const base = {
    urlFilter: `||${site}`,
    resourceTypes: RESOURCE_TYPES
  };
  if (site.toLowerCase() === "twitch.tv") {
    base.excludedTopDomains = TWITCH_EXCLUDED_TOP_DOMAINS;
  }
  return base;
}

function buildRulesForSites(capped, stored) {
  const requestHeaders = buildRequestHeaders(stored);
  return capped.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "modifyHeaders", requestHeaders },
    condition: conditionForSite(site)
  }));
}

async function applyNetRequestRules() {
  const [stored, oldRules] = await Promise.all([
    chrome.storage.sync.get(STORAGE_KEYS),
    chrome.declarativeNetRequest.getDynamicRules()
  ]);

  const sites = Array.isArray(stored.sites)
    ? stored.sites.map((entry) => String(entry).trim()).filter(Boolean)
    : [];

  const capped = collectCappedSites(sites);
  if (capped.length === 0 && oldRules.length === 0) return;

  const addRules = buildRulesForSites(capped, stored);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRules.map((r) => r.id),
    addRules
  });
}

chrome.runtime.onInstalled.addListener(updateRules);
chrome.runtime.onStartup.addListener(updateRules);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  const relevant = STORAGE_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(changes, key)
  );
  if (relevant) updateRules();
});
