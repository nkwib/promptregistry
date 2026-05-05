<script>
  // No external imports — the hero is hand-rendered for crisp control over the
  // before/after demo.
</script>

<svelte:head>
  <title>promptregistry — typed prompt manifest with lockfile-gated integrity</title>
  <meta
    name="description"
    content="A static JSON manifest, typed named imports, and a committed lockfile. When a remote prompt loses a variable, tsc fails the build."
  />
</svelte:head>

<section class="hero">
  <div class="hero-grid">
    <div class="hero-copy">
      <span class="badge">
        <span class="dot" aria-hidden="true"></span>
        v0.1 · MIT · TypeScript SDK + CLI
      </span>
      <h1>
        When the manifest changes,<br />
        <span class="accent">the build fails.</span>
      </h1>
      <p class="lede">
        <strong>promptregistry</strong> turns a static JSON manifest into typed,
        greppable named imports with a committed lockfile. A PM removes a
        variable from the remote prompt — your <code>tsc --noEmit</code>
        catches it before it reaches the model.
      </p>

      <div class="cta">
        <a class="btn primary" href="/docs">Read the docs</a>
        <a class="btn ghost" href="https://github.com/nkwib/promptregistry" target="_blank" rel="noopener">
          GitHub
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 17L17 7M17 7H9M17 7V15"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>
      </div>

      <pre class="install"><span class="prompt">$</span> npm install promptregistry</pre>
    </div>

    <aside class="demo">
      <div class="demo-tab">
        <span class="dots" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
        <span class="filename">src/main.ts</span>
      </div>
      <pre class="demo-code"><code><span class="kw">import</span> &lbrace; customerSummary &rbrace; <span class="kw">from</span> <span class="str">'./prompts/.generated/registry.js'</span>;

customerSummary.<span class="fn">with</span>(&lbrace;
  <span class="prop">customerName</span>: <span class="str">'Ada'</span>,
  <span class="prop">planTier</span>: <span class="str">'Pro'</span>,
  <span class="cmt">// joinDate omitted — manifest still requires it</span>
&rbrace;);

<span class="cmt">// $ promptregistry check --tsc</span>
<span class="err"><span class="err-line">// Remote prompt 'customer-summary@v1' removed</span>
<span class="err-line">// variable 'joinDate' — update the call site</span>
<span class="err-line">// (src/main.ts:3) or pin to a previous version.</span></span></code></pre>
    </aside>
  </div>
</section>

<section class="features">
  <div class="features-inner">
    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" stroke-width="1.6" />
          <line x1="7" y1="9" x2="17" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          <line x1="7" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          <line x1="7" y1="17" x2="15" y2="17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </div>
      <h3>Static manifest</h3>
      <p>
        Host <code>manifest.json</code> on GitHub raw, a release asset, or any
        public bucket. Each entry has a name, version, template, and delimiter.
        No backend, no hosted UI.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 7l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M11 17h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </div>
      <h3>Named imports, not strings</h3>
      <p>
        Codegen emits a <code>registry.ts</code> barrel with one named export
        per prompt. Refactor-safe, jump-to-definition works, and missing
        variables are <code>tsc</code> errors at the call site.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="6" y="11" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.6" />
          <path d="M9 11V8a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
        </svg>
      </div>
      <h3>Lockfile-gated</h3>
      <p>
        <code>prompt-lock.json</code> pins every entry to its content hash.
        <code>promptregistry check</code> fails loudly when the remote was
        edited without a version bump — the build is the integrity gate.
      </p>
    </div>
  </div>
</section>

<section class="quickstart">
  <div class="quickstart-inner">
    <h2>Sixty-second walkthrough</h2>
    <ol class="steps">
      <li>
        <span class="step-label">Author</span>
        Drop a <code>manifest.json</code> with a <code>customer-summary</code> entry.
      </li>
      <li>
        <span class="step-label">Generate</span>
        Run <code>npx promptregistry codegen</code> — emits one runtime <code>.ts</code> per prompt and a typed barrel.
      </li>
      <li>
        <span class="step-label">Consume</span>
        <code>{'import { customerSummary } from \'./prompts/.generated/registry.js\''}</code> and call <code>{'.with({...})'}</code>.
      </li>
      <li>
        <span class="step-label">Guard</span>
        Wire <code>{'"typecheck": "promptregistry check && tsc --noEmit"'}</code> in <code>package.json</code>. Done.
      </li>
    </ol>
    <a class="btn primary" href="/docs">Full quickstart →</a>
  </div>
</section>

