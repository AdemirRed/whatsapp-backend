# Opções de Dockerfile para diferentes plataformas

## Como o Render escolhe qual Dockerfile usar:

### 1. Se você tem render.yaml:
- Usa o arquivo especificado em `dockerfilePath`
- Atualmente: `./Dockerfile.simple` (recomendado para Render)

### 2. Se não tem render.yaml:
- Usa `Dockerfile` (padrão)

### 3. Para outras plataformas:
- Railway: usa `Dockerfile` automaticamente
- Fly.io: usa o especificado em `fly.toml` (build.dockerfile)

## Arquivos disponíveis:

1. **Dockerfile** - Principal, Node 18, para uso geral
2. **Dockerfile.simple** - Otimizado para Render (recomendado)  
3. **Dockerfile.robust** - Versão com segurança extra

## Para mudar qual usar no Render:

### Opção A: Usar Dockerfile principal
Mude no render.yaml:
```yaml
dockerfilePath: ./Dockerfile
```

### Opção B: Usar Dockerfile.simple (atual)
Mantenha no render.yaml:
```yaml
dockerfilePath: ./Dockerfile.simple
```

### Opção C: Remover render.yaml
- Delete o arquivo render.yaml
- Configure tudo via dashboard do Render
- Usará `Dockerfile` automaticamente
