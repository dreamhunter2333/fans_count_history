import { Hono } from 'hono'

const api = new Hono()
const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
}
api.get('/api/line_chart', async (c) => {
    const account_query = await c.env.DB.prepare(
        `SELECT id, name, source  FROM fans_accounts`
    ).all();
    if (!account_query.results) {
        return c.json({ error: "No accounts" }, 500)
    }
    const accounts = account_query.results;
    const { results } = await c.env.DB.prepare(
        `SELECT
            account_id,
            strftime('%Y-%m-%d', created_at) AS date,
            count
        FROM fans_count_history
            WHERE created_at >= datetime('now', '-30 day')
        ORDER BY created_at ASC;
        `
    ).all();
    if (!results) {
        return c.json({ error: "No results" }, 500)
    }
    // convet results to map by date - account_id - count
    const results_map = results.reduce((result, item) => {
        if (!result[item.date]) {
            result[item.date] = {}
        }
        result[item.date][item.account_id] = item.count;
        return result;
    }, {});
    const dates = Object.keys(results_map).sort();
    const series = accounts.map(account => {
        const account_counts = dates.map(date => {
            return results_map[date][account.id] || null;
        });
        return {
            name: `${account.name}`,
            data: account_counts
        };
    });

    return c.json({
        dates: dates,
        series: series
    });
})

api.post('/api/bilibili', async (c) => {
    const { uid } = await c.req.json();
    const res = await fetch(
        `https://api.bilibili.com/x/space/wbi/acc/info?mid=${uid}`,
        { headers }
    )
    const { data } = await res.json();
    const { name } = data;
    if (!name) {
        return c.text("Failed to get name", 400)
    }
    const { results } = await c.env.DB.prepare(
        `SELECT id FROM fans_accounts WHERE ref_id = ? and source = 'bilibili';`
    ).bind(uid).all();
    if (results.length > 0) {
        return c.text("Uid already exists", 400)
    }
    const { success } = await c.env.DB.prepare(
        `INSERT into tmp_fans_accounts (ref_id, name, source) values (?, ?, ?);`
    ).bind(
        uid, name, "bilibili"
    ).run();
    if (!success) {
        return c.text("Failed to add uid", 500)
    }
    return c.json({ name: name })
})

api.post('/admin/pending_accounts/:id', async (c) => {
    const id = c.req.param('id');
    if (!id) {
        return c.text("Missing id", 400)
    }
    const { results } = await c.env.DB.prepare(
        `SELECT ref_id, name, source  FROM tmp_fans_accounts WHERE id = ?;`
    ).bind(id).all();
    if (results.length === 0) {
        return c.text("Uid not exists", 400)
    }
    const { ref_id, name, source } = results[0];
    const { success } = await c.env.DB.prepare(
        `INSERT into fans_accounts (ref_id, name, source) values (?, ?, ?);`
    ).bind(
        ref_id, name, source
    ).run();
    if (!success) {
        return c.text("Failed to add uid", 500)
    }
    // delete from tmp_fans_accounts
    const { success: success2 } = await c.env.DB.prepare(
        `DELETE FROM tmp_fans_accounts WHERE id = ?`
    ).bind(id).run();
    if (!success2) {
        return c.text("Failed to delete uid", 500)
    }
    return c.json({ success: true })
})

api.get('/admin/pending_accounts', async (c) => {
    const { results } = await c.env.DB.prepare(
        `SELECT * FROM tmp_fans_accounts`
    ).all();
    return c.json(results)
})

api.delete('/admin/pending_accounts/:id', async (c) => {
    const id = c.req.param('id');
    const { success } = await c.env.DB.prepare(
        `DELETE FROM tmp_fans_accounts WHERE id = ?;`
    ).bind(id).run();
    if (!success) {
        return c.text("Failed to delete uid", 500)
    }
    return c.json({ success: true })
})

api.get('/admin/accounts', async (c) => {
    const { results } = await c.env.DB.prepare(
        `SELECT * FROM fans_accounts;`
    ).all();
    return c.json(results)
})

api.delete('/admin/accounts/:id', async (c) => {
    const id = c.req.param('id');
    const { success } = await c.env.DB.prepare(
        `DELETE FROM fans_accounts WHERE id = ?;`
    ).bind(id).run();
    if (!success) {
        return c.text("Failed to delete uid", 500)
    }
    return c.json({ success: true })
})

export { api }
