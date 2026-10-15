<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## WebSentinel architecture
- Keep scan reads, creation, and exports behind the typed ScannerApi abstraction; its mock adapter never contacts targets, allowing a future FastAPI adapter without UI transport logic.
- Use TanStack Query loader-backed data and API-returned IDs for navigation; this keeps loading, retries, and cache invalidation consistent.
- Share scan display and state components across routes; this keeps demo labeling and lifecycle handling consistent.
- Live adapters must enforce authenticated ownership, explicit target authorization, connection-time IP/DNS and redirect checks, timeouts, and request budgets server-side; browser validation is not a security boundary.
