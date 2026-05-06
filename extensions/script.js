/**
 * CatMod Extensions Gallery Logic
 * Updated with Download and Copy Code features to bypass CORS limitations.
 */

// --- GALLERY LOGIC ---
async function loadExtensions() {
    const grid = document.getElementById('extension-grid');
    if (!grid) return;

    try {
        const response = await fetch('extensions.json');
        if (!response.ok) throw new Error('Could not load gallery data');
        
        const data = await response.json();
        grid.innerHTML = '';
        
        data.extensions.forEach(ext => {
            grid.appendChild(createExtensionCard(ext));
        });
    } catch (error) {
        console.error('Gallery Error:', error);
        grid.innerHTML = `
            <div class="col-span-full text-center p-8 bg-red-900/10 border border-red-500/20 rounded-xl text-red-400">
                Error loading library: ${error.message}
            </div>`;
    }
}

/**
 * Creates the HTML structure for a single extension card
 * Fixed the 😺'"> glitch by cleaning up the img attribute structure.
 */
function createExtensionCard(ext) {
    const div = document.createElement('div');
    div.className = 'glass-card p-6 rounded-2xl flex flex-col h-full';
    
    // Sanitize image URL
    const cleanImgUrl = ext.image.includes('google.com') ? ext.image.split('q=')[1] : ext.image;

    div.innerHTML = `
        <div class="w-full h-32 bg-slate-800/50 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
            <img src="${cleanImgUrl}" alt="${ext.name}" class="max-h-24 max-w-full object-contain" 
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\"text-4xl\">🐱</span>'">
        </div>
        <div class="flex justify-between items-start mb-2">
            <h3 class="text-xl font-bold text-white">${ext.name}</h3>
            <span class="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">v${ext.version}</span>
        </div>
        <p class="text-slate-400 text-sm mb-6 flex-grow">${ext.description}</p>
        
        <div class="mt-auto flex flex-col gap-2">
            <!-- Copy Code Button -->
            <button 
                onclick="handleCopyCode('${ext.downloadUrl}', this)" 
                class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <span>Copy Code</span>
            </button>
            
            <!-- Download Button -->
            <button 
                onclick="handleDownload('${ext.downloadUrl}', this)" 
                style="border: 1px solid ${ext.color}; color: ${ext.color}"
                class="w-full bg-transparent hover:bg-white/5 font-bold py-2 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                <span>Download .js</span>
            </button>
        </div>
    `;
    return div;
}

/**
 * Fetches the raw file and copies it to clipboard
 */
async function handleCopyCode(path, btn) {
    const originalText = btn.innerHTML;
    try {
        btn.innerHTML = '<span>Fetching...</span>';
        const response = await fetch(path);
        const code = await response.text();

        const el = document.createElement('textarea');
        el.value = code;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

        btn.innerHTML = '<span>Code Copied!</span>';
        btn.classList.add('bg-green-600');
    } catch (err) {
        console.error(err);
        btn.innerHTML = '<span>Failed to Copy</span>';
    } finally {
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('bg-green-600');
        }, 2000);
    }
}

/**
 * Triggers a browser download for the .js file
 */
async function handleDownload(path, btn) {
    try {
        const response = await fetch(path);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = path.split('/').pop();
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        console.error('Download failed:', err);
    }
}

// --- AI REVIEWER LOGIC ---
// (Kept as requested from your existing code)
function initReviewer() {
    const fileInput = document.getElementById('fileInput');
    const sendBtn = document.getElementById('sendBtn');
    if (!fileInput || !sendBtn) return;

    window.setPrompt = (text) => {
        const promptInput = document.getElementById('promptInput');
        if (promptInput) promptInput.value = text;
        sendBtn.classList.add('ring-2', 'ring-blue-400');
        setTimeout(() => sendBtn.classList.remove('ring-2', 'ring-blue-400'), 500);
    };

    sendBtn.addEventListener('click', async () => {
        const status = document.getElementById('status');
        const promptInput = document.getElementById('promptInput');
        const file = fileInput.files[0];
        const userPrompt = promptInput.value.trim();

        if (!file) { status.innerText = "❌ Please upload a project file first."; return; }
        if (!userPrompt) { status.innerText = "❌ Please enter a prompt."; return; }

        status.innerText = "📂 Reading project data...";

        try {
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(file);
            const projectJsonFile = loadedZip.file("project.json");

            if (!projectJsonFile) {
                status.innerText = "❌ Error: Could not find project.json.";
                return;
            }

            const projectData = await projectJsonFile.async("string");
            status.innerText = "📋 Copying prompt to clipboard...";

            const finalPrompt = `This prompt is auto generated by 'https://mobilefriendlyallay.github.io/catmod-extra/ai.' A user wants to review a PenguinMod project with the prompt '${userPrompt}'. The JSON project is: \n\n ${projectData}`;

            const el = document.createElement('textarea');
            el.value = finalPrompt;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);

            status.innerHTML = "✅ <b>Copied!</b><br>Redirecting... Paste (Ctrl+V) at ChatGPT.";

            setTimeout(() => {
                window.location.href = `https://chatgpt.com/?q=${encodeURIComponent("I am pasting a PenguinMod project. Please wait for me to paste it.")}`;
            }, 1500);

        } catch (err) {
            console.error(err);
            status.innerText = "❌ Error reading file.";
        }
    });
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    loadExtensions();
    initReviewer();
});
