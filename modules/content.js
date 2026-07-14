const SITES_KEY = "sites";
const LOCAL_KEY = "MUserAgentSwitcher";
const STREAMRUNNERS_HOST = "streamrunners.fr";

function syncFlag(sites) {
  const on = Array.isArray(sites) && sites.includes(STREAMRUNNERS_HOST);
  if (on) localStorage.setItem(LOCAL_KEY, "true");
  else localStorage.removeItem(LOCAL_KEY);
}

chrome.storage.sync
  .get(SITES_KEY)
  .then((result) => {
    syncFlag(result[SITES_KEY]);
  })
  .catch(() => {});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (!Object.prototype.hasOwnProperty.call(changes, SITES_KEY)) return;
  syncFlag(changes[SITES_KEY].newValue);
});
