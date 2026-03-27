(async () => {
    try {
        const resp = await fetch("https://cqszqdgoteagffdnecju.supabase.co/functions/v1/send-reminders", {
            method: "POST",
            headers: {
                "Authorization": "Bearer sb_publishable_duhsv4cxG6VIhNbjtKVVJA_fWGiMx56",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                customClients: [
                    {
                        phone: "+19393167853",
                        name: "LOANN SANTIAGO",
                        lastDate: "2023-01-01"
                    }
                ]
            })
        });

        const json = await resp.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
