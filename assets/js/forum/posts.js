// Deleting an article together with its image files (author on Makalelerim, admin on the admin panel).
import { getClient, imagesPrefix } from './client.js';
import { removablePostFiles } from './lib.js';

export async function deletePost(post) {
  const client = getClient();
  const { data: own, error: readError } = await client.from('posts')
    .select('id,author_id,cover_path,body_md').eq('author_id', post.author_id);
  if (readError) throw readError;
  const { data, error } = await client.from('posts').delete().eq('id', post.id).select('id');
  if (error) throw error;
  if (!data.length) throw new Error('not_deleted');
  // Files go after the article, so a failure can never leave an article with missing images.
  const target = own.find((p) => p.id === post.id);
  const files = target ? removablePostFiles(target, own, imagesPrefix()) : [];
  if (files.length) {
    try { await client.storage.from('forum-images').remove(files); } catch { /* a leftover file is harmless */ }
  }
}
