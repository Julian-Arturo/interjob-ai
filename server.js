import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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

app.post('/api/chat', async (req, res) => {
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

    console.log(`📡 Calling ${provider} API at ${apiUrl} with model ${model}`);

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
    res.json(normalizedData);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Supports: OpenAI, Anthropic Claude, Ollama (local), Custom APIs`);
});
