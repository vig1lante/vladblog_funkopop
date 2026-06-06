import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(import.meta.dirname, "styles.css"), "utf8");
const presetsPage = readFileSync(
  resolve(import.meta.dirname, "pages/PresetsPage.tsx"),
  "utf8",
);
const welcomePage = readFileSync(
  resolve(import.meta.dirname, "pages/WelcomePage.tsx"),
  "utf8",
);
const photoPage = readFileSync(
  resolve(import.meta.dirname, "pages/PhotoPage.tsx"),
  "utf8",
);
const readyPage = readFileSync(
  resolve(import.meta.dirname, "pages/GenerationReadyPage.tsx"),
  "utf8",
);
const waitingPage = readFileSync(
  resolve(import.meta.dirname, "pages/GenerationWaitingPage.tsx"),
  "utf8",
);
const myFigurePage = readFileSync(
  resolve(import.meta.dirname, "pages/MyFigurePage.tsx"),
  "utf8",
);
const figureCard = readFileSync(
  resolve(import.meta.dirname, "components/FigureCard.tsx"),
  "utf8",
);
const rarityBadge = readFileSync(
  resolve(import.meta.dirname, "components/RarityBadge.tsx"),
  "utf8",
);
const main = readFileSync(resolve(import.meta.dirname, "main.tsx"), "utf8");
const app = readFileSync(resolve(import.meta.dirname, "App.tsx"), "utf8");
const presetLabels = readFileSync(
  resolve(import.meta.dirname, "lib/presetLabels.ts"),
  "utf8",
);
const approvedRarityStyles = readFileSync(
  resolve(import.meta.dirname, "lib/approvedRarityStyles.ts"),
  "utf8",
);

