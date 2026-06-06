const presetLabels: Record<string, string> = {
  red: "🔴 Красный",
  blue: "🔵 Синий",
  green: "🟢 Зелёный",
  purple: "🟣 Фиолетовый",
  black: "⚫ Чёрный",
  gold: "🟡 Золотой",
  crypto: "₿ Крипто",
  cyberpunk: "🌆 Киберпанк",
  meme: "😄 Мемный",
  gamer: "🎮 Геймер",
  magic: "✨ Магический",
  samurai: "🗡️ Самурай",
  laptop: "💻 Ноутбук",
  coffee: "☕ Кофе",
  gamepad: "🎮 Геймпад",
  bitcoin_coin: "🪙 Bitcoin-монета",
  microphone: "🎙️ Микрофон",
  drumsticks: "🥁 Барабанные палочки",
  neon_server_room: "🌌 Неоновая серверная",
  crypto_chart: "📈 Крипто-график",
  space: "🚀 Космос",
  gaming_room: "🕹️ Геймерская комната",
  castle: "🏰 Замок",
  white_studio: "🤍 Белая студия",
  Epic: "△ Epic",
  Mythic: "◆ Mythic",
  Legendary: "⬢ Legendary",
  "Founder Legendary": "✹ Founder Legendary",
  Foil: "✨ Foil",
  "Foil Epic": "△ Foil Epic",
  "Foil Mythic": "◆ Foil Mythic",
  "Foil Legendary": "⬢ Foil Legendary",
  "Foil Founder Legendary": "✹ Foil Founder Legendary",
  telegram_profile: "📷 Фото Telegram",
  uploaded: "🖼️ Загруженное фото",
  none: "Без фото",
  draft: "Черновик",
  ready_for_generation: "Готова к генерации",
  generating: "Генерируется",
  completed: "Готова",
  failed: "Ошибка генерации",
};

export function getPresetLabel(value: string | null | undefined): string {
  if (!value) {
    return "Не выбрано";
  }

  return presetLabels[value] ?? value;
}
