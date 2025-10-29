// api.js

// --- FUNGSI UNTUK MENDAPATKAN KONFIGURASI DARI LOCALSTORAGE ---
function getApiConfig() {
    const config = {
        owner: localStorage.getItem('github_owner'),
        repo: localStorage.getItem('github_repo'),
        token: localStorage.getItem('github_token'),
        branch: localStorage.getItem('github_branch') || 'main'
    };

    if (!config.owner || !config.repo || !config.token) {
        throw new Error('Konfigurasi API (Owner, Repo, Token) belum lengkap. Silakan atur di halaman Settings.');
    }

    return config;
}

/**
 * Mengambil konten file dari repository.
 * @param {string} path - Nama file (contoh: 'kas.json')
 * @param {object} [config] - Objek konfigurasi opsional. Jika tidak ada, akan ambil dari localStorage.
 * @returns {Promise<any>} - Data JSON dari file
 */
async function getFile(path, config) {
    // Gunakan config yang diberikan, jika tidak ada, ambil dari localStorage
    const apiConfig = config || getApiConfig(); 
    const url = `https://api.github.com/repos/${apiConfig.owner}/${apiConfig.repo}/contents/${path}?ref=${apiConfig.branch}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${apiConfig.token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Gagal mengambil file ${path}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = atob(data.content); // Decode dari Base64
    return JSON.parse(content);
}

/**
 * Menulis atau memperbarui konten file di repository.
 * @param {string} path - Nama file (contoh: 'kas.json')
 * @param {any} content - Konten baru yang akan ditulis (objek atau array)
 * @param {string} message - Pesan commit
 * @param {object} [config] - Objek konfigurasi opsional.
 * @returns {Promise<void>}
 */
async function putFile(path, content, message, config) {
    // Gunakan config yang diberikan, jika tidak ada, ambil dari localStorage
    const apiConfig = config || getApiConfig();

    // 1. Dapatkan SHA file yang ada
    let sha;
    try {
        const fileDataResponse = await fetch(`https://api.github.com/repos/${apiConfig.owner}/${apiConfig.repo}/contents/${path}?ref=${apiConfig.branch}`, {
            headers: { 'Authorization': `token ${apiConfig.token}` }
        });
        if (fileDataResponse.ok) {
            const data = await fileDataResponse.json();
            sha = data.sha;
        }
    } catch (error) {
        console.log(`File ${path} tidak ditemukan, akan membuat baru.`);
    }

    // 2. Siapkan data untuk API
    const contentString = JSON.stringify(content, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(contentString)));

    const body = {
        message: message,
        content: contentBase64,
        branch: apiConfig.branch
    };

    if (sha) {
        body.sha = sha;
    }

    // 3. Kirim permintaan PUT
    const url = `https://api.github.com/repos/${apiConfig.owner}/${apiConfig.repo}/contents/${path}`;
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${apiConfig.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gagal menyimpan file ${path}: ${errorData.message}`);
    }
    
    console.log(`File ${path} berhasil disimpan.`);
}

// --- EKSPOR FUNGSI ---
window.GitHubAPI = {
    getFile,
    putFile
};
