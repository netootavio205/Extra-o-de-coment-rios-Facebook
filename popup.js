// Popup Script for Instagram Comments Backup Extension
// Handles UI interactions and communication with background script

class PopupController {
  constructor() {
    this.currentData = null;
    this.isScanning = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkCurrentPage();
  }

  bindEvents() {
    // Comment limit selection
    document.getElementById('commentLimit').addEventListener('change', (e) => {
      this.handleLimitChange(e.target.value);
    });

    // Custom limit input
    document.getElementById('customLimit').addEventListener('input', (e) => {
      this.validateCustomLimit(e.target.value);
    });

    // Action buttons
    document.getElementById('scanBtn').addEventListener('click', () => this.startScan());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
    document.getElementById('printBtn').addEventListener('click', () => this.openReport());
    document.getElementById('newScanBtn').addEventListener('click', () => this.resetScan());
    document.getElementById('retryBtn').addEventListener('click', () => this.checkCurrentPage());
  }

  async checkCurrentPage() {
    console.log('Popup: Verificando página atual...');
    this.showStatus('checking', 'Verificando página...', 'Validando post do Instagram');
    
    try {
      const response = await this.sendMessage({ action: 'checkPage' });
      console.log('Popup: Received response:', response);
      
      if (response && response.success) {
        if (response.isValid) {
          console.log('Popup: Página válida, mostrando config');
          this.showConfig();
          this.showStatus('success', 'Página válida', `Pronto para escanear: ${response.shortcode || 'Post'}`);
        } else {
          console.log('Popup: Página inválida detectada pelo content script');
          this.showStatus('error', 'Página inválida', 
            'Esta não parece ser uma página de post.');
          this.showError('Abra um post do Instagram (p/, reels/ ou tv/) para escanear.');
        }
      } else {
        const errorMsg = response?.error || 'Erro desconhecido na comunicação.';
        console.log('Popup: Erro na resposta:', errorMsg);
        this.showStatus('error', 'Erro', 'Falha na verificação');
        this.showError(errorMsg);
      }

    } catch (error) {
      console.error('Popup: Erro ao verificar página:', error);
      this.showStatus('error', 'Erro de conexão', 'Não foi possível verificar a página');
      this.showError('Falha ao conectar com a página do Instagram. Recarregue a página e tente novamente.');
    }
  }

  handleLimitChange(value) {
    const customInput = document.getElementById('customLimit');
    
    if (value === 'custom') {
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      customInput.style.display = 'none';
      customInput.value = '';
    }
  }

  validateCustomLimit(value) {
    const num = parseInt(value);
    if (num < 1 || num > 1000) {
      this.showStatus('warning', 'Limite inválido', 'Insira um número entre 1 e 1000');
    }
  }

  async startScan() {
    console.log('Popup: Starting scan...');
    
    if (this.isScanning) {
      console.log('Popup: Escaneamento já em curso');
      return;
    }

    const limit = this.getSelectedLimit();
    console.log('Popup: Selected limit:', limit);
    
    if (!limit) {
      this.showError('Especifique a quantidade de comentários que deseja capturar.');
      return;
    }

    this.isScanning = true;
    this.showProgress();
    this.updateProgress(30, 'Conectando com a API do Instagram...');

    try {
      console.log('Popup: Sending scan request...');
      const response = await this.sendMessage({ 
        action: 'scanComments', 
        data: { limit } 
      });

      console.log('Popup: Scan response:', response);

      if (response && response.success) {
        console.log('Popup: Captura realizada, mostrando resultados');
        this.currentData = response;
        this.showResults(response);
        this.updateProgress(100, 'Escaneamento concluído com sucesso!');
      } else {
        console.error('Popup: Scan failed:', response);
        throw new Error(response?.error || 'Scan failed');
      }
    } catch (error) {
      console.error('Popup: Erro no scan:', error);
      this.showError(`O escaneamento falhou: ${error.message}`);
    } finally {
      this.isScanning = false;
      console.log('Popup: Scan finished');
    }
  }

  getSelectedLimit() {
    const select = document.getElementById('commentLimit');
    const customInput = document.getElementById('customLimit');
    
    if (select.value === 'custom') {
      return parseInt(customInput.value) || null;
    }
    
    return parseInt(select.value);
  }

