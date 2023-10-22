const textArea = document.getElementById('github-ids');
const submitBtn = document.getElementById('submit-btn');
const tableBody = document.getElementById('table-body');
const inputContainer = document.getElementById('input-container');
const outputContainer = document.getElementById('output-container');
const downloadButton = document.getElementById('download-btn');

const headerRow = ['GitHub ID', 'Number of Repositories', 'Total Contributions', 'Number of Languages', 'Languages'];
const commonLanguages = fetch("res/common.txt").then(res => res.text()).then(text => text.split('\n'));

const CLIENT_ID = '8afe237c3f87bcd01256';

function categorizeLanguages(languages, commonLanguagesList) {
    let common = 0, rare = 0;
    languages.forEach(language => commonLanguagesList.includes(language) ? common++ : rare++);
    return {common, rare};
}

async function initiateAuthFlow() {
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${window.location.href}&scope=user`;
}

submitBtn.addEventListener('click', async () => {
    // Disable the text area and submit button while fetching data
    textArea.disabled = true;
    submitBtn.disabled = true;

    const textAreaValue = textArea.value;
    const githubIds = textAreaValue.split('\n').map(id => id.trim()).filter(Boolean);

    if (githubIds.length === 0) {
        alert('Please enter at least one GitHub ID.');
        textArea.disabled = false;
        submitBtn.disabled = false;
        return;
    }

    let token = localStorage.getItem('github_token');
    if (!token) {
        localStorage.setItem('github_ids', textArea.value);
        return initiateAuthFlow();  // Exit early, will continue after user is authenticated
    }

    const commonLanguagesList = await commonLanguages;

    const dataRows = [];
    for (const githubId of githubIds) {
        try {
            const data = await fetchGitHubData(githubId, token).catch(error => {
                if (String(error).includes('401') || String(error).includes('403')) {
                    if(localStorage.getItem('retry') === 'true') {
                        localStorage.removeItem('retry');
                        break;
                    }

                    localStorage.removeItem('github_token');
                    localStorage.setItem('github_ids', textArea.value);
                    localStorage.setItem('retry', 'true');
                    return initiateAuthFlow();
                }

                throw error;
            });
            const {common, rare} = categorizeLanguages(data.languages, commonLanguagesList);

            dataRows.push([
                githubId,
                data.numberOfRepositories,
                data.totalContributions,
                common,
                rare,
                data.languages.sort().join(' ')
            ]);
        } catch (error) {
            console.error(`Failed to fetch data for GitHub ID ${githubId}:`, error);
            dataRows.push([githubId, '', '', '', '', '']);
        }
    }

    const csvContent = [headerRow, ...dataRows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], {type: 'text/csv'});

    dataRows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    downloadButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'github-data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    inputContainer.style.display = 'none';
    outputContainer.style.display = 'block';

    localStorage.removeItem('retry');
});

// Assuming the OAuth callback redirects to this page with a code parameter
const code = new URLSearchParams(window.location.search).get('code')

if (code) {
    fetch(`/exchange?code=${code}`)
        .then(response => response.json())
        .then(data => {
            const accessToken = data.access_token;
            localStorage.setItem('github_token', accessToken);  // Store the token for future use

            const githubIds = localStorage.getItem('github_ids');
            if (githubIds) {
                textArea.value = githubIds;
                localStorage.removeItem('github_ids');
                submitBtn.click();
            }
        });
}
