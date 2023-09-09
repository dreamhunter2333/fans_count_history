const headers = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
}

async function crawler(event, env, ctx) {
    const { results } = await env.DB.prepare(
        `SELECT * FROM fans_accounts`
    ).all();
    if (!results) {
        console.error("No results")
    }
    for (const account of results) {
        try {
            await handle_all(account, env)
        } catch (error) {
            console.error(`Failed to handle ${account.source} account ${account.ref_id}`)
            console.error(error)
        }
        console.log(`Handled ${account.source} account ${account.ref_id}`)
        // sleep 5s to avoid rate limit
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

async function handle_all(account, env) {
    switch (account.source) {
        case "bilibili":
            const fans_count = await handle_bilibili(account)
            await update_db(account, fans_count, env)
            break;
        default:
            console.log("Unknown source")
    }
}

async function handle_bilibili(account) {
    const res = await fetch(
        `https://api.bilibili.com/x/relation/stat?vmid=${account.ref_id}&jsonp=jsonp`,
        { headers: headers }
    )
    const { data } = await res.json()
    const { follower } = data
    if (!follower) {
        throw new Error("Failed to get fans")
    }
    return follower
}

async function update_db(account, fans_count, env) {
    const { success } = await env.DB.prepare(
        `INSERT INTO fans_count_history (account_id, count) VALUES (?, ?)`
    ).bind(account.id, fans_count).run();
    if (!success) {
        throw new Error("Failed to update fans")
    }
}


const crawler_third_part = async (account_id, env) => {
    const history = await env.DB.prepare(
        `SELECT count(*) as total FROM fans_count_history WHERE account_id = ?`
    ).bind(account_id).first('total');
    if (history) {
        throw new Error("Already exists fans history")
    }
    const account = await env.DB.prepare(
        `SELECT * FROM fans_accounts WHERE id = ?`
    ).bind(account_id).first();
    const res = await fetch(
        `https://workers.meta48.live/api/bilibili/fans-history/${account.ref_id}`,
        { headers: headers }
    )
    const fans_list = await res.json()
    const stmt = env.DB.prepare("INSERT INTO fans_count_history (account_id, count, created_at) VALUES (?, ?, ?)");
    await env.DB.batch(fans_list.map(
        fans => stmt.bind(account_id, fans["fans"], fans["date"])
    )).run();
    return;
}

export { crawler, crawler_third_part };
