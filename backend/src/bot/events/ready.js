import { Events, ActivityType } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuarios: ${client.users.cache.size}`);

    // Establecer estado del bot
    client.user.setPresence({
      activities: [{
        name: `/rank | ${client.guilds.cache.size} servidores`,
        type: ActivityType.Playing
      }],
      status: 'online'
    });

    // Actualizar estado cada 5 minutos
    setInterval(() => {
      const activities = [
        { name: `/rank | ${client.guilds.cache.size} servidores`, type: ActivityType.Playing },
        { name: 'niveles y XP', type: ActivityType.Watching },
        { name: 'el dashboard', type: ActivityType.Watching },
      ];

      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      client.user.setPresence({
        activities: [randomActivity],
        status: 'online'
      });
    }, 5 * 60 * 1000);
  }
};