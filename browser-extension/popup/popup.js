const API_BASE_URL = 'https://journalmate.ai';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const authStatus = document.getElementById('auth-status');
  const connectedView = document.getElementById('connected-view');
  const disconnectedView = document.getElementById('disconnected-view');
  
  try {
    const result = await chrome.storage.local.get(['extensionToken', 'tokenExpiry']);
    
    authStatus.classList.add('hidden');
    
    if (result.extensionToken && result.tokenExpiry > Date.now()) {
      connectedView.classList.remove('hidden');
    } else {
      disconnectedView.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    authStatus.innerHTML = `
      <div class="error-status">
        <p>Error checking connection status</p>
      </div>
    `;
  }
  
  document.getElementById('connect-btn')?.addEventListener('click', handleConnect);
  document.getElementById('disconnect-btn')?.addEventListener('click', handleDisconnect);
}

async function handleConnect() {
  const connectBtn = document.getElementById('connect-btn');
  const originalText = connectBtn.textContent;
  
  connectBtn.disabled = true;
  connectBtn.textContent = 'Opening login page...';
  
  const state = generateState();
  
  await chrome.storage.local.set({ authState: state });
  
  const authUrl = `${API_BASE_URL}/extension-auth?state=${state}`;
  
  chrome.tabs.create({ url: authUrl }, (tab) => {
    listenForAuthCallback(tab.id, state);
  });
  
  setTimeout(() => {
    connectBtn.disabled = false;
    connectBtn.textContent = originalText;
  }, 3000);
}

function generateState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function listenForAuthCallback(tabId, expectedState) {
  const listener = (details) => {
    if (details.tabId !== tabId) return;
    
    try {
      const url = new URL(details.url);
      
      if (url.pathname === '/extension-auth-callback' || url.pathname === '/extension-auth/callback') {
        const token = url.searchParams.get('token');
        const state = url.searchParams.get('state');
        const expiresIn = url.searchParams.get('expires_in');
        
        if (state === expectedState && token) {
          const expiry = Date.now() + (parseInt(expiresIn) || 30 * 24 * 60 * 60) * 1000;
          
          chrome.storage.local.set({
            extensionToken: token,
            tokenExpiry: expiry
          }, () => {
            chrome.tabs.remove(tabId);
            
            document.getElementById('disconnected-view').classList.add('hidden');
            document.getElementById('connected-view').classList.remove('hidden');
          });
        }
        
        chrome.webNavigation.onBeforeNavigate.removeListener(listener);
      }
    } catch (e) {
      console.error('Error parsing auth callback URL:', e);
    }
  };
  
  chrome.webNavigation.onBeforeNavigate.addListener(listener);
  
  setTimeout(() => {
    chrome.webNavigation.onBeforeNavigate.removeListener(listener);
  }, 300000);
}

async function handleDisconnect() {
  const disconnectBtn = document.getElementById('disconnect-btn');
  
  if (!confirm('Are you sure you want to disconnect your JournalMate account?')) {
    return;
  }
  
  disconnectBtn.disabled = true;
  disconnectBtn.textContent = 'Disconnecting...';
  
  try {
    const result = await chrome.storage.local.get(['extensionToken']);
    
    if (result.extensionToken) {
      try {
        await fetch(`${API_BASE_URL}/api/extensions/revoke-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.extensionToken}`
          }
        });
      } catch (e) {
        console.log('Could not revoke token on server:', e);
      }
    }
    
    await chrome.storage.local.remove(['extensionToken', 'tokenExpiry', 'authState']);
    
    document.getElementById('connected-view').classList.add('hidden');
    document.getElementById('disconnected-view').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error disconnecting:', error);
    alert('Failed to disconnect. Please try again.');
  } finally {
    disconnectBtn.disabled = false;
    disconnectBtn.textContent = 'Disconnect Account';
  }
}
