// ---------------------------------------------------------------------------------------
// OPTIONAL local-LLM adapter — deliberately a no-op today.
//
// The assistant is fully functional without any model: parsing is deterministic (nlu/),
// data comes from the site's own API, replies come from curated templates (replies.js).
// This file is the single seam where a LOCAL model (e.g. Ollama on the same machine)
// could later add flourish — rephrasing a templated reply more naturally, or acting as
// a fallback intent classifier for sentences the rule parser scores low on.
//
// Design rules (per project requirements):
//   • The site must NEVER depend on this to work. If the endpoint is absent, everything
//     behaves exactly as it does today — enabled stays false and polish() is identity.
//   • No paid APIs. Point it only at something local/free (VITE_ASSISTANT_LLM_URL, e.g.
//     http://localhost:11434 for Ollama). Nothing ships enabled and nothing is downloaded.
//   • Never let a model INVENT data: it may only rephrase text the rule engine produced;
//     property facts always come from the API results untouched.
// ---------------------------------------------------------------------------------------
const URL_FROM_ENV = import.meta.env?.VITE_ASSISTANT_LLM_URL || ''

export const llm = {
  enabled: false && !!URL_FROM_ENV, // flip the literal when a local endpoint is provisioned

  // Rephrase an already-correct templated reply. MUST resolve to usable text either way.
  async polish(text /* , { lang, filters } */) {
    return text
  },
}
