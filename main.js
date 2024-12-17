const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('node:path')
const Database = require('better-sqlite3')

const { BIBLE_BOOKS } = require('./constants')

const fs = require('fs');

const srcDbPath = path.join(__dirname, 'app.db'); // Original location
const destDbPath = path.join(app.getPath('userData'), 'app.db'); // Writable location

if (!fs.existsSync(destDbPath)) {
  fs.copyFileSync(srcDbPath, destDbPath);
}

/*** BEGIN: DATABASE ***/
const db = new Database(destDbPath);

function initDatabase() {
  const createAnnoTableStmt = db.prepare(`CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      body TEXT NOT NULL,
      verse INTEGER NOT NULL,
      FOREIGN KEY (verse) REFERENCES bible(id)
    )
  `);
  createAnnoTableStmt.run();
} 
/*** END: DATABASE ***/

let mainWindow;
let isQuitting = false;

const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.loadFile('index.html');

    mainWindow.on('close', (event) => {
      if (!isQuitting && process.platform === 'darwin') {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
}

app.on('ready', () => {
  createWindow();
})

initDatabase();

/*** BEGIN: API ***/
ipcMain.handle('get-bible-books', () => {
    return BIBLE_BOOKS;
});

ipcMain.handle('get-book-content', (event, bookIdx) => {
    const stmt = db.prepare(`SELECT COUNT(DISTINCT Chapter) as chapter_count FROM bible WHERE Book = ${bookIdx}`);
    const res = stmt.get();
    return res.chapter_count;
});

ipcMain.handle('get-chapter-content', (event, bookIdx, chapterIdx) => { 
    const stmt = db.prepare(`SELECT * FROM bible WHERE Book = ${bookIdx} AND Chapter = ${chapterIdx}`);
    const res = stmt.all();
    let verses = [];

    res.forEach(verseObj => {
      verses.push({
        "id": verseObj.id,
        "verse": verseObj.verse
      }); 
    });
    return verses;
});


ipcMain.handle('get-annotations', (event, verseKey) => {
    const stmt = db.prepare(`SELECT * FROM annotations WHERE verse=${verseKey}`);
    const verseNumStmt = db.prepare(`SELECT Versecount FROM bible WHERE id=${verseKey}`)
    const res = stmt.all();
    const verseNum = verseNumStmt.get();
    let annotes = [];
    res.forEach(annot => {
      annotes.push(annot.body);
    });
    return {
      "verseNum": verseNum,
      "annotations": annotes
    }
});
ipcMain.handle('post-annotation', (event, annotBody, verseId) => {
  try {
    const stmt = db.prepare('INSERT INTO annotations (body, verse) VALUES (?, ?)');
    stmt.run(annotBody, verseId); // Dynamically bind `body` and `verseId`
    return true;
  } catch (error) {
    console.log('Error annotating:', error);
    return false;
  }
})
/*** END: API ***/

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else mainWindow.show();
})

app.on('window-all-closed', () => {
    // comment out to leave open in bg for mac
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

