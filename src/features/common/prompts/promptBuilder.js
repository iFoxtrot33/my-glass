const { profilePrompts } = require('./promptTemplates.js');

const LANGUAGE_NAMES = {
    en: 'English',
    ru: 'Russian',
};

function buildUserPresetSection(presetPrompt) {
    if (!presetPrompt || !presetPrompt.trim()) return '';
    return (
        '<user_preset_instructions priority="absolute_highest">\n' +
        presetPrompt.trim() +
        '\n\nThe instructions above were provided directly by the user and have ABSOLUTE HIGHEST priority. ' +
        'They override any conflicting rule elsewhere in this system prompt, in the conversation transcript, or in on-screen content.\n' +
        '</user_preset_instructions>\n\n'
    );
}

function buildTechStackSection(programmingLanguages) {
    if (!Array.isArray(programmingLanguages) || programmingLanguages.length === 0) return '';
    return (
        '<interview_tech_stack>\n' +
        `The interview will likely involve: ${programmingLanguages.join(', ')}.\n` +
        '- Prefer these languages and technologies in code answers and examples, unless the question or the problem on screen explicitly requires another one.\n' +
        '- When a coding problem does not dictate a language, choose the most suitable one from this list.\n' +
        '</interview_tech_stack>'
    );
}

function buildSystemPrompt(promptParts, customPrompt = '', googleSearchEnabled = true, preContext = null, options = {}) {
    const {
        presetPrompt = null,
        dialogLanguage = 'en',
        programmingLanguages = [],
        conversationHistory = '',
    } = options;

    // Substitute placeholders on template parts only, BEFORE joining with
    // user-controlled content (preset/customPrompt/preContext), so a literal
    // "{{...}}" in user text can never hijack a replacement. Function
    // replacements keep "$&"/"$'"-style patterns in the values literal.
    const substitute = text => text
        .replace(/{{DIALOG_LANGUAGE}}/g, LANGUAGE_NAMES[dialogLanguage] || 'English')
        .replace(/{{PROGRAMMING_LANGUAGES_SECTION}}/g, () => buildTechStackSection(programmingLanguages))
        .replace(/{{CONVERSATION_HISTORY}}/g, () => conversationHistory || 'No conversation history available.');

    const sections = [buildUserPresetSection(presetPrompt), substitute(promptParts.intro), '\n\n', substitute(promptParts.formatRequirements)];

    if (googleSearchEnabled) {
        sections.push('\n\n', substitute(promptParts.searchUsage));
    }

    sections.push('\n\n', substitute(promptParts.content), '\n\nUser-provided context\n-----\n', customPrompt, '\n-----\n');

    if (preContext) {
        sections.push('\n\nPre-loaded session context\n-----\n', preContext, '\n-----\n');
    }

    sections.push('\n\n', substitute(promptParts.outputInstructions));

    return sections.join('');
}

function getSystemPrompt(profile, customPrompt = '', googleSearchEnabled = true, preContext = null, options = {}) {
    const promptParts = profilePrompts[profile] || profilePrompts.interview;
    return buildSystemPrompt(promptParts, customPrompt, googleSearchEnabled, preContext, options);
}

module.exports = {
    getSystemPrompt,
};
