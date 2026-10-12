demo user :
{
  "name":"demo",
  "email":"demouser@demo.com",
  "password":"demo1234"
}

## Evidence profiles

The application includes editable developer profiles, public project visibility, automatic public GitHub repository discovery, and manually triggered contribution verification and evidence synchronization.

### GitHub setup and limitations

Configure the existing GitHub OAuth App variables in `backend/.env`:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL` (local callback: `http://localhost:3000/api/auth/github/callback`)
- `FRONTEND_URL`

The backend also requires its existing `DB`, `jwtSecretKey`, and `jwt_expire_in` settings.

The GitHub OAuth App callback URL must exactly match `GITHUB_CALLBACK_URL`. The OAuth flow requests `read:user` and `user:email` for sign-in; the authenticated GitHub identity is taken from GitHub's `/user` endpoint and matched by its stable numeric account ID. Keep the OAuth client secret in `backend/.env`; DevCollab does not retain the exchanged GitHub access token. Repository discovery uses GitHub's public REST API without a token, and no additional OAuth scopes are requested. Discovery is restricted to public repositories owned by the connected GitHub account. Private repositories, collaborator-only repositories, and organization repositories not owned by the connected account cannot be discovered with these permissions. Public repositories are refreshed in the background after OAuth and can also be refreshed manually from Evidence Profile settings. The refresh is bounded to ten pages of 100 repositories; the UI reports when that limit is reached. Repositories missing from a complete successful refresh are marked unavailable rather than deleted.

The app name or owner shown on GitHub's authorization page comes from the GitHub OAuth App registration; it is separate from the GitHub account authorizing DevCollab.

GitHub metadata and contribution records are retrieved from the GitHub REST API. Contribution checks read up to three pages of 100 commits and three pages of 100 pull requests per action. Repository ownership is not treated as contribution proof: user-specific evidence is stored only when GitHub's stable account ID matches a connected DevCollab account. A negative check means no matching record was found in the bounded available results, not that the user has never contributed. Git commit and pull request records may represent related work and are displayed as source records, not combined into a skill score or accomplishment total.

### Evidence profile workflow

1. Sign in and open **Profile → Manage evidence profile** from the dashboard.
2. Edit your display name, bio, image URL, profile technology tags, and profile visibility.
3. Set project visibility, technologies, and featured status in the dashboard's project editor.
4. Use **Connect GitHub** in profile settings to link the authorizing GitHub account directly to the currently signed-in DevCollab account. The account-link callback is bound to the initiating session and OAuth state; it does not sign you into or create another DevCollab account. Existing GitHub identity conflicts are rejected without changing either account. The normal login/signup OAuth flow remains separate.
5. In Evidence Profile settings, browse or search the automatically discovered public repositories, link one to a project, and choose **Check contribution** or **Sync evidence**. Use **Refresh repositories** to check GitHub again.
6. Make the profile and desired projects public to share `/u/<username>`. Private profiles return 404, and private projects are excluded from public results.

### Evidence profile API

| Method and route | Authentication / authorization | Purpose |
| --- | --- | --- |
| `GET /api/auth/github/link` | Authenticated; caller only | Starts GitHub OAuth account linking for the current DevCollab account. |
| `PATCH /api/auth/me` | Authenticated; updates only the caller's editable profile fields | Updates name, email, avatar, bio, profile visibility, and technology tags. Returns a sanitized profile. |
| `GET /api/profile/me` | Authenticated; caller only | Returns the caller's projects and recent evidence. |
| `GET /api/evidence/me` | Authenticated; caller only | Returns the caller's recent evidence records. |
| `POST /api/project/:projectId/github/repository` | Authenticated project owner | Body: `{ "url": "https://github.com/owner/repository" }`. Fetches metadata on the server and checks public visibility and connected GitHub owner ID. |
| `DELETE /api/project/:projectId/github/repository` | Authenticated project owner | Unlinks the repository. Stored history remains private to its owners and is not shown publicly while that repository is unlinked. |
| `POST /api/project/:projectId/github/sync` | Authenticated project owner | Synchronizes bounded commit and pull request evidence for the linked repository. Returns `status`, processed/omitted counts, pagination truncation, and any failed record types. |
| `GET /api/github/repositories` | Authenticated; caller only | Lists the caller's available discovered repositories. Supports `page`, `limit` (max 50), `q`, and `filter=linked\|unlinked\|verified`; includes discovery status and pagination. |
| `POST /api/github/repositories/refresh` | Authenticated; caller only | Refreshes public repositories owned by the connected GitHub account. The operation is bounded and idempotently upserts records by stable GitHub repository ID. |
| `PATCH /api/github/repositories/:repositoryId/link` | Authenticated; caller only | Body: `{ "projectId": "<owned-project-id>" }` to link or `{ "projectId": null }` to unlink. |
| `POST /api/github/repositories/:repositoryId/verify` | Authenticated; caller only | Checks recent bounded commits and pull requests, matching activity by stable GitHub user ID. A no-match result is not proof of no historical contribution. |
| `GET /api/profiles/:username` | Public; only a public profile | Returns explicit public developer, public project, and associated GitHub evidence fields. |

Repository operations can return `400` for invalid input or unsupported repository scope, `401` for an invalid session, `403` for an ownership mismatch, `404` for unavailable projects/profiles/repositories, `409` if no GitHub identity is connected, an operation is already in progress, or a project/repository is already linked elsewhere, `429` for GitHub rate limits, `502` for GitHub failures, and `504` for GitHub request timeouts.

GitHub evidence describes GitHub-attributed records; it does not prove skill, code quality, or professional competence. A real OAuth app and reachable GitHub API are required to test the live flow; automated local tests do not establish that the deployment's OAuth configuration is correct. Run backend unit tests with `cd backend && npm test`.