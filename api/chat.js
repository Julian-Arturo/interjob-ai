const AI_PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    body: (model, messages) => ({
      model,
      response_format: { type: 'json_object' },
      messages
    }),
    parseResponse: (data) => data
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }),
    body: (model, messages) => {
      const systemMsg = messages.find(m => m.role === 'system');
      const userMsgs = messages.filter(m => m.role !== 'system');
      return {
        model,
        max_tokens: 4096,
        system: systemMsg?.content || '',
        messages: userMsgs
      };
    },
    parseResponse: (data) => ({
      choices: [{
        message: {
          content: data.content[0].text
        }
      }]
    })
  },
  ollama: {
    url: 'http://localhost:11434/api/chat',
    headers: () => ({
      'Content-Type': 'application/json'
    }),
    body: (model, messages) => ({
      model,
      messages,
      stream: false,
      format: 'json'
    }),
    parseResponse: (data) => ({
      choices: [{
        message: {
          content: data.message.content
        }
      }]
    })
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider = 'openai', apiKey, messages, model, customApiUrl } = req.body;

    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig) {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    // Ollama no requiere API key
    if (provider !== 'ollama' && provider !== 'custom' && !apiKey) {
      return res.status(400).json({ error: 'API Key is required' });
    }

    const apiUrl = provider === 'custom' && customApiUrl ? customApiUrl : providerConfig.url;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: providerConfig.headers(apiKey),
      body: JSON.stringify(providerConfig.body(model, messages))
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Normalizar respuesta según el proveedor
    const normalizedData = providerConfig.parseResponse(data);
    res.status(200).json(normalizedData);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}
