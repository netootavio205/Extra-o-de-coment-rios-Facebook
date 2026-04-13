// Report Page Script for Instagram Comments Backup Extension
// Handles data loading, display, and export functionality

class ReportController {
  constructor() {
    this.reportData = null;
    this.selectedIds = new Set();
    this.currentPage = 1;
    this.perPage = 50;
    this.init();
  }

  async init() {
    try {
      await this.loadReportData();
      if (this.reportData) {
        // Inicialmente seleciona todos
        this.reportData.comments.forEach(c => this.selectedIds.add(c.id));
        this.setupEventListeners();
        this.renderStats();
        this.renderReport();
      } else {
        this.showError('Nenhum dado de relatório disponível');
      }
    } catch (error) {
      console.error('Erro na inicialização do relatório:', error);
      this.showError('Falha ao carregar dados do relatório');
    }
  }

  async loadReportData() {
    // Get report ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');
    
    if (!reportId) {
      throw new Error('ID do relatório não fornecido');
    }

    // Load data from storage
    const storageKey = `report_${reportId}`;
    const result = await chrome.storage.local.get(storageKey);
    
    if (!result[storageKey]) {
      throw new Error('Dados do relatório não encontrados');
    }

    this.reportData = result[storageKey];
    
    // Limpeza opcional: Remove apenas se houver muitos relatórios acumulados
    this.cleanupOldReports();
  }

