/**
 * Fetches the runtime options for system prompt assembly: the user's selected
 * preset, dialog language, and interview programming languages.
 * Fetched fresh on every request so settings changes apply immediately.
 */
async function getPromptRuntimeOptions() {
    // Lazy requires: settingsService transitively requires askService
    // (settingsService → windowManager → shortcutsService → askService),
    // so top-level imports here would create a require cycle.
    const settingsService = require('../../settings/settingsService');
    const presetRepository = require('../repositories/preset');

    let settings = {};
    try {
        settings = (await settingsService.getSettings()) || {};
    } catch (error) {
        console.warn('[PromptContext] Failed to load settings:', error.message);
    }

    let presetPrompt = null;
    if (settings.selectedPresetId) {
        try {
            const presets = await presetRepository.getPresets();
            const preset = presets.find(p => p.id === settings.selectedPresetId);
            if (preset && preset.prompt) {
                const encryptionService = require('../services/encryptionService');
                if (encryptionService.looksEncrypted(preset.prompt)) {
                    // Decryption silently returns the ciphertext on key mismatch —
                    // don't inject base64 garbage into the prompt.
                    console.warn(`[PromptContext] Preset "${preset.title || preset.id}" looks like undecryptable ciphertext; skipping. Re-save the preset to re-encrypt it.`);
                } else {
                    presetPrompt = preset.prompt;
                    console.log(`[PromptContext] Active preset: "${preset.title}" (${preset.prompt.length} chars)`);
                }
            } else {
                console.warn(`[PromptContext] Selected preset ${settings.selectedPresetId} not found; skipping preset block.`);
            }
        } catch (error) {
            console.warn('[PromptContext] Failed to load presets:', error.message);
        }
    } else {
        console.log('[PromptContext] No active preset selected.');
    }

    return {
        presetPrompt,
        dialogLanguage: settings.dialogLanguage || 'en',
        programmingLanguages: Array.isArray(settings.programmingLanguages) ? settings.programmingLanguages : [],
    };
}

module.exports = {
    getPromptRuntimeOptions,
};