describe("frontend styles", () => {
  it("does not use global loading cursors", () => {
    expect(styles).not.toMatch(/cursor:\s*(wait|progress)/);
  });

  it("styles the shared UI system", () => {
    for (const className of [
      ".ui-button",
      ".glass-panel",
      ".select-field",
      ".error-message",
      ".step-indicator",
      ".spinner",
    ]) {
      expect(styles).toContain(className);
    }
  });

  it("does not keep noisy orb or shimmer animations", () => {
    expect(styles).not.toMatch(
      /welcome-orb|generation-orb|brand-mark|orbFloat|spinGlow|@keyframes shimmer/,
    );
  });

  it("hides public presets UI and uses the shorter CTA", () => {
    expect(presetsPage).not.toContain("Публичность");
    expect(presetsPage).not.toContain("Продолжить к генерации");
    expect(presetsPage).not.toContain('title: "Цвет"');
    expect(presetsPage).not.toContain("selected_color");
    expect(presetsPage).toContain("Продолжить");
    expect(presetsPage).toContain("Редкость");
    expect(presetsPage).toContain("presets.rarities");
    expect(presetsPage).toContain("buildInitialPresetForm");
  });

  it("shows Telegram identity on the presets step", () => {
    expect(presetsPage).toContain("type UserResponse");
    expect(presetsPage).toContain("getTelegramDisplayName");
    expect(presetsPage).toContain("Имя из Telegram");
    expect(styles).toContain(".identity-chip");
  });

  it("shows Telegram identity on the final setup step", () => {
    expect(readyPage).toContain("type UserResponse");
    expect(readyPage).toContain("getTelegramDisplayName");
    expect(readyPage).toContain("Имя из Telegram");
  });

  it("uses dark mode as the only base theme", () => {
    expect(main).not.toContain("ThemeProvider");
    expect(styles).not.toContain('[data-theme="dark"]');
    expect(styles).not.toContain(".theme-toggle");
    expect(styles).not.toContain("@media (prefers-color-scheme: dark)");
    expect(styles).toContain("--bg: #0b0b12");
  });

  it("does not show personal debug badge or technical figure status", () => {
    expect(welcomePage).not.toContain("Для ");
    expect(welcomePage).not.toContain("brand-mark");
    expect(figureCard).not.toContain("Статус:");
    expect(figureCard).not.toContain("figure.status");
  });

  it("adds emoji labels for style presets", () => {
    for (const label of [
      "🟣 Фиолетовый",
      "🌆 Киберпанк",
      "💻 Ноутбук",
      "🌌 Неоновая серверная",
      "⬢ Legendary",
    ]) {
      expect(presetLabels).toContain(label);
    }
  });

  it("uses updated user-facing copy", () => {
    expect(welcomePage).toContain("Преврати свою индивидуальность");
    expect(welcomePage).toContain("поделись ей с другими");
    expect(photoPage).toContain("свое лучшее из галереи");
    expect(photoPage).toContain("Тобой;)");
  });

  it("uses a resilient native upload label instead of programmatic file clicks", () => {
    expect(photoPage).toContain("fileInputVersion");
    expect(photoPage).toContain("htmlFor={status === \"ready\" ? fileInputId : undefined}");
    expect(photoPage).toContain("file-upload-control");
    expect(photoPage).not.toContain("inputRef.current?.click()");
    expect(photoPage).not.toContain("Выбрать фото меньше");
    expect(styles).toContain(".file-upload-control");
    expect(styles).toContain(".ui-button.is-disabled");
  });

  it("keeps number and rarity secret until generation result", () => {
    expect(photoPage).not.toContain("figure.display_number");
    expect(readyPage).not.toContain("figure.display_number");
    expect(readyPage).not.toContain("figure.rarity");
    expect(readyPage).not.toContain('title="Номер"');
    expect(readyPage).not.toContain('title="Редкость"');
    expect(readyPage).not.toContain('title="Фото"');
    expect(waitingPage).not.toContain("figure.display_number");
  });

  it("animates rarity badges with a dedicated shine layer", () => {
    expect(rarityBadge).toContain("rarity-badge-text");
    expect(rarityBadge).toContain("rarity-badge-icon");
    expect(rarityBadge).not.toContain("rarity-badge-mark");
    expect(styles).toContain("raritySweep");
    expect(styles).toContain("rarityPulse");
    expect(styles).toContain(".rarity-badge::after");
  });

  it("removes generated source photo block from the result page", () => {
    expect(myFigurePage).not.toContain("Фото для генерации");
    expect(myFigurePage).not.toContain("source-photo-summary");
    expect(myFigurePage).not.toContain("source_photo_url");
    expect(myFigurePage).not.toContain("source_photo_type");
  });

  it("uses approved rarity styles on the generated figure card", () => {
    expect(myFigurePage).not.toContain("rarityStyleOptions");
    expect(myFigurePage).not.toContain("RarityPreviewPair");
    expect(myFigurePage).not.toContain("function RarityStyleShowcase");
    expect(myFigurePage).not.toContain("{variant.icon}");
    expect(myFigurePage).not.toContain("FinalRarityStyleShowcase");
    expect(myFigurePage).not.toContain("finalRarityStyles");
    expect(myFigurePage).not.toContain("Поделиться скоро");
    expect(myFigurePage).toContain("downloadMyFigureCard");
    expect(myFigurePage).not.toContain(">Скачать результат<");
    expect(myFigurePage).toContain('aria-label={isDownloadComplete ? "Скачано" : "Скачать результат"}');
    expect(myFigurePage).toContain("download-button");
    expect(myFigurePage).toContain("download-icon");
    expect(myFigurePage).toContain("download-glyph");
    expect(myFigurePage).toContain("CheckIcon");
    expect(myFigurePage).toContain("if (isDownloadComplete || isDownloading)");
    expect(myFigurePage).toContain("onClick={isDownloadComplete ? undefined : handleDownload}");
    expect(myFigurePage).toContain("isDownloadComplete");
    expect(myFigurePage).toContain("download-complete");
    expect(styles).toContain(".download-button.download-complete");
    expect(styles).toContain(".actions-row .download-button");
    expect(styles).toContain("border-radius: 18px");
    expect(styles).toContain("height: 50px");
    expect(figureCard).toContain("getApprovedRarityStyle");
    expect(figureCard).toContain("figure-rarity-card");
    expect(figureCard).not.toContain("figure-card-number");
    expect(figureCard).not.toContain("figure-style-emblem");
    expect(figureCard).toContain("figure-image-stage");
    expect(waitingPage).toContain("calm-loader");
    expect(waitingPage).toContain("generation-waiting-copy");
    expect(waitingPage).toContain("generation-pulse-ring");
    expect(waitingPage).toContain("waitingCopyLines");
    expect(waitingPage).toContain("setCopyIndex");
    expect(waitingPage).not.toContain("generation-status");
    expect(waitingPage).not.toContain("generation-progress");
    expect(waitingPage).not.toContain("Проверить статус");
    expect(waitingPage).not.toContain("Генерация идёт");
    expect(waitingPage).not.toContain("Собираем образ...");
    expect(waitingPage).not.toContain("Упаковываем индивидуальность...");
    expect(waitingPage).not.toContain("Добавляем стиль VladBlog...");
    expect(waitingPage).not.toContain("Генерируем коллекционную фигурку...");
    expect(waitingPage).not.toContain("Сохраняем результат...");
    expect(waitingPage).toContain("Собираем образ и сохраняем детали");
    expect(waitingPage).toContain("Подбираем позу для коллекционной полки");
    expect(waitingPage).toContain("Наводим мягкий блеск на упаковку");
    expect(waitingPage).toContain("Проверяем, чтобы фигурка выглядела как лимитка");
    expect(waitingPage).toContain("Почти готово, финальные штрихи уже внутри");
    expect(styles).toContain(".calm-loader");
    expect(styles).toContain(".generation-pulse-ring");
    expect(styles).toContain("softOrbit");
    expect(styles).toContain("gentlePulse");
    expect(styles).not.toContain(".generation-status");
    expect(styles).not.toContain(".generation-progress");
    expect(styles).not.toContain("styleBadgeSweep");
    expect(styles).not.toContain(".figure-style-emblem");
    expect(styles).not.toContain(".rarity-style-lab");
    expect(styles).not.toContain(".final-rarity-style-grid");
    expect(styles).not.toContain(".rarity-style-card");
    expect(styles).not.toContain(".rarity-style-token");

    for (const token of [
      'approvedEpicStyle',
      'selectedIndex: 2',
      'name: "Arc Chip"',
      'icon: "△"',
      'approvedMythicStyle',
      'selectedIndex: 4',
      'name: "Blood Plasma"',
      'icon: "◆"',
      'approvedLegendaryStyle',
      'selectedIndex: 3',
      'name: "Sun Relic"',
      'icon: "⬢"',
      'approvedFounderLegendaryStyle',
      'selectedIndex: 5',
      'name: "Legacy Frame"',
      'approvedFoilStyle',
      'name: "Holographic"',
      'approvedFoilEpicStyle',
      'name: "Foil Arc Chip"',
      'approvedFoilMythicStyle',
      'name: "Foil Blood Plasma"',
      'approvedFoilLegendaryStyle',
      'name: "Foil Sun Relic"',
      'approvedFoilFounderLegendaryStyle',
      'name: "Foil Legacy Frame"',
      'finalRarityStyles',
      'getApprovedRarityStyle',
    ]) {
      expect(approvedRarityStyles).toContain(token);
    }

    for (const token of [
      '.rarity-epic .rarity-badge-icon',
      '.rarity-badge-icon::before',
      '.rarity-mythic .rarity-badge-icon',
      '.rarity-legendary .rarity-badge-icon',
      '.rarity-founder-legendary',
      'content: none',
      '.rarity-foil',
      '.rarity-foil-epic',
      '.rarity-foil-mythic',
      '.rarity-foil-legendary',
      '.rarity-foil-founder-legendary',
      '.figure-rarity-card',
      '.figure-rarity-card::before',
      '.figure-rarity-card::after',
      '.figure-image-stage',
      '.figure-card-body::before',
      '.rarity-power-epic',
      '.rarity-power-mythic',
      '.rarity-power-legendary',
      '.rarity-power-founder',
      '.rarity-power-foil',
      '.rarity-power-foil-epic',
      '.rarity-power-foil-mythic',
      '.rarity-power-foil-legendary',
      '.rarity-power-foil-founder',
      '--foil-card-palette',
      '.foil-rarity-preview',
      '.figure-result-card',
      'margin-inline: auto',
      'epicBadgeAura',
      'mythicBadgeEmber',
      'legendaryBadgeSweep',
      'founderTokenSeal',
      'foilSparkle',
      'foilGlow',
    ]) {
      expect(styles).toContain(token);
    }

    expect(styles).toContain("--badge-icon-shape: polygon(50% 4%, 96% 92%, 4% 92%)");
    expect(styles).toContain(
      "--badge-icon-shape: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
    );

    expect((approvedRarityStyles.match(/selected: true/g) ?? []).length).toBe(5);
    expect(approvedRarityStyles).toContain("useLiveBadge: true");
    expect(rarityBadge).toContain("foilPreviewRarities");
    expect(rarityBadge).toContain("FoilRarityPreview");
    expect(main).toContain("createRoot");
    expect(rarityBadge).toContain("Foil Founder Legendary");
    expect(figureCard).toContain('rarity-power-${rarityStyle.power}');
    expect(rarityBadge).toContain('rare: "Epic"');
    expect(rarityBadge).toContain('rawKey === "rare" ? "epic"');
    expect(approvedRarityStyles).toContain('name: "Holographic"');
    expect(approvedRarityStyles).toContain('approved: true');
  });

  it("keeps rarities off the first auth screen", () => {
    expect(app).not.toContain("FoilRarityPreview");
    expect(app).not.toContain("<FoilRarityPreview />");
    expect(welcomePage).not.toContain("FoilRarityPreview");
    expect(welcomePage).not.toContain("<FoilRarityPreview />");
  });

  it("shows the model name and high-contrast attribute labels on the final card", () => {
    expect(myFigurePage).toContain("type UserResponse");
    expect(myFigurePage).toContain("getTelegramUsernameLabel");
    expect(myFigurePage).toContain("getTelegramProfileUrl");
    expect(myFigurePage).toContain("modelUsername");
    expect(figureCard).toContain("<dt>Модель</dt>");
    expect(figureCard).toContain("<dt>Редкость</dt>");
    expect(figureCard).toContain("getRarityDropRateLabel");
    expect(figureCard).toContain("modelProfileUrl");
    expect(figureCard).toContain('target="_blank"');
    expect(styles).toContain(".figure-presets dt");
    expect(styles).toContain("color: var(--text)");
  });
});
