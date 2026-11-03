(() => {
  const config = window.RAGGED_AI_CONFIG || {};
  const form = document.getElementById('aiForm');
  const input = document.getElementById('aiInput');
  const conversation = document.getElementById('aiConversation');
  const sendButton = document.getElementById('aiSend');
  if (!form || !input || !conversation || !sendButton) return;

  const messages = [];
  const addMessage = (text, role, extraClass = '') => {
    const node = document.createElement('div');
    node.className = `ai-message ${role}${extraClass ? ` ${extraClass}` : ''}`;
    node.textContent = text;
    conversation.appendChild(node);
    conversation.scrollTop = conversation.scrollHeight;
    return node;
  };

  const readReply = (data) => {
    if (typeof data?.choices?.[0]?.message?.content === 'string') return data.choices[0].message.content;
    if (Array.isArray(data?.choices?.[0]?.message?.content)) {
      return data.choices[0].message.content.map((part) => part.text || '').join('');
    }
    if (typeof data?.output_text === 'string') return data.output_text;
    if (typeof data?.reply === 'string') return data.reply;
    if (typeof data?.response === 'string') return data.response;
    return '';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt || sendButton.disabled) return;
    if (!config.endpoint) {
      addMessage('Add your AI endpoint in ai-config.js to connect the assistant.', 'assistant', 'error');
      return;
    }

    messages.push({ role: 'user', content: prompt });
    addMessage(prompt, 'user');
    input.value = '';
    sendButton.disabled = true;
    const pending = addMessage('…', 'assistant');

    try {
      const headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
      const payload = { messages };
      if (config.model) payload.model = config.model;
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || data.message || `Request failed (${response.status})`);
      const reply = readReply(data);
      if (!reply) throw new Error('The API response did not contain a recognized reply.');
      pending.remove();
      messages.push({ role: 'assistant', content: reply });
      addMessage(reply, 'assistant');
    } catch (error) {
      pending.remove();
      messages.pop();
      addMessage(error.message || 'The assistant could not connect.', 'assistant', 'error');
    } finally {
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
})();
