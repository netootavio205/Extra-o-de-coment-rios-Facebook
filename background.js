// Service Worker for Instagram Comments Backup Extension
// Handles communication between popup and content script

class BackgroundService {
  constructor() {
    this.setupMessageListeners();
    console.log('Serviço de Background inicializado');
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Mantém o canal aberto para resposta assíncrona
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      let tabId = sender.tab?.id;
      if (!tabId) {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tabId = tabs[0]?.id;
        if (!tabId) {
          const allTabs = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = allTabs[0]?.id;
        }
      }

      switch (message.action) {
        case 'checkPage':
          await this.handleCheckPage(tabId, sendResponse);
          break;
        case 'scanComments':
          await this.handleScanComments(tabId, message.data, sendResponse);
          break;
        case 'exportData':
          await this.handleExportData(message.data, sendResponse);
          break;
        case 'openReport':
          await this.handleOpenReport(message.data, sendResponse);
          break;
        default:
          sendResponse({ success: false, error: 'Ação desconhecida' });
      }
    } catch (error) {
      console.error('Erro no serviço de background:', error);
      sendResponse({ success: false, error: error.message });
    }
  }


  async getMediaInfo(shortcode) {
    // Tenta obter informações completas do post usando técnica de spoofing e APIs alternativas
    console.log(`Buscando info de mídia para ${shortcode}...`);
    
    // Hash para informações detalhadas de mídia (post info)
    const mediaQueryHash = 'b3055c01b4b222b8a47dc18dc3a652c7';
    const variables = JSON.stringify({ shortcode: shortcode, child_comment_count: 3 });
    const url = `https://www.instagram.com/graphql/query/?query_hash=${mediaQueryHash}&variables=${encodeURIComponent(variables)}`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        }
      });
      
      if (!response.ok) throw new Error('API do Instagram falhou');
      
      const json = await response.json();
      const media = json.data?.shortcode_media;
      
      if (media) {
        return {
          displayUrl: media.display_url || (media.display_resources && media.display_resources[media.display_resources.length - 1]?.src),
          isVideo: media.is_video,
          videoUrl: media.video_url,
          caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || '',
          owner: media.owner?.username
        };
      }
    } catch (e) {
      console.warn('Falha na descoberta GraphQL, tentando fallback...', e);
    }
    
    return null;
  }

  async handleCheckPage(tabId, sendResponse) {
    if (!tabId) {
      sendResponse({ success: false, error: 'Nenhuma aba ativa encontrada' });
      return;
    }
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'checkPage' });
      sendResponse(response);
    } catch (error) {
      sendResponse({ success: false, error: 'Content script não disponível. Recarregue a página.' });
    }
  }

  async handleScanComments(tabId, data, sendResponse) {
    if (!tabId) {
      sendResponse({ success: false, error: 'Aba não identificada' });
      return;
    }

    try {
      const pageInfo = await chrome.tabs.sendMessage(tabId, { action: 'checkPage' });
      if (!pageInfo.isValid || !pageInfo.shortcode) {
        throw new Error('Página inválida.');
      }

      const shortcode = pageInfo.shortcode;
      const limit = data.limit || 50;
      
      // Usamos as infos do Content Script (DOM) pois são as que o usuário está VENDO
      const mediaInfoFromDOM = await chrome.tabs.sendMessage(tabId, { action: 'extractMetadata' });
      
      const result = await this.fetchCommentsViaGraphQL(shortcode, limit, mediaInfoFromDOM);
      
      sendResponse({
        success: true,
        meta: {
          capturedAt: new Date().toISOString(),
          sourceUrl: pageInfo.url,
          capturedCommentCount: result.comments.length,
          requestedCommentLimit: limit,
          scanDuration: 0,
          scanStatus: 'complete'
        },
        comments: result.comments,
        post: {
          postId: shortcode,
          author: result.post?.owner || pageInfo.author || 'Instagram User',
          caption: result.post?.caption || 'Sem legenda',
          imageUrl: result.post?.base64Image || result.post?.displayUrl || ''
        }
      });
    } catch (error) {
      console.error('Erro no scan:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async fetchCommentsViaGraphQL(shortcode, targetLimit, initialMediaInfo = null) {
    const queryHash = '33ba35852cb50da46f5b5e889df7d159';
    let comments = [];
    let hasNextPage = true;
    let endCursor = '';
    let postMetadata = initialMediaInfo;

    // Se temos meta inicial mas não tem Base64, converte agora
    if (postMetadata && (postMetadata.imageUrl || postMetadata.displayUrl) && !postMetadata.base64Image) {
      const urlToConvert = postMetadata.imageUrl || postMetadata.displayUrl;
      postMetadata.base64Image = await this.imageToBase64(urlToConvert);
      postMetadata.displayUrl = urlToConvert; // Garante consistência interna
    }
    
    while (hasNextPage && comments.length < targetLimit) {
      const variables = JSON.stringify({
        shortcode: shortcode,
        first: 50,
        after: endCursor
      });
      
      const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(variables)}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        
        const json = await response.json();
        const media = json.data?.shortcode_media;
        if (!media) break;

        // Metadados do post (Imagem Thumbnail)
        if (!postMetadata) {
          postMetadata = {
            caption: media.edge_media_to_caption?.edges[0]?.node?.text || '',
            displayUrl: media.display_url || media.display_resources?.[0]?.src,
            owner: media.owner?.username || media.owner?.full_name
          };
          
          // Se for carrossel, pega a primeira imagem se o topo falhar
          if (!postMetadata.displayUrl && media.edge_sidecar_to_children?.edges?.[0]?.node) {
            const firstChild = media.edge_sidecar_to_children.edges[0].node;
            postMetadata.displayUrl = firstChild.display_url || firstChild.display_resources?.[0]?.src;
          }

          if (postMetadata.displayUrl) {
            console.log('Convertendo miniatura do post...');
            postMetadata.base64Image = await this.imageToBase64(postMetadata.displayUrl);
          }
        }

        const edgeComments = media.edge_media_to_comment || media.edge_threaded_comments;
        if (!edgeComments) break;

        const edges = edgeComments.edges || [];
        const batchPromises = edges.map(async (edge) => {
          if (comments.length >= targetLimit) return null;
          
          const node = edge.node;
          const avatarUrl = node.owner?.profile_pic_url;
          let base64Avatar = null;
          
          if (avatarUrl && comments.length < 100) { // Limit Base64 conversion for performance
             base64Avatar = await this.imageToBase64(avatarUrl);
          }

          const commentObj = {
            id: node.id,
            username: node.owner?.username,
            text: node.text,
            timestamp: node.created_at,
            likes: node.edge_liked_by?.count || 0,
            avatarUrl: avatarUrl,
            base64Avatar: base64Avatar
          };
          comments.push(commentObj);
          return commentObj;
        });

        await Promise.all(batchPromises);

        hasNextPage = edgeComments.page_info?.has_next_page && comments.length < targetLimit;
        endCursor = edgeComments.page_info?.end_cursor;

        if (!hasNextPage || !endCursor) break;
        await new Promise(r => setTimeout(r, 600));
        
      } catch (error) {
        console.error('Fetch error:', error);
        break;
      }
    }
    
    return { comments, post: postMetadata };
  }

  async imageToBase64(url) {
    if (!url) return null;
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:${response.headers.get('content-type')};base64,${btoa(binary)}`;
    } catch (e) {
      console.warn('Base64 conversion failed', e);
      return url;
    }
  }

  async handleExportData(data, sendResponse) {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
      const dataUrl = `data:application/json;base64,${base64Data}`;
      await chrome.downloads.download({
        url: dataUrl,
        filename: `instagram-backup-${Date.now()}.json`,
        saveAs: true
      });
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleOpenReport(data, sendResponse) {
    try {
      const reportId = Date.now().toString();
      await chrome.storage.local.set({ [`report_${reportId}`]: data });
      const url = chrome.runtime.getURL(`report.html?id=${reportId}`);
      await chrome.tabs.create({ url });
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
}

new BackgroundService();
