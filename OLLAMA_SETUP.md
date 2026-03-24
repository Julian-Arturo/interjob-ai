# 🦙 Guía: Configurar IA Local con Ollama (Sin Límites de Tokens)

Esta guía te muestra cómo levantar tu propia IA local usando Ollama para tener **respuestas ilimitadas sin pagar por tokens**.

## ¿Por qué Ollama Local?

✅ **Sin límites de tokens** - Usa todo lo que quieras
✅ **Gratis** - No pagas nada después de la instalación
✅ **Privado** - Tus datos nunca salen de tu computadora
✅ **Sin API keys** - No necesitas configurar nada externo
✅ **Rápido** - Respuestas en segundos si tienes buena GPU

## Requisitos del Sistema

- **RAM**: Mínimo 8GB (recomendado 16GB)
- **Disco**: 10-50GB libres (según el modelo)
- **GPU** (opcional): NVIDIA/AMD para mejor rendimiento
- **Sistema operativo**: Windows, macOS, o Linux

## Paso 1: Instalar Ollama

### Windows

1. Descarga el instalador: https://ollama.com/download/windows
2. Ejecuta el instalador `.exe`
3. Sigue las instrucciones del asistente

### macOS

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## Paso 2: Descargar un Modelo

Ollama funciona descargando modelos de IA a tu computadora. Aquí están los recomendados:

### Modelos Recomendados

#### 1. **Llama 3.2** (Recomendado para empezar)
```bash
ollama pull llama3.2
```
- **Tamaño**: ~2GB
- **RAM necesaria**: 8GB
- **Calidad**: Excelente para tareas generales

#### 2. **Mistral**
```bash
ollama pull mistral
```
- **Tamaño**: ~4.1GB
- **RAM necesaria**: 8GB
- **Calidad**: Muy bueno para español

#### 3. **Qwen 2.5** (El mejor para código)
```bash
ollama pull qwen2.5
```
- **Tamaño**: ~4.7GB
- **RAM necesaria**: 8GB
- **Calidad**: Excelente para programación y código

#### 4. **CodeLlama** (Especializado en código)
```bash
ollama pull codellama
```
- **Tamaño**: ~3.8GB
- **RAM necesaria**: 8GB
- **Calidad**: Especializado en explicar y escribir código

### Comando para Ver Modelos Instalados

```bash
ollama list
```

## Paso 3: Verificar que Ollama Está Corriendo

```bash
ollama serve
```

O simplemente abre un navegador y ve a: http://localhost:11434

Deberías ver: `Ollama is running`

## Paso 4: Probar el Modelo

```bash
ollama run llama3.2
```

Escribe algo como: "Hola, ¿cómo estás?" y presiona Enter.

Para salir: escribe `/bye`

## Paso 5: Configurar InterJob AI

1. Abre la aplicación InterJob AI
2. Haz clic en ⚙️ **Opciones**
3. En **Proveedor de IA**, selecciona: **Ollama (Local - Sin límites)**
4. En **Modelo**, selecciona el modelo que descargaste (ej: `llama3.2`)
5. Guarda y cierra

**¡Listo!** Ya no necesitas API key y puedes usar la app sin límites.

## Solución de Problemas

### Error: "Failed to connect to Ollama"

**Solución**: Asegúrate de que Ollama esté corriendo:

```bash
ollama serve
```

### Error: "Model not found"

**Solución**: Descarga el modelo primero:

```bash
ollama pull llama3.2
```

### La IA responde muy lento

**Soluciones**:
1. Usa un modelo más pequeño (llama3.2 en lugar de qwen2.5)
2. Cierra otras aplicaciones para liberar RAM
3. Si tienes GPU NVIDIA, Ollama la usará automáticamente

### Quiero usar varios modelos

Puedes descargar todos los que quieras:

```bash
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5
ollama pull codellama
```

Luego cambia entre ellos desde la app en ⚙️ Opciones > Modelo.

## Comparación de Calidad

| Modelo | Velocidad | Calidad | Mejor para |
|--------|-----------|---------|------------|
| llama3.2 | ⚡⚡⚡ | ★★★★ | Uso general |
| mistral | ⚡⚡ | ★★★★★ | Español y entrevistas |
| qwen2.5 | ⚡⚡ | ★★★★★ | Código Flutter/Dart |
| codellama | ⚡⚡ | ★★★★ | Solo código |

## Comandos Útiles de Ollama

```bash
# Ver modelos instalados
ollama list

# Descargar un modelo
ollama pull <nombre-modelo>

# Eliminar un modelo
ollama rm <nombre-modelo>

# Ver cuánto espacio ocupan tus modelos
ollama list

# Actualizar Ollama
# Windows: Descarga nuevo instalador
# macOS/Linux:
curl -fsSL https://ollama.com/install.sh | sh
```

## Recursos Adicionales

- **Documentación oficial**: https://ollama.com/docs
- **Modelos disponibles**: https://ollama.com/library
- **GitHub de Ollama**: https://github.com/ollama/ollama

---

## ¿Preguntas?

Si tienes problemas, revisa:
1. Que Ollama esté corriendo (`ollama serve`)
2. Que el modelo esté descargado (`ollama list`)
3. Que hayas seleccionado "Ollama (Local - Sin límites)" en la app

¡Disfruta de tu IA local sin límites! 🚀
