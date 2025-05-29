import { MetaProgress, MetaSettings as MetaSettingsType } from '../game/game.model';

export const MetaSettings: MetaSettingsType = {
  'Category visible': {
    maxValue: 1,
    price: 25,
    explanation: '<strong>Category visible:</strong><br/><br/>Shows the category for the word',
  },
  'Daily boost': {
    maxValue: 1,
    price: 50,
    explanation:
      '<strong>Daily Boost:</strong><br/><br/>Unlocks 5 boosted words every day, each worth 10 times the usual ☁️.',
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
  'Remove clouds': {
    maxValue: 1,
    price: 2500,
    explanation:
      '<strong>Remove clouds:</strong><br/><br/>Removes the clouds around the word.<br/>Always see full length of the word.',
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

export const styledCategories = [
  '🧑‍🤝‍🧑 People and Relationships 💞',
  '🌿 Nature and Environment 🌍',
  '🫁 Body and Health 🩺',
  '🍕 Food and Drink 🥤',
  '🛠️ Objects and Tools 🧰',
  '🗺️ Places and Geography 🌆',
  '⏳ Time and Dates 📅',
  '😄 Emotions and States 🧠',
  '🎯 Activities and Leisure 🕹️',
  '🚶 Movement and Travel ✈️',
  '🗣️ Communication and Language ✍️',
  '💼 Work and Business 📈',
  '🏛️ Society and Politics 🗳️',
  '🔬 Science and Technology 🤖',
  '📏 Quantities and Measurements ⚖️',
  '🌌 Abstract Concepts 🧠',
  '🎨 Colors and Descriptions 🧵',
];

export const winMessagesLow = [
  'Whew! Just made it 😅',
  'Close call! 🫣',
  'Pulled it off… barely! 😬',
  'A win’s a win! 🟡',
  'That was a battle! ⚔️',
  'You got there! Eventually 😄',
  'Not bad! 😉',
  'Well... it worked. 😅',
  'Came in clutch! 🧤',
  'Lucky guess? 🍀',
  'Saved by the bell! 🔔',
  'Could’ve gone either way! ⚖️',
  'Hey, it still counts! ✅',
  'One ☁️ at a time! 🌤️',
  'Resilient win! 🧱',
  'Stubborn pays off! 🐢',
  'Late game heroics! 🕰️',
  'Got there in the end! 🛤️',
  'Phew! 🧻',
  'Sweaty win! 💦',
];

export const winMessagesMid = [
  'Nice! 🎯',
  'Well done! 👏',
  'Great guess! 😎',
  'Correct! ✅',
  'You nailed it! 🔨',
  'Boom! 💥',
  'That’s it! 🎉',
  'Winner! 🏆',
  'Yes! 😁',
  'Smooth! 😌',
  'Nice work! 🔧',
  'That’s the one! ✅',
  'Bang on! 🎯',
  'Bravo! 👏',
  'Pro move! 🎮',
  'Solid hit! 🧱',
  'Tidy guess! 🧼',
  'Sharp mind! 🧠',
  'All day! ⏰',
  'Steady hand! ✋',
  'Clean win! 🧽',
  'You got this! 💫',
  'Bangarang! 🛎️',
  'Mad skills! 🌀',
  'Smart move! 🧠',
  'Sharp as ever! 🔪',
  'Crackin’ job! 🧩',
  'You rule! 👑',
  'Look at you! 🌟',
  'Flex! 💪',
];

export const winMessagesHigh = [
  'Flawless! 🧼',
  'Sniped it! 🎯',
  'One shot, one win! 🎯',
  'Crushed it! 💪',
  'Smashed it! 🚀',
  'Busted it wide open! 💥',
  'You beast! 🐾',
  'Legend! 👑',
  'Epic win! 🏆',
  'Big brain! 🧠',
  'Word wizard! ✨',
  'Golden guess! 🥇',
  'Dead-on! 🧷',
  'Touché! 🗡️',
  'No contest! 🥊',
  'Savage guess! 😤',
  'Stellar! 🌠',
  'Masterstroke! 🎨',
  'Overachiever! 🥇',
  'Clean sweep! 🧹',
  'Zing! ⚡',
  'Goat level! 🐐',
  'Feelin’ lucky? You should! 🍀',
  'Prime pick! 🔍',
  'Mind = Blown 💥',
  'Victory lap! 🏁',
  'King/Queen move! 👑',
  'The stuff of legends! 📖',
  'Game on, game won! 🕹️',
  'Boomshakalaka! 💣',
  'Unreal! 🎭',
  'You crushed that! 🍉',
  'Like a boss! 💼',
  'Exacto! 🎯',
];
