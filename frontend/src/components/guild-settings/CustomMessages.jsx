import { useState } from 'react';
import { Send, MessageSquare, Sparkles, Plus, Trash2, Hash } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { StyledSelect } from '../ui/StyledSelect';
import { InfoAlert } from '../ui/InfoAlert';
import toast from 'react-hot-toast';
import { guildService } from '../../services/api';

export function CustomMessages({ guildId, channels }) {
  const [messageType, setMessageType] = useState('text');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [sending, setSending] = useState(false);

  // Estados para mensaje de texto
  const [textContent, setTextContent] = useState('');

  // Estados para embed
  const [embedTitle, setEmbedTitle] = useState('');
  const [embedDescription, setEmbedDescription] = useState('');
  const [embedColor, setEmbedColor] = useState('#5865F2');
  const [embedFooter, setEmbedFooter] = useState('');
  const [embedThumbnail, setEmbedThumbnail] = useState('');
  const [embedImage, setEmbedImage] = useState('');
  const [embedAuthorName, setEmbedAuthorName] = useState('');
  const [embedAuthorIcon, setEmbedAuthorIcon] = useState('');
  const [embedFields, setEmbedFields] = useState([]);

  // Solo canales de texto
  const textChannels = channels.filter(c => c.type === 0 || c.type === 'GUILD_TEXT');
  const channelOptions = textChannels.map(ch => ({ id: ch.id, name: `# ${ch.name}` }));

  const addField = () => {
    setEmbedFields([...embedFields, { name: '', value: '', inline: false }]);
  };

  const removeField = (index) => {
    setEmbedFields(embedFields.filter((_, i) => i !== index));
  };

  const updateField = (index, key, value) => {
    const updated = [...embedFields];
    updated[index][key] = value;
    setEmbedFields(updated);
  };

  const resetForm = () => {
    setTextContent('');
    setEmbedTitle('');
    setEmbedDescription('');
    setEmbedColor('#5865F2');
    setEmbedFooter('');
    setEmbedThumbnail('');
    setEmbedImage('');
    setEmbedAuthorName('');
    setEmbedAuthorIcon('');
    setEmbedFields([]);
  };

  const handleSendMessage = async () => {
    if (!selectedChannel) {
      toast.error('Por favor selecciona un canal');
      return;
    }

    if (messageType === 'text' && !textContent.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }

    if (messageType === 'embed' && !embedTitle && !embedDescription) {
      toast.error('El embed debe tener al menos un título o descripción');
      return;
    }

    setSending(true);

    try {
      const payload = {
        channelId: selectedChannel,
        type: messageType,
        content: messageType === 'text' ? textContent : undefined
      };

      if (messageType === 'embed') {
        payload.embed = {
          title: embedTitle || undefined,
          description: embedDescription || undefined,
          color: embedColor || undefined,
          footer: embedFooter || undefined,
          thumbnail: embedThumbnail || undefined,
          image: embedImage || undefined,
          author: embedAuthorName ? {
            name: embedAuthorName,
            iconUrl: embedAuthorIcon || undefined
          } : undefined,
          fields: embedFields.filter(f => f.name && f.value).length > 0 
            ? embedFields.filter(f => f.name && f.value)
            : undefined
        };
      }

      const response = await guildService.sendMessage(guildId, payload);
      
      toast.success('Mensaje enviado correctamente');
      resetForm();
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Error al enviar el mensaje';
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
            <span>Mensajes Personalizados</span>
          </h2>
          <p className="text-gray-400 mt-1">
            Envía mensajes personalizados como el bot a cualquier canal
          </p>
        </div>
      </div>

      {/* Información */}
      <InfoAlert
        variant="blue"
        title="Información"
        items={[
          'Puedes enviar mensajes de texto simples o embeds enriquecidos',
          'El bot necesita permisos para enviar mensajes en el canal seleccionado',
          'Los embeds soportan hasta 25 campos',
          'Los mensajes se envían inmediatamente al hacer clic en "Enviar Mensaje"'
        ]}
      />

      {/* Configuración del Mensaje */}
      <SectionCard
        icon={MessageSquare}
        iconBgColor="bg-indigo-500/20"
        iconColor="text-indigo-400"
        title="Configuración del Mensaje"
        description="Selecciona el canal y tipo de mensaje que deseas enviar"
      >
        <div className="space-y-4">
          {/* Selector de Canal con StyledSelect */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Canal de destino
            </label>
            <StyledSelect
              value={selectedChannel}
              onChange={(val) => setSelectedChannel(val || '')}
              options={channelOptions}
              placeholder="Selecciona un canal"
              icon={Hash}
            />
            <p className="text-xs text-gray-400 mt-1">
              Canal donde se enviará el mensaje personalizado
            </p>
          </div>

          {/* Tipo de Mensaje */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de mensaje
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setMessageType('text')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
                  messageType === 'text'
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                    : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Texto Simple</span>
              </button>
              <button
                onClick={() => setMessageType('embed')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
                  messageType === 'embed'
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                    : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Sparkles className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Embed</span>
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Contenido del Mensaje */}
      {messageType === 'text' ? (
        <SectionCard
          icon={MessageSquare}
          iconBgColor="bg-blue-500/20"
          iconColor="text-blue-400"
          title="Contenido del Mensaje"
          description="Escribe el mensaje de texto que deseas enviar"
        >
          <div>
            <label htmlFor="text-content" className="block text-sm font-medium text-gray-300 mb-2">
              Mensaje
            </label>
            <textarea
              id="text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={6}
              maxLength={2000}
              className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-400">
                Límite de Discord: 2000 caracteres
              </p>
              <p className="text-xs text-gray-500">
                {textContent.length}/2000
              </p>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          icon={Sparkles}
          iconBgColor="bg-purple-500/20"
          iconColor="text-purple-400"
          title="Configuración del Embed"
          description="Personaliza el embed con todos sus elementos"
        >
          <div className="space-y-4">
            {/* Título */}
            <div>
              <label htmlFor="embed-title" className="block text-sm font-medium text-gray-300 mb-2">
                Título
              </label>
              <input
                id="embed-title"
                type="text"
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
                placeholder="Título del embed"
                maxLength={256}
                className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">Máximo 256 caracteres</p>
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="embed-description" className="block text-sm font-medium text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                id="embed-description"
                value={embedDescription}
                onChange={(e) => setEmbedDescription(e.target.value)}
                placeholder="Descripción del embed"
                rows={4}
                maxLength={4096}
                className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">Máximo 4096 caracteres</p>
            </div>

            {/* Color */}
            <div>
              <label htmlFor="embed-color" className="block text-sm font-medium text-gray-300 mb-2">
                Color del embed
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="embed-color-picker"
                  value={embedColor}
                  onChange={(e) => setEmbedColor(e.target.value)}
                  className="w-16 h-12 rounded-lg cursor-pointer border-2 border-gray-600 bg-gray-700"
                />
                <input
                  type="text"
                  id="embed-color"
                  value={embedColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setEmbedColor(value);
                    }
                  }}
                  placeholder="#5865F2"
                  maxLength={7}
                  className="flex-1 bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-3 text-white font-mono placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Color hexadecimal (ej: #5865F2 para azul Discord)
              </p>
            </div>

            {/* Autor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="embed-author-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Autor (nombre)
                </label>
                <input
                  id="embed-author-name"
                  type="text"
                  value={embedAuthorName}
                  onChange={(e) => setEmbedAuthorName(e.target.value)}
                  placeholder="Nombre del autor"
                  maxLength={256}
                  className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label htmlFor="embed-author-icon" className="block text-sm font-medium text-gray-300 mb-2">
                  Autor (icono URL)
                </label>
                <input
                  id="embed-author-icon"
                  type="url"
                  value={embedAuthorIcon}
                  onChange={(e) => setEmbedAuthorIcon(e.target.value)}
                  placeholder="https://ejemplo.com/icon.png"
                  className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            {/* Imágenes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="embed-thumbnail" className="block text-sm font-medium text-gray-300 mb-2">
                  Thumbnail URL
                </label>
                <input
                  id="embed-thumbnail"
                  type="url"
                  value={embedThumbnail}
                  onChange={(e) => setEmbedThumbnail(e.target.value)}
                  placeholder="https://ejemplo.com/thumbnail.png"
                  className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label htmlFor="embed-image" className="block text-sm font-medium text-gray-300 mb-2">
                  Imagen URL
                </label>
                <input
                  id="embed-image"
                  type="url"
                  value={embedImage}
                  onChange={(e) => setEmbedImage(e.target.value)}
                  placeholder="https://ejemplo.com/image.png"
                  className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div>
              <label htmlFor="embed-footer" className="block text-sm font-medium text-gray-300 mb-2">
                Footer
              </label>
              <input
                id="embed-footer"
                type="text"
                value={embedFooter}
                onChange={(e) => setEmbedFooter(e.target.value)}
                placeholder="Texto del footer"
                maxLength={2048}
                className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">Máximo 2048 caracteres</p>
            </div>

            {/* Campos */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Campos (opcional)
                </label>
                <button
                  onClick={addField}
                  disabled={embedFields.length >= 25}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Campo</span>
                </button>
              </div>

              {embedFields.length > 0 && (
                <div className="space-y-3">
                  {embedFields.map((field, index) => (
                    <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-300">Campo {index + 1}</span>
                        <button
                          onClick={() => removeField(index)}
                          className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(index, 'name', e.target.value)}
                          placeholder="Nombre del campo"
                          maxLength={256}
                          className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                        <textarea
                          value={field.value}
                          onChange={(e) => updateField(index, 'value', e.target.value)}
                          placeholder="Valor del campo"
                          rows={2}
                          maxLength={1024}
                          className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
                        />
                        <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.inline}
                            onChange={(e) => updateField(index, 'inline', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span>Mostrar en línea</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {embedFields.length === 0 && (
                <div className="text-center py-8 bg-gray-700/20 rounded-lg border-2 border-dashed border-gray-600">
                  <p className="text-gray-400 text-sm">No hay campos agregados</p>
                  <p className="text-gray-500 text-xs mt-1">Haz clic en "Agregar Campo" para añadir uno</p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Botones de Acción */}
      <div className="flex justify-end gap-3">
        <button
          onClick={resetForm}
          disabled={sending}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
        >
          Limpiar
        </button>
        <button
          onClick={handleSendMessage}
          disabled={sending || !selectedChannel}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg cursor-pointer"
        >
          <Send className="w-5 h-5" />
          <span>{sending ? 'Enviando...' : 'Enviar Mensaje'}</span>
        </button>
      </div>
    </div>
  );
}