import { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  CANDIDATE_PROFILE as DEFAULT_PROFILE,
  JOB_REQUIREMENTS as DEFAULT_JOB,
  MODE_LABELS,
  getModeInstructions,
  SILENCE_DELAY,
  API_KEY as DEFAULT_API_KEY,
  FILLER_PHRASES,
  AI_PROVIDERS,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL
} from './config';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function App() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('interjob_mode') || 'flutter';
  });
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Presiona ESCUCHAR para comenzar');
  const [statusClass, setStatusClass] = useState('idle');
  const [result, setResult] = useState(null);
  const [fillerPhrase, setFillerPhrase] = useState(null);
  const [processingTime, setProcessingTime] = useState(0);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('interjob_settings');
    if (saved) return JSON.parse(saved);
    return {
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      apiKey: DEFAULT_API_KEY || '',
      customApiUrl: '',
      profile: DEFAULT_PROFILE,
      vacancy: DEFAULT_JOB
    };
  });

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const wakeLockRef = useRef(null);
  const isManuallyStoppedRef = useRef(true);
  const modeRef = useRef(mode);
  const restartAttemptsRef = useRef(0);
  const lastRestartTimeRef = useRef(0);

  // Wake Lock
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Screen Wake Lock active');
      }
    } catch (err) {
      console.log('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Screen Wake Lock released');
      } catch (err) {
        console.log('Wake Lock release error:', err);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('interjob_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('interjob_mode', mode);
    modeRef.current = mode;
    console.log('💾 Modo guardado:', mode);
  }, [mode]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      updateStatus('⚠️ Tu navegador no soporta reconocimiento de voz', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      updateStatus('🎤 Escuchando...', 'listening');
      requestWakeLock();
    };

    recognition.onspeechstart = () => {
      updateStatus('🗣️ Detectando voz...', 'listening');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current += final;
      }
      interimTranscriptRef.current = interim;

      const fullText = (finalTranscriptRef.current + interim).trim();
      setTranscript(fullText);

      clearTimeout(silenceTimerRef.current);
      if (fullText.length > 5) {
        updateStatus('Detectando pausa...', 'listening');
        silenceTimerRef.current = setTimeout(() => {
          if (!isManuallyStoppedRef.current && fullText.length > 5) {
            handleAnalyze(fullText);
          }
        }, SILENCE_DELAY);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      if (event.error === 'no-speech') return; // Ignore silent periods
      if (event.error === 'aborted') return;
      if (event.error === 'not-allowed') {
        updateStatus('⚠️ Permiso de micrófono denegado', 'error');
        setIsListening(false);
        isManuallyStoppedRef.current = true;
      } else {
        // network or other
        console.log(`Non-critical error ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (!isManuallyStoppedRef.current) {
        // Protección contra bucles infinitos de reinicio
        const now = Date.now();
        if (now - lastRestartTimeRef.current < 1000) {
          restartAttemptsRef.current++;
          if (restartAttemptsRef.current > 5) {
            console.error('🛑 Demasiados reinicios. Deteniendo reconocimiento.');
            isManuallyStoppedRef.current = true;
            setIsListening(false);
            updateStatus('⚠️ Error: Reconocimiento detenido. Presiona ESCUCHAR de nuevo.', 'error');
            releaseWakeLock();
            return;
          }
        } else {
          restartAttemptsRef.current = 0;
        }
        lastRestartTimeRef.current = now;

        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('Restart failed', e);
          }
        }, 100);
      } else {
        releaseWakeLock();
        restartAttemptsRef.current = 0;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearTimeout(silenceTimerRef.current);
      releaseWakeLock();
    };
  }, []);

  const updateStatus = (message, className) => {
    setStatus(message);
    setStatusClass(className);
  };

  const toggleListen = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      isManuallyStoppedRef.current = true;
      recognitionRef.current.abort();
      setIsListening(false);
      updateStatus('Detenido', 'idle');
      clearTimeout(silenceTimerRef.current);
    } else {
      isManuallyStoppedRef.current = false;
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setTranscript('');
      setResult(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.log('Already started or error');
      }
    }
  };

  const handleAnalyze = async (text) => {
    if (!text || text.trim().length === 0) return;

    // Validar API key solo si el proveedor la requiere
    const currentProvider = AI_PROVIDERS[settings.provider] || AI_PROVIDERS.openai;
    if (currentProvider.requiresKey && !settings.apiKey) {
      updateStatus('⚠️ Configura tu API Key en opciones', 'error');
      return;
    }

    updateStatus('⚡ Analizando...', 'processing');

    // Seleccionar una frase de relleno aleatoria
    const randomFiller = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
    setFillerPhrase(randomFiller);

    // Iniciar contador de tiempo
    const startTime = Date.now();
    const timeInterval = setInterval(() => {
      setProcessingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    const currentMode = modeRef.current;
    const isTechMode = currentMode === 'tech';
    console.log('🔍 DEBUG - Modo actual:', currentMode);
    console.log('🔍 DEBUG - ¿Es modo técnico?:', isTechMode);
    const modeInstructions = getModeInstructions(currentMode);
    
    // Customized prompt based on mode
    let taskInstructions = `1. IDENTIFICA si hay una PREGUNTA del reclutador en la transcripción. Si NO hay pregunta clara o solo escuchas al candidato hablando, NO generes respuesta.
2. Si SÍ hay pregunta del reclutador: Tradúcela en 1 oración simple en español.
3. Escribe una respuesta excelente y CORTA en inglés (máx 2-3 oraciones) basada en el perfil del candidato.
4. Traduce esa respuesta al español para que el candidato entienda qué significa.
5. Escribe EXACTAMENTE esa misma respuesta en inglés, pero usando fonética española para que el candidato la lea tal cual suena (ej: "Ai jaf ecspiriens").`;

    if (isTechMode) {
      taskInstructions = `1. IDENTIFICA si hay una PREGUNTA TÉCNICA del reclutador. Si NO hay pregunta o solo escuchas al candidato, NO generes respuesta.
2. Si SÍ hay pregunta técnica: Tradúcela en español e inglés.
3. OBLIGATORIO: Proporciona un fragmento de código Flutter/Dart COMPLETO y FUNCIONAL (Flutter 3.27+) que resuelva el problema. NUNCA omitas el código.
4. Explica la solución en español e inglés (máx 2-3 oraciones cada idioma), mencionando Big O si aplica.
5. Proporciona la respuesta oral en inglés con fonética española para leerla.`;
    }

    const systemPrompt = `Eres mi asistente secreto de entrevistas.
PERFIL: ${settings.profile}
VACANTE: ${settings.vacancy}
MODO ACTIVO: ${modeInstructions}

IMPORTANTE - FILTRADO DE VOZ:
- En la transcripción hay 2 voces mezcladas: el RECLUTADOR y YO (el candidato)
- Tu trabajo es SOLO responder a las PREGUNTAS del reclutador
- IGNORA completamente lo que YO digo (mis respuestas, muletillas, "hmm", "well", etc.)
- Si solo escuchas MI voz hablando o practicando, NO generes respuesta (devuelve JSON vacío)
- SOLO responde cuando detectes una PREGUNTA CLARA del reclutador

TAREA PRIORIDAD ULTRA-VELOCIDAD:
${taskInstructions}

MÍNIMO GASTO DE TOKENS. RESPONDE ÚNICA Y EXCLUSIVAMENTE CON ESTE JSON:
${isTechMode ? `{
  "pregunta_es": "traducción de la pregunta en español",
  "pregunta_en": "traducción de la pregunta en inglés",
  "codigo": "OBLIGATORIO: código Flutter/Dart completo y funcional con sintaxis Flutter 3.27+. NUNCA dejes este campo vacío. Incluye imports, clases completas y ejemplos prácticos",
  "explicacion_es": "explicación técnica en español (2-3 oraciones, incluye Big O si aplica)",
  "explicacion_en": "explicación técnica en inglés (2-3 oraciones, incluye Big O si aplica)",
  "respuesta_oral_en": "respuesta verbal breve en inglés para decir en la entrevista",
  "fonetica": "la respuesta_oral_en en fonética española"
}

EJEMPLO DE RESPUESTA VÁLIDA EN MODO TÉCNICO:
{
  "pregunta_es": "¿Cómo crear una lista en Flutter?",
  "pregunta_en": "How to create a list in Flutter?",
  "codigo": "// Creating a list in Flutter\nList<String> items = ['Apple', 'Banana', 'Orange'];\n\n// Using ListView.builder\nListView.builder(\n  itemCount: items.length,\n  itemBuilder: (context, index) {\n    return ListTile(\n      title: Text(items[index]),\n    );\n  },\n)",
  "explicacion_es": "Se usa List para crear listas de datos y ListView.builder para renderizar listas dinámicas eficientemente. Complejidad O(n) para renderizado.",
  "explicacion_en": "Use List to create data arrays and ListView.builder to efficiently render dynamic lists. Time complexity O(n) for rendering.",
  "respuesta_oral_en": "We use List and ListView.builder for efficient dynamic lists",
  "fonetica": "Ui ius List and List Viu Bilder for eficient dinamic lists"
}` : `{
  "pregunta_es": "traducción brevísima de la pregunta",
  "respuesta_en": "respuesta en inglés al grano",
  "respuesta_es": "traducción de la respuesta_en al español",
  "fonetica": "la respuesta_en escrita tal cual suena en fonética española"
}`}`;

    try {
      // Usar proxy local en desarrollo, Vercel functions en producción
      const apiUrl = import.meta.env.DEV
        ? 'http://localhost:3001/api/chat'
        : '/api/chat';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: settings.provider || 'openai',
          model: settings.model || 'gpt-4o',
          apiKey: settings.apiKey,
          customApiUrl: settings.customApiUrl,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Transcripción de audio (Reclutador y Yo mezclados): "${text}"` }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `Error ${response.status}`);

      const content = data.choices[0].message.content;
      console.log('📦 DEBUG - Respuesta completa de la API:', content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Respuesta inválida de IA (no es JSON)');

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ DEBUG - JSON parseado:', parsed);
      console.log('🔍 DEBUG - ¿Tiene código?:', !!parsed.codigo);

      clearInterval(timeInterval);
      setFillerPhrase(null);
      setProcessingTime(0);

      // Validar que haya contenido útil (la IA detectó una pregunta)
      if (!parsed.pregunta_es || parsed.pregunta_es.trim() === '') {
        console.log('⚠️ No se detectó pregunta del reclutador, ignorando...');
        updateStatus('🎤 Escuchando...', 'listening');
        finalTranscriptRef.current = '';
        interimTranscriptRef.current = '';
        setTranscript('');
        return;
      }

      setResult(parsed);
      updateStatus('✅ Listo', 'success');

      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setTranscript('');

      setTimeout(() => {
        if (!isManuallyStoppedRef.current) {
          updateStatus('🎤 Escuchando...', 'listening');
        }
      }, 1000);

    } catch (error) {
      clearInterval(timeInterval);
      setFillerPhrase(null);
      setProcessingTime(0);
      console.error('Error:', error);
      updateStatus(`❌ ${error.message}`, 'error');
    }
  };

  const analyzeManual = () => handleAnalyze(transcript);

  const clearAll = () => {
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setTranscript('');
    setResult(null);
    updateStatus(isListening ? '🎤 Escuchando...' : 'Presiona ESCUCHAR', isListening ? 'listening' : 'idle');
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="App">
      <div className="top-nav">
        <button className="btn-icon" onClick={() => setIsSettingsOpen(true)}>
          ⚙️
        </button>
      </div>

      <header>
        <h1>InterJob AI</h1>
        <p className="subtitle">Asistente Coverto de Entrevistas</p>
      </header>

      <div className="mode-selector">
        {Object.entries(MODE_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`mode-btn ${mode === key ? 'active' : ''}`}
            onClick={() => {
              console.log('🎯 Cambiando modo a:', key);
              setMode(key);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`status ${statusClass}`}>
        {status} | Modo: <strong>{mode.toUpperCase()}</strong>
      </div>

      {AI_PROVIDERS[settings.provider]?.requiresKey && !settings.apiKey && (
        <div className="section-block" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderLeft: '4px solid #ef4444',
          padding: '1rem'
        }}>
          <div className="block-label" style={{ color: '#ef4444' }}>
            ⚠️ CONFIGURACIÓN REQUERIDA
          </div>
          <div className="block-text" style={{ color: '#fca5a5' }}>
            Debes configurar tu API Key de {AI_PROVIDERS[settings.provider]?.name} en ⚙️ Opciones.
            <br />
            {settings.provider === 'ollama' ? (
              <>Ollama no requiere API key. <a href="#" onClick={() => setIsSettingsOpen(true)} style={{color: '#60a5fa', textDecoration: 'underline'}}>Configurar</a></>
            ) : (
              <>Obtén tu key en: <a href={settings.provider === 'anthropic' ? 'https://console.anthropic.com/settings/keys' : 'https://platform.openai.com/api-keys'} target="_blank" rel="noopener noreferrer" style={{color: '#60a5fa', textDecoration: 'underline'}}>{settings.provider === 'anthropic' ? 'console.anthropic.com' : 'platform.openai.com'}</a></>
            )}
          </div>
        </div>
      )}

      <div className="controls">
        <button
          className={`btn-listen ${isListening ? 'listening' : ''}`}
          onClick={toggleListen}
        >
          {isListening ? '⏹ DETENER' : '🎤 ESCUCHAR'}
        </button>
        <button className="btn-analyze" onClick={analyzeManual}>
          ⚡ FORZAR
        </button>
        <button className="btn-clear" onClick={clearAll}>
          🗑 LIMPIAR
        </button>
      </div>

      <div className="section-block transcript-block">
        <div className="block-label">Dicen en la llamada</div>
        <div className="block-text">{transcript || '...'}</div>
      </div>

      {fillerPhrase && (
        <div className="section-block filler-block">
          <div className="block-label">💡 DI ESTO MIENTRAS ESPERAS ({processingTime}s)</div>
          <div className="block-text filler-text-en">{fillerPhrase.en}</div>
          <div className="block-label" style={{marginTop: '0.5rem', fontSize: '0.75rem'}}>PRONUNCIACIÓN:</div>
          <div className="block-text filler-text-phonetic">{fillerPhrase.phonetic}</div>
        </div>
      )}

      {result && (
        <div className="focus-mode">
          <div className="section-block theme-block">
            <div className="block-label">Te preguntaron:</div>
            <div className="block-text">
              <strong>ES:</strong> {result.pregunta_es}
              {result.pregunta_en && (
                <><br/><strong>EN:</strong> {result.pregunta_en}</>
              )}
            </div>
          </div>

          {result.codigo && (
            <div className="section-block code-block">
              <div className="block-label">CÓDIGO SOLUCIÓN:</div>
              <SyntaxHighlighter
                language="dart"
                style={vscDarkPlus}
                customStyle={{
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  margin: '0.5rem 0'
                }}
              >
                {result.codigo}
              </SyntaxHighlighter>

              {result.explicacion_es && (
                <>
                  <div className="block-label" style={{marginTop: '1rem'}}>EXPLICACIÓN (ES):</div>
                  <div className="block-text">{result.explicacion_es}</div>
                </>
              )}

              {result.explicacion_en && (
                <>
                  <div className="block-label" style={{marginTop: '1rem'}}>EXPLANATION (EN):</div>
                  <div className="block-text">{result.explicacion_en}</div>
                </>
              )}
            </div>
          )}

          <div className="section-block answer-en-block">
            <div className="block-label">INGLÉS (Di esto):</div>
            <div className="block-text highlight-text">
              {result.respuesta_oral_en || result.respuesta_en}
            </div>

            {result.respuesta_es && (
              <>
                <div className="block-label" style={{marginTop: '1rem', color: 'var(--accent-green)'}}>ESPAÑOL (Significado):</div>
                <div className="block-text" style={{fontSize: '1.2rem', color: 'var(--text-secondary)'}}>
                  {result.respuesta_es}
                </div>
              </>
            )}

            <div className="block-label" style={{marginTop: '1.5rem', color: 'var(--accent-pink)'}}>PRONUNCIACIÓN:</div>
            <div className="block-text phonetic-text">{result.fonetica}</div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsSettingsOpen(false)}>×</button>
            <h2 className="modal-title">Configuración</h2>

            <div className="form-group">
              <label>Proveedor de IA</label>
              <select
                name="provider"
                value={settings.provider}
                onChange={handleSettingsChange}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '0.875rem',
                  color: 'white',
                  fontFamily: 'var(--font-family)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                  <option key={key} value={key} style={{background: '#1a1a1a', color: 'white'}}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Modelo</label>
              <select
                name="model"
                value={settings.model}
                onChange={handleSettingsChange}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '0.875rem',
                  color: 'white',
                  fontFamily: 'var(--font-family)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                {(AI_PROVIDERS[settings.provider]?.models || AI_PROVIDERS.openai.models).map((model) => (
                  <option key={model} value={model} style={{background: '#1a1a1a', color: 'white'}}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {settings.provider === 'custom' && (
              <div className="form-group">
                <label>URL de API Personalizada</label>
                <input
                  type="text"
                  name="customApiUrl"
                  value={settings.customApiUrl}
                  onChange={handleSettingsChange}
                  placeholder="http://localhost:8080/v1/chat/completions"
                />
              </div>
            )}

            {AI_PROVIDERS[settings.provider]?.requiresKey && (
              <div className="form-group">
                <label>API Key - REQUERIDA</label>
              <input
                type="password"
                name="apiKey"
                value={settings.apiKey}
                onChange={handleSettingsChange}
                placeholder="sk-proj-..."
              />
              <small style={{
                display: 'block',
                marginTop: '0.5rem',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem'
              }}>
                Tu API key se almacena solo en tu navegador (localStorage). Obtén una en{' '}
                <a
                  href={settings.provider === 'anthropic' ? 'https://console.anthropic.com/settings/keys' : 'https://platform.openai.com/api-keys'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{color: 'var(--accent-cyan)', textDecoration: 'underline'}}
                >
                  {settings.provider === 'anthropic' ? 'console.anthropic.com' : 'platform.openai.com'}
                </a>
              </small>
            </div>
            )}
            
            <div className="form-group">
              <label>Perfil del Candidato</label>
              <textarea
                name="profile"
                value={settings.profile}
                onChange={handleSettingsChange}
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Requerimientos de la Vacante</label>
              <textarea
                name="vacancy"
                value={settings.vacancy}
                onChange={handleSettingsChange}
                rows={4}
              />
            </div>

            <button className="btn-save" onClick={() => setIsSettingsOpen(false)}>
              Guardar y Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
