(() => {
  const config = window.RAGGED_AI_CONFIG || {};
  const page = document.getElementById('ai');
  const form = document.getElementById('aiForm');
  const input = document.getElementById('aiInput');
  const conversationView = document.getElementById('aiConversation');
  const sendButton = document.getElementById('aiSend');
  if (!page || !form || !input || !conversationView || !sendButton) return;

  const STORAGE_KEY = 'ragged-ai-conversations';
  const messages = [];
  let conversations = loadConversations();
  let activeId = null;
  let busy = false;

  function loadConversations() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((item) => item && typeof item.id === 'string' && Array.isArray(item.messages)) : [];
    } catch { return []; }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); } catch { /* Storage may be unavailable or full. */ }
  }

  function ensureHistoryPanel() {
    let panel = page.querySelector('.ai-history');
    if (panel) return panel;
    panel = document.createElement('aside');
    panel.className = 'ai-history';
    panel.setAttribute('aria-label', 'Saved conversations');
    panel.innerHTML = '<div class="ai-history-heading">Conversations</div><button class="ai-new-chat" type="button">＋ New chat</button><div class="ai-history-list" role="list"></div>';
    page.appendChild(panel);
    panel.querySelector('.ai-new-chat').addEventListener('click', startNewConversation);
    panel.querySelector('.ai-history-list').addEventListener('click', onHistoryClick);
    return panel;
  }

  const historyPanel = ensureHistoryPanel();
  const historyList = historyPanel.querySelector('.ai-history-list');

  function newId() {
    return globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function activeConversation() {
    return conversations.find((item) => item.id === activeId) || null;
  }

  function saveActive() {
    const item = activeConversation();
    if (!item) return;
    item.messages = messages.map(({ role, content }) => ({ role, content }));
    item.updatedAt = Date.now();
    persist();
    renderHistory();
  }

  function renderHistory() {
    historyList.replaceChildren();
    const sorted = [...conversations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!sorted.length) {
      const empty = document.createElement('p');
      empty.className = 'ai-history-empty';
      empty.textContent = 'Your saved chats will appear here.';
      historyList.appendChild(empty);
      return;
    }
    sorted.forEach((item) => {
      const row = document.createElement('div');
      row.className = `ai-history-row${item.id === activeId ? ' active' : ''}`;
      row.setAttribute('role', 'listitem');
      const select = document.createElement('button');
      select.className = 'ai-history-select';
      select.type = 'button';
      select.dataset.action = 'open';
      select.dataset.id = item.id;
      select.textContent = item.title || 'New conversation';
      select.setAttribute('aria-current', item.id === activeId ? 'true' : 'false');
      const remove = document.createElement('button');
      remove.className = 'ai-history-delete';
      remove.type = 'button';
      remove.dataset.action = 'delete';
      remove.dataset.id = item.id;
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Delete ${item.title || 'conversation'}`);
      row.append(select, remove);
      historyList.appendChild(row);
    });
  }

  function onHistoryClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'open') openConversation(button.dataset.id);
    if (button.dataset.action === 'delete') deleteConversation(button.dataset.id);
  }

  function addBubble(text, role, extraClass = '') {
    const node = document.createElement('div');
    node.className = `ai-message ${role}${extraClass ? ` ${extraClass}` : ''}`;
    node.textContent = text;
    conversationView.appendChild(node);
    conversationView.scrollTop = conversationView.scrollHeight;
    return node;
  }

  function paintConversation() {
    conversationView.replaceChildren();
    messages.forEach((message) => addBubble(message.content, message.role));
  }

  function openConversation(id) {
    if (busy) return;
    const item = conversations.find((entry) => entry.id === id);
    if (!item) return;
    activeId = item.id;
    messages.splice(0, messages.length, ...item.messages.map(({ role, content }) => ({ role, content })));
    paintConversation();
    renderHistory();
  }

  function startNewConversation() {
    if (busy) return;
    activeId = null;
    messages.length = 0;
    conversationView.replaceChildren();
    renderHistory();
    input.focus();
  }

  function deleteConversation(id) {
    if (busy && id === activeId) return;
    conversations = conversations.filter((item) => item.id !== id);
    if (activeId === id) {
      activeId = null;
      messages.length = 0;
      conversationView.replaceChildren();
    }
    persist();
    renderHistory();
  }

  function ensureConversation(prompt) {
    if (!activeConversation()) {
      const item = { id: newId(), title: prompt.slice(0, 48), messages: [], createdAt: Date.now(), updatedAt: Date.now() };
      conversations.push(item);
      activeId = item.id;
    } else if (!activeConversation().messages.length) {
      activeConversation().title = prompt.slice(0, 48);
    }
  }

  function readReply(data) {
    if (typeof data?.choices?.[0]?.message?.content === 'string') return data.choices[0].message.content;
    if (Array.isArray(data?.choices?.[0]?.message?.content)) return data.choices[0].message.content.map((part) => part.text || '').join('');
    if (typeof data?.output_text === 'string') return data.output_text;
    if (typeof data?.reply === 'string') return data.reply;
    if (typeof data?.response === 'string') return data.response;
    return '';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt || busy) return;
    if (!config.endpoint) {
      addBubble('Add your AI endpoint in ai-config.js to connect the assistant.', 'assistant', 'error');
      return;
    }

    ensureConversation(prompt);
    messages.push({ role: 'user', content: prompt });
    addBubble(prompt, 'user');
    input.value = '';
    busy = true;
    sendButton.disabled = true;
    const pending = addBubble('…', 'assistant');
    saveActive();

    try {
      const headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
      const payload = { messages: messages.map(({ role, content }) => ({ role, content })) };
      if (config.model) payload.model = config.model;
      const response = await fetch(config.endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || data.message || `Request failed (${response.status})`);
      const reply = readReply(data);
      if (!reply) throw new Error('The API response did not contain a recognized reply.');
      pending.remove();
      messages.push({ role: 'assistant', content: reply });
      addBubble(reply, 'assistant');
      saveActive();
    } catch (error) {
      pending.remove();
      messages.pop();
      saveActive();
      addBubble(error.message || 'The assistant could not connect.', 'assistant', 'error');
    } finally {
      busy = false;
      sendButton.disabled = false;
      input.focus();
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  const last = [...conversations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (last) openConversation(last.id);
  else renderHistory();
})();
