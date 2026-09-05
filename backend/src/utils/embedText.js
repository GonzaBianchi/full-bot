const MAX_FIELD_LENGTH = 1024;

/**
 * Reparte texto en trozos que caben en un field de embed (1024 caracteres),
 * cortando por bloques completos en vez de a mitad de una línea.
 */
export function chunkForField(blocks, maxLength = MAX_FIELD_LENGTH) {
  const chunks = [];
  let current = '';

  for (const block of blocks) {
    if (current.length + block.length > maxLength) {
      if (current) chunks.push(current.trimEnd());
      current = block.length > maxLength ? `${block.slice(0, maxLength - 3)}...` : block;
    } else {
      current += block;
    }
  }

  if (current) chunks.push(current.trimEnd());
  return chunks;
}
