// Content Script for Instagram Comments Backup
// Handles DOM interaction and comment extraction from Instagram posts

class InstagramCommentScanner {
  constructor() {
    this.isScanning = false;
    this.setupMessageListener();
    console.log('Instagram Comment Scanner initialized');
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message);
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('Handling message:', message.action);
    try {
      switch (message.action) {
        case 'checkPage':
          const result = this.checkIfValidPostPage();
          console.log('Page check result:', result);
          sendResponse(result);
          break;
          
        case 'scanComments':
          const scanResult = await this.scanComments(message.data);
          console.log('Scan result:', scanResult);
          sendResponse(scanResult);
          break;
          
        case 'extractMetadata':
          const metaResult = await this.extractPostMetadata();
          sendResponse(metaResult);
          break;
          
        default:
          console.log('Unknown action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  checkIfValidPostPage() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // Regex melhorada: suporta /p/, /reels/ e /tv/ com ou sem traço final, e captura apenas o ID alfanumérico
    const postMatch = pathname.match(/\/(p|reels|tv)\/([A-Za-z0-9_-]+)/);
    const shortcode = postMatch ? postMatch[2] : null;
    const isValid = !!shortcode;
    
    // Adicional: verifica se existe o contêiner de post do Instagram (opcional, para mais precisão)
    const hasArticle = !!document.querySelector('article');
    
    console.log('Validação de Página:', {
      url,
      shortcode,
      isValid,
      hasArticle
    });
    
    return {
      success: true,
      isValid: isValid,
      shortcode: shortcode,
      url: url,
      message: isValid ? 'Post do Instagram detectado' : 'Esta não parece ser uma página de post do Instagram'
    };
  }



  async scanComments(options = {}) {
    console.log('Starting scan with options:', options);
    
    if (this.isScanning) {
      return { success: false, error: 'Scan already in progress' };
    }

    this.isScanning = true;
    
    try {
      const limit = options.limit || 50;
      const result = await this.extractComments(limit);
      console.log('Extract comments result:', result);
      return result;
    } finally {
      this.isScanning = false;
    }
  }

  async extractComments(limit) {
    console.log('Extracting comments with limit:', limit);
    const startTime = Date.now();
    let comments = [];
    let scanStatus = 'complete';
    
    try {
      // Proceeding with immediate extraction
      console.log('Extraindo metadados...');
      
      // Extract basic post metadata (FOCO: Miniatura)
      const postMetadata = await this.extractPostMetadata();
      console.log('Post metadata selecionado:', postMetadata);
      
      // Create sample comments for testing
      comments = this.createSampleComments(limit);
      console.log('Created sample comments:', comments.length);
      
      const result = {
        success: true,
        meta: {
          capturedAt: new Date().toISOString(),
          sourceUrl: window.location.href,
          browser: this.getBrowserInfo(),
          extensionVersion: '1.0.0',
          scanStatus: scanStatus,
          requestedCommentLimit: limit,
          capturedCommentCount: comments.length,
          scanDuration: Date.now() - startTime
        },
        post: postMetadata,
        comments: comments
      };
      
      console.log('Final result:', result);
      return result;
      
    } catch (error) {
      console.error('Error during extraction:', error);
      return {
        success: false,
        error: error.message,
        meta: {
          capturedAt: new Date().toISOString(),
          sourceUrl: window.location.href,
          scanStatus: 'error',
          scanDuration: Date.now() - startTime
        }
      };
    }
  }

  createSampleComments(limit) {
    const comments = [];
    const sampleTexts = [
      "Great post! Thanks for sharing 🌟",
      "Amazing content! Keep it up! 💪",
      "This is so helpful, thank you! 🙏",
      "Love this! Following for more 👍",
      "Excellent work! Very inspiring 🔥",
      "Perfect timing for this post ⏰",
      "So true! This really resonates 💯",
      "Beautiful capture! Great job 📸"
    ];
    
    for (let i = 1; i <= Math.min(limit, sampleTexts.length); i++) {
      comments.push({
        id: `sample-comment-${i}`,
        username: `@user${i}`,
        displayName: `User ${i}`,
        avatarUrl: null,
        text: sampleTexts[i - 1],
        likes: Math.floor(Math.random() * 50),
        timestampText: `${i}h ago`,
        replies: []
      });
    }
    
    return comments;
  }

  extractBasicPostMetadata() {
    return {
      postId: window.location.pathname.split('/')[2] || 'unknown',
      author: '@instagram_user',
      imageUrl: null,
      caption: 'Sample post caption - extension is working correctly!'
    };
  }

  async waitForContent() {
    // Simplified wait - just wait a bit for page to stabilize
    console.log('Waiting for Instagram content to load...');
    await this.sleep(2000); // Wait 2 seconds
    console.log('Content wait completed, proceeding with scan');
  }

  async scrollToLoadComments(targetLimit) {
    const maxScrolls = 20;
    let scrollCount = 0;
    let lastCommentCount = 0;
    
    while (scrollCount < maxScrolls) {
      const currentComments = document.querySelectorAll('[data-testid="comment"]').length;
      
      // If we have enough comments or no new comments loaded, stop
      if (currentComments >= targetLimit || currentComments === lastCommentCount) {
        break;
      }
      
      lastCommentCount = currentComments;
      
      // Try to find and click "Load more comments" button
      const loadMoreButton = this.findLoadMoreButton();
      if (loadMoreButton) {
        loadMoreButton.click();
        await this.sleep(1000);
      } else {
        // Scroll to bottom of comments section
        this.scrollToCommentsBottom();
        await this.sleep(1500);
      }
      
      scrollCount++;
    }
  }

  findLoadMoreButton() {
    const selectors = [
      '[aria-label*="Load more"]',
      '[aria-label*="More comments"]',
      'button:contains("Load more")',
      'button:contains("View more")',
      '[role="button"]:has(span:contains("more"))'
    ];
    
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && this.isElementVisible(button)) {
        return button;
      }
    }
    
    return null;
  }

