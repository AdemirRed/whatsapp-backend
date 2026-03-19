/**
 * patch.js
 * Aplica patches necessários nos arquivos do whatsapp-web.js após npm install.
 * Executado automaticamente via postinstall em package.json.
 */
'use strict';

const fs = require('fs');

const patches = [
  {
    file: './node_modules/whatsapp-web.js/src/structures/Channel.js',
    description: 'Channel.js: safe access to channelMetadata.description',
    find: 'data.channelMetadata.description',
    replace: 'data.channelMetadata?.description',
  },
  {
    file: './node_modules/whatsapp-web.js/src/util/Injected/Utils.js',
    description: 'Utils.js: wrap addNewsletterMsgsRecords em try-catch para evitar erro reading add',
    find: '            await window.Store.SendChannelMessage.addNewsletterMsgsRecords([msgDataFromMsgModel]);\n            chat.msgs?.add(msg);\n            chat.t = msg.t;',
    replace: '            try {\n                await window.Store.SendChannelMessage.addNewsletterMsgsRecords([msgDataFromMsgModel]);\n                chat.msgs?.add(msg);\n            } catch (e) {\n                // Ignorar erros de cache local — não afeta o envio real para o canal\n            }\n            chat.t = msg.t;',
  },
];

let allOk = true;

for (const patch of patches) {
  try {
    if (!fs.existsSync(patch.file)) {
      console.warn(`⚠️  ${patch.description} — arquivo não encontrado: ${patch.file}`);
      continue;
    }

    let content = fs.readFileSync(patch.file, 'utf8');

    if (content.includes(patch.replace)) {
      console.log(`✅ Já com patch: ${patch.description}`);
      continue;
    }

    if (!content.includes(patch.find)) {
      console.warn(`⚠️  Patch não aplicável (string não encontrada): ${patch.description}`);
      continue;
    }

    content = content.replace(patch.find, patch.replace);
    fs.writeFileSync(patch.file, content, 'utf8');
    console.log(`✅ Patch aplicado: ${patch.description}`);
  } catch (err) {
    console.error(`❌ Erro ao aplicar patch "${patch.description}": ${err.message}`);
    allOk = false;
  }
}

process.exit(allOk ? 0 : 1);
