import { Hono } from 'hono'

const api = new Hono()

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

export { api }
