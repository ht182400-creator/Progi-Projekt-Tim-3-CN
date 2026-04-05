// replace-all.js
const fs = require('fs');
const path = require('path');

// ---------- 配置 ----------
const SRC_DIR = path.join(__dirname, 'app/client/src');
const BACKUP_DIR = path.join(__dirname, 'app/client/src_backup_full');
const TRANSLATION_FILE = path.join(__dirname, 'commons.js'); // 你的对照文件

// ---------- 读取翻译映射 ----------
function loadTranslationMap() {
    try {
        const content = fs.readFileSync(TRANSLATION_FILE, 'utf-8');
        const match = content.match(/export const commons = ({[\s\S]*?});/);
        if (!match) {
            console.error('❌ 无法解析翻译文件');
            process.exit(1);
        }
        return eval(`(${match[1]})`);
    } catch (err) {
        console.error('❌ 读取翻译文件失败:', err.message);
        process.exit(1);
    }
}

// ---------- 替换 JSX 文本节点 ----------
// 匹配标签之间的纯文本（不包括标签内的属性）
function replaceJSXText(content, translationMap) {
    // 匹配 > 和 < 之间的文本，且不包含 HTML 标签
    // 使用 (?<=>) 和 (?=<) 但 JS 正则不支持变长后顾，改用捕获组
    const regex = />([^<]+)</g;
    let modified = false;
    
    content = content.replace(regex, (match, text) => {
        let replacedText = text;
        for (const [original, chinese] of Object.entries(translationMap)) {
            if (text.includes(original)) {
                replacedText = text.replace(new RegExp(escapeRegex(original), 'g'), chinese);
            }
        }
        if (replacedText !== text) {
            modified = true;
            return `>${replacedText}<`;
        }
        return match;
    });
    
    return { content, modified };
}

// ---------- 替换字符串字面量 ----------
function replaceStringLiterals(content, translationMap) {
    let modified = false;
    for (const [original, chinese] of Object.entries(translationMap)) {
        if (!original || typeof chinese !== 'string') continue;
        
        const doubleQuoted = new RegExp(`"${escapeRegex(original)}"`, 'g');
        if (doubleQuoted.test(content)) {
            content = content.replace(doubleQuoted, `"${chinese}"`);
            modified = true;
        }
        const singleQuoted = new RegExp(`'${escapeRegex(original)}'`, 'g');
        if (singleQuoted.test(content)) {
            content = content.replace(singleQuoted, `'${chinese}'`);
            modified = true;
        }
        const templateQuoted = new RegExp(`\\\`${escapeRegex(original)}\\\``, 'g');
        if (templateQuoted.test(content)) {
            content = content.replace(templateQuoted, `\`${chinese}\``);
            modified = true;
        }
    }
    return { content, modified };
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------- 处理单个文件 ----------
function processFile(filePath, translationMap) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let anyModified = false;
    
    // 1. 替换字符串字面量
    const { content: afterStrings, modified: stringsModified } = replaceStringLiterals(content, translationMap);
    content = afterStrings;
    anyModified = stringsModified;
    
    // 2. 替换 JSX 文本节点
    const { content: afterJSX, modified: jsxModified } = replaceJSXText(content, translationMap);
    content = afterJSX;
    anyModified = anyModified || jsxModified;
    
    if (anyModified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    }
    return false;
}

// ---------- 遍历目录 ----------
function processDirectory(dir, translationMap) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let fileCount = 0, changedCount = 0;
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const { fileCount: subFiles, changedCount: subChanged } = processDirectory(fullPath, translationMap);
            fileCount += subFiles;
            changedCount += subChanged;
        } else if (entry.isFile() && /\.(jsx?|tsx?)$/i.test(entry.name)) {
            fileCount++;
            if (processFile(fullPath, translationMap)) {
                changedCount++;
                console.log(`  ✓ 已修改: ${path.relative(SRC_DIR, fullPath)}`);
            }
        }
    }
    return { fileCount, changedCount };
}

// ---------- 主流程 ----------
function main() {
    console.log('🚀 开始完整替换（字符串 + JSX 文本）...\n');
    
    if (!fs.existsSync(SRC_DIR)) {
        console.error(`❌ 源目录不存在: ${SRC_DIR}`);
        process.exit(1);
    }
    
    // 备份
    if (fs.existsSync(BACKUP_DIR)) {
        console.log(`⚠️  备份目录已存在，将覆盖: ${BACKUP_DIR}`);
        fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
    console.log(`📦 备份到: ${BACKUP_DIR}`);
    fs.cpSync(SRC_DIR, BACKUP_DIR, { recursive: true });
    
    const translationMap = loadTranslationMap();
    console.log(`📖 加载了 ${Object.keys(translationMap).length} 条翻译`);
    
    console.log(`\n🔧 处理中...`);
    const { fileCount, changedCount } = processDirectory(SRC_DIR, translationMap);
    
    console.log(`\n✅ 完成！`);
    console.log(`   - 扫描文件: ${fileCount}`);
    console.log(`   - 修改文件: ${changedCount}`);
    console.log(`   - 备份位置: ${BACKUP_DIR}`);
    console.log(`\n👉 重启开发服务器: cd app/client && npm run dev`);
}

main();