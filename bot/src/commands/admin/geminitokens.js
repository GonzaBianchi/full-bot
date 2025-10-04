import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { GeminiToken } from '../../models/GeminiToken.js';

export const data = new SlashCommandBuilder()
  .setName('geminitokens')
  .setDescription('Muestra la cantidad de tokens usados este mes por Gemini')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const nowDate = new Date();
  const monthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
  const TOKEN_LIMIT = 2000000;
  let tokenDoc = await GeminiToken.findOne({ month: monthKey });
  const used = tokenDoc ? tokenDoc.used : 0;
  const percent = ((used / TOKEN_LIMIT) * 100).toFixed(2);
  await interaction.reply({
    content: `Tokens usados este mes: **${used.toLocaleString()}** / **${TOKEN_LIMIT.toLocaleString()}**  (${percent}%)`,
    flags: 64
  });
}
