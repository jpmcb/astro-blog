import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';

const parser = new MarkdownIt();

export async function GET(context) {
    const posts = (await getCollection('posts'))
        .filter(post => !post.data.isDraft)
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,

        items: posts.map((post) => ({
          title: post.data.title,
          pubDate: post.data.pubDate,
          description: post.data.description,
          link: `/archive/${post.id}/`,
          content: sanitizeHtml(parser.render(post.body), {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img'])
          }),
        })),
	});
}
