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
  // WA Web 2.3000 (jul/2026) renomeou id._serialized -> id.$1: downloadMedia/getMessageById quebram com "r: r".
  // Ver wwebjs/whatsapp-web.js#201833. Preenche _serialized a partir de $1 quando faltar.
  {
    file: './node_modules/whatsapp-web.js/src/structures/Message.js',
    description: 'Message.js: backfill id._serialized a partir de id.$1 (WA 2.3000)',
    find: '        this.id = data.id;\n',
    replace: '        this.id = (data.id && data.id._serialized == null && data.id.$1 != null) ? Object.assign({}, data.id, { _serialized: data.id.$1 }) : data.id;\n',
  },
  // WA Web 2.3000: downloadMedia() da 1.34.7 falha com "t: t". Usa o caminho do upstream
  // (wwebjs/whatsapp-web.js#201697, resolveMediaBlob inline) com fallback para o antigo.
  {
    file: './node_modules/whatsapp-web.js/src/structures/Message.js',
    description: 'Message.js: downloadMedia via InMemoryMediaBlobCache (wwebjs#201697)',
    find: "            if (msg.mediaData.mediaStage != 'RESOLVED') {\n                // try to resolve media\n                await msg.downloadMedia({\n                    downloadEvenIfExpensive: true,\n                    rmrReason: 1,\n                });\n            }\n\n            if (\n                msg.mediaData.mediaStage.includes('ERROR') ||\n                msg.mediaData.mediaStage === 'FETCHING'\n            ) {\n                // media could not be downloaded\n                return undefined;\n            }\n\n            try {\n                const mockQpl = {\n                    addAnnotations: function () {\n                        return this;\n                    },\n                    addPoint: function () {\n                        return this;\n                    },\n                };\n                const decryptedMedia = await window\n                    .require('WAWebDownloadManager')\n                    .downloadManager.downloadAndMaybeDecrypt({\n                        directPath: msg.directPath,\n                        encFilehash: msg.encFilehash,\n                        filehash: msg.filehash,\n                        mediaKey: msg.mediaKey,\n                        mediaKeyTimestamp: msg.mediaKeyTimestamp,\n                        type: msg.type,\n                        signal: new AbortController().signal,\n                        downloadQpl: mockQpl,\n                    });\n\n                const data =\n                    await window.WWebJS.arrayBufferToBase64Async(\n                        decryptedMedia,\n                    );\n\n                return {\n                    data,\n                    mimetype: msg.mimetype,\n                    filename: msg.filename,\n                    filesize: msg.size,\n                };\n            } catch (e) {\n                if (e.status && e.status === 404) return undefined;\n                throw e;\n            }\n",
    replace: "            // patched (wwebjs#201697): sempre pede o download interno e le o blob do cache do WA,\n            // em vez de downloadAndMaybeDecrypt, que quebra no WA Web 2.3000 (\"t: t\" / \"r: r\").\n            await msg.downloadMedia({\n                downloadEvenIfExpensive: true,\n                rmrReason: 1,\n                isUserInitiated: true,\n            });\n\n            if (\n                msg.mediaData.mediaStage.includes('ERROR') ||\n                msg.mediaData.mediaStage === 'FETCHING'\n            ) {\n                // media could not be downloaded\n                return undefined;\n            }\n\n            let blob = null;\n            try {\n                blob = window\n                    .require('WAWebMediaInMemoryBlobCache')\n                    .InMemoryMediaBlobCache.get(msg.mediaObject?.filehash) || null;\n            } catch (_e) { blob = null; }\n            if (!blob && msg.mediaObject?.mediaBlob) {\n                blob = msg.mediaObject.mediaBlob.forceToBlob();\n            }\n\n            try {\n                let buffer;\n                if (blob) {\n                    buffer = await blob.arrayBuffer();\n                } else {\n                    const mockQpl = {\n                        addAnnotations: function () {\n                            return this;\n                        },\n                        addPoint: function () {\n                            return this;\n                        },\n                    };\n                    buffer = await window\n                        .require('WAWebDownloadManager')\n                        .downloadManager.downloadAndMaybeDecrypt({\n                            directPath: msg.directPath,\n                            encFilehash: msg.encFilehash,\n                            filehash: msg.filehash,\n                            mediaKey: msg.mediaKey,\n                            mediaKeyTimestamp: msg.mediaKeyTimestamp,\n                            type: msg.type,\n                            signal: new AbortController().signal,\n                            downloadQpl: mockQpl,\n                        });\n                }\n\n                const data =\n                    await window.WWebJS.arrayBufferToBase64Async(buffer);\n\n                return {\n                    data,\n                    mimetype: msg.mimetype,\n                    filename: msg.filename,\n                    filesize: msg.size,\n                };\n            } catch (e) {\n                if (e.status && e.status === 404) return undefined;\n                throw e;\n            }\n",
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
