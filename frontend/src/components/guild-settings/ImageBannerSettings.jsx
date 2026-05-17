import { useState, useEffect } from 'react';
import { Image, Upload, X, Eye, EyeOff, Sliders } from 'lucide-react';

export function ImageBannerSettings({ guildId, type = 'achievement-notification' }) {
  const [config, setConfig] = useState({
    url: '',
    blur: type === 'rank-card' ? 8 : 6,
    opacity: type === 'rank-card' ? 0.5 : 0.7
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  const API_URL = import.meta.env?.VITE_API_URL ?? '';

  useEffect(() => {
    loadConfig();
  }, [guildId, type]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/guilds/${guildId}/config/images`,
        { credentials: 'include' }
      );
      
      if (!response.ok) throw new Error('Error cargando configuración');
      
      const data = await response.json();
      const imageConfig = type === 'rank-card' 
        ? data.images?.rankCard 
        : data.images?.achievementNotification;

      if (imageConfig) {
        setConfig({
          url: imageConfig.url || '',
          blur: imageConfig.blur ?? (type === 'rank-card' ? 8 : 6),
          opacity: imageConfig.opacity ?? (type === 'rank-card' ? 0.5 : 0.7)
        });
        setTempUrl(imageConfig.url || '');
      }
    } catch (error) {
      console.error('Error cargando configuración de imagen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (tempUrl && !isValidUrl(tempUrl)) {
        alert('Por favor ingresa una URL válida');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/guilds/${guildId}/config/images/${type}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            url: tempUrl || null,
            blur: config.blur,
            opacity: config.opacity
          })
        }
      );

      if (!response.ok) throw new Error('Error guardando configuración');

      setConfig(prev => ({ ...prev, url: tempUrl }));
      alert('✅ Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('❌ Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Resetear la configuración de imagen a los valores por defecto?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `${API_URL}/api/guilds/${guildId}/config/images/${type}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Error reseteando configuración');

      const defaults = {
        url: '',
        blur: type === 'rank-card' ? 8 : 6,
        opacity: type === 'rank-card' ? 0.5 : 0.7
      };
      
      setConfig(defaults);
      setTempUrl('');
      alert('✅ Configuración reseteada');
    } catch (error) {
      console.error('Error reseteando configuración:', error);
      alert('❌ Error al resetear');
    } finally {
      setSaving(false);
    }
  };

  const isValidUrl = (string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const title = type === 'rank-card' ? 'Banner de Rank Card' : 'Banner de Notificaciones de Logros';
  const description = type === 'rank-card' 
    ? 'Personaliza el fondo de las tarjetas de rango (/rank)'
    : 'Personaliza el fondo de las notificaciones cuando se desbloquea un logro';

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center gap-3 mb-6">
        <Image className="w-6 h-6 text-indigo-400" />
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* URL de la imagen */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            URL de la Imagen
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full pl-11 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {tempUrl && (
                <button
                  onClick={() => setTempUrl('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setPreview(!preview)}
              disabled={!tempUrl || !isValidUrl(tempUrl)}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              title={preview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
            >
              {preview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Soporta: JPG, PNG, GIF, WebP. Recomendado: 1920x1080px o mayor
          </p>
        </div>

        {/* Vista previa de la imagen */}
        {preview && tempUrl && isValidUrl(tempUrl) && (
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-600">
            <div className="relative h-64">
              <img
                src={tempUrl}
                alt="Vista previa"
                className="w-full h-full object-cover"
                style={{
                  filter: `blur(${config.blur}px)`,
                  opacity: config.opacity
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'flex items-center justify-center h-64 bg-gray-900';
                  errorDiv.innerHTML = '<p class="text-red-400">❌ No se pudo cargar la imagen</p>';
                  e.target.parentElement.appendChild(errorDiv);
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="text-center text-white">
                  <p className="text-2xl font-bold mb-2">Vista Previa</p>
                  <p className="text-sm">Blur: {config.blur}px | Opacidad: {Math.round(config.opacity * 100)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controles de Blur */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Desenfoque (Blur): <span className="text-indigo-400">{config.blur}px</span>
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={config.blur}
            onChange={(e) => setConfig({ ...config, blur: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Sin desenfoque</span>
            <span>Muy desenfocado</span>
          </div>
        </div>

        {/* Controles de Opacidad */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Opacidad del Overlay: <span className="text-indigo-400">{Math.round(config.opacity * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.opacity}
            onChange={(e) => setConfig({ ...config, opacity: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Transparente</span>
            <span>Opaco</span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            🔄 Resetear
          </button>
        </div>

        {/* Ayuda */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-300 mb-2">💡 <strong>Consejos:</strong></p>
          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
            <li>Usa imágenes de alta resolución para mejores resultados</li>
            <li>El blur suaviza la imagen de fondo</li>
            <li>La opacidad controla qué tan visible es el texto sobre la imagen</li>
            <li>Puedes usar servicios como Imgur, Discord CDN, o tu propio hosting</li>
          </ul>
        </div>
      </div>
    </div>
  );
}