// Títulos y descripciones de logros para cada tipo y nivel
export const LOGROS = {
  birthday: {
    title: '¡Cumpleañero Oficial!',
    description: 'Registrar su cumpleaños en el bot con /setbirthday.'
  },
  booster: {
    title: '¡Turbo Fan del Server!',
    description: 'Boostear el server al menos una vez.'
  },
  messages: [
    { title: '¡Primeras Palabras!', desc: 'Enviar 20 mensajes.' },
    { title: '¡Conversador Casual!', desc: 'Enviar 100 mensajes.' },
    { title: '¡Chateador Constante!', desc: 'Enviar 500 mensajes.' },
    { title: '¡Teclado Humeante!', desc: 'Enviar 1,000 mensajes.' },
    { title: '¡Leyenda del Chat!', desc: 'Enviar 10,000 mensajes.' },
    { title: '¡Mito del Teclado!', desc: 'Enviar 100,000 mensajes.' },
    { title: '¡Deidad del Spam!', desc: 'Enviar 1,000,000 mensajes.' }
  ],
  reactions: [
    { title: '¡Dedo Inquieto!', desc: 'Reaccionar 10 veces.' },
    { title: '¡Reaccionador Alegre!', desc: 'Reaccionar 100 veces.' },
    { title: '¡Emoji Master!', desc: 'Reaccionar 500 veces.' },
    { title: '¡Señor de las Reacciones!', desc: 'Reaccionar 1,000 veces.' },
    { title: '¡Rey del Like!', desc: 'Reaccionar 10,000 veces.' },
    { title: '¡Mito de las Reacciones!', desc: 'Reaccionar 100,000 veces.' },
    { title: '¡Dios de los Emojis!', desc: 'Reaccionar 1,000,000 veces.' }
  ],
  voice: [
    { title: '¡Charlatán Novato!', desc: 'Pasar 60 minutos en voice.' },
    { title: '¡Conversador de Café!', desc: 'Pasar 180 minutos en voice.' },
    { title: '¡Locutor Amateur!', desc: 'Pasar 720 minutos en voice.' },
    { title: '¡Radio del Server!', desc: 'Pasar 1,440 minutos en voice.' },
    { title: '¡Leyenda del Mic!', desc: 'Pasar 10080 minutos en voice.' },
    { title: '¡Mito del Parlante!', desc: 'Pasar 43200 minutos en voice.' }
  ]
};

// Niveles de cada logro (acumulativos)
export const LEVELS = {
  messages: [20, 100, 500, 1000, 10000, 100000, 1000000],
  reactions: [10, 100, 500, 1000, 10000, 100000, 1000000],
  voice: [60, 180, 720, 1440, 10080, 43200] // minutos
};
