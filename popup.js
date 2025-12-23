function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-area');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' 
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

document.getElementById('btn-config-twitch').addEventListener('click', () => {
  chrome.storage.sync.get(['sites'], (result) => {
    let sites = result.sites || [];
    const isPackActive = sites.includes('twitch.tv') && sites.includes('streamrunners.fr');

    if (isPackActive) {
      const updated = sites.filter(s => s !== 'twitch.tv' && s !== 'streamrunners.fr');
      chrome.storage.sync.set({ sites: updated }, () => {
        displaySites();
        showNotification('Pack Twitch X Streamrunners désactivé');
      });
    } else {
      let added = false;
      ['twitch.tv', 'streamrunners.fr'].forEach(domain => {
        if (!sites.includes(domain)) {
          sites.push(domain);
          added = true;
        }
      });

      if (added) {
        chrome.storage.sync.set({ sites }, () => {
          displaySites();
          showNotification('Le Pack Twitch X Streamrunners est prêt !');
        });
      }
    }
  });
});

document.getElementById('add-site').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || tab.url.startsWith('chrome://')) {
    showNotification('Impossible d\'ajouter ce type de page', 'error');
    return;
  }

  const url = new URL(tab.url).hostname;
  
  chrome.storage.sync.get(['sites'], (result) => {
    const sites = result.sites || [];
    if (!sites.includes(url)) {
      sites.push(url);
      chrome.storage.sync.set({ sites }, () => {
        displaySites();
        showNotification('Site ajouté avec succès !');
      });
    } else {
      showNotification('Ce site est déjà actif !', 'error');
    }
  });
});

function displaySites() {
  chrome.storage.sync.get(['sites'], (result) => {
    const sites = result.sites || [];
    const list = document.getElementById('site-list');
    const emptyMsg = document.getElementById('empty-msg');
    const packBtn = document.getElementById('btn-config-twitch');
    
    list.innerHTML = '';
    
    const isPackActive = sites.includes('twitch.tv') && sites.includes('streamrunners.fr');
    if (isPackActive) {
      packBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg> Désactiver le pack';
      packBtn.classList.remove('btn-primary');
      packBtn.classList.add('btn-secondary');
    } else {
      packBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Activer le pack';
      packBtn.classList.remove('btn-secondary');
      packBtn.classList.add('btn-primary');
    }

    if (sites.length === 0) {
      emptyMsg.style.display = 'block';
    } else {
      emptyMsg.style.display = 'none';
      
      const hasTwitch = sites.includes('twitch.tv');
      const hasStreamRunners = sites.includes('streamrunners.fr');
      
      let filteredSites = [...sites];

      if (hasTwitch && hasStreamRunners) {
        const li = document.createElement('li');
        li.className = 'site-item';
        li.style.background = 'rgba(168, 85, 247, 0.1)';
        li.style.borderColor = 'rgba(168, 85, 247, 0.3)';
        
        li.innerHTML = `
          <div class="site-info">
            <div class="status-dot" style="background-color: var(--primary); box-shadow: 0 0 8px var(--primary);"></div>
            <span class="site-name" style="color: var(--primary); font-weight: 600;">📦 Pack Twitch X Streamrunners</span>
          </div>
        `;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon';
        deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = 'Désactiver le pack';
        
        deleteBtn.addEventListener('click', () => {
          const updated = sites.filter(s => s !== 'twitch.tv' && s !== 'streamrunners.fr');
          chrome.storage.sync.set({ sites: updated }, () => {
            displaySites();
            showNotification('Pack Twitch X Streamrunners désactivé');
          });
        });
        
        li.appendChild(deleteBtn);
        list.appendChild(li);
        
        filteredSites = filteredSites.filter(s => s !== 'twitch.tv' && s !== 'streamrunners.fr');
      }

      filteredSites.forEach((site) => {
        const li = document.createElement('li');
        li.className = 'site-item';
        
        li.innerHTML = `
          <div class="site-info">
            <div class="status-dot"></div>
            <span class="site-name">${site}</span>
          </div>
        `;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon';
        deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = 'Supprimer';
        
        deleteBtn.addEventListener('click', () => {
          const updated = sites.filter(s => s !== site);
          chrome.storage.sync.set({ sites: updated }, () => {
            displaySites();
            showNotification('Site retiré de la liste');
          });
        });
        
        li.appendChild(deleteBtn);
        list.appendChild(li);
      });
    }
  });
}

displaySites();

const DEFAULTS = {
  ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  ch_ua: '"Chromium";v="143", "Google Chrome";v="143", "Not.A/Brand";v="99"',
  ch_platform: '"Windows"',
  ch_mobile: "?0"
};

const uaInput = document.getElementById('ua-input');
const chUaInput = document.getElementById('ch-ua-input');
const chPlatformInput = document.getElementById('ch-platform-input');
const chMobileInput = document.getElementById('ch-mobile-input');

chrome.storage.sync.get(['customUA', 'customCH_UA', 'customCH_Platform', 'customCH_Mobile'], (result) => {
  uaInput.value = result.customUA || DEFAULTS.ua;
  chUaInput.value = result.customCH_UA || DEFAULTS.ch_ua;
  chPlatformInput.value = result.customCH_Platform || DEFAULTS.ch_platform;
  chMobileInput.value = result.customCH_Mobile || DEFAULTS.ch_mobile;
});

document.getElementById('save-ua').addEventListener('click', () => {
  const data = {
    customUA: uaInput.value.trim(),
    customCH_UA: chUaInput.value.trim(),
    customCH_Platform: chPlatformInput.value.trim(),
    customCH_Mobile: chMobileInput.value.trim()
  };

  chrome.storage.sync.set(data, () => {
    showNotification('Paramètres enregistrés !');
  });
});

document.getElementById('reset-ua').addEventListener('click', () => {
  uaInput.value = DEFAULTS.ua;
  chUaInput.value = DEFAULTS.ch_ua;
  chPlatformInput.value = DEFAULTS.ch_platform;
  chMobileInput.value = DEFAULTS.ch_mobile;

  chrome.storage.sync.set({
    customUA: DEFAULTS.ua,
    customCH_UA: DEFAULTS.ch_ua,
    customCH_Platform: DEFAULTS.ch_platform,
    customCH_Mobile: DEFAULTS.ch_mobile
  }, () => {
    showNotification('Paramètres réinitialisés');
  });
});
function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  const step1 = document.getElementById('onboarding-step-1');
  const step2 = document.getElementById('onboarding-step-2');
  const nextBtn = document.getElementById('onboarding-next');
  const applyBtn = document.getElementById('onboarding-apply-pack');
  const skipBtn = document.getElementById('onboarding-skip-pack');

  chrome.storage.sync.get(['onboardingCompleted'], (result) => {
    if (!result.onboardingCompleted) {
      overlay.style.display = 'flex';
    }
  });

  nextBtn.addEventListener('click', () => {
    step1.classList.remove('active');
    step2.classList.add('active');
  });

  const finishOnboarding = () => {
    chrome.storage.sync.set({ onboardingCompleted: true }, () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    });
  };

  applyBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['sites'], (result) => {
      let sites = result.sites || [];
      ['twitch.tv', 'streamrunners.fr'].forEach(domain => {
        if (!sites.includes(domain)) {
          sites.push(domain);
        }
      });
      chrome.storage.sync.set({ sites }, () => {
        displaySites();
        showNotification('Pack Twitch X Streamrunners activé !');
        finishOnboarding();
      });
    });
  });

  skipBtn.addEventListener('click', () => {
    finishOnboarding();
  });
}

document.addEventListener('DOMContentLoaded', initOnboarding);