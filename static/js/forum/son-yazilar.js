// Home page: "Son Yazılar". Stays hidden unless there is something to show, so the rest of the page never depends on it.
import { articleCard } from './card.js';
import { latestPostsUrl } from './lib.js';

const COUNT = 3;

async function start() {
  const { url, key } = window.FORUM_CONFIG;
  const answer = await fetch(latestPostsUrl(url, COUNT), { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
  if (!answer.ok) return;
  const posts = await answer.json();
  if (!posts.length) return;
  document.getElementById('son-yazilar-list').replaceChildren(...posts.map(articleCard));
  document.getElementById('son-yazilar').hidden = false;
  document.getElementById('home-split').classList.add('has-posts');
}

start().catch(() => { /* forum not reachable: the home page stays as it is */ });
