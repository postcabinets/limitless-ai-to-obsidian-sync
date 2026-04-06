#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const LIMITLESS_API_KEY = process.env.LIMITLESS_API_KEY;
const VAULT_REPO_PATH = process.env.VAULT_REPO_PATH || './vault';
const VAULT_URL = process.env.VAULT_URL || 'https://github.com/postcabinets/obsidian-vault.git';

async function fetchLimitlessData(date) {
  const timezone = 'Asia/Tokyo';
  const lifelogsUrl = `https://api.limitless.ai/v1/lifelogs?date=${date}&timezone=${timezone}&limit=10&includeContents=true`;
  const chatsUrl = `https://api.limitless.ai/v1/chats?limit=100&timezone=${timezone}`;

  console.log(`📡 Fetching Limitless AI data for ${date}...`);

  try {
    const lifelogsRes = await fetch(lifelogsUrl, {
      headers: { 'X-API-Key': LIMITLESS_API_KEY }
    });
    const lifelogsData = await lifelogsRes.json();

    const chatsRes = await fetch(chatsUrl, {
      headers: { 'X-API-Key': LIMITLESS_API_KEY }
    });
    const chatsData = await chatsRes.json();

    console.log(`✅ Fetched ${lifelogsData.data?.lifelogs?.length || 0} lifelogs`);
    console.log(`✅ Fetched ${chatsData.data?.chats?.length || 0} chats`);

    return { lifelogs: lifelogsData.data?.lifelogs || [], chats: chatsData.data?.chats || [] };
  } catch (error) {
    console.error('❌ Error fetching Limitless AI data:', error.message);
    return { lifelogs: [], chats: [] };
  }
}

function generateMarkdown(lifelogs, chats, date) {
  let markdown = `---
type: limitless-capture
date: ${date}
session: pendant-sync-${date}
duration: ${lifelogs.reduce((sum, l) => sum + (l.endTime && l.startTime ? 1 : 0), 0)}
source: limitless-ai-pendant
filtered: false
participants: []
---

# Limitless AI キャプチャ（${date}）

## 記録内容\n\n`;

  // Lifelogs セクション
  if (lifelogs.length > 0) {
    markdown += `### Pendant 記録\n\n`;
    lifelogs.forEach((lifelog, i) => {
      const title = lifelog.title || `Session ${i + 1}`;
      const startTime = new Date(lifelog.startTime).toLocaleTimeString('ja-JP');
      const endTime = new Date(lifelog.endTime).toLocaleTimeString('ja-JP');

      markdown += `#### ${i + 1}. ${title}\n`;
      markdown += `**時間:** ${startTime} - ${endTime}\n\n`;

      if (lifelog.markdown) {
        markdown += lifelog.markdown + '\n\n';
      }

      if (lifelog.contents && lifelog.contents.length > 0) {
        lifelog.contents.forEach(content => {
          if (content.speakerName) {
            markdown += `**${content.speakerName}:** ${content.content}\n\n`;
          } else if (content.type === 'heading1') {
            markdown += `## ${content.content}\n\n`;
          } else if (content.type === 'heading2') {
            markdown += `### ${content.content}\n\n`;
          } else {
            markdown += `${content.content}\n\n`;
          }
        });
      }

      markdown += '---\n\n';
    });
  }

  // Chats セクション
  if (chats.length > 0) {
    markdown += `## Ask AI チャット\n\n`;
    chats.forEach((chat, i) => {
      markdown += `### チャット ${i + 1}: ${chat.summary || 'Q&A'}\n`;
      markdown += `**作成:** ${new Date(chat.createdAt).toLocaleString('ja-JP')}\n\n`;

      if (chat.messages && chat.messages.length > 0) {
        chat.messages.forEach(msg => {
          if (msg.user?.role === 'user') {
            markdown += `**Q:** ${msg.text}\n\n`;
          } else {
            markdown += `**A:** ${msg.text}\n\n`;
          }
        });
      }

      markdown += '\n';
    });
  }

  if (lifelogs.length === 0 && chats.length === 0) {
    markdown += `（このセッションはデータがありません）\n`;
  }

  markdown += `\n---\n\n**キャプチャ時刻:** ${new Date().toISOString()}\n`;

  return markdown;
}

function ensureVaultStructure() {
  const dirs = [
    `${VAULT_REPO_PATH}/captures`,
    `${VAULT_REPO_PATH}/filtered/decisions`,
    `${VAULT_REPO_PATH}/filtered/insights`,
    `${VAULT_REPO_PATH}/filtered/reference/transcripts`
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
}

function saveCapture(markdown, date) {
  const capturesDir = path.join(VAULT_REPO_PATH, 'captures', date);
  fs.mkdirSync(capturesDir, { recursive: true });

  const fileName = `session-${date}.md`;
  const filePath = path.join(capturesDir, fileName);

  fs.writeFileSync(filePath, markdown);
  console.log(`✅ Saved: ${filePath}`);

  return filePath;
}

async function commitAndPush(message) {
  try {
    const cwd = VAULT_REPO_PATH;

    // Check if git is initialized
    if (!fs.existsSync(path.join(cwd, '.git'))) {
      console.log('📦 Initializing git repository...');
      execSync('git init', { cwd, stdio: 'inherit' });
      execSync('git config user.email "claude-code@openclaws.ai"', { cwd, stdio: 'inherit' });
      execSync('git config user.name "Claude Code"', { cwd, stdio: 'inherit' });
      execSync(`git remote add origin ${VAULT_URL}`, { cwd, stdio: 'inherit' });
    }

    console.log('📤 Committing changes...');
    execSync('git add -A', { cwd, stdio: 'inherit' });
    execSync(`git commit -m "${message}"`, { cwd, stdio: 'inherit' });

    console.log('📡 Pushing to GitHub...');
    execSync('git push -u origin main', { cwd, stdio: 'inherit' });

    console.log('✅ Pushed to GitHub');
  } catch (error) {
    console.error('⚠️  Git operation warning:', error.message);
    // Dont fail on git errors
  }
}

async function main() {
  if (!LIMITLESS_API_KEY) {
    console.error('❌ LIMITLESS_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Starting Limitless AI → Obsidian Sync');
  console.log(`   Vault: ${path.resolve(VAULT_REPO_PATH)}`);
  console.log(`   Limitless API: api.limitless.ai`);

  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  try {
    // Ensure vault structure exists
    ensureVaultStructure();

    // Fetch Limitless data
    const { lifelogs, chats } = await fetchLimitlessData(dateStr);

    // Generate Markdown
    const markdown = generateMarkdown(lifelogs, chats, dateStr);

    // Save capture
    const savedPath = saveCapture(markdown, dateStr);

    // Commit and push
    await commitAndPush(`feat: Add Limitless AI capture for ${dateStr}\n\nAutomated sync from Limitless Pendant`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Sync Complete');
    console.log(`   Lifelogs: ${lifelogs.length}`);
    console.log(`   Chats: ${chats.length}`);
    console.log(`   File: ${savedPath}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
