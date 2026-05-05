<script>
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();

  const sections = [
    {
      label: 'Guide',
      items: [
        { href: '/docs', label: 'Overview' },
        { href: '/docs#installation', label: 'Installation' },
        { href: '/docs#manifest', label: 'Author a manifest' },
        { href: '/docs#codegen', label: 'Run codegen' },
        { href: '/docs#consume', label: 'Consume the barrel' },
        { href: '/docs#check', label: 'check + drift detection' },
        { href: '/docs#tsc', label: 'check --tsc' },
        { href: '/docs#non-goals', label: 'Non-goals' }
      ]
    },
    {
      label: 'Reference',
      items: [
        { href: '/api', label: 'API' }
      ]
    },
    {
      label: 'Decisions',
      items: [
        { href: '/adr', label: 'Overview' },
        { href: '/adr/0004-barrel-only-public-api', label: 'ADR-0004 · Barrel-only API' },
        { href: '/adr/0005-prompt-lock-semantics', label: 'ADR-0005 · Lock semantics' },
        { href: '/adr/0006-check-placement', label: 'ADR-0006 · Check placement' }
      ]
    }
  ];
</script>

<div class="docs-shell">
  <Sidebar {sections} />
  <article class="docs-article">
    {@render children()}
  </article>
</div>

<style>
  .docs-shell {
    max-width: var(--wide-max);
    margin: 0 auto;
    padding: 0 var(--sp-5);
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    gap: var(--sp-7);
    align-items: start;
  }

  .docs-article {
    padding: var(--sp-7) 0 var(--sp-9);
    max-width: var(--content-max);
    width: 100%;
  }

  .docs-article :global(h1) {
    font-size: var(--fs-2xl);
    margin-top: 0;
  }

  @media (max-width: 960px) {
    .docs-shell {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .docs-article {
      padding: var(--sp-4) 0 var(--sp-7);
    }
  }
</style>
