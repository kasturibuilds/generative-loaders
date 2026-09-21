const repositoryUrl = "https://github.com/kasturikhanke/generative-loaders";

export function GitHubButton({ compact = false }: { compact?: boolean }) {
  return <a
    className={`github-button${compact ? " github-button-compact" : ""}`}
    href={repositoryUrl}
    target="_blank"
    rel="noreferrer"
    aria-label="View Generative Loaders on GitHub. 74k npm downloads."
  >
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2.6a9.7 9.7 0 0 0-3.1 18.9c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1 1.6 1 .9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.7-1.3-2.2-.3-4.6-1.1-4.6-4.8 0-1.1.4-1.9 1-2.6-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.7.7 1 1.6 1 2.6 0 3.7-2.3 4.5-4.6 4.8.4.3.7.9.7 1.8V21c0 .4.2.6.7.5A9.7 9.7 0 0 0 12 2.6Z" /></svg>
    <span>GitHub</span>
    <small>74k</small>
  </a>;
}
