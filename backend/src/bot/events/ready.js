import { Events, ActivityType } from 'discord.js';
import logger from '../../utils/logger.js';

const PRESENCE_ROTATION_MS = 5 * 60 * 1000;

let rotationTimer = null;

function activitiesFor(client) {
  return [
    { name: `/rank | ${client.guilds.cache.size} servidores`, type: ActivityType.Playing },
    { name: 'niveles y XP', type: ActivityType.Watching },
    { name: 'el dashboard', type: ActivityType.Watching },
  ];
}

/** Detiene la rotación de presencia. La llama el shutdown de BotApp. */
export function stopPresenceRotation() {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Bot conectado como ${client.user.tag} — ${client.guilds.cache.size} servidores`);

    client.user.setPresence({
      activities: [activitiesFor(client)[0]],
      status: 'online'
    });

    // Un solo timer, guardado para poder limpiarlo: antes se creaba sin
    // referencia y sobrevivía al shutdown.
    stopPresenceRotation();
    rotationTimer = setInterval(() => {
      const activities = activitiesFor(client);
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      client.user.setPresence({ activities: [randomActivity], status: 'online' });
    }, PRESENCE_ROTATION_MS);
    rotationTimer.unref();
  }
};
