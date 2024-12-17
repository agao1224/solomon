const { contextBridge, ipcRenderer } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
});

contextBridge.exposeInMainWorld('db', {
    getBibleBooks: () => ipcRenderer.invoke('get-bible-books'),
    getBookContent: (bookIdx) => ipcRenderer.invoke('get-book-content', bookIdx),
    getChapterContent: (bookIdx, chapterIdx) => ipcRenderer.invoke('get-chapter-content', bookIdx, chapterIdx),

    getAnnotations: (verseId) => ipcRenderer.invoke('get-annotations', verseId),
    postAnnotation: (annotBody, verseId) => ipcRenderer.invoke('post-annotation', annotBody, verseId)
});
