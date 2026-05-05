<script>
  let { size = 28 } = $props();
</script>

<span class="logo" style="--s: {size}px">
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    aria-hidden="true"
    role="img"
    fill="none"
  >
    <!-- Manifest card with three stacked entries; lock-dot accents the bottom row. -->
    <rect
      x="3"
      y="3"
      width="26"
      height="26"
      rx="5"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <line x1="8" y1="11" x2="24" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <line x1="8" y1="16" x2="20" y2="16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <line x1="8" y1="21" x2="22" y2="21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <circle cx="25.5" cy="21" r="1.8" fill="var(--c-accent)" />
  </svg>
  <span class="wordmark">promptregistry</span>
</span>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--c-text);
    font-weight: 600;
    letter-spacing: -0.02em;
    font-size: 1.05rem;
  }

  .wordmark {
    font-family: var(--font-mono);
    font-size: 0.95rem;
  }
</style>
