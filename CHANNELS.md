# Guia de Canais do WhatsApp

Todas as rotas usam o header `x-api-key` e o `channelId` sempre termina em `@newsletter` (ex: `123456789@newsletter`).

---

## 1. Listar meus canais
```http
GET /channel/getChannels/{sessionId}
```
Retorna `id._serialized` (o `channelId` para usar nas demais chamadas), `name`, `description`, `unreadCount`, `isMuted`.

---

## 2. Enviar mensagem de texto
```http
POST /channel/sendMessage/{sessionId}
Content-Type: application/json

{
  "channelId": "123456789@newsletter",
  "content": "Texto da publicação"
}
```

## 3. Enviar imagem / mídia
```http
POST /channel/sendMessage/{sessionId}
Content-Type: application/json

{
  "channelId": "123456789@newsletter",
  "mediaBase64": "data:image/jpeg;base64,...",
  "caption": "Legenda opcional",
  "filename": "imagem.jpg"
}
```

---

## 4. Buscar histórico de publicações
```http
POST /channel/fetchMessages/{sessionId}
Content-Type: application/json

{
  "channelId": "123456789@newsletter",
  "limit": 20,
  "fromMe": true
}
```

---

## 5. Criar canal
```http
POST /channel/createChannel/{sessionId}
Content-Type: application/json

{
  "title": "Nome do canal",
  "description": "Descrição opcional",
  "pictureBase64": "data:image/jpeg;base64,..."
}
```
Resposta inclui `channelId` (`nid._serialized`) e `inviteLink`.

---

## 6. Deletar canal
```http
POST /channel/deleteChannel/{sessionId}
Content-Type: application/json

{ "channelId": "123456789@newsletter" }
```

---

## 7. Buscar canal por link de convite
```http
POST /channel/getChannelByInviteCode/{sessionId}
Content-Type: application/json

{ "inviteCode": "AbCdEfGhIjKlMnOp" }
```
O `inviteCode` é a parte final de `https://whatsapp.com/channel/AbCdEfGhIjKlMnOp`.

---

## 8. Pesquisar canais
```http
POST /channel/searchChannels/{sessionId}
Content-Type: application/json

{
  "searchText": "notícias",
  "limit": 10,
  "view": 0,
  "countryCodes": ["BR"],
  "skipSubscribedNewsletters": false
}
```
`view`: `0`=Recomendados, `1`=Trending, `2`=Populares, `3`=Novos

---

## 9. Inscrever / cancelar inscrição
```http
POST /channel/subscribeToChannel/{sessionId}
{ "channelId": "123456789@newsletter" }

POST /channel/unsubscribeFromChannel/{sessionId}
{ "channelId": "123456789@newsletter", "deleteLocalModels": false }
```

---

## 10. Editar canal

### Renomear
```http
POST /channel/setSubject/{sessionId}
{ "channelId": "123456789@newsletter", "subject": "Novo nome" }
```

### Atualizar descrição
```http
POST /channel/setDescription/{sessionId}
{ "channelId": "123456789@newsletter", "description": "Nova descrição" }
```

### Atualizar foto de perfil
```http
POST /channel/setProfilePicture/{sessionId}
{ "channelId": "123456789@newsletter", "pictureBase64": "data:image/jpeg;base64,..." }
```

### Configurar reações permitidas
```http
POST /channel/setReactionSetting/{sessionId}
{ "channelId": "123456789@newsletter", "reactionCode": 1 }
```
`reactionCode`: `0`=Nenhuma, `1`=Básica (👍❤️😂😮😢🙏), `2`=Todas

---

## 11. Notificações
```http
POST /channel/mute/{sessionId}
{ "channelId": "123456789@newsletter" }

POST /channel/unmute/{sessionId}
{ "channelId": "123456789@newsletter" }
```

---

## 12. Assinantes
```http
POST /channel/getSubscribers/{sessionId}
{ "channelId": "123456789@newsletter", "limit": 50 }
```
Retorna apenas assinantes que estão na sua lista de contatos.

---

## 13. Administração

### Enviar convite de admin
```http
POST /channel/sendChannelAdminInvite/{sessionId}
{
  "channelId": "123456789@newsletter",
  "chatId": "555197756708@c.us",
  "comment": "Convite para ser admin"
}
```

### Aceitar convite de admin
```http
POST /channel/acceptChannelAdminInvite/{sessionId}
{ "channelId": "123456789@newsletter" }
```

### Revogar convite de admin
```http
POST /channel/revokeChannelAdminInvite/{sessionId}
{ "channelId": "123456789@newsletter", "userId": "555197756708@c.us" }
```

### Rebaixar admin
```http
POST /channel/demoteChannelAdmin/{sessionId}
{ "channelId": "123456789@newsletter", "userId": "555197756708@c.us" }
```

### Transferir propriedade
```http
POST /channel/transferChannelOwnership/{sessionId}
{
  "channelId": "123456789@newsletter",
  "newOwnerId": "555197756708@c.us",
  "shouldDismissSelfAsAdmin": false
}
```
> O usuário destino precisa ser admin do canal antes da transferência.

---

## Fluxo típico para LLM publicar conteúdo

```
1. GET  /channel/getChannels       → descobre o channelId pelo nome
2. POST /channel/sendMessage       → publica o conteúdo
3. POST /channel/fetchMessages     → confirma que foi publicado
```