<style>
  .hero {
    max-width: var(--wide-max);
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-5) var(--sp-7);
  }

  .hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-7);
    align-items: center;
  }

  @media (max-width: 960px) {
    .hero-grid {
      grid-template-columns: 1fr;
      gap: var(--sp-6);
    }
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--c-text-muted);
    background: var(--c-bg-alt);
    border: 1px solid var(--c-border);
    padding: 4px var(--sp-3);
    border-radius: 999px;
    margin-bottom: var(--sp-4);
  }

  .badge .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c-accent);
  }

  h1 {
    font-size: var(--fs-3xl);
    line-height: 1.1;
    margin: 0 0 var(--sp-4);
    letter-spacing: -0.035em;
  }

  .accent {
    color: var(--c-accent);
  }

  .lede {
    font-size: var(--fs-md);
    color: var(--c-text-muted);
    margin: 0 0 var(--sp-5);
    max-width: 30rem;
  }

  .lede code {
    font-size: 0.92em;
  }

  .cta {
    display: inline-flex;
    gap: var(--sp-3);
    margin-bottom: var(--sp-5);
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0.6rem 1rem;
    border-radius: var(--r-md);
    font-size: var(--fs-sm);
    font-weight: 600;
    text-decoration: none;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  }

  .btn.primary {
    background: var(--c-accent);
    color: var(--c-accent-fg);
    border: 1px solid var(--c-accent);
  }

  .btn.primary:hover {
    text-decoration: none;
    filter: brightness(1.05);
  }

  .btn.ghost {
    background: var(--c-bg-alt);
    color: var(--c-text);
    border: 1px solid var(--c-border-strong);
  }

  .btn.ghost:hover {
    background: var(--c-surface-2);
    text-decoration: none;
  }

  .install {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    background: var(--c-code-bg);
    border: 1px solid var(--c-border);
    color: var(--c-code-text);
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--r-md);
    margin: 0;
    display: inline-block;
  }

  .install .prompt {
    color: var(--c-text-subtle);
    margin-right: var(--sp-2);
  }

  .demo {
    background: var(--c-code-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    overflow: hidden;
    box-shadow: var(--sh-md);
  }

  .demo-tab {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--c-border);
    background: var(--c-bg-alt);
  }

  .dots {
    display: inline-flex;
    gap: 6px;
  }

  .dots i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--c-border-strong);
  }

  .filename {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--c-text-subtle);
  }

  .demo-code {
    margin: 0;
    padding: var(--sp-4) var(--sp-5);
    font-family: var(--font-mono);
    font-size: 0.82rem;
    line-height: 1.55;
    color: var(--c-code-text);
    overflow-x: auto;
  }

  .demo-code code {
    font-family: inherit;
  }

  .demo-code .kw { color: var(--c-code-keyword); }
  .demo-code .str { color: var(--c-code-string); }
  .demo-code .fn { color: var(--c-code-fn); }
  .demo-code .prop { color: var(--c-code-prop); }
  .demo-code .cmt { color: var(--c-code-comment); font-style: italic; }
  .demo-code .err { display: block; color: var(--c-accent); }
  .demo-code .err-line { display: block; }

  .features {
    border-top: 1px solid var(--c-border);
    border-bottom: 1px solid var(--c-border);
    background: var(--c-bg-alt);
    padding: var(--sp-7) var(--sp-5);
  }

  .features-inner {
    max-width: var(--wide-max);
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-6);
  }

  @media (max-width: 800px) {
    .features-inner {
      grid-template-columns: 1fr;
    }
  }

  .feature h3 {
    font-size: var(--fs-md);
    margin: 0 0 var(--sp-2);
  }

  .feature p {
    color: var(--c-text-muted);
    margin: 0;
    font-size: var(--fs-sm);
  }

  .feature-icon {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--c-accent);
    background: var(--c-accent-soft);
    border-radius: var(--r-md);
    margin-bottom: var(--sp-3);
  }

  .feature-icon svg {
    width: 22px;
    height: 22px;
  }

  .quickstart {
    max-width: var(--wide-max);
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-5);
  }

  .quickstart-inner {
    max-width: 44rem;
    margin: 0 auto;
  }

  .quickstart h2 {
    font-size: var(--fs-2xl);
    margin: 0 0 var(--sp-5);
    letter-spacing: -0.025em;
  }

  .steps {
    list-style: none;
    counter-reset: step;
    padding: 0;
    margin: 0 0 var(--sp-5);
  }

  .steps li {
    counter-increment: step;
    position: relative;
    padding: var(--sp-3) 0 var(--sp-3) var(--sp-7);
    border-top: 1px solid var(--c-border);
    color: var(--c-text);
  }

  .steps li:last-child {
    border-bottom: 1px solid var(--c-border);
  }

  .steps li::before {
    content: counter(step);
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--c-accent-soft);
    color: var(--c-accent);
    border-radius: 50%;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 600;
  }

  .step-label {
    display: block;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--c-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 2px;
  }

  .steps code {
    font-size: 0.88em;
  }
</style>
