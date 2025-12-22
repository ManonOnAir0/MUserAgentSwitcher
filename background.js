const DEFAULTS = {
  ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  ch_ua: '"Chromium";v="143", "Google Chrome";v="143", "Not.A/Brand";v="99"',
  ch_platform: '"Windows"',
  ch_mobile: "?0"
};

async function updateRules() {
  const result = await chrome.storage.sync.get([
    'sites', 
    'customUA', 
    'customCH_UA', 
    'customCH_Platform', 
    'customCH_Mobile'
  ]);
  
  let sites = result.sites || [];
  const userAgent = result.customUA || DEFAULTS.ua;
  const chUa = result.customCH_UA || DEFAULTS.ch_ua;
  const chPlatform = result.customCH_Platform || DEFAULTS.ch_platform;
  const chMobile = result.customCH_Mobile || DEFAULTS.ch_mobile;
  
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = oldRules.map(r => r.id);

  const newRules = sites.map((site, idx) => ({
    id: idx + 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "User-Agent", operation: "set", value: userAgent },
        { header: "Sec-CH-UA", operation: "set", value: chUa },
        { header: "Sec-CH-UA-Platform", operation: "set", value: chPlatform },
        { header: "Sec-CH-UA-Mobile", operation: "set", value: chMobile }
      ]
    },
    condition: {
      urlFilter: `||${site}`,
      resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "script", "image", "media", "other"]
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeRuleIds,
    addRules: newRules
  });
}

chrome.runtime.onInstalled.addListener(updateRules);
chrome.runtime.onStartup.addListener(updateRules);
chrome.storage.onChanged.addListener((changes) => {
  const keys = ['sites', 'customUA', 'customCH_UA', 'customCH_Platform', 'customCH_Mobile'];
  if (keys.some(key => changes[key])) {
    updateRules();
  }
});