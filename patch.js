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
  // Caso 1: source original do npm (sem optional chaining)
  {
    file: './node_modules/whatsapp-web.js/src/util/Injected/Utils.js',
    description: 'Utils.js: wrap addNewsletterMsgsRecords em try-catch (source original)',
    find: '            await window.Store.SendChannelMessage.addNewsletterMsgsRecords([msgDataFromMsgModel]);\n            chat.msgs.add(msg);\n            chat.t = msg.t;',
    replace: '            try {\n                await window.Store.SendChannelMessage.addNewsletterMsgsRecords([msgDataFromMsgModel]);\n                chat.msgs?.add(msg);\n            } catch (_patchErr) {\n                // patched: ignore local cache errors for channels\n            }\n            chat.t = msg.t;',
  },
  // Caso 2: source com optional chaining (patch antigo parcial)
  {
    file: './node_modules/whatsapp-web.js/src/util/Injected/Utils.js',
    description: 'Utils.js: wrap addNewsletterMsgsRecords em try-catch (com optional chaining)',
    find: '            await window.Store.SendChannelMessage.addNewsletterMsgsRecords([msgDataFromMsgModel]);\n            chat.msgs?.add(msg);\n            chat.t = msg.t;',
    replace: '            try {\n                await window.Store.SendChannelMessage.addNewsletterMsgsRecords([msgDataFromMsgModel]);\n                chat.msgs?.add(msg);\n            } catch (_patchErr) {\n                // patched: ignore local cache errors for channels\n            }\n            chat.t = msg.t;',
  },
  // Bug da lib: Client.deleteChannel usa this.client.pupPage em vez de this.pupPage
  {
    file: './node_modules/whatsapp-web.js/src/Client.js',
    description: 'Client.js: fix deleteChannel - this.client.pupPage -> this.pupPage',
    find: '    async deleteChannel(channelId) {\n        return await this.client.pupPage.evaluate',
    replace: '    async deleteChannel(channelId) {\n        return await this.pupPage.evaluate',
  },
  // Bug: requestProfilePicFromServer e profilePicFind falham em WA 2.3000.x.
  // Usa ProfilePicThumb.find que funciona em todas as versões modernas.
  {
    file: './node_modules/whatsapp-web.js/src/Client.js',
    description: 'Client.js: usar ProfilePicThumb.find em getProfilePicUrl (resolve TypeError isNewsletter e profilePicFind not a function)',
    find: `    async getProfilePicUrl(contactId) {
        const profilePic = await this.pupPage.evaluate(async contactId => {
            try {
                const chatWid = window.Store.WidFactory.createWid(contactId);
                return window.compareWwebVersions(window.Debug.VERSION, '<', '2.3000.0')
                    ? await window.Store.ProfilePic.profilePicFind(chatWid)
                    : await window.Store.ProfilePic.requestProfilePicFromServer(chatWid);
            } catch (err) {
                if(err.name === 'ServerStatusCodeError') return undefined;
                throw err;
            }
        }, contactId);

        return profilePic ? profilePic.eurl : undefined;
    }`,
    replace: `    async getProfilePicUrl(contactId) {
        const profilePic = await this.pupPage.evaluate(async contactId => {
            try {
                const chatWid = window.Store.WidFactory.createWid(contactId);
                const thumb = await window.Store.ProfilePicThumb.find(chatWid);
                return thumb || undefined;
            } catch (err) {
                return undefined;
            }
        }, contactId);

        return profilePic ? (profilePic.eurl || profilePic.img || undefined) : undefined;
    }`,
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
