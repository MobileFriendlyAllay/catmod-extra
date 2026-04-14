/**
 * CatMod Extras Gallery Logic
 * Fetches extension data from extensions.json and renders the UI
 */

async function loadExtensions() {
    const grid = document.getElementById('extension-grid');
    try {
        // Fetch the central database
        const response = await fetch('extensions.json');
        if (!response.ok) throw new Error('Could not load gallery data');
        
        const data = await response.json();
        
        // Clear the loading spinner
        grid.innerHTML = '';
        
        // Build a card for each extension found in the JSON
        data.extensions.forEach(ext => {
            grid.appendChild(createExtensionCard(ext));
        });
    } catch (error) {
        console.error('Gallery Error:', error);
        grid.innerHTML = `
            <div class="col-span-full text-center p-8 bg-red-900/10 border border-red-500/20 rounded-xl text-red-400">
                Error loading library: ${error.message}. <br>
                <span class="text-sm opacity-70">Make sure extensions.json is in the same folder and uploaded to GitHub!</span>
            </div>`;
    }
}

/**
 * Creates the HTML structure for a single extension card
 * @param {object} ext - The extension data object from JSON
 */
function createExtensionCard(ext) {
    const div = document.createElement('div');
    div.className = 'glass-card p-6 rounded-2xl flex flex-col h-full';
    
    // Handle image URLs (removes Google redirects if they exist)
    const cleanImgUrl = ext.image.includes('google.com') ? ext.image.split('q=')[1] : ext.image;

    div.innerHTML = `
        <div class="w-full h-32 bg-slate-800/50 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
            <img src="${cleanImgUrl}" alt="${ext.name}" class="max-h-24 max-w-full object-contain" 
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<span class="text-4xl">🐱</span>'">
        </div>
        <div class="flex justify-between items-start mb-2">
            <h3 class="text-xl font-bold text-white">${ext.name}</h3>
            <span class="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">v${ext.version}</span>
        </div>
        <p class="text-slate-400 text-sm mb-6 flex-grow">${ext.description}</p>
        
        <div class="mt-auto">
            <button 
                onclick="copyExtensionLink('${ext.downloadUrl}', this)" 
                style="background-color: ${ext.color}"
                class="w-full text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
                <span>Copy URL for CatMod</span>
            </button>
        </div>
    `;
    return div;
}

/**
 * Copies the absolute URL of the extension to the user's clipboard
 * @param {string} path - The relative path to the .js file
 * @param {HTMLElement} btn - The button element for visual feedback
 */
function copyExtensionLink(path, btn) {
    // Generate the full URL based on where the site is currently hosted
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const fullUrl = baseUrl + path;

    const el = document.createElement('textarea');
    el.value = fullUrl;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    // Visual feedback "Copied!" animation
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>Copied to Clipboard!</span>';
    btn.classList.add('brightness-110');
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('brightness-110');
    }, 2000);
}

// Start the loading process when the page is ready
window.addEventListener('DOMContentLoaded', loadExtensions);
