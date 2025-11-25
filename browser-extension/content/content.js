(function() {
  'use strict';
  
  const BUTTON_ID = 'journalmate-import-btn';
  const TOAST_ID = 'journalmate-toast';
  
  function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
      return 'chatgpt';
    } else if (hostname.includes('claude.ai')) {
      return 'claude';
    } else if (hostname.includes('gemini.google.com')) {
      return 'gemini';
    } else if (hostname.includes('copilot.microsoft.com')) {
      return 'copilot';
    } else if (hostname.includes('perplexity.ai')) {
      return 'perplexity';
    }
    return 'unknown';
  }
  
  function extractConversation() {
    const platform = detectPlatform();
    let messages = [];
    
    switch (platform) {
      case 'chatgpt':
        messages = extractChatGPT();
        break;
      case 'claude':
        messages = extractClaude();
        break;
      case 'gemini':
        messages = extractGemini();
        break;
      case 'copilot':
        messages = extractCopilot();
        break;
      case 'perplexity':
        messages = extractPerplexity();
        break;
      default:
        messages = extractGeneric();
    }
    
    return {
      platform,
      text: messages.join('\n\n'),
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    };
  }
  
  function extractChatGPT() {
    const messages = [];
    const messageContainers = document.querySelectorAll('[data-message-author-role]');
    
    messageContainers.forEach(container => {
      const role = container.getAttribute('data-message-author-role');
      if (role === 'assistant') {
        const textContent = container.innerText || container.textContent;
        if (textContent && textContent.trim()) {
          messages.push(textContent.trim());
        }
      }
    });
    
    if (messages.length === 0) {
      const assistantBlocks = document.querySelectorAll('.markdown, .prose, [class*="message-assistant"]');
      assistantBlocks.forEach(block => {
        const text = block.innerText || block.textContent;
        if (text && text.trim() && text.length > 50) {
          messages.push(text.trim());
        }
      });
    }
    
    return messages;
  }
  
  function extractClaude() {
    const messages = [];
    
    const claudeMessages = document.querySelectorAll('[data-is-streaming], .font-claude-message');
    claudeMessages.forEach(msg => {
      const text = msg.innerText || msg.textContent;
      if (text && text.trim()) {
        messages.push(text.trim());
      }
    });
    
    if (messages.length === 0) {
      const proseBlocks = document.querySelectorAll('.prose');
      proseBlocks.forEach(block => {
        const text = block.innerText || block.textContent;
        if (text && text.trim() && text.length > 50) {
          messages.push(text.trim());
        }
      });
    }
    
    return messages;
  }
  
  function extractGemini() {
    const messages = [];
    const responseBlocks = document.querySelectorAll('.model-response-text, [data-message-author="1"]');
    
    responseBlocks.forEach(block => {
      const text = block.innerText || block.textContent;
      if (text && text.trim()) {
        messages.push(text.trim());
      }
    });
    
    return messages;
  }
  
  function extractCopilot() {
    const messages = [];
    const responseBlocks = document.querySelectorAll('[data-content="ai-message"], .ai-response');
    
    responseBlocks.forEach(block => {
      const text = block.innerText || block.textContent;
      if (text && text.trim()) {
        messages.push(text.trim());
      }
    });
    
    return messages;
  }
  
  function extractPerplexity() {
    const messages = [];
    const answerBlocks = document.querySelectorAll('.prose, [data-testid="answer-content"]');
    
    answerBlocks.forEach(block => {
      const text = block.innerText || block.textContent;
      if (text && text.trim() && text.length > 100) {
        messages.push(text.trim());
      }
    });
    
    return messages;
  }
  
  function extractGeneric() {
    const messages = [];
    
    const possibleContainers = document.querySelectorAll('.markdown, .prose, [class*="response"], [class*="message"]');
    possibleContainers.forEach(container => {
      const text = container.innerText || container.textContent;
      if (text && text.trim() && text.length > 100) {
        messages.push(text.trim());
      }
    });
    
    return messages;
  }
  
  function showToast(message, type = 'info') {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      document.body.appendChild(toast);
    }
    
    toast.className = `journalmate-toast journalmate-toast-${type}`;
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 4000);
  }
  
  function createImportButton() {
    if (document.getElementById(BUTTON_ID)) {
      return;
    }
    
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.className = 'journalmate-import-button';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L12 16M12 16L7 11M12 16L17 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 19H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Send to JournalMate</span>
    `;
    
    button.addEventListener('click', handleImport);
    document.body.appendChild(button);
    
    makeDraggable(button);
  }
  
  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    
    element.addEventListener('mousedown', dragMouseDown);
    
    function dragMouseDown(e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('mouseup', closeDragElement);
      }
    }
    
    function elementDrag(e) {
      isDragging = true;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.right = "auto";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
      isDragging = false;
      document.removeEventListener('mousemove', elementDrag);
      document.removeEventListener('mouseup', closeDragElement);
    }
  }
  
  async function handleImport() {
    const button = document.getElementById(BUTTON_ID);
    const originalContent = button.innerHTML;
    
    button.innerHTML = `
      <svg class="journalmate-spinner" width="20" height="20" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
          <animate attributeName="stroke-dashoffset" dur="1s" values="31.416;0" repeatCount="indefinite"/>
        </circle>
      </svg>
      <span>Importing...</span>
    `;
    button.disabled = true;
    
    try {
      const authResponse = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
      
      if (!authResponse.authenticated) {
        showToast('Please connect your JournalMate account first. Click the extension icon.', 'warning');
        button.innerHTML = originalContent;
        button.disabled = false;
        return;
      }
      
      const conversation = extractConversation();
      
      if (!conversation.text || conversation.text.length < 50) {
        showToast('No plan content detected. Make sure there is AI-generated content on this page.', 'warning');
        button.innerHTML = originalContent;
        button.disabled = false;
        return;
      }
      
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_PLAN',
        source: conversation.platform,
        data: {
          text: conversation.text,
          messageCount: conversation.messageCount,
          timestamp: conversation.timestamp
        }
      });
      
      if (response.success) {
        const taskCount = response.data?.parsedPlan?.tasks?.length || 0;
        showToast(`Plan imported! ${taskCount} tasks created.`, 'success');
        
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Imported!</span>
        `;
        
        setTimeout(() => {
          button.innerHTML = originalContent;
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('JournalMate import error:', error);
      showToast(error.message || 'Failed to import plan. Please try again.', 'error');
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  }
  
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createImportButton, 1000);
      });
    } else {
      setTimeout(createImportButton, 1000);
    }
    
    const observer = new MutationObserver((mutations) => {
      if (!document.getElementById(BUTTON_ID)) {
        createImportButton();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  init();
})();
