chrome.storage.sync.get(['sites'], (result) => {
  const sites = result.sites || [];
  if (sites.includes('streamrunners.fr')) {
    localStorage.setItem('MUserAgentSwitcher', 'true');
  }
});
