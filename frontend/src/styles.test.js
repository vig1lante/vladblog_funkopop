import { existsSync, readFileSync } from "node:fs";
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
const figureMotionCardPath = resolve(
  import.meta.dirname,
  "components/FigureMotionCard.tsx",
);
const figureMotionCard = existsSync(figureMotionCardPath)
  ? readFileSync(figureMotionCardPath, "utf8")
  : "";
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
const frontendRoot = resolve(import.meta.dirname, "..");
const telegramViewportPath = resolve(
  import.meta.dirname,
  "lib/telegramViewport.ts",
);
const telegramViewport = existsSync(telegramViewportPath)
  ? readFileSync(telegramViewportPath, "utf8")
  : "";

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

  it("adds system emoji font fallbacks for mobile Telegram WebViews", () => {
    expect(styles).toContain('"Apple Color Emoji"');
    expect(styles).toContain('"Segoe UI Emoji"');
    expect(styles).toContain('"Noto Color Emoji"');
  });

  it("adds emoji labels for expanded style presets", () => {
    for (const label of [
      "💻 Разработчик",
      "📷 Фотограф",
      "📷 Камера",
      "🧘 Коврик для йоги",
      "🏢 Стартап-офис",
      "🚉 Вокзал",
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
    expect(myFigurePage).toContain("const displayedVariant = showFoilVersion && foilFigure ? \"foil\" : \"normal\"");
    expect(myFigurePage).toContain("downloadStatusByVariant");
    expect(myFigurePage).toContain("getPublicFigureCardUrl(figure.id, downloadVariant)");
    expect(myFigurePage).toContain("downloadMyFigureCard(downloadVariant)");
    expect(myFigurePage).not.toContain(">Скачать результат<");
    expect(myFigurePage).toContain('aria-label={isDownloadComplete ? "Скачано" : "Скачать результат"}');
    expect(myFigurePage).toContain("download-button");
    expect(myFigurePage).toContain("download-icon");
    expect(myFigurePage).toContain("download-glyph");
    expect(myFigurePage).toContain("CheckIcon");
    expect(myFigurePage).toContain("if (downloadStatus.isComplete || downloadStatus.isDownloading)");
    expect(myFigurePage).toContain("onClick={isDownloadComplete ? undefined : handleDownload}");
    expect(myFigurePage).toContain("isDownloadComplete");
    expect(myFigurePage).toContain("download-complete");
    expect(myFigurePage).toContain("Foil версия");
    expect(myFigurePage).toContain("foil-version-toggle");
    expect(myFigurePage).toContain("getFoilFigure");
    expect(styles).toContain(".download-button.download-complete");
    expect(styles).toContain(".actions-row .download-button");
    expect(styles).toContain(".foil-version-toggle");
    expect(styles).toContain(".foil-version-switch");
    expect(styles).toContain(".foil-version-switch-thumb");
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
    expect(figureCard).not.toContain("const isFoilRarity");
    expect(figureCard).not.toContain("figure-foil-underlay");
    expect(myFigurePage).toContain("FigureMotionCard");
    expect(myFigurePage).toContain("<FigureMotionCard");
    expect(myFigurePage).toContain("isFoil={displayedIsFoilRarity}");
    expect(myFigurePage).toContain("foilTextureUrl={displayedRarityStyle.foilTextureUrl");
    expect(myFigurePage).toContain("foilHue={displayedRarityStyle.foilHue");
    expect(myFigurePage).toContain("foilTintOpacity={displayedRarityStyle.foilTintOpacity");
    expect(myFigurePage).toContain("const displayedRarityStyle = getApprovedRarityStyle(displayedFigure.rarity)");
    expect(myFigurePage).toContain('displayedRarityStyle.power.startsWith("foil")');
    expect(figureMotionCard).toContain("export function FigureMotionCard");
    expect(figureMotionCard).toContain("foilTextureUrl");
    expect(figureMotionCard).toContain("foilHue");
    expect(figureMotionCard).toContain("foilTintOpacity");
    expect(figureMotionCard).toContain("requestAnimationFrame");
    expect(figureMotionCard).toContain("setPointerCapture");
    expect(figureMotionCard).toContain("onPointerCancel");
    expect(figureMotionCard).toContain('className={`figure-motion-card ${isFoil ? "figure-motion-foil" : "figure-motion-normal"}');
    expect(figureMotionCard).toContain("figure-motion-foil-effects");
    expect(figureMotionCard).toContain("figure-motion-foil-texture");
    expect(figureMotionCard).toContain("figure-motion-rarity-tint");
    expect(figureMotionCard).toContain("--motion-texture-x");
    expect(figureMotionCard).toContain("--motion-texture-y");
    expect(figureMotionCard).toContain("--motion-texture-scale");
    expect(styles).toContain(".figure-motion-card");
    expect(styles).toContain(".figure-motion-normal");
    expect(styles).toContain(".figure-motion-foil");
    expect(styles).toContain(".figure-motion-foil-effects");
    expect(styles).toContain(".figure-motion-foil-texture");
    expect(styles).toContain(".figure-motion-rarity-tint");
    expect(styles).toContain(".figure-motion-prism");
    expect(styles).toContain(".figure-motion-glare");
    expect(styles).toContain(".figure-motion-shadow");
    expect(styles).toContain("--motion-rotate-x");
    expect(styles).toContain("--motion-angle");
    expect(styles).toContain("--motion-card-scale");
    expect(styles).toContain("--motion-texture-x");
    expect(styles).toContain("--motion-texture-y");
    expect(styles).toContain("--motion-texture-scale");
    expect(styles).toContain("--motion-foil-hue");
    expect(styles).toContain("figureMotionPrismSweep");
    expect(styles).not.toContain(".figure-motion-normal .figure-motion-prism");
    expect(styles).toContain(".figure-motion-foil .figure-motion-prism");
    expect(figureMotionCard).toContain('aria-hidden="true"');
    expect(styles).not.toContain(".figure-foil-underlay");
    expect(styles).toContain("mix-blend-mode: overlay");
    expect(styles).toContain("mix-blend-mode: color");
    expect(styles).toContain("filter: grayscale(0) saturate(4) hue-rotate(var(--motion-foil-hue, 0deg))");
    expect(styles).toContain("object-fit: cover");
    expect(styles).toContain("scale3d(var(--motion-texture-scale, 1), var(--motion-texture-scale, 1), 1)");

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
      'accent: "#1d4ed8"',
      'accent2: "#020a3a"',
      'approvedFoilStyle',
      'name: "Holographic"',
      'approvedFoilEpicStyle',
      'name: "Foil Arc Chip"',
      'foilTextureUrl: "/foil_effects/1.PNG"',
      'approvedFoilMythicStyle',
      'name: "Foil Blood Plasma"',
      'foilTextureUrl: "/foil_effects/2.PNG"',
      'approvedFoilLegendaryStyle',
      'name: "Foil Sun Relic"',
      'foilTextureUrl: "/foil_effects/3.PNG"',
      'approvedFoilFounderLegendaryStyle',
      'name: "Foil Legacy Frame"',
      'foilTextureUrl: "/foil_effects/1.PNG"',
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
      '.figure-motion-card',
      '.figure-motion-foil',
      '.figure-motion-normal',
      '.figure-motion-prism',
      '.figure-motion-foil-texture',
      '.figure-motion-rarity-tint',
      'margin-inline: auto',
      'epicBadgeAura',
      'mythicBadgeEmber',
      'legendaryBadgeSweep',
      'founderTokenSeal',
      'foilSparkle',
      'foilGlow',
      'figureMotionPrismSweep',
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

  it("bundles the three approved foil texture PNGs for the frontend", () => {
    for (const fileName of ["1.PNG", "2.PNG", "3.PNG"]) {
      expect(
        existsSync(resolve(frontendRoot, "public", "foil_effects", fileName)),
      ).toBe(true);
    }
  });

  it("keeps approved foil rarity palettes distinct", () => {
    for (const token of [
      'approvedFoilEpicStyle',
      'accent: "#8b5cf6"',
      'accent2: "#f472ff"',
      "foilHue: 284",
      'approvedFoilMythicStyle',
      'accent: "#ef2d2d"',
      'accent2: "#ff7a2f"',
      "foilHue: 348",
      'approvedFoilLegendaryStyle',
      'accent: "#d4af37"',
      'accent2: "#ffe68a"',
      "foilHue: 54",
      'approvedFoilFounderLegendaryStyle',
      'accent: "#1d4ed8"',
      'accent2: "#020a3a"',
      "foilHue: 222",
    ]) {
      expect(approvedRarityStyles).toContain(token);
    }

    for (const token of [
      ".rarity-power-foil-epic",
      "rgba(139, 92, 246, 0.48)",
      ".rarity-power-foil-mythic",
      "rgba(239, 45, 45, 0.5)",
      ".rarity-power-foil-legendary",
      "rgba(212, 175, 55, 0.46)",
      ".rarity-power-foil-founder",
      "rgba(29, 78, 216, 0.62)",
    ]) {
      expect(styles).toContain(token);
    }
  });

  it("uses the cosmic blue Founder Legendary palette", () => {
    for (const token of [
      'accent: "#1d4ed8"',
      'accent2: "#020a3a"',
      'glow: "rgba(29, 78, 216, 0.52)"',
      'foilFrame: "rgba(29, 78, 216, 0)"',
      "#1d4ed8",
      "#0b1f7a",
      "#020a3a",
      "#010414",
      "rgba(29, 78, 216, 0.62)",
    ]) {
      expect(`${approvedRarityStyles}\n${styles}`).toContain(token);
    }
    expect(`${approvedRarityStyles}\n${styles}`).not.toContain("#38bdf8");
  });

  it("keeps rarities off the first auth screen", () => {
    expect(app).not.toContain("FoilRarityPreview");
    expect(app).not.toContain("<FoilRarityPreview />");
    expect(welcomePage).not.toContain("FoilRarityPreview");
    expect(welcomePage).not.toContain("<FoilRarityPreview />");
  });

  it("asks Telegram for fullscreen viewport on app startup", () => {
    expect(app).toContain("prepareTelegramViewport(webApp)");
    expect(telegramViewport).toContain("export function prepareTelegramViewport");
    expect(telegramViewport).toContain("webApp.requestFullscreen?.()");
    expect(telegramViewport).toContain("webApp.expand?.()");
    expect(telegramViewport).toContain("webApp.disableVerticalSwipes?.()");
    expect(telegramViewport).toContain("webApp.ready?.()");
    expect(telegramViewport).toContain("isTelegramVersionAtLeast(webApp.version, 7, 7)");
    expect(telegramViewport).toContain("isTelegramVersionAtLeast(webApp.version, 8, 0)");
  });

  it("prevents page scrolling while the final motion card is being inspected", () => {
    expect(figureMotionCard).toContain("handleTouchMove");
    expect(figureMotionCard).toContain("onTouchMove={handleTouchMove}");
    expect(figureMotionCard).toContain("event.preventDefault()");
    expect(figureMotionCard).toContain("event.stopPropagation()");
    expect(styles).toContain("overscroll-behavior: contain");
    expect(styles).toContain("touch-action: none");
  });

  it("keeps final card motion layers locked together without diagonal foil stripes", () => {
    expect(styles).not.toContain("repeating-linear-gradient(");
    expect(styles).not.toContain("translateZ(30px)");
    expect(styles).not.toContain("translateZ(48px)");
    expect(styles).not.toContain("translateZ(56px)");
    expect(styles).not.toContain("translateZ(62px)");
    expect(styles).not.toContain("translateZ(64px)");
    expect(styles).not.toContain("translate3d(var(--motion-prism-x)");
    expect(figureMotionCard).not.toContain("--motion-prism-x");
    expect(figureMotionCard).not.toContain("--motion-prism-y");
  });

  it("keeps the final foil texture translucent so the figure remains visible", () => {
    const foilTextureRule = styles.match(
      /\.figure-motion-foil \.figure-motion-foil-texture\s*\{([^}]*)\}/,
    )?.[1] ?? "";
    const opacity = Number(
      foilTextureRule.match(/opacity:\s*([0-9.]+)/)?.[1] ?? "NaN",
    );

    expect(foilTextureRule).not.toContain("opacity: 1");
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThanOrEqual(0.38);
  });

  it("clips foil texture corners and fades foil overlays away from card details with one mask", () => {
    const foilTextureBaseRule = styles.match(
      /\.figure-motion-foil-texture\s*\{([^}]*)\}/,
    )?.[1] ?? "";
    const foilEffectsMaskRule = styles.match(
      /\.figure-motion-foil-effects\s*\{([^}]*)\}/,
    )?.[1] ?? "";

    expect(figureMotionCard).toContain("figure-motion-foil-effects");
    expect(foilTextureBaseRule).toContain("clip-path: inset(0 round 24px)");
    expect(foilTextureBaseRule).toContain("contain: paint");
    expect(styles).toContain("--motion-foil-readable-mask");
    expect(foilEffectsMaskRule).toContain("-webkit-mask-image: var(--motion-foil-readable-mask)");
    expect(foilEffectsMaskRule).toContain("mask-image: var(--motion-foil-readable-mask)");
    expect(styles).not.toContain(".figure-motion-foil .figure-motion-foil-texture,");
  });

  it("does not mount hidden prism and foil-only paint layers on normal final cards", () => {
    expect(figureMotionCard).toContain("{isFoil && (");
    expect(figureMotionCard).not.toContain(
      '<span className="figure-motion-prism" aria-hidden="true" />',
    );
    expect(figureMotionCard).not.toContain(
      '<span className="figure-motion-rarity-tint" aria-hidden="true" />',
    );
    expect(styles).not.toContain(".figure-motion-normal .figure-motion-prism");
  });

  it("keeps final card pointer motion from repainting foil gradients every frame", () => {
    expect(figureMotionCard).toContain("TEXTURE_UPDATE_INTERVAL_MS");
    expect(figureMotionCard).toContain("lastTextureUpdateAtRef");
    expect(figureMotionCard).toContain("shouldUpdateTexture");
    expect(figureMotionCard).toContain("updateTexture: shouldUpdateTexture");
    expect(figureMotionCard).not.toContain('element.style.setProperty(\n    "--motion-card-scale"');
    expect(figureMotionCard).not.toContain('element.style.setProperty(\n      "--motion-foil-hue"');
    expect(figureMotionCard).not.toContain('"--motion-foil-hue",');
    expect(styles).not.toContain("will-change: transform, filter");
  });

  it("pauses decorative foil sweeps while the final card is actively dragged", () => {
    const activeMotionRule = styles.match(
      /\.figure-motion-card\.is-motion-active \.figure-rarity-card::before,[\s\S]*?\.figure-motion-card\.is-motion-active \.figure-motion-prism\s*\{([^}]*)\}/,
    )?.[1] ?? "";

    expect(activeMotionRule).toContain("animation-play-state: paused");
  });

  it("reuses final card motion bounds across pointer moves", () => {
    expect(figureMotionCard).toContain("motionBoundsRef");
    expect(figureMotionCard).toContain("readMotionBounds");
    expect(figureMotionCard).toContain("motionBoundsRef.current = null");
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
