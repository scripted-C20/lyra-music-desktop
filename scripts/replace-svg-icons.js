const fs = require('fs');
const path = require('path');

const iconMap = {
    'window-close': 'X',
    'window-minimize': 'Minus',
    'window-hide': 'RectangleHorizontal',
    'search': 'Search',
    'left': 'ChevronLeft',
    'right': 'ChevronRight',
    'first': 'ChevronsLeft',
    'last': 'ChevronsRight',
    'down': 'ChevronDown',
    'testPlay': 'Play',
    'addTo': 'Plus',
    'download': 'Download',
    'play': 'Play',
    'play-outline': 'Play',
    'pause': 'Pause',
    'musicFile': 'FileAudio',
    'delete': 'Trash2',
    'font-increase': 'AArrowUp',
    'font-decrease': 'AArrowDown',
    'prevMusic': 'SkipBack',
    'nextMusic': 'SkipForward',
    'eraser': 'Eraser',
    'list-add': 'ListPlus',
    'refresh': 'RefreshCw',
    'chevron-right': 'ChevronRight',
    'chevron-left': 'ChevronLeft',
    'album': 'DiscAlbum',
    'leaderboard': 'BarChart2',
    'love': 'Heart'
};

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    if (!content.includes('<svg-icon')) return;

    const matches = [...content.matchAll(/<svg-icon\s+[^>]*icon=['\"]([^'\"]+)['\"][^>]*\/?>(<\/.+?>)?/g)];
    if (matches.length > 0) {
        let replacedContent = content;
        let addedIcons = new Set();

        // Simple replacement
        replacedContent = replacedContent.replace(/<svg-icon(.*?)icon=['\"]([^'\"]+)['\"](.*?)(\/?)>/g, (match, before, name, after, selfClose) => {
            const lucideIcon = iconMap[name] || 'ChevronRight'; // Fallback
            if (lucideIcon) {
                addedIcons.add(lucideIcon);
                return '<line-icon' + before + ' :icon=\"' + lucideIcon + '\"' + after + selfClose + '>';
            }
            return match;
        });

        if (addedIcons.size > 0) {
            console.log('Processed', filepath, Array.from(addedIcons));

            // Add imports
            const imports = Array.from(addedIcons).join(', ');

            if (replacedContent.includes('lucide-vue-next')) {
                replacedContent = replacedContent.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-vue-next['"]/, (match, p1) => {
                    let existing = p1.split(',').map(s => s.trim());
                    Array.from(addedIcons).forEach(i => {
                        if (!existing.includes(i)) existing.push(i);
                    });
                    return `import { ${existing.join(', ')} } from 'lucide-vue-next'`;
                });
            } else {
                replacedContent = replacedContent.replace(/<script[^>]*>/, (match) => {
                    return match + `\nimport { ${imports} } from 'lucide-vue-next'\n`;
                });
            }

            // Expose in setup if there is a setup()
            if (replacedContent.includes('setup(')) {
                // Find return statement in setup
                let setupRegex = /setup\s*\([^)]*\)\s*\{([\s\S]*?)return\s*\{([\s\S]*?)\}/;
                replacedContent = replacedContent.replace(setupRegex, (match, beforeReturn, returnContent) => {
                    let existing = returnContent.split(',').map(s => s.trim());
                    Array.from(addedIcons).forEach(i => {
                        if (!existing.includes(i)) existing.push(i);
                    });
                    return `setup() {${beforeReturn}return {\n      ${existing.filter(i => i).join(',\n      ')},`;
                });
            }

            fs.writeFileSync(filepath, replacedContent, 'utf8');
        }
    }
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (dirPath.endsWith('.vue')) {
            callback(dirPath);
        }
    });
}

walkDir('src/renderer', processFile);
