// src/utils.ts
export function generateRandomTitle(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let title = '';
  for (let i = 0; i < 3; i++) {
    title += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  // Optional: You could add a timestamp or something short to make it even less likely to collide
  // title += '-' + Date.now().toString().slice(-4);
  return title;
}

// Add any other utility functions here if needed