  async exportData() {
    if (!this.currentData) {
      this.showError('Sem dados disponíveis para exportação.');
      return;
    }

    try {
      this.showStatus('exporting', 'Exportando...', 'Gerando arquivo JSON');
      
      const response = await this.sendMessage({
        action: 'exportData',
        data: this.currentData
      });

      if (response.success) {
        this.showStatus('success', 'Exportação concluída', 'Arquivo JSON baixado');
        setTimeout(() => this.showResults(this.currentData), 2000);
      } else {
        throw new Error(response.error || 'Exportação falhou');
      }
    } catch (error) {
      this.showError(`A exportação falhou: ${error.message}`);
    }
  }

  async openReport() {
    if (!this.currentData) {
      this.showError('Sem dados disponíveis para o relatório.');
      return;
    }

    try {
      this.showStatus('generating', 'Gerando relatório...', 'Criando versão para impressão');
      
      const response = await this.sendMessage({
        action: 'openReport',
        data: this.currentData
      });

      if (response.success) {
        this.showStatus('success', 'Relatório aberto', 'O relatório foi aberto em uma nova aba');
        setTimeout(() => this.showResults(this.currentData), 2000);
      } else {
        throw new Error(response.error || 'Falha ao abrir relatório');
      }
    } catch (error) {
      this.showError(`Erro ao abrir o relatório: ${error.message}`);
    }
  }

  resetScan() {
    this.currentData = null;
    this.isScanning = false;
    this.checkCurrentPage();
  }

  // UI State Management
  showStatus(type, title, message) {
    const statusCard = document.getElementById('pageStatus');
    const icon = statusCard.querySelector('.status-icon');
    const titleEl = statusCard.querySelector('h3');
    const messageEl = statusCard.querySelector('p');

    // Set icon based on type
    const icons = {
      checking: '⏳',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      exporting: '📤',
      generating: '📄'
    };
    
    icon.textContent = icons[type] || '⏳';
    titleEl.textContent = title;
    messageEl.textContent = message;

    // Update card color
    statusCard.className = 'status-card';
    if (type === 'error') statusCard.classList.add('error');
    if (type === 'success') statusCard.classList.add('success');
    if (type === 'warning') statusCard.classList.add('warning');
  }

  showConfig() {
    this.hideAllSections();
    document.getElementById('configSection').style.display = 'block';
    document.getElementById('pageStatus').style.display = 'flex';
  }

  showProgress() {
    this.hideAllSections();
    document.getElementById('scanProgress').style.display = 'block';
  }

  showResults(data) {
    this.hideAllSections();
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('pageStatus').style.display = 'flex';

    // Atualizar estatísticas
    document.getElementById('capturedCount').textContent = data.meta.capturedCommentCount;
    document.getElementById('scanTime').textContent = `${data.comments.length > 0 ? 'Concluído' : '0s'}`;

    // Update preview
    this.updatePreview(data.comments);
  }

  showError(message) {
    this.hideAllSections();
    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
  }

  hideAllSections() {
    const sections = ['configSection', 'scanProgress', 'resultsSection', 'errorSection'];
    sections.forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
  }

  updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = text;
  }

  updatePreview(comments) {
    const previewList = document.getElementById('previewList');
    previewList.innerHTML = '';

    // Show first 5 comments
    const previewComments = comments.slice(0, 5);
    
    previewComments.forEach(comment => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      
      item.innerHTML = `
        <div class="preview-username">${comment.username}</div>
        <div class="preview-text">${this.escapeHtml(comment.text)}</div>
      `;
      
      previewList.appendChild(item);
    });

    if (comments.length > 5) {
      const moreItem = document.createElement('div');
      moreItem.className = 'preview-item';
      moreItem.innerHTML = `<div style="text-align: center; color: var(--text-secondary);">
        ... e mais ${comments.length - 5} comentários
      </div>`;
      previewList.appendChild(moreItem);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Communication with background script
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup: DOM loaded, initializing controller...');
  new PopupController();
  console.log('Popup: Controller initialized');
});