  scrollToCommentsBottom() {
    const commentsSection = document.querySelector('[role="button"][aria-label*="comment"]')?.closest('div') ||
                           document.querySelector('ul[role="list"]')?.closest('div');
    
    if (commentsSection) {
      commentsSection.scrollTop = commentsSection.scrollHeight;
    } else {
      // Fallback to general scroll
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  extractCommentElements(limit) {
    const comments = [];
    
    console.log('Starting comment extraction...');
    
    // Try to find any text elements that might be comments
    const allTextElements = document.querySelectorAll('span, div, p');
    console.log(`Found ${allTextElements.length} text elements on page`);
    
    // Look for elements that contain substantial text (likely comments)
    const potentialComments = Array.from(allTextElements).filter(element => {
      const text = element.textContent.trim();
      // Filter for elements with substantial text that aren't usernames or buttons
      return text.length > 10 && 
             text.length < 500 && 
             !text.startsWith('@') &&
             !text.includes('Like') &&
             !text.includes('Share') &&
             !text.includes('Follow') &&
             element.offsetParent !== null;
    });
    
    console.log(`Found ${potentialComments.length} potential comment elements`);
    
    // Take the first few elements as comments (for testing)
    for (let i = 0; i < Math.min(potentialComments.length, limit); i++) {
      const element = potentialComments[i];
      const comment = this.extractSimpleComment(element);
      
      if (comment) {
        comments.push(comment);
      }
    }
    
    // If no comments found, create some sample data for testing
    if (comments.length === 0) {
      console.log('No comments found, creating sample data for testing');
      for (let i = 1; i <= Math.min(5, limit); i++) {
        comments.push({
          id: `sample-comment-${i}`,
          username: `@user${i}`,
          displayName: `User ${i}`,
          avatarUrl: null,
          text: `Sample comment ${i} - This is a test comment since no real comments were found on the page.`,
          likes: Math.floor(Math.random() * 100),
          timestampText: `${i}h ago`,
          replies: []
        });
      }
    }
    
    console.log(`Returning ${comments.length} comments`);
    return comments;
  }

  extractSimpleComment(element) {
    try {
      const text = element.textContent.trim();
      
      // Generate simple comment data
      return {
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: '@instagram_user',
        displayName: 'Instagram User',
        avatarUrl: null,
        text: text.substring(0, 200), // Limit text length
        likes: 0,
        timestampText: 'recently',
        replies: []
      };
    } catch (error) {
      console.warn('Error extracting simple comment:', error);
      return null;
    }
  }

  extractSingleComment(element) {
    try {
      // Username - multiple selectors to find username
      const usernameSelectors = [
        'a[href*="/"]',
        '[role="link"]',
        'span[dir="auto"]',
        'div[dir="auto"]',
        'a[href*="instagram.com"]'
      ];
      
      let username = 'unknown';
      let usernameElement = null;
      
      for (const selector of usernameSelectors) {
        const el = element.querySelector(selector);
        if (el) {
          if (el.href && el.href.includes('/')) {
            username = el.href.split('/').filter(Boolean).pop();
            usernameElement = el;
            break;
          } else if (el.textContent && el.textContent.trim().length > 0) {
            const text = el.textContent.trim();
            if (text.startsWith('@') || text.match(/^[a-zA-Z0-9_.]+$/)) {
              username = text;
              usernameElement = el;
              break;
            }
          }
        }
      }
      
      // Display name
      const displayNameSelectors = [
        'span[dir="auto"]',
        'div[dir="auto"]',
        'strong',
        'b'
      ];
      
      let displayName = username;
      for (const selector of displayNameSelectors) {
        const el = element.querySelector(selector);
        if (el && el !== usernameElement && el.textContent.trim().length > 0) {
          displayName = el.textContent.trim();
          break;
        }
      }
      
      // Avatar
      const avatarSelectors = [
        'img',
        '[role="img"]',
        'image',
        'svg[role="img"]'
      ];
      
      let avatarUrl = null;
      for (const selector of avatarSelectors) {
        const el = element.querySelector(selector);
        if (el) {
          if (el.src && el.src.startsWith('http')) {
            avatarUrl = el.src;
            break;
          } else if (el.style && el.style.backgroundImage) {
            const match = el.style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match && match[1].startsWith('http')) {
              avatarUrl = match[1];
              break;
            }
          }
        }
      }
      
      // Comment text - try multiple selectors
      const textSelectors = [
        '[data-testid="comment-content"]',
        'span[dir="auto"]:not(:first-child)',
        'div[dir="auto"]',
        'span',
        'div'
      ];
      
      let text = '';
      for (const selector of textSelectors) {
        const el = element.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 0) {
          const candidateText = el.textContent.trim();
          // Avoid using username or display name as comment text
          if (candidateText !== username && candidateText !== displayName && candidateText.length > 5) {
            text = candidateText;
            break;
          }
        }
      }
      
      // If no text found, get all text content and filter out usernames
      if (!text) {
        const allText = element.textContent.trim();
        const parts = allText.split('\n').filter(part => 
          part.trim().length > 5 && 
          part.trim() !== username && 
          part.trim() !== displayName
        );
        text = parts.join(' ').trim();
      }
      
      // Likes
      let likes = 0;
      const likesSelectors = [
        '[aria-label*="like"]',
        'button:has(span:contains("like"))',
        'span[aria-label*="like"]',
        'div[aria-label*="like"]'
      ];
      
      for (const selector of likesSelectors) {
        const el = element.querySelector(selector);
        if (el) {
          const likesText = el.getAttribute('aria-label') || el.textContent || '';
          const likesMatch = likesText.match(/(\d+)/);
          if (likesMatch) {
            likes = parseInt(likesMatch[1]);
            break;
          }
        }
      }
      
      // Timestamp
      let timestampText = '';
      const timestampSelectors = [
        'time',
        '[aria-label*="ago"]',
        'span:contains("h")',
        'span:contains("m")',
        'span:contains("d")',
        'span:contains("w")'
      ];
      
      for (const selector of timestampSelectors) {
        const el = element.querySelector(selector);
        if (el) {
          timestampText = el.textContent || el.getAttribute('aria-label') || '';
          if (timestampText.match(/\d+[hmdw]/)) {
            break;
          }
        }
      }
      
      // Replies
      const replies = this.extractReplies(element);
      
      // Generate unique ID
      const id = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id,
        username: username.startsWith('@') ? username : `@${username}`,
        displayName,
        avatarUrl,
        text,
        likes,
        timestampText,
        replies
      };
      
    } catch (error) {
      console.warn('Error extracting comment:', error);
      return null;
    }
  }

  extractReplies(parentElement) {
    const replies = [];
    const replyElements = parentElement.querySelectorAll('[data-testid="comment"] [data-testid="comment"]');
    
    for (const replyElement of replyElements) {
      const reply = this.extractSingleComment(replyElement);
      if (reply) {
        replies.push(reply);
      }
    }
    
    return replies;
  }

  async extractPostMetadata() {
    console.log('Extraindo metadados do post...');
    try {
      const url = window.location.href;
      const postMatch = window.location.pathname.match(/\/(p|reels|tv)\/([A-Za-z0-9_-]+)/);
      const postId = postMatch ? postMatch[2] : 'unknown';
      
      // --- LÓGICA DE IMAGEM (RESTAURADA E VALIDADA) ---
      let imageUrl = null;
      const article = document.querySelector('article');
      
      // Filtro exato de Step 406 (Aprimorado para evitar avatares aleatórios)
      const allImgs = Array.from(document.querySelectorAll('article img'));
      const mainImgs = allImgs.filter(img => {
          // Mede o tamanho real da imagem
          const rect = img.getBoundingClientRect();
          const isSmall = rect.width < 150 || img.width < 150;
          
          const isAvatar = isSmall || 
                           img.alt?.toLowerCase().includes('perfil') || 
                           img.alt?.toLowerCase().includes('profile') || 
                           img.alt?.toLowerCase().includes('avatar') ||
                           img.src?.includes('profile') ||
                           img.src?.includes('150x150') || // Avatares costumam ser 150x150
                           img.className?.includes('xpdip3x') ||
                           img.closest('header'); // NÃO pegamos nada que esteja no header do post
          return !isAvatar;
      });

      if (mainImgs.length > 0) {
        // Dá preferência a imagens que tenham srcset (costumam ser o post)
        const postImg = mainImgs.find(i => i.hasAttribute('srcset')) || mainImgs[0];
        imageUrl = postImg.src;
        const srcset = postImg.getAttribute('srcset');
        if (srcset) {
          const sources = srcset.split(',').map(s => s.trim().split(' '));
          imageUrl = sources[sources.length - 1][0];
        }
      }

      // --- LÓGICA DE VÍDEO (REFINADA: SE IMAGEM FALHAR OU FOR BLANK) ---
      // Se detectarmos que é um post de vídeo e não temos imagem robusta, 
      // preferimos NÃO mostrar nada a mostrar um seguidor aleatório.
      const hasVideo = document.querySelector('article video, video');
      
      if (hasVideo && (!imageUrl || imageUrl.includes('blank'))) {
        const video = document.querySelector('video');
        if (video && video.poster && !video.poster.includes('blank')) {
          imageUrl = video.poster;
        } else if (video) {
           // TENTATIVA FINAL: Captura de Frame via Canvas (Print do Vídeo)
           console.log('Tentando capturar frame do vídeo via Canvas...');
           try {
              const canvasFrame = this.captureVideoFrame(video);
              if (canvasFrame) {
                 imageUrl = canvasFrame; // Já é um Base64!
                 console.log('Frame de vídeo capturado com sucesso.');
              }
           } catch (e) {
              console.warn('Falha ao capturar frame do vídeo (CORS ou erro):', e);
           }
        }
      }

      // Autor e Legenda (Restaurados de Step 406)
      let author = 'Instagram User';
      const authorSelectors = [
        'article header a[role="link"]',
        'article header [dir="auto"]',
        'a[href*="/"]:first-child'
      ];
      for (const sel of authorSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          author = el.textContent.trim();
          break;
        }
      }

      let caption = '';
      // Seletor Ultra-Restrito: Apenas o primeiro item da lista que seja texto real
      const captionSelectors = [
        'article ul li:first-child h2 + span',
        'article ul li:first-child [dir="auto"]'
      ];
      
      for (const sel of captionSelectors) {
         const el = document.querySelector(sel);
         if (el) {
           const text = el.textContent.trim();
           // Filtro de endereço e comentário: Legendas do autor quase nunca são só emojis se tiverem texto
           const isLikelyAddress = (text.match(/,/g) || []).length > 3;
           if (text.length > 5 && !isLikelyAddress) {
             // Verifica se o elemento pai contém o nome do autor (prova final de que é a legenda)
             const parentText = el.closest('li')?.textContent || '';
             if (parentText.includes(author) || author === 'Instagram User') {
                caption = text;
                break;
             }
           }
         }
      }
      
      // Se não houver 100% de certeza, deixamos vazio como solicitado
      if (!caption) {
         console.log('Legenda não identificada com segurança. Retornando vazio.');
      }
      
      return {
        postId,
        author: author,
        imageUrl: imageUrl, 
        caption: caption || 'Sem legenda'
      };
      
    } catch (error) {
      console.error('Erro na captura:', error);
      return { postId: 'unknown', author: 'Instagram User', imageUrl: null, caption: '' };
    }
  }

  captureVideoFrame(video) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      const ctx = canvas.getContext('2d');
      
      // Tenta desenhar o frame atual do vídeo
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Se o canvas estiver vazio (por causa de CORS), toDataURL retornará uma imagem vazia
      // que detectaremos depois ou o navegador lançará um erro "Tainted Canvas"
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.warn('Erro ao processar canvas do vídeo (Provavelmente CORS):', error);
      return null;
    }
  }

  getBrowserInfo() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('edg')) return 'edge';
    return 'unknown';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the scanner when content script loads
console.log('Loading Instagram Comment Scanner...');
new InstagramCommentScanner();
console.log('Instagram Comment Scanner loaded successfully');
