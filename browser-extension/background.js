const API_BASE_URL = 'https://journalmate.ai';

chrome.runtime.onInstalled.addListener(() => {
  console.log('JournalMate extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'IMPORT_PLAN') {
    handlePlanImport(message.data, message.source)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'CHECK_AUTH') {
    checkAuthentication()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ authenticated: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'GET_TOKEN') {
    chrome.storage.local.get(['extensionToken', 'tokenExpiry'], (result) => {
      if (result.extensionToken && result.tokenExpiry > Date.now()) {
        sendResponse({ token: result.extensionToken });
      } else {
        sendResponse({ token: null });
      }
    });
    return true;
  }
});

async function checkAuthentication() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['extensionToken', 'tokenExpiry'], (result) => {
      if (result.extensionToken && result.tokenExpiry > Date.now()) {
        resolve({ authenticated: true, token: result.extensionToken });
      } else {
        resolve({ authenticated: false });
      }
    });
  });
}

async function handlePlanImport(planData, source) {
  const auth = await checkAuthentication();
  
  if (!auth.authenticated) {
    throw new Error('Not authenticated. Please connect your JournalMate account.');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/extensions/import-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    },
    body: JSON.stringify({
      rawText: planData.text,
      source: source,
      sourceDevice: 'browser_extension'
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import plan');
  }
  
  return await response.json();
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.extensionToken) {
    console.log('Extension token updated');
  }
});
