// Mirror of src/lib/macros/abilities.ts for the extension popup step-builder.
window.MACRO_ABILITIES = [
  { id: 'navigate', label: '🌐 Open URL', fields: [
      { name: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com' },
    ] },
  { id: 'click', label: '🖱️ Click element', fields: [
      { name: 'selector', label: 'CSS selector', type: 'text', placeholder: 'button[type="submit"]' },
    ] },
  { id: 'fill', label: '✏️ Fill field', fields: [
      { name: 'selector', label: 'CSS selector', type: 'text', placeholder: 'input[name="q"]' },
      { name: 'value', label: 'Value (supports {{vault.*}} / {{var.*}})', type: 'text' },
    ] },
  { id: 'login_vault', label: '🔐 Vault login', fields: [
      { name: 'user_selector', label: 'Username field selector', type: 'text', placeholder: "input[name='email']" },
      { name: 'pass_selector', label: 'Password field selector', type: 'text', placeholder: "input[type='password']" },
      { name: 'item', label: 'Vault item title (optional)', type: 'text' },
    ], build: (v) => ({
      action: 'login_vault',
      user_selector: v.user_selector,
      pass_selector: v.pass_selector,
      value: v.item
        ? { username: `{{vault:"${v.item}".username}}`, password: `{{vault:"${v.item}".password}}` }
        : { username: '{{vault.username}}', password: '{{vault.password}}' },
    }), parse: (s) => ({
      user_selector: s.user_selector || '',
      pass_selector: s.pass_selector || '',
      item: (() => {
        const m = /\{\{vault:"([^"]+)"/.exec(JSON.stringify(s.value || {}));
        return m ? m[1] : '';
      })(),
    }) },
  { id: 'wait', label: '⏱️ Wait (ms)', fields: [
      { name: 'ms', label: 'Milliseconds', type: 'number', placeholder: '1500' },
    ], build: (v) => ({ action: 'wait', ms: Number(v.ms || 1000) }) },
  { id: 'wait_for', label: '⏳ Wait for element', fields: [
      { name: 'selector', label: 'CSS selector', type: 'text' },
    ] },
  { id: 'ask', label: '❓ Ask the user', fields: [
      { name: 'prompt', label: 'Question', type: 'text' },
      { name: 'options', label: 'Options (comma-separated, optional)', type: 'text' },
      { name: 'var', label: 'Variable name', type: 'text', placeholder: 'answer' },
    ], build: (v) => ({
      action: 'ask',
      prompt: v.prompt,
      options: v.options ? v.options.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      var: v.var || 'answer',
    }), parse: (s) => ({
      prompt: s.prompt || '',
      options: Array.isArray(s.options) ? s.options.join(', ') : '',
      var: s.var || '',
    }) },
  { id: 'pause', label: '⏸️ Pause for user', fields: [
      { name: 'prompt', label: 'Instruction', type: 'text', placeholder: 'Solve the CAPTCHA, then continue.' },
      { name: 'selector', label: 'Highlight selector (optional)', type: 'text' },
    ] },
  { id: 'extract_to_card', label: '🗂️ Save text to Zettel card', fields: [
      { name: 'selector', label: 'Selector to extract', type: 'text', placeholder: 'article' },
      { name: 'title', label: 'Card title', type: 'text' },
    ] },
  { id: 'summarize_page', label: '📝 Summarize page', fields: [
      { name: 'notebook', label: 'Notebook (optional)', type: 'text' },
    ] },
  { id: 'alice_chat', label: '✨ Send prompt to ALICE', fields: [
      { name: 'prompt', label: 'Prompt', type: 'textarea' },
    ] },
  { id: 'run_macro', label: '🔗 Run another macro', fields: [
      { name: 'macro_id', label: 'Macro ID', type: 'text' },
    ] },
  { id: 'alice_plan', label: '🧠 Let ALICE plan the rest', fields: [
      { name: 'goal', label: 'Goal', type: 'textarea' },
    ] },
  { id: 'keypress', label: '⌨️ Press key', fields: [
      { name: 'key', label: 'Key (e.g. Enter, Escape)', type: 'text' },
      { name: 'selector', label: 'Target selector (optional)', type: 'text' },
    ] },
  { id: 'scroll', label: '🔽 Scroll to element', fields: [
      { name: 'selector', label: 'CSS selector', type: 'text' },
    ] },
  { id: 'scroll_window', label: '🔽 Scroll window (top/bottom)', fields: [
      { name: 'target', label: 'top or bottom', type: 'text', placeholder: 'bottom' },
    ] },
  { id: 'hover', label: '🖐️ Hover element', fields: [
      { name: 'selector', label: 'CSS selector', type: 'text' },
    ] },
  { id: 'select_option', label: '🎛️ Pick dropdown option', fields: [
      { name: 'selector', label: 'Select element', type: 'text', placeholder: "select[name='country']" },
      { name: 'value', label: 'Option value', type: 'text' },
    ] },
  { id: 'set_var', label: '🏷️ Set a variable', fields: [
      { name: 'var', label: 'Variable name', type: 'text', placeholder: 'topic' },
      { name: 'value', label: 'Value', type: 'text' },
    ] },
  { id: 'extract_text', label: '📋 Save text to variable', fields: [
      { name: 'selector', label: 'CSS selector', type: 'text' },
      { name: 'var', label: 'Variable name', type: 'text', placeholder: 'value' },
    ] },
  { id: 'copy_to_clipboard', label: '📎 Copy to clipboard', fields: [
      { name: 'selector', label: 'Selector (optional)', type: 'text' },
      { name: 'value', label: 'Literal text (if no selector)', type: 'text' },
    ] },
  { id: 'notify', label: '🔔 Show notification', fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Done!' },
      { name: 'message', label: 'Message', type: 'text' },
    ] },
  { id: 'navigate_back', label: '↩️ Go back', fields: [] },
  { id: 'reload', label: '🔄 Reload page', fields: [] },
  { id: 'note', label: '📌 Note / comment', fields: [
      { name: 'note', label: 'Note (won\'t execute anything)', type: 'text' },
    ] },
  { id: 'custom', label: '⚙️ Custom (raw JSON)', fields: [
      { name: 'json', label: 'Step JSON', type: 'textarea', placeholder: '{"action":"click","selector":"#go"}' },
    ], build: (v) => { try { return JSON.parse(v.json); } catch { return { action: 'noop', note: 'Invalid JSON' }; } },
    parse: (s) => ({ json: JSON.stringify(s, null, 2) }) },
];

window.MACRO_ABILITY_BY_ID = Object.fromEntries(window.MACRO_ABILITIES.map((a) => [a.id, a]));

// Default builder: copy named fields onto the step object alongside `action`.
window.macroBuildStep = function (abilityId, values) {
  const ab = window.MACRO_ABILITY_BY_ID[abilityId];
  if (!ab) return { action: abilityId, ...values };
  if (ab.build) return ab.build(values);
  const step = { action: abilityId };
  for (const f of ab.fields) {
    const v = values[f.name];
    if (v === undefined || v === null || v === '') continue;
    step[f.name] = f.type === 'number' ? Number(v) : v;
  }
  return step;
};

// Default parser: take fields off the step object.
window.macroParseStep = function (step) {
  const id = step?.action || 'custom';
  const ab = window.MACRO_ABILITY_BY_ID[id];
  if (!ab) return { abilityId: 'custom', values: { json: JSON.stringify(step, null, 2) } };
  if (ab.parse) return { abilityId: id, values: ab.parse(step) };
  const values = {};
  for (const f of ab.fields) {
    const v = step[f.name];
    values[f.name] = v == null ? '' : String(v);
  }
  return { abilityId: id, values };
};
