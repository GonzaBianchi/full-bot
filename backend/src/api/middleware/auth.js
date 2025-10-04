export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'No autenticado' });
};

export const hasGuildPermission = async (req, res, next) => {
  try {
    const guildId = req.params.guildId;
    const user = req.user;

    // Verificar si el usuario tiene el servidor en su lista
    const userGuilds = user.guilds || [];
    const guild = userGuilds.find(g => g.id === guildId);

    if (!guild) {
      return res.status(403).json({ error: 'No tienes acceso a este servidor' });
    }

    // Verificar permisos de administrador (0x8 = ADMINISTRATOR)
    const hasAdmin = (parseInt(guild.permissions) & 0x8) === 0x8;

    if (!hasAdmin) {
      return res.status(403).json({ error: 'Necesitas permisos de administrador' });
    }

    // Verificar que el bot esté en el servidor
    const botGuild = req.discordClient.guilds.cache.get(guildId);
    if (!botGuild) {
      return res.status(404).json({ error: 'El bot no está en este servidor' });
    }

    req.guild = botGuild;
    next();
  } catch (error) {
    console.error('Error en hasGuildPermission:', error);
    res.status(500).json({ error: 'Error al verificar permisos' });
  }
};