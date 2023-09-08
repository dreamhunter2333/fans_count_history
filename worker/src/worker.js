import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt'
import { cache } from 'hono/cache'

import { api } from './router';
import { crawler } from './crawler';

const app = new Hono()
app.use('/*', cors());

app.use('/admin/*', async (c, next) => {
	return jwt({ secret: c.env.JWT_SECRET })(c, next);
});

api.post('/admin/crawler', async (c) => {
	await crawler(null, c.env, null);
	return c.json({ success: true });
})

app.get(
	'/api/*',
	cache({
		cacheName: 'app-cache',
		cacheControl: 'max-age=3600',
	})
)

app.route('/', api)

app.all('/*', async c => c.html(`<h1>Hello World</h1>`))


export default {
	fetch: app.fetch,
	scheduled: crawler,
}
