/**
 * Plugin comments run on giscus: GitHub Discussions in this site's own repo,
 * one discussion per plugin. Comments stay hidden until `categoryId` is set —
 * it only exists once Discussions is enabled on the repo and the giscus app
 * is installed (https://giscus.app shows the ids for the chosen category).
 */
export const giscus = {
  repo: 'qunqin24/opendock',
  repoId: 'R_kgDOT4NNsQ',
  category: 'Plugin comments',
  categoryId: '',
};

export const giscusEnabled = Boolean(giscus.repoId && giscus.categoryId);
