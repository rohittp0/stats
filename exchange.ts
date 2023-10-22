// Importing necessary modules from their URLs
import {Application, Router} from "https://deno.land/x/oak/mod.ts";
import {staticServe} from "https://deno.land/x/oak_static/mod.ts";

const app = new Application();
const router = new Router();

const CLIENT_ID = Deno.env.get('GITHUB_CLIENT_ID');
const CLIENT_SECRET = Deno.env.get('GITHUB_CLIENT_SECRET');

if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing GitHub OAuth credentials');
}

router.get("/exchange", async context => {
    const code = context.request.url.searchParams.get("code");

    if (!code) {
        context.response.status = 400;
        context.response.body = 'Error: No code provided';
        return;
    }

    const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
        }),
    });

    context.response.body = await res.json();
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(staticServe("./public"));

addEventListener("fetch", (event) => {
    event.respondWith(app.handle(event.request));
});
