const textArea = document.getElementById('github-ids');
const submitBtn = document.getElementById('submit-btn');
const tableBody = document.getElementById('table-body');
const inputContainer  = document.getElementById('input-container');
const outputContainer = document.getElementById('output-container');
const downloadButton = document.getElementById('download-btn');

const headerRow = ['GitHub ID', 'Number of Repositories', 'Total Contributions', 'Number of Languages', 'Languages'];
const commonLanguages = fetch("res/common.txt").then(res => res.text()).then(text => text.split('\n'));

function categorizeLanguages(languages, commonLanguagesList) {
    let common = 0, rare = 0;
    languages.forEach(language => commonLanguagesList.includes(language) ? common++ : rare++);
    return {common, rare};
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

    const commonLanguagesList = await commonLanguages;

    const dataRows = [];
    for (const githubId of githubIds) {
        try {
            const data = await fetchGitHubData(githubId);
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
    const blob = new Blob([csvContent], { type: 'text/csv' });


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
});
