async function fetchGitHubData(githubId, token) {
    const endpoint = 'https://api.github.com/graphql';

    async function fetchGraphQL(query, variables = {}) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({query, variables}),
        });

        if (response.status !== 200)
            throw new Error(String(response.status));

        const data = await response.json();
        if (data.errors) {
            if (data.errors[0].type === 'NOT_FOUND')
                return null;

            throw new Error(data.errors[0].message);
        }

        return data.data;
    }

    async function fetchAllPages(query, fieldPath, variables = {}) {
        let items = [];
        let cursor = undefined;
        let hasNextPage = true;

        while (hasNextPage) {
            const data = await fetchGraphQL(query, {...variables, cursor});

            if (!data)
                return null;

            const page = fieldPath.reduce((obj, key) => obj[key], data);
            items = items.concat(page.nodes);
            cursor = page.pageInfo.endCursor;
            hasNextPage = page.pageInfo.hasNextPage;
        }

        return items;
    }

    const reposQuery = `
    query($login: String!, $cursor: String) {
      user(login: $login) {
        repositories(first: 100, isFork: false, after: $cursor) {
          nodes {
            languages(first: 100) {
              nodes {
                name
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  `;

    const contribQuery = `
    query($login: String!, $cursor: String) {
      user(login: $login) {
        repositoriesContributedTo(first: 100, after: $cursor) {
          nodes {
            languages(first: 100) {
              nodes {
                name
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  `;

    const contributionsQuery = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

    const now = Date.now();

    const {cached, timestamp} = JSON.parse(localStorage.getItem(githubId) || '{}');

    if (cached && now - timestamp < 1000 * 60 * 60 * 24)
        return cached;

    if (cached === null && now - timestamp < 1000 * 60 * 60 * 24 * 7)
        return null;

    let contributionsData, reposData, contribData

    [contributionsData, reposData, contribData] = await Promise.all([
            fetchGraphQL(contributionsQuery, {login: githubId}),
            fetchAllPages(reposQuery, ['user', 'repositories'], {login: githubId}),
            fetchAllPages(contribQuery, ['user', 'repositoriesContributedTo'], {login: githubId})
        ]);

    if (!contributionsData || !reposData || !contribData)
        return localStorage.setItem(githubId, JSON.stringify({cached: null, timestamp: now}));

    reposData = reposData.concat(contribData);

    const languages = new Set();
    reposData.forEach(repo => {
        repo.languages.nodes.forEach(language => {
            languages.add(language.name);
        });
    });

    const data = {
        numberOfRepositories: reposData.length,
        totalContributions: contributionsData.user.contributionsCollection.contributionCalendar.totalContributions,
        numberOfLanguages: languages.size,
        languages: Array.from(languages)
    };

    localStorage.setItem(githubId, JSON.stringify({cached: data, timestamp: now}));

    return data;
}
