export const MetaSettings: {
  [key: string]: { maxValue: number; price: number; explanation: string };
} = {
  'Theme visible': {
    maxValue: 1,
    price: 25,
    explanation: '<strong>Theme visible:</strong><br/><br/>Shows the theme for the word',
  },
  'Purge group 3': {
    maxValue: 4,
    price: 50,
    explanation:
      '<strong>Purge group 3:</strong><br/><br/>Removes unused letters from group 3:<br/>F, Y, W, V, K, X, Z, J, Q',
  },
  'Purge group 2': {
    maxValue: 3,
    price: 100,
    explanation:
      '<strong>Purge group 2:</strong><br/><br/>Removes unused letters from group 2:<br/>C, U, D, P, M, H, G, B',
  },
  'Purge group 1': {
    maxValue: 2,
    price: 250,
    explanation:
      '<strong>Purge group 1:</strong><br/><br/>Removes unused letters from group 1:<br/>E, A, R, I, O, T, N, S, L',
  },
  'Definition visible': {
    maxValue: 5,
    price: 500,
    explanation:
      '<strong>Definition visible:</strong><br/><br/>Shows (part of) the definition<br/><br/>Rank 1 shows every 5th word<br/>Rank 2 shows every 4th word<br/>Rank 3 shows every 3rd word<br/>Rank 4 shows every 2nd word<br/>Rank 5 shows the entire definition',
  },
  'Free letter': {
    maxValue: 1,
    price: 1000,
    explanation: '<strong>Free letter:</strong><br/><br/>Get a random free letter when starting a new word.',
  },
};

export const KeyboardLayout: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

//letterGroups are ordered by frequency of use in English
//https://en.wikipedia.org/wiki/Letter_frequency
export const LetterGroups: string[][] = [
  ['e', 'a', 'r', 'i', 'o', 't', 'n', 's', 'l'],
  ['c', 'u', 'd', 'p', 'm', 'h', 'g', 'b'],
  ['f', 'y', 'w', 'v', 'k', 'x', 'z', 'j', 'q'],
];