  setupEventListeners() {
    // Select All
    const selectAll = document.getElementById('selectAll');
    selectAll.checked = true;
    selectAll.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));

    // Clear Selection
    document.getElementById('clearSelection').addEventListener('click', () => this.toggleSelectAll(false));

    // Per Page Change
    document.getElementById('perPage').addEventListener('change', (e) => {
      this.perPage = parseInt(e.target.value);
      this.currentPage = 1;
      this.renderReport();
    });

    // Action Buttons
    document.getElementById('printBtn').addEventListener('click', () => this.handlePrint());
    document.getElementById('downloadBtn').addEventListener('click', () => this.handleDownload());
  }

  toggleSelectAll(checked) {
    if (checked) {
      this.reportData.comments.forEach(c => this.selectedIds.add(c.id));
    } else {
      this.selectedIds.clear();
    }
    document.getElementById('selectAll').checked = checked;
    this.updateSelectionInfo();
    this.renderReport();
  }

  toggleCommentSelection(id, checked) {
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
      document.getElementById('selectAll').checked = false;
    }
    
    // Atualiza a classe para impressão dinamicamente
    const item = document.getElementById(`item-${id}`);
    if (item) {
      if (checked) item.classList.remove('not-selected-print');
      else item.classList.add('not-selected-print');
    }

    this.updateSelectionInfo();
  }

  updateSelectionInfo() {
    const count = this.selectedIds.size;
    const total = this.reportData.comments.length;
    document.getElementById('selectedCount').textContent = count;
    
    // Atualiza a contagem para o modo de impressão
    const printCount = document.getElementById('printSelectionCount');
    if (printCount) {
      printCount.textContent = `(${count}/${total} selecionados)`;
    }
  }

  renderStats() {
    const { meta, post } = this.reportData;
    this.updateHeader(meta);
    this.updatePostInfo(post, meta);
    this.updateStatistics(meta);
    this.updateFooter(meta);
    this.updateSelectionInfo();
  }

  renderReport() {
    const { comments } = this.reportData;
    
    // Calculate pagination
    const totalPages = Math.ceil(comments.length / this.perPage);
    const start = (this.currentPage - 1) * this.perPage;
    const end = start + this.perPage;
    const paginatedComments = comments.slice(start, end);

    // Update list
    this.updateCommentsList(paginatedComments);
    
    // Render pagination nav
    this.renderPaginationNav(totalPages);
  }

  renderPaginationNav(totalPages) {
    const top = document.getElementById('paginationTop');
    const bottom = document.getElementById('paginationBottom');
    
    if (totalPages <= 1) {
      top.innerHTML = '';
      bottom.innerHTML = '';
      return;
    }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="reportController.goToPage(${i})">${i}</button>`;
    }

    top.innerHTML = html;
    bottom.innerHTML = html;
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderReport();
    window.scrollTo({ top: document.querySelector('.comments-section').offsetTop - 20, behavior: 'smooth' });
  }

  handlePrint() {
    if (this.selectedIds.size === 0) {
      alert('Selecione pelo menos um comentário para imprimir.');
      return;
    }
    window.print();
  }

  handleDownload() {
    if (this.selectedIds.size === 0) {
      alert('Selecione pelo menos um comentário para exportar.');
      return;
    }

    // Filtrar apenas selecionados para o JSON
    const filteredData = {
      ...this.reportData,
      comments: this.reportData.comments.filter(c => this.selectedIds.has(c.id)),
      meta: {
        ...this.reportData.meta,
        capturedCommentCount: this.selectedIds.size,
        isFiltered: true
      }
    };

    const jsonString = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `instagram-comments-selected-${timestamp}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async cleanupOldReports() {
    const storage = await chrome.storage.local.get(null);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const keysToRemove = Object.keys(storage).filter(key => {
      if (key.startsWith('report_')) {
        const timestamp = parseInt(key.split('_')[1]);
        return (now - timestamp) > oneHour;
      }
      return false;
    });
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  }


  updateHeader(meta) {
    const reportDate = document.getElementById('reportDate');
    const reportId = document.getElementById('reportId');
    
    const capturedDate = new Date(meta.capturedAt);
    reportDate.textContent = capturedDate.toLocaleString();
    
    // Generate report ID from timestamp and URL
    const urlHash = btoa(meta.sourceUrl).substring(0, 8);
    reportId.textContent = `Report #${capturedDate.getTime()}-${urlHash}`;
  }

  updatePostInfo(post, meta) {
    // Update post URL
    const postUrl = document.getElementById('postUrl');
    postUrl.href = meta.sourceUrl;
    postUrl.textContent = meta.sourceUrl;
    
    // Update post author
    const postAuthor = document.getElementById('postAuthor');
    postAuthor.textContent = post.author || 'Desconhecido';
    
    // Update post caption
    const postCaption = document.getElementById('postCaption');
    postCaption.textContent = post.caption || 'Sem legenda disponível';
    
    // Update post image
    const postImageImg = document.getElementById('postImageImg');
    if (post.imageUrl) {
      postImageImg.src = post.imageUrl;
      postImageImg.onerror = () => {
        postImageImg.style.display = 'none';
        postImageImg.parentElement.innerHTML = '<div class="no-image">Placeholder: Imagem do Post</div>';
      };
      postImageImg.style.display = 'block';
    } else {
      postImageImg.style.display = 'none';
      postImageImg.parentElement.innerHTML = '<div class="no-image">Imagem não disponível</div>';
    }
  }

  updateStatistics(meta) {
    document.getElementById('totalComments').textContent = meta.capturedCommentCount;
    document.getElementById('requestedLimit').textContent = meta.requestedCommentLimit;
    document.getElementById('scanDuration').textContent = `${(meta.scanDuration / 1000).toFixed(1)}s`;
    
    // Update scan status with appropriate styling
    const statusElement = document.getElementById('scanStatus');
    const statusText = this.formatScanStatus(meta.scanStatus);
    statusElement.textContent = statusText;
    
    // Add color coding for status
    statusElement.className = 'stat-value';
    if (meta.scanStatus === 'complete') {
      statusElement.style.color = 'var(--success-color)';
    } else if (meta.scanStatus === 'partial') {
      statusElement.style.color = 'var(--warning-color)';
    } else if (meta.scanStatus === 'error') {
      statusElement.style.color = 'var(--error-color)';
    }
  }

  formatScanStatus(status) {
    const statusMap = {
      'complete': 'Completo',
      'partial': 'Parcial',
      'no_comments': 'Sem Comentários',
      'error': 'Erro',
      'in_progress': 'Em Andamento'
    };
    return statusMap[status] || status;
  }

  updateCommentsList(comments) {
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length === 0) {
      commentsList.innerHTML = '<div class="error-message">Nenhum comentário nesta página</div>';
      return;
    }

    commentsList.innerHTML = comments.map(comment => this.renderComment(comment)).join('');
    
    // Atribui eventos de checkbox
    comments.forEach(comment => {
      const cb = document.getElementById(`cb-${comment.id}`);
      if (cb) {
        cb.checked = this.selectedIds.has(comment.id);
        cb.addEventListener('change', (e) => this.toggleCommentSelection(comment.id, e.target.checked));
      }
    });
  }

  renderComment(comment) {
    const isSelected = this.selectedIds.has(comment.id);
    const avatarHtml = this.renderAvatar(comment.base64Avatar || comment.avatarUrl, comment.username);
    const repliesHtml = comment.replies && comment.replies.length > 0 
      ? this.renderReplies(comment.replies) 
      : '';
    
    return `
      <div id="item-${comment.id}" class="comment-item ${isSelected ? '' : 'not-selected-print'}">
        <div class="comment-selector">
           <label class="checkbox-container">
             <input type="checkbox" id="cb-${comment.id}" ${isSelected ? 'checked' : ''}>
             <span class="checkmark"></span>
           </label>
        </div>
        <div class="comment-main">
          <div class="comment-header">
            <div class="comment-avatar">
              ${avatarHtml}
            </div>
            <div class="comment-author-info">
              <div class="comment-username">${this.escapeHtml(comment.username)}</div>
            </div>
            <div class="comment-meta">
              ${comment.likes > 0 ? `<div class="comment-likes">${comment.likes}</div>` : ''}
            </div>
          </div>
          <div class="comment-text">${this.escapeHtml(comment.text)}</div>
        </div>
      </div>
    `;
  }


  renderAvatar(avatarUrl, username) {
    const initials = username ? username.substring(0, 2).toUpperCase() : 'U';
    if (avatarUrl) {
      return `<img src="${avatarUrl}" alt="${username}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-placeholder\\'>${initials}</div>'">`;
    } else {
      return `<div class="avatar-placeholder">${initials}</div>`;
    }
  }

  renderReplies(replies) {
    if (!replies || replies.length === 0) return '';
    
    const repliesHtml = replies.map(reply => `
      <div class="reply-item">
        <div class="reply-header">
          <div class="reply-avatar">
            ${this.renderAvatar(reply.avatarUrl, reply.username)}
          </div>
          <div class="reply-username">${this.escapeHtml(reply.username)}</div>
        </div>
        <div class="reply-text">${this.escapeHtml(reply.text)}</div>
      </div>
    `).join('');
    
    return `
      <div class="comment-replies">
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600;">
          ${replies.length} ${replies.length === 1 ? 'resposta' : 'respostas'}
        </div>
        ${repliesHtml}
      </div>
    `;
  }

  updateFooter(meta) {
    const footerDate = document.getElementById('footerDate');
    const capturedDate = new Date(meta.capturedAt);
    footerDate.textContent = capturedDate.toLocaleString();
  }

  showError(message) {
    document.querySelector('.report-container').innerHTML = `
      <div class="error-message" style="margin: 50px; padding: 40px;">
        <h2>Erro ao Carregar Relatório</h2>
        <p>${message}</p>
        <button onclick="window.close()" class="btn btn-primary" style="margin-top: 20px;">
          Fechar Janela
        </button>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// As funções globais foram integradas à classe e aos listeners

// Initialize report controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.reportController = new ReportController();
});

// Handle print events
window.addEventListener('beforeprint', () => {
  // Add any print-specific adjustments here
  document.body.classList.add('printing');
});

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing');
});
