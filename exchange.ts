// Importing necessary modules from their URLs
import {Application, Router} from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

const CLIENT_ID = Deno.env.get('GITHUB_CLIENT_ID');
const CLIENT_SECRET = Deno.env.get('GITHUB_CLIENT_SECRET');

if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing GitHub OAuth credentials');
}

// Enable CORS for all routes
app.use((context, next) => {
    context.response.headers.set('Access-Control-Allow-Origin', '*');
    context.response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
    context.response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return next();
});

router.get("/exchange", async context => {
    const code = context.request.url.searchParams.get("code");
    if (code) {
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
    } else {
        context.response.status = 400;
        context.response.body = 'Error: No code provided';
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

addEventListener("fetch", (event) => {
    event.respondWith(app.handle(event.request));
});
