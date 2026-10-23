/**
 * Author pages live at `/authors/<slug>/`. The slug is the owner login
 * lower-cased: GitHub logins are case-insensitive, and the dataset does carry
 * the same person under two casings (`OpeOginni` / `opeoginni`).
 *
 * Kept free of the dataset import so client islands can link to author pages
 * without pulling `plugins.json` into the bundle.
 *
 * `owner` is the repo owner when the package has a repo, otherwise the npm
 * publisher. For the second kind the pipeline also records CI placeholders
 * ("GitHub Actions", "GitLab CI/CD") — the character check rejects those
 * because they are not people.
 */
const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function authorSlug(owner: string | null | undefined): string | null {
  return owner && SLUG_RE.test(owner) ? owner.toLowerCase() : null;
}
