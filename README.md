# Instagram Comments Backup Extension

Uma extensão profissional para Google Chrome e Microsoft Edge que permite extrair, exportar e imprimir comentários de posts do Instagram.

## 🚀 Funcionalidades

- **Escaneamento inteligente**: Captura comentários de posts do Instagram automaticamente
- **Exportação JSON**: Gera arquivos JSON estruturados com todos os dados
- **Relatórios imprimíveis**: Cria relatórios profissionais prontos para impressão
- **Interface intuitiva**: Popup moderno e fácil de usar
- **Segurança total**: Funciona 100% local, sem enviar dados para servidores

## 📋 Estrutura do Projeto

```
instagram-comments-backup/
├── manifest.json          # Configuração da extensão (Manifest V3)
├── background.js          # Service worker principal
├── content.js            # Script para interação com DOM do Instagram
├── popup.html            # Interface popup
├── popup.css             # Estilos do popup
├── popup.js              # Lógica do popup
├── report.html           # Página de relatório imprimível
├── report.css            # Estilos do relatório
├── report.js             # Lógica do relatório
├── icons/                # Ícones da extensão
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # Este arquivo
```

## 🔧 Instalação

### Para Desenvolvedores

1. Clone ou baixe este repositório
2. Abra o Chrome e vá para `chrome://extensions/`
3. Ative o "Modo do desenvolvedor"
4. Clique em "Carregar sem compactação"
5. Selecione a pasta do projeto
6. A extensão estará disponível na barra de ferramentas

### Para Microsoft Edge

1. Abra o Edge e vá para `edge://extensions/`
2. Ative o "Modo do desenvolvedor"
3. Clique em "Carregar descompactada"
4. Selecione a pasta do projeto

## 📖 Como Usar

1. **Abra um post do Instagram** no navegador
2. **Clique no ícone** da extensão na barra de ferramentas
3. **Escolha a quantidade** de comentários que deseja capturar
4. **Clique em "Scan Comments"** para iniciar o escaneamento
5. **Aguarde o processo** de captura automática
6. **Exporte os dados** em JSON ou gere um relatório imprimível

## 🛠️ Tecnologias Utilizadas

- **Manifest V3**: Padrão mais recente de extensões Chrome
- **Vanilla JavaScript**: Sem dependências externas
- **CSS3 Moderno**: Design responsivo e animações suaves
- **Chrome Extensions API**: Integração nativa com navegadores
- **DOM Manipulation**: Extração inteligente de dados

## 📊 Estrutura de Dados

### Metadados
```json
{
  "meta": {
    "capturedAt": "2026-03-20T10:30:00-03:00",
    "sourceUrl": "https://www.instagram.com/p/XXXX/",
    "browser": "chrome",
    "extensionVersion": "1.0.0",
    "scanStatus": "complete",
    "requestedCommentLimit": 100,
    "capturedCommentCount": 87,
    "scanDuration": 3500
  }
}
```

### Dados do Post
```json
{
  "post": {
    "postId": "XXXX",
    "author": "@perfil",
    "imageUrl": "https://...",
    "caption": "Legenda do post"
  }
}
```

### Comentários
```json
{
  "comments": [
    {
      "id": "comment-1",
      "username": "@usuario",
      "displayName": "Usuário",
      "avatarUrl": "https://...",
      "text": "Comentário...",
      "likes": 12,
      "timestampText": "2 h",
      "replies": []
    }
  ]
}
```

## 🔒 Segurança e Privacidade

- ✅ **100% Local**: Nenhum dado é enviado para servidores externos
- ✅ **Sem Telemetria**: Não coleta informações de uso
- ✅ **Sem APIs Externas**: Funciona apenas com dados visíveis na página
- ✅ **Código Aberto**: Totalmente transparente e auditável
- ✅ **Permissões Mínimas**: Solicita apenas o essencial

## 🌐 Compatibilidade

- ✅ Google Chrome (versões recentes)
- ✅ Microsoft Edge (versões recentes)
- ✅ Instagram Web (instagram.com)
- ✅ Windows, macOS, Linux

## 🎯 Recursos Principais

### Escaneamento Inteligente
- Detecção automática de posts válidos
- Expansão automática de comentários
- Captura de replies quando disponíveis
- Tratamento de erros robusto

### Interface Profissional
- Design moderno e intuitivo
- Feedback visual em tempo real
- Indicadores de progresso
- Prévia dos resultados

### Exportação Flexível
- JSON estruturado e legível
- Relatórios HTML imprimíveis
- Metadados completos
- Formatação profissional

## 🐛 Solução de Problemas

### Extensão não funciona
1. Verifique se está em um post do Instagram (URL deve conter `/p/`)
2. Recarregue a página e tente novamente
3. Verifique se a extensão está ativada

### Comentários não são capturados
1. Aguarde a página carregar completamente
2. Verifique se os comentários estão visíveis
3. Tente reduzir o limite de comentários

### Erro ao exportar
1. Verifique as permissões da extensão
2. Tente usar um navegador diferente
3. Verifique o console para erros

## 🔄 Atualizações Futuras

- [ ] Suporte para múltiplos idiomas
- [ ] Filtros avançados de comentários
- [ ] Análise de sentimentos
- [ ] Exportação para CSV/Excel
- [ ] Backup automático
- [ ] Interface de configurações

## 📝 Licença

Este projeto é开源 e pode ser utilizado livremente. Mantenha os créditos ao redistribuir.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:
1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Abra um Pull Request

## 📞 Suporte

Para suporte ou sugestões:
- Abra uma issue no repositório
- Envie um e-mail para a equipe de desenvolvimento

---

**Desenvolvido com ❤️ para a comunidade Instagram**
