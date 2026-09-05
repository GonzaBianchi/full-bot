import { getCommands } from '../bot/commands/index.js';
import { chunkForField } from './embedText.js';

const SUBCOMMAND = 1;
const SUBCOMMAND_GROUP = 2;

function usageOf(json) {
  const options = json.options || [];
  const subcommands = options.filter(o => o.type === SUBCOMMAND || o.type === SUBCOMMAND_GROUP);

  if (subcommands.length > 0) {
    return `/${json.name} <${subcommands.map(o => o.name).join(' | ')}>`;
  }

  const args = options.map(o => (o.required ? `<${o.name}>` : `[${o.name}]`));
  return args.length > 0 ? `/${json.name} ${args.join(' ')}` : `/${json.name}`;
}

/**
 * Describe los comandos realmente registrados, separando los de administración
 * por si declaran `default_member_permissions`.
 * /adminhelp y /userhelp mantenían la lista a mano y ya se había desincronizado
 * del código (nombres equivocados y comandos ausentes).
 */
export function describeCommands({ adminOnly }) {
  return [...getCommands().values()]
    .map(cmd => cmd.data.toJSON())
    .filter(json => Boolean(json.default_member_permissions) === adminOnly)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(json => ({
      name: `/${json.name}`,
      description: json.description,
      usage: usageOf(json)
    }));
}

/** Convierte la lista de comandos en fields de embed ya troceados. */
export function commandFields(commands, title) {
  const blocks = commands.map(cmd => `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\`\n\n`);
  const chunks = chunkForField(blocks);

  return chunks.map((value, i) => ({
    name: i === 0 ? title : `${title} (cont.)`,
    value,
    inline: false
  }));
}
