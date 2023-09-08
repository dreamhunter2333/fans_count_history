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
        {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
            }
        }
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

export { crawler };
